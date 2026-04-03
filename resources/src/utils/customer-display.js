/**
 * Customer Display Bridge Integration
 * Handles communication with the local customer display service
 */

class CustomerDisplayBridge {
  constructor() {
    this.apiBase = 'https://client.ecofieldgroup.com/delight/pos-display-bridge';
    this.enabled = true;
    this.lastTotal = 0;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 3;
    this.reconnectDelay = 2000;
    
    this.checkServiceAvailability();
  }

  async checkServiceAvailability() {
    try {
      const response = await fetch(`${this.apiBase}/`);
      const data = await response.json();
      this.enabled = data.success === true;
      console.log('PHP display bridge available:', data);
      return true;
    } catch (error) {
      console.log('PHP display bridge not available:', error.message);
      this.enabled = false;
      return false;
    }
  }

  async sendRequest(data) {
    if (!this.enabled) {
      console.log('Customer display disabled - service not available');
      return { success: false, message: 'Service not available' };
    }

    try {
      const response = await fetch(this.apiBase, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      this.connectionAttempts = 0; // Reset on successful connection
      return result;
    } catch (error) {
      console.error('Customer display error:', error);
      this.connectionAttempts++;
      
      // Disable service after multiple failed attempts
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        this.enabled = false;
        console.log('Customer display service disabled after connection failures');
        
        // Try to re-enable after delay
        setTimeout(() => {
          this.connectionAttempts = 0;
          this.checkServiceAvailability();
        }, this.reconnectDelay * 5);
      }
      
      return { success: false, error: error.message };
    }
  }

  async sendTotal(total) {
    if (typeof total !== 'number' || total < 0) {
      console.warn('Invalid total amount:', total);
      return { success: false, error: 'Invalid total amount' };
    }

    // Only send if total changed significantly (avoid spam)
    if (Math.abs(total - this.lastTotal) < 0.01) {
      return { success: true, message: 'Total unchanged' };
    }

    this.lastTotal = total;
    return await this.sendRequest({ 
      total: Math.round(total * 100),
      action: 'total' 
    });
  }

  async showItem(name, price) {
    if (!name || typeof price !== 'number' || price < 0) {
      console.warn('Invalid item data:', { name, price });
      return { success: false, error: 'Invalid item data' };
    }

    return await this.sendRequest({ 
      itemName: name,
      price: Math.round(price * 100),
      action: 'item' 
    });
  }

  async clearDisplay() {
    return await this.sendRequest({ action: 'clear' });
  }

  async setDisplayType(type) {
    return await this.sendRequest({ displayType: type });
  }

  async connectToPort(portPath, displayType) {
    return await this.sendRequest({ portPath, displayType });
  }

  /*
  async getAvailablePorts() {
    try {
      const response = await fetch(`${this.apiBase}/ports`);
      return await response.json();
    } catch (error) {
      console.error('Error getting ports:', error);
      return { ports: [], error: error.message };
    }
  }
  */

  // Enable/disable the service
  enable() {
    this.enabled = true;
    this.connectionAttempts = 0;
    this.checkServiceAvailability();
  }

  disable() {
    this.enabled = false;
    this.clearDisplay(); // Clear display when disabled
  }

  isEnabled() {
    return this.enabled;
  }

  // Format amount for display (currency)
  formatAmount(amount, currency = '') {
    return `${currency}${amount.toFixed(2)}`;
  }
}

// Create singleton instance
const customerDisplay = new CustomerDisplayBridge();

// Vue mixin for easy integration
const CustomerDisplayMixin = {
  data() {
    return {
      customerDisplay: customerDisplay
    };
  },
  
  watch: {
    // Watch for GrandTotal changes in POS
    GrandTotal: {
      handler(newTotal, oldTotal) {
        if (this.$options.name === 'pos' && newTotal !== oldTotal) {
          this.updateCustomerDisplay(newTotal);
        }
      },
      immediate: false
    }
  },

  methods: {
    async updateCustomerDisplay(total) {
      if (this.customerDisplay.isEnabled()) {
        await this.customerDisplay.sendTotal(total);
      }
    },

    async showItemOnDisplay(itemName, price) {
      if (this.customerDisplay.isEnabled()) {
        await this.customerDisplay.showItem(itemName, price);
      }
    },

    async clearCustomerDisplay() {
      if (this.customerDisplay.isEnabled()) {
        await this.customerDisplay.clearDisplay();
      }
    },

    async toggleCustomerDisplay() {
      if (this.customerDisplay.isEnabled()) {
        this.customerDisplay.disable();
        this.$bvToast.toast('Customer display disabled', {
          title: 'Display Status',
          variant: 'warning',
          solid: true
        });
      } else {
        this.customerDisplay.enable();
        this.$bvToast.toast('Customer display enabled', {
          title: 'Display Status',
          variant: 'success',
          solid: true
        });
      }
    }
  },

  mounted() {
    // Check display service availability when component mounts
    this.customerDisplay.checkServiceAvailability();
  }
};

export { CustomerDisplayBridge, CustomerDisplayMixin };
export default customerDisplay;
