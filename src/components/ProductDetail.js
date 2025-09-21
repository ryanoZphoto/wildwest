import { PRODUCT_CONSTANTS } from '../utils/config.js';
import cartService from '../utils/cart.js';

class ProductDetail {
  constructor(productData, containerId) {
    this.product = productData;
    this.container = document.getElementById(containerId);
    // Preselect finish from URL if provided
    const urlParams = new URLSearchParams(window.location.search);
    this.selectedFinish = (urlParams.get('finish') || 'acrylic').toLowerCase();
    this.selectedSize = '20x40';
    this.selectedQuantity = 1;
    this.currentImageIndex = 0;
    this.init();
  }

  init() {
    this.render();
    this.setupEventListeners();
    this.setupImageGallery();
  }

  render() {
    this.container.innerHTML = `
      <!-- Meta tags are set in the parent component -->

      <!-- Product Title and Breadcrumb -->
      <nav aria-label="Breadcrumb" style="padding: 1rem 0; font-size: 0.9rem; color: #666;">
        <a href="/" style="text-decoration: none; color: #d4a373;">Home</a> > 
        <a href="/gallery.html" style="text-decoration: none; color: #d4a373;">Gallery</a> > 
        <span>${this.product.title}</span>
      </nav>

      <!-- Product Grid Layout -->
      <div class="grid-2" style="gap: 2rem;">

        <!-- Image Section -->
        <section class="product-images">
          <div class="main-image-container" id="main-image-container" style="position: relative; margin-bottom: 1rem;">
            <img id="main-product-image" src="${this.product.mainImage}" alt="${this.product.title}" style="width: 100%; max-height: 600px; object-fit: cover; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); cursor: zoom-in;">
            <div class="image-zoom" id="image-zoom" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; cursor: zoom-out;">
              <img src="${this.product.mainImage}" alt="${this.product.title}" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); max-width: 90%; max-height: 90%; object-fit: contain;">
            </div>
          </div>

          <!-- Thumbnail Gallery -->
          <div class="thumbnail-gallery" id="thumbnail-gallery" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 0.5rem;">
            ${this.product.galleryImages.map((img, index) => `
              <img src="${img}" alt="${this.product.title} - ${index + 1}" data-index="${index}" class="thumbnail ${index === 0 ? 'active' : ''}" style="width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 4px; cursor: pointer; border: 2px solid ${index === 0 ? '#d4a373' : 'transparent'};">
            `).join('')}
          </div>
        </section>

        <!-- Product Information -->
        <section class="product-info">
          <div class="product-header">
            <h1 class="product-title" style="font-size: 2rem; font-weight: 800; margin-bottom: 0.5rem; color: #1a1a1a;">${this.product.title}</h1>
            <p class="artist" style="color: #666; font-size: 0.9rem; margin-bottom: 1rem;">by ${this.product.artist}</p>
          </div>

          <div class="product-description" style="margin-bottom: 2rem;">
            <p style="line-height: 1.6; color: #444;">${this.product.description}</p>
          </div>

          <!-- Finish Selection -->
          <div class="finish-tabs" id="finish-tabs" style="margin-bottom: 2rem;">
            ${PRODUCT_CONSTANTS.FINISH_TYPES
              .filter(finish => this.product.availableFinishes.includes(finish))
              .map(finish => `
                <button id="finish-${finish}" class="finish-option ${finish === 'acrylic' ? 'active' : ''}" data-finish="${finish}" style="padding: 1rem 1.4rem; min-width: 120px; border: none; border-radius: 12px; background: ${finish === 'acrylic' ? '#d4a373' : 'rgba(255,255,255,0.1)'}; color: ${finish === 'acrylic' ? '#fff' : '#eaeaea'}; font-weight: 600; cursor: pointer; transition: all 0.2s ease;">
                  ${finish.charAt(0).toUpperCase() + finish.slice(1)}
                </button>
              `).join('')}
          </div>

          <!-- Size Selection -->
          <div class="size-selection" id="size-selection" style="margin-bottom: 2rem;">
            <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem;">Size Options</h3>
            <div class="size-options" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.75rem;">
              ${Object.keys(PRODUCT_CONSTANTS.SIZES).map(size => `
                <button class="size-option ${size === '20x40' ? 'selected' : ''}" data-size="${size}" style="padding: 1rem; border: 2px solid ${size === '20x40' ? '#d4a373' : '#e0e0e0'}; border-radius: 8px; background: ${size === '20x40' ? 'rgba(212,163,115,0.1)' : '#fff'}; cursor: pointer; transition: all 0.2s ease;">
                  <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.25rem;">${size}"</div>
                  <div id="price-${size}" style="font-size: 1rem; color: #d4a373; font-weight: 700;">$${this.product.prices.acrylic[size]}</div>
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Quantity and Cart -->
          <div class="cart-section" style="margin-bottom: 2rem;" id="cart-section">
            <div class="quantity-selector" id="quantity-selector" style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
              <label style="font-weight: 600;">Quantity:</label>
              <button class="quantity-btn" id="quantity-minus" style="width: 40px; height: 40px; border: 2px solid #e0e0e0; border-radius: 4px; background: #fff; cursor: pointer; font-size: 1.2rem;">-</button>
              <span id="quantity-display" style="font-size: 1.2rem; font-weight: 600; min-width: 40px; text-align: center;">1</span>
              <button class="quantity-btn" id="quantity-plus" style="width: 40px; height: 40px; border: 2px solid #e0e0e0; border-radius: 4px; background: #fff; cursor: pointer; font-size: 1.2rem;">+</button>
            </div>

            <div class="total-price" id="total-price" style="font-size: 1.3rem; font-weight: 800; color: #d4a373; margin-bottom: 1.5rem;">
              Total: $${this.product.prices.acrylic['20x40']}
            </div>

            <div class="availability" id="availability-message" style="margin-bottom: 1rem; display: ${this.product.inStock ? 'none' : 'block'}; color: #dc2626; font-weight: 600;">
              ⚠️ Out of stock
            </div>

            <div class="action-buttons" id="action-buttons">
              <button id="add-to-cart-btn" class="order-cta ${!this.product.inStock ? 'disabled' : ''}" style="width: 100%; margin-bottom: 1rem;" ${!this.product.inStock ? 'disabled' : ''}>
                Add to Cart (${this.product.prices.acrylic['20x40']})</button>
              <button id="buy-now-btn" style="width: 100%; padding: 1rem; background: transparent; border: 2px solid #d4a373; color: #d4a373; border-radius: 999px; cursor: pointer; font-weight: 700; transition: all 0.2s ease;">
                Buy Now (${this.product.prices.acrylic['20x40']})
              </button>
            </div>

            <div id="cart-message" class="cart-message" style="margin-top: 1rem; display: none;">
              <div id="cart-message-text" style="color: #22c55e; font-weight: 600;"></div>
            </div>
          </div>

          <!-- Product Tags -->
          ${this.product.tags.length > 0 ? `
            <div class="product-tags" style="margin-bottom: 2rem;">
              <h4 style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.5px;">Tags</h4>
              <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                ${this.product.tags.map(tag => `<span style="padding: 0.25rem 0.75rem; background: #f5f5f5; border-radius: 20px; font-size: 0.8rem; color: #666;">${tag}</span>`).join('')}
              </div>
            </div>
          ` : ''}

        </section>
      </div>

      <!-- Pagination - Related Products will go here -->
      <section class="related-products" style="margin-top: 4rem; padding-top: 2rem; border-top: 1px solid #e0e0e0;">
        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 2rem;">You might also like</h2>
        <div id="related-products-container" class="gallery-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 2rem;">
          <!-- Related products will be loaded here -->
        </div>
      </section>
    `;
  }

  setupEventListeners() {
    // Finish selection
    document.querySelectorAll('[data-finish]').forEach(button => {
      button.addEventListener('click', (e) => {
        document.querySelectorAll('.finish-option').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        this.selectedFinish = e.target.dataset.finish;
        this.updateImagePreview();
        this.updatePrices();
        this.updateTotalPrice();
      });
    });

    // Size selection
    document.querySelectorAll('.size-option').forEach(button => {
      button.addEventListener('click', (e) => {
        document.querySelectorAll('.size-option').forEach(btn => btn.classList.remove('selected'));
        e.target.closest('.size-option').classList.add('selected');
        this.selectedSize = e.target.closest('.size-option').dataset.size;
        this.updateTotalPrice();
      });
    });

    // Quantity selection
    document.getElementById('quantity-plus').addEventListener('click', () => {
      this.selectedQuantity++;
      document.getElementById('quantity-display').textContent = this.selectedQuantity;
      this.updateTotalPrice();
    });

    document.getElementById('quantity-minus').addEventListener('click', () => {
      if (this.selectedQuantity > 1) {
        this.selectedQuantity--;
        document.getElementById('quantity-display').textContent = this.selectedQuantity;
        this.updateTotalPrice();
      }
    });

    // Cart functionality
    document.getElementById('add-to-cart-btn').addEventListener('click', async () => {
      await this.addToCart();
    });

    document.getElementById('buy-now-btn').addEventListener('click', async () => {
      await this.buyNow();
    });
  }

  async addToCart() {
    if (!this.product.inStock) {
      this.showCartMessage('This item is currently out of stock.', 'error');
      return;
    }

    try {
      // Disable button to prevent double-clicks
      const button = document.getElementById('add-to-cart-btn');
      button.disabled = true;
      button.textContent = 'Adding to Cart...';

      const configuration = {
        finish: this.selectedFinish,
        size: this.selectedSize,
        quantity: this.selectedQuantity,
        price: this.product.prices[this.selectedFinish][this.selectedSize]
      };

      const result = await cartService.addItem(this.product.id, configuration);

      if (result.success) {
        this.showCartMessage(`Added ${configuration.quantity}x ${this.product.title} to cart!`, 'success');
        this.updateCartCounter();

        // Optional: Redirect to cart page after short delay
        setTimeout(() => {
          if (confirm('Item added to cart! Go to checkout?')) {
            window.location.href = 'cart.html';
          }
        }, 1500);
      } else {
        throw new Error(result.error || 'Failed to add item to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      this.showCartMessage('Failed to add item to cart. Please try again.', 'error');
    } finally {
      // Re-enable button
      const button = document.getElementById('add-to-cart-btn');
      const price = this.product.prices[this.selectedFinish][this.selectedSize];
      button.disabled = false;
      button.textContent = `Add to Cart ($${price})`;
    }
  }

  async buyNow() {
    if (!this.product.inStock) {
      this.showCartMessage('This item is currently out of stock.', 'error');
      return;
    }

    try {
      // Add item to cart first
      const configuration = {
        finish: this.selectedFinish,
        size: this.selectedSize,
        quantity: this.selectedQuantity,
        price: this.product.prices[this.selectedFinish][this.selectedSize]
      };

      const result = await cartService.addItem(this.product.id, configuration);

      if (result.success) {
        // Redirect to cart page for checkout
        window.location.href = 'cart.html';
      } else {
        throw new Error(result.error || 'Failed to add item to cart');
      }
    } catch (error) {
      console.error('Error with buy now:', error);
      this.showCartMessage('Failed to process request. Please try again.', 'error');
    }
  }

  showCartMessage(message, type = 'success') {
    const messageDiv = document.getElementById('cart-message');
    const messageText = document.getElementById('cart-message-text');

    if (messageDiv && messageText) {
      messageText.textContent = message;
      messageText.style.color = type === 'error' ? '#dc2626' : '#22c55e';
      messageDiv.style.display = 'block';

      // Hide message after 3 seconds
      setTimeout(() => {
        messageDiv.style.display = 'none';
      }, 3000);
    }
  }

  updateCartCounter() {
    // Update any cart counter displays on the page
    const cartCounters = document.querySelectorAll('.cart-counter');
    const count = cartService.getCartCount();

    cartCounters.forEach(counter => {
      counter.textContent = count;
      counter.style.display = count > 0 ? 'inline-block' : 'none';
    });
  }

  setupImageGallery() {
    // Image zoom
    const mainImage = document.getElementById('main-product-image');
    const zoomContainer = document.getElementById('image-zoom');

    mainImage.addEventListener('click', () => {
      zoomContainer.style.display = 'block';
      document.body.style.overflow = 'hidden';
    });

    zoomContainer.addEventListener('click', () => {
      zoomContainer.style.display = 'none';
      document.body.style.overflow = '';
    });

    // Thumbnail selection
    document.querySelectorAll('.thumbnail').forEach(thumb => {
      thumb.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        this.currentImageIndex = index;
        this.updateMainImage();

        // Update active thumbnail
        document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
      });
    });
  }

  updateImagePreview() {
    const previewImage = this.product.previewImages[this.selectedFinish] || this.product.mainImage;
    if (previewImage) {
      document.getElementById('main-product-image').src = previewImage;
      document.getElementById('image-zoom').querySelector('img').src = previewImage;
    }
  }

  updateMainImage() {
    const images = [this.product.mainImage, ...this.product.galleryImages];
    const imageUrl = images[this.currentImageIndex];
    if (imageUrl) {
      document.getElementById('main-product-image').src = imageUrl;
      document.getElementById('image-zoom').querySelector('img').src = imageUrl;
    }
  }

  updatePrices() {
    Object.keys(PRODUCT_CONSTANTS.SIZES).forEach(size => {
      const priceElement = document.getElementById(`price-${size}`);
      if (priceElement) {
        const price = this.product.prices[this.selectedFinish]?.[size];
        if (price) {
          priceElement.textContent = `$${price}`;
        }
      }
    });
  }

  updateTotalPrice() {
    const basePrice = this.product.prices[this.selectedFinish]?.[this.selectedSize] || 0;
    const totalPrice = basePrice * this.selectedQuantity;
    const shippingCost = (basePrice >= 100 || totalPrice >= 100) ? 0 : 10;

    document.getElementById('total-price').textContent = `Total: $${totalPrice + shippingCost}`;
    document.getElementById('add-to-cart-btn').textContent = `Add to Cart ($${basePrice})`;
    document.getElementById('buy-now-btn').textContent = `Buy Now ($${basePrice})`;
  }

  getCurrentConfiguration() {
    return {
      product: this.product,
      finish: this.selectedFinish,
      size: this.selectedSize,
      quantity: this.selectedQuantity,
      price: this.product.prices[this.selectedFinish][this.selectedSize],
      totalPrice: this.product.prices[this.selectedFinish][this.selectedSize] * this.selectedQuantity
    };
  }
}

export default ProductDetail;
