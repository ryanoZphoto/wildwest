import { AIRTABLE_CONFIG, API_ENDPOINTS } from './config.js';
console.log('airtable.js version=v5');

class AirtableService {
  constructor() {
    this.apiKey = AIRTABLE_CONFIG.API_KEY;
    this.baseId = AIRTABLE_CONFIG.BASE_ID;
    this.productsUrl = API_ENDPOINTS.PRODUCTS;
    this.cache = new Map();
    this.cacheTimeout = 300000;
  }

  async fetchWithAuth(url) {
    const response = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
    if (!response.ok) throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
    return response.json();
  }

  async getAllProducts() {
    const cacheKey = 'allProducts';
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) return cached.data;
    try {
      const products = [];
      let offset = null;
      do {
        const url = offset
          ? `${this.productsUrl}?offset=${offset}&sort%5B0%5D%5Bfield%5D=featured&sort%5B0%5D%5Bdirection%5D=desc&sort%5B1%5D%5Bfield%5D=created_time&sort%5B1%5D%5Bdirection%5D=desc`
          : `${this.productsUrl}?sort%5B0%5D%5Bfield%5D=featured&sort%5B0%5D%5Bdirection%5D=desc&sort%5B1%5D%5Bfield%5D=created_time&sort%5B1%5D%5Bdirection%5D=desc`;
        const response = await this.fetchWithAuth(url);
        const safeRecords = Array.isArray(response.records) ? response.records : [];
        const formatted = safeRecords
          .filter(rec => rec && rec.id && rec.fields)
          .map(rec => this.formatProduct(rec));
        products.push(...formatted);
        offset = response.offset;
      } while (offset);
      this.cache.set(cacheKey, { data: products, timestamp: Date.now() });
      return products;
    } catch (err) {
      console.error('Error fetching products:', err);
      return [];
    }
  }

  async getProductById(id) {
    const cacheKey = `product_${id}`;
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) return cached.data;
    try {
      const record = await this.fetchWithAuth(`${this.productsUrl}/${id}`);
      if (!record || !record.id || !record.fields) return null;
      const product = this.formatProduct(record);
      this.cache.set(cacheKey, { data: product, timestamp: Date.now() });
      return product;
    } catch (err) {
      console.error('Error fetching product:', err);
      return null;
    }
  }

  searchProducts(query, filters = {}) {
    return this.getAllProducts()
      .then(all => this.filterProducts(all, query, filters))
      .catch(() => []);
  }

  filterProducts(products, query, filters) {
    let filtered = products;
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(p => (
        (p.title || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.tags || []).some(t => (t || '').toLowerCase().includes(q))
      ));
    }
    if (filters.category) filtered = filtered.filter(p => p.category === filters.category);
    if (filters.finish) filtered = filtered.filter(p => (p.availableFinishes || []).includes(filters.finish));
    if (filters.priceRange) {
      const [min, max] = filters.priceRange;
      filtered = filtered.filter(p => {
        const prices = Object.values(p.prices?.acrylic || {});
        return prices.some(price => price >= min && price <= max);
      });
    }
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
            return (a.title || '').localeCompare(b.title || '');
          default:
            return 0;
        }
      });
    }
    return filtered;
  }

  formatProduct(record) {
    const fields = record?.fields || {};
    // Prefer a clean display title (strip common suffixes/underscores)
    const rawTitle = fields.Title || fields.title || '';
    const cleanTitle = rawTitle
      .replace(/[_-]+/g, ' ')
      .replace(/\s+(print|landscape|portrait)$/i, '')
      .trim();
    const finishes = [];
    if (fields.AcrylicPreview || fields.Acrylic20x40) finishes.push('acrylic');
    if (fields.MetalPreview || fields.Metal20x40) finishes.push('metal');
    if (fields.CanvasPreview || fields.Canvas20x40) finishes.push('canvas');
    return {
      id: record.id,
      title: cleanTitle,
      description: fields.Description || '',
      shortDescription: fields.ShortDescription || fields.Description?.substring(0, 100) + '...' || '',
      category: fields.Category || 'Uncategorized',
      tags: Array.isArray(fields.Tags) ? fields.Tags : (typeof fields.Tags === 'string' ? fields.Tags.split(',').map(t => t.trim()) : []),
      mainImage: fields.MainImage?.[0]?.url || '',
      galleryImages: fields.GalleryImages?.map(img => img.url) || [],
      previewImages: {
        acrylic: fields.AcrylicPreview?.[0]?.url || '',
        metal: fields.MetalPreview?.[0]?.url || '',
        canvas: fields.CanvasPreview?.[0]?.url || ''
      },
      availableFinishes: finishes.length ? finishes : ['acrylic', 'metal', 'canvas'],
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

  generateSlug(title) {
    return (title || '')
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  clearCache() { this.cache.clear(); }
}

const airtableService = new AirtableService();
export default airtableService;



