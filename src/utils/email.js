import { EMAIL_CONFIG } from './config.js';

class EmailService {
  constructor() {
    this.serviceId = EMAIL_CONFIG.SERVICE_ID;
    this.templateId = EMAIL_CONFIG.TEMPLATE_ID;
    this.publicKey = EMAIL_CONFIG.PUBLIC_KEY;
    this.adminEmail = EMAIL_CONFIG.ADMIN_EMAIL;
    this.loaded = false;
    this.loadEmailJSSDK();
  }

  async loadEmailJSSDK() {
    return new Promise((resolve) => {
      if (window.emailjs) {
        this.initEmailJS();
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/emailjs.min.js';
      script.async = true;
      script.onload = () => {
        this.initEmailJS();
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  initEmailJS() {
    if (window.emailjs && this.publicKey !== 'your_public_key_here') {
      window.emailjs.init(this.publicKey);
      this.loaded = true;
    }
  }

  async sendOrderConfirmation(orderData) {
    if (!this.isReady()) {
      console.warn('EmailJS not ready, skipping order confirmation email');
      return false;
    }

    try {
      const templateParams = {
        customer_name: orderData.name,
        customer_email: orderData.email,
        order_id: orderData.paypal_order_id || 'TBD',
        order_total: orderData.order_total,
        shipping_address: this.formatAddress(orderData),
        order_items: this.formatOrderItems(orderData.cartItems),
        shipping_cost: orderData.shipping_cost,
        admin_email: this.adminEmail,
        to_email: orderData.email
      };

      const result = await window.emailjs.send(
        this.serviceId,
        this.templateId,
        templateParams
      );

      console.log('Order confirmation email sent:', result);
      return true;
    } catch (error) {
      console.error('Error sending order confirmation email:', error);
      return false;
    }
  }

  async sendAdminNotification(orderData) {
    if (!this.isReady()) {
      console.warn('EmailJS not ready, skipping admin notification');
      return false;
    }

    try {
      const adminTemplate = {
        customer_name: orderData.name,
        customer_email: orderData.email,
        order_id: orderData.paypal_order_id || 'Pending',
        order_total: orderData.order_total,
        shipping_address: this.formatAddress(orderData),
        order_items: this.formatOrderItems(orderData.cartItems),
        shipping_cost: orderData.shipping_cost,
        to_email: this.adminEmail,
        customer_email: orderData.email
      };

      const result = await window.emailjs.send(
        this.serviceId,
        'admin_notification_template', // You'll need to create this template in EmailJS
        adminTemplate
      );

      console.log('Admin notification email sent:', result);
      return true;
    } catch (error) {
      console.error('Error sending admin notification email:', error);
      return false;
    }
  }

  async sendOrderProcessedNotification(orderData) {
    // Send email to customer when order is processed
    if (!this.isReady()) { return false; }

    try {
      const templateParams = {
        customer_name: orderData.name,
        customer_email: orderData.email,
        order_id: orderData.paypal_order_id,
        order_status: 'Processed',
        estimated_delivery: this.calculateEstimatedDelivery(),
        to_email: orderData.email
      };

      await window.emailjs.send(
        this.serviceId,
        'order_processed_template', // Create this template in EmailJS
        templateParams
      );

      return true;
    } catch (error) {
      console.error('Error sending order processed notification:', error);
      return false;
    }
  }

  async sendContactEmail(contactData) {
    if (!this.isReady()) { return false; }

    try {
      const templateParams = {
        from_name: contactData.name,
        from_email: contactData.email,
        message: contactData.message,
        phone: contactData.phone || '',
        subject: contactData.subject || 'Contact Form Inquiry',
        to_email: this.adminEmail
      };

      const result = await window.emailjs.send(
        this.serviceId,
        'contact_form_template', // Create this template in EmailJS
        templateParams
      );

      return true;
    } catch (error) {
      console.error('Error sending contact email:', error);
      return false;
    }
  }

  formatAddress(orderData) {
    return `${orderData.address_line_1}${orderData.address_line_2 ? ', ' + orderData.address_line_2 : ''}
${orderData.city}, ${orderData.state} ${orderData.postal_code}
${orderData.country_code}`;
  }

  formatOrderItems(cartItems) {
    if (!cartItems || !Array.isArray(cartItems)) return '';

    return cartItems.map(item =>
      `${item.quantity}x ${item.product_name} - $${item.price} each = $${item.total}`
    ).join('\n');
  }

  calculateEstimatedDelivery() {
    // Add business days to today's date
    const now = new Date();
    let deliveryDate = new Date(now);
    let businessDays = 10; // Adjust based on your processing time

    while (businessDays > 0) {
      deliveryDate.setDate(deliveryDate.getDate() + 1);
      // Skip weekends
      if (deliveryDate.getDay() !== 0 && deliveryDate.getDay() !== 6) {
        businessDays--;
      }
    }

    return deliveryDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  isReady() {
    return this.loaded &&
           window.emailjs &&
           this.serviceId !== 'service_your_service_id' &&
           this.templateId !== 'template_order_confirmation' &&
           this.publicKey !== 'your_public_key_here';
  }

  // Test email functionality
  async testEmail(toEmail) {
    if (!this.isReady()) {
      throw new Error('EmailJS not properly configured');
    }

    try {
      const testParams = {
        to_name: 'Test User',
        to_email: toEmail || this.adminEmail,
        subject: 'Test Email',
        message: 'This is a test email from Wild West Wall Art website.',
        from_email: this.adminEmail
      };

      const result = await window.emailjs.send(
        this.serviceId,
        'test_template',
        testParams
      );

      return { success: true, result };
    } catch (error) {
      return { success: false, error };
    }
  }
}

// Create singleton instance
const emailService = new EmailService();

// Export singleton
export default emailService;

// Also export class for testing
export { EmailService };
