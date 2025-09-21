// Airtable Configuration
export const AIRTABLE_CONFIG = {
  API_KEY: '', // No longer used on client – proxied via Netlify function
  BASE_ID: '', // Stored as env in Netlify
  PRODUCTS_TABLE: 'products', // Table name (server-side)
  ENTRIES: 100 // Records per page
};

// Stripe Configuration
export const STRIPE_CONFIG = {
  PUBLISHABLE_KEY: 'pk_live_your_stripe_publishable_key_here',
  // Your Stripe live key will need to be added here
};

// EmailJS Configuration
export const EMAIL_CONFIG = {
  SERVICE_ID: 'service_your_service_id',
  TEMPLATE_ID: 'template_order_confirmation',
  PUBLIC_KEY: 'your_public_key_here',
  ADMIN_EMAIL: 'ryan@ryanosmunphoto.com'
};

// API Endpoints
export const API_ENDPOINTS = {
  PRODUCTS: '/.netlify/functions/products',
  BASE_URL: '/.netlify/functions/products'
};

// Product Constants
export const PRODUCT_CONSTANTS = {
  FINISH_TYPES: ['acrylic', 'metal', 'canvas'],
  SIZES: {
    '20x40': { width: 40, height: 20 },
    '24x36': { width: 36, height: 24 },
    '20x30': { width: 30, height: 20 },
    '16x24': { width: 24, height: 16 }
  },
  BASE_PRICES: {
    acrylic: {
      '20x40': 180,
      '24x36': 130,
      '20x30': 100,
      '16x24': 60
    },
    metal: {
      '20x40': 220,
      '24x36': 150,
      '20x30': 120,
      '16x24': 70
    },
    canvas: {
      '20x40': 180,
      '24x36': 130,
      '20x30': 100,
      '16x24': 60
    }
  }
};
