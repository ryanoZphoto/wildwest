import airtableService from './airtable.v5.js';

class CartService {
  constructor() {
    this.cart = this.loadCart();
    this.listeners = [];
  }

  // Load cart from localStorage
  loadCart() {
    try {
      const saved = localStorage.getItem('wildWestCart');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error loading cart:', error);
      return [];
    }
  }

  // Save cart to localStorage
  saveCart() {
    try {
      localStorage.setItem('wildWestCart', JSON.stringify(this.cart));
      this.notifyListeners();
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  }

  // Add item to cart
  async addItem(productId, configuration) {
    try {
      // Ensure product data is up to date
      const product = await airtableService.getProductById(productId);
      if (!product) throw new Error('Product not found');

      const cartItem = {
        productId,
        productData: product,
        finish: configuration.finish,
        size: configuration.size,
        quantity: configuration.quantity,
        price: configuration.price,
        addedAt: new Date().toISOString(),
        id: this.generateItemId(productId, configuration)
      };

      // Check if item already exists in cart
      const existingIndex = this.cart.findIndex(item =>
        item.id === cartItem.id
      );

      if (existingIndex >= 0) {
        // Update quantity
        this.cart[existingIndex].quantity += configuration.quantity;
      } else {
        // Add new item
        this.cart.push(cartItem);
      }

      this.saveCart();
      return { success: true, cartItem };
    } catch (error) {
      console.error('Error adding item to cart:', error);
      return { success: false, error: error.message };
    }
  }

  // Remove item from cart
  removeItem(itemId) {
    const index = this.cart.findIndex(item => item.id === itemId);
    if (index >= 0) {
      this.cart.splice(index, 1);
      this.saveCart();
      return true;
    }
    return false;
  }

  // Update item quantity
  updateItemQuantity(itemId, newQuantity) {
    if (newQuantity <= 0) {
      return this.removeItem(itemId);
    }

    const item = this.cart.find(item => item.id === itemId);
    if (item) {
      item.quantity = newQuantity;
      this.saveCart();
      return true;
    }
    return false;
  }

  // Clear entire cart
  clearCart() {
    this.cart = [];
    localStorage.removeItem('wildWestCart');
    this.notifyListeners();
  }

  // Get current cart items
  getItems() {
    return this.cart;
  }

  // Get cart summary
  getSummary() {
    let subtotal = 0;
    let itemCount = 0;

    this.cart.forEach(item => {
      const itemTotal = item.price * item.quantity;
      subtotal += itemTotal;
      itemCount += item.quantity;
    });

    const shipping = subtotal >= 100 ? 0 : 10;
    const total = subtotal + shipping;

    return {
      itemCount,
      subtotal: subtotal.toFixed(2),
      shipping: shipping.toFixed(2),
      total: total.toFixed(2),
      freeShipping: subtotal >= 100
    };
  }

  // Generate unique item ID
  generateItemId(productId, config) {
    return `${productId}_${config.finish}_${config.size}`;
  }

  // Add change listener
  addListener(listener) {
    this.listeners.push(listener);
  }

  // Notify listeners of cart changes
  notifyListeners() {
    this.listeners.forEach(listener => listener(this.cart));
  }

  // Get cart item count
  getCartCount() {
    return this.cart.reduce((total, item) => total + item.quantity, 0);
  }

  // Check if item is in cart
  isInCart(itemId) {
    return this.cart.some(item => item.id === itemId);
  }

  // Convert cart for checkout
  prepareForCheckout() {
    return this.cart.map(item => ({
      product_name: `${item.productData.title} - ${item.finish} ${item.size}"`,
      product_id: item.productId,
      finish: item.finish,
      size: item.size,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity
    }));
  }

  // Validate cart items (ensure products still exist)
  async validateCart() {
    const validItems = [];
    const invalidItems = [];

    for (const item of this.cart) {
      try {
        const product = await airtableService.getProductById(item.productId);
        if (product && product.inStock) {
          validItems.push(item);
        } else {
          invalidItems.push(item);
        }
      } catch (error) {
        invalidItems.push(item);
      }
    }

    if (invalidItems.length > 0) {
      this.cart = validItems;
      this.saveCart();
    }

    return { validItems, invalidItems };
  }
}

// Create singleton instance
const cartService = new CartService();

// Export singleton
export default cartService;

// Also export CartService class for testing
export { CartService };
