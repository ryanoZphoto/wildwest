import { AIRTABLE_CONFIG, API_ENDPOINTS } from './config.js';
// Debug/version marker to ensure latest script is loaded
console.log('airtable.js version=v4');

class AirtableService {
  constructor() {
    this.apiKey = AIRTABLE_CONFIG.API_KEY;
    this.baseId = AIRTABLE_CONFIG.BASE_ID;
    this.productsUrl = API_ENDPOINTS.PRODUCTS;
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
    // Ensure instance methods keep context when passed as callbacks
    this.formatProduct = this.formatProduct.bind(this);
    this.getAvailableFinishes = this.getAvailableFinishes.bind(this);
  }

  async fetchWithAuth(url) {
    // Authorization handled server-side by Netlify function proxy
    const response = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  async getAllProducts() {
    const cacheKey = 'allProducts';
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const products = [];
      let offset = null;

      do {
        const url = offset
          ? `${this.productsUrl}?offset=${offset}&sort%5B0%5D%5Bfield%5D=featured&sort%5B0%5D%5Bdirection%5D=desc&sort%5B1%5D%5Bfield%5D=created_time&sort%5B1%5D%5Bdirection%5D=desc`
          : `${this.productsUrl}?sort%5B0%5D%5Bfield%5D=featured&sort%5B0%5D%5Bdirection%5D=desc&sort%5B1%5D%5Bfield%5D=created_time&sort%5B1%5D%5Bdirection%5D=desc`;

        const response = await this.fetchWithAuth(url);
        // Preserve class context and guard missing fields
        const formattedProducts = (response.records || []).map((rec) => this.formatProduct(rec));
        products.push(...formattedProducts);
        offset = response.offset;
      } while (offset);

      this.cache.set(cacheKey, { data: products, timestamp: Date.now() });
      return products;
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  }

  async getProductById(id) {
    const cacheKey = `product_${id}`;
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const product = await this.fetchWithAuth(`${this.productsUrl}/${id}`);
      const formattedProduct = this.formatProduct(product);
      this.cache.set(cacheKey, { data: formattedProduct, timestamp: Date.now() });
      return formattedProduct;
    } catch (error) {
      console.error('Error fetching product:', error);
      return null;
    }
  }

  async searchProducts(query, filters = {}) {
    try {
      const allProducts = await this.getAllProducts();
      return this.filterProducts(allProducts, query, filters);
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }

  filterProducts(products, query, filters) {
    let filtered = products;

    // Text search
    if (query) {
      const searchTerm = query.toLowerCase();
      filtered = filtered.filter(product =>
        product.title.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm) ||
        product.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(product =>
        product.category === filters.category
      );
    }

    // Finish filter
    if (filters.finish) {
      filtered = filtered.filter(product =>
        product.availableFinishes.includes(filters.finish)
      );
    }

    // Price range filter
    if (filters.priceRange) {
      const [min, max] = filters.priceRange;
      filtered = filtered.filter(product => {
        const prices = Object.values(product.prices.acrylic);
        return prices.some(price => price >= min && price <= max);
      });
    }

    // Sort
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        switch (filters.sortBy) {
          case 'price_asc':
            return Math.min(...Object.values(a.prices.acrylic)) - Math.min(...Object.values(b.prices.acrylic));
          case 'price_desc':
            return Math.max(...Object.values(b.prices.acrylic)) - Math.max(...Object.values(a.prices.acrylic));
          case 'newest':
            return new Date(b.createdTime) - new Date(a.createdTime);
          case 'title':
            return a.title.localeCompare(b.title);
          default:
            return 0;
        }
      });
    }

    return filtered;
  }

  formatProduct(record) {
    const fields = record?.fields || {};
    // Compute finishes locally to avoid relying on bound context
    const finishes = [];
    if (fields.AcrylicPreview || fields.Acrylic20x40) finishes.push('acrylic');
    if (fields.MetalPreview || fields.Metal20x40) finishes.push('metal');
    if (fields.CanvasPreview || fields.Canvas20x40) finishes.push('canvas');
    return {
      id: record.id,
      title: fields.Title || '',
      description: fields.Description || '',
      shortDescription: fields.ShortDescription || fields.Description?.substring(0, 100) + '...' || '',
      category: fields.Category || 'Uncategorized',
      tags: Array.isArray(fields.Tags) ? fields.Tags : (typeof fields.Tags === 'string' ? fields.Tags.split(',').map(tag => tag.trim()) : []),
      mainImage: fields.MainImage?.[0]?.url || '',
      galleryImages: fields.GalleryImages?.map(img => img.url) || [],
      previewImages: {
        acrylic: fields.AcrylicPreview?.[0]?.url || '',
        metal: fields.MetalPreview?.[0]?.url || '',
        canvas: fields.CanvasPreview?.[0]?.url || ''
      },
      availableFinishes: finishes.length > 0 ? finishes : ['acrylic', 'metal', 'canvas'],
      prices: {
        acrylic: {
          '20x40': fields.Acrylic20x40 || 180,
          '24x36': fields.Acrylic24x36 || 130,
          '20x30': fields.Acrylic20x30 || 100,
          '16x24': fields.Acrylic16x24 || 60
        },
        metal: {
          '20x40': fields.Metal20x40 || 220,
          '24x36': fields.Metal24x36 || 150,
          '20x30': fields.Metal20x30 || 120,
          '16x24': fields.Metal16x24 || 70
        },
        canvas: {
          '20x40': fields.Canvas20x40 || 180,
          '24x36': fields.Canvas24x36 || 130,
          '20x30': fields.Canvas20x30 || 100,
          '16x24': fields.Canvas16x24 || 60
        }
      },
      seoTitle: fields.SEOTitle || fields.Title || '',
      seoDescription: fields.SEODescription || fields.ShortDescription || '',
      featured: fields.Featured || false,
      inStock: fields.InStock !== false,
      stock: fields.Stock || 1,
      createdTime: fields.created_time,
      lastModified: record.createdTime,
      slug: this.generateSlug(fields.Title || ''),
      artist: fields.Artist || 'Ryan Osmun'
    };
  }

  getAvailableFinishes(fields = {}) {
    const finishes = [];
    if (fields.AcrylicPreview || fields.Acrylic20x40) finishes.push('acrylic');
    if (fields.MetalPreview || fields.Metal20x40) finishes.push('metal');
    if (fields.CanvasPreview || fields.Canvas20x40) finishes.push('canvas');
    return finishes.length > 0 ? finishes : ['acrylic', 'metal', 'canvas'];
  }

  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  clearCache() {
    this.cache.clear();
  }
}

const airtableService = new AirtableService();
export default airtableService;
