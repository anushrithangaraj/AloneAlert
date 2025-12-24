const twilio = require('twilio');

class TwilioService {
  constructor() {
    this.initializeTwilio();
  }

  initializeTwilio() {
    // Check if we should use simulation mode
    if (process.env.SMS_SIMULATION_MODE === 'true') {
      console.log('🔧 Twilio: Using SIMULATION mode (no real SMS)');
      this.client = null;
      this.isConfigured = false;
      this.mode = 'SIMULATION';
      return;
    }

    // Check for required environment variables
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.warn('⚠️  Twilio credentials missing. Using simulation mode.');
      this.client = null;
      this.isConfigured = false;
      this.mode = 'SIMULATION';
      return;
    }

    try {
      // Validate Account SID format
      const accountSid = process.env.TWILIO_ACCOUNT_SID.trim();
      if (!accountSid.startsWith('AC')) {
        throw new Error(`Invalid Twilio Account SID format. Should start with "AC", got: ${accountSid.substring(0, 2)}`);
      }

      // Validate Auth Token
      const authToken = process.env.TWILIO_AUTH_TOKEN.trim();
      if (authToken.length < 10) {
        throw new Error('Twilio Auth Token appears to be invalid');
      }

      console.log('🔧 Initializing Twilio with REAL credentials...');
      
      // Initialize Twilio client with REAL credentials
      this.client = twilio(accountSid, authToken);
      this.isConfigured = true;
      this.mode = 'REAL SMS';
      
      console.log('✅ Twilio: REAL SMS service initialized successfully');
      console.log('📱 Phone Number:', process.env.TWILIO_PHONE_NUMBER);
      
      // Test the configuration
      this.testConfiguration();
      
    } catch (error) {
      console.error('❌ Twilio initialization failed:', error.message);
      console.log('🔧 Falling back to simulation mode');
      this.client = null;
      this.isConfigured = false;
      this.mode = 'SIMULATION';
    }
  }

  // Add this method to validate message length
  validateMessageLength(message) {
    const maxLength = 300; // Conservative limit for trial accounts
    
    if (message.length > maxLength) {
      console.warn(`⚠️ Message too long: ${message.length} chars, truncating...`);
      
      // Keep the essential parts: alert type, location, map link
      const lines = message.split('\n');
      const essentialLines = lines.filter(line => 
        line.includes('ALERT') || 
        line.includes('Location') || 
        line.includes('Map:') ||
        line.includes('User:') ||
        line.includes('Time:')
      );
      
      let shortened = essentialLines.join('\n');
      
      // If still too long, remove less critical parts
      if (shortened.length > maxLength) {
        shortened = shortened
          .replace(/Time:.*\n/, '')
          .replace(/Battery:.*\n/, '');
      }
      
      return shortened.substring(0, maxLength);
    }
    
    return message;
  }

  async sendSMS(to, message) {
    if (!this.isConfigured) {
      console.log('📱 [SIMULATED SMS] To:', to);
      console.log('💬 Message preview:', message.substring(0, 100) + '...');
      console.log('🔧 Mode: SIMULATION (No real SMS sent)');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        success: true,
        sid: 'simulated_' + Date.now(),
        status: 'delivered',
        simulated: true,
        mode: 'SIMULATION'
      };
    }

    try {
      // Validate and shorten message if needed
      const finalMessage = this.validateMessageLength(message);
      
      if (finalMessage !== message) {
        console.log('📝 Message shortened for trial account limits');
      }

      const result = await this.client.messages.create({
        body: finalMessage,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to
      });
      
      console.log(`✅ SMS sent to: ${to}, Length: ${finalMessage.length} chars`);
      return { success: true, sid: result.sid, status: result.status };
    } catch (error) {
      console.error('❌ Twilio error:', error.message);
      return { success: false, error: error.message, code: error.code };
    }
  }

  async sendEmergencyAlert(contact, user, alert) {
    const message = this.formatEmergencyMessage(user, alert);
    
    console.log(`🚨 Sending EMERGENCY ALERT to: ${contact.name} (${contact.phone})`);
    console.log(`📱 Mode: ${this.mode}`);
    
    const result = await this.sendSMS(contact.phone, message);
    
    return {
      ...result,
      contactName: contact.name,
      contactPhone: contact.phone,
      alertType: alert.type,
      mode: this.mode,
      timestamp: new Date()
    };
  }

  async sendEmergencyAlertsToAllContacts(contacts, user, alert) {
    console.log(`🚨 Sending emergency alerts to ${contacts.length} contacts`);
    console.log(`📱 SMS Mode: ${this.mode}`);
    
    const results = [];
    
    for (const contact of contacts) {
      if (contact.phone && contact.notificationsEnabled !== false) {
        try {
          const result = await this.sendEmergencyAlert(contact, user, alert);
          results.push(result);
          
          // Add small delay to avoid rate limiting (only for real SMS)
          if (this.mode === 'REAL SMS') {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
        } catch (error) {
          console.error(`Failed to send to ${contact.name}:`, error);
          results.push({
            success: false,
            error: error.message,
            contactName: contact.name,
            contactPhone: contact.phone,
            mode: this.mode
          });
        }
      }
    }
    
    return results;
  }

  formatEmergencyMessage(user, alert) {
    const alertTypes = {
      'sos': 'SOS EMERGENCY',
      'checkin_missed': 'MISSED CHECK-IN',
      'route_deviation': 'ROUTE DEVIATION',
      'battery_low': 'LOW BATTERY',
      'safe_zone_breach': 'SAFE ZONE BREACH', 
      'duress_pin': 'SILENT EMERGENCY',
      'shake_trigger': 'SHAKE TRIGGER',
      'voice_trigger': 'VOICE TRIGGER'
    };

    const alertType = alertTypes[alert.type] || 'EMERGENCY ALERT';
    const locationInfo = alert.location?.address || 
      `${alert.location?.latitude?.toFixed(4)}, ${alert.location?.longitude?.toFixed(4)}`;

    // Handle battery level properly
    let batteryDisplay = 'Unknown';
    if (alert.batteryLevel !== undefined && alert.batteryLevel !== null) {
      batteryDisplay = `${alert.batteryLevel}%`;
    }

    // SHORTER MESSAGE FOR TRIAL ACCOUNTS
    let message;
    
    if (alert.type === 'checkin_missed') {
      message = `ALONE ALERT - MISSED CHECK-IN

User: ${user.name}
Time: ${new Date().toLocaleTimeString()}
Location: ${locationInfo}
Battery: ${batteryDisplay}

Map: https://maps.google.com/?q=${alert.location?.latitude},${alert.location?.longitude}

Check on them immediately.`;
    } else if (alert.type === 'sos') {
      message = `ALONE ALERT - SOS EMERGENCY

User: ${user.name} needs help!
Time: ${new Date().toLocaleTimeString()}
Location: ${locationInfo}
Battery: ${batteryDisplay}

Map: https://maps.google.com/?q=${alert.location?.latitude},${alert.location?.longitude}

URGENT: Check immediately!`;
    } else {
      message = `ALONE ALERT - ${alertType}

User: ${user.name}
Time: ${new Date().toLocaleTimeString()}
Location: ${locationInfo}
Battery: ${batteryDisplay}

Map: https://maps.google.com/?q=${alert.location?.latitude},${alert.location?.longitude}

Please check on them.`;
    }

    console.log(`📝 Message length: ${message.length} characters, Battery: ${batteryDisplay}`);
    return message;
  }

  isValidPhoneNumber(phone) {
    if (!phone) return false;
    
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Basic international phone validation
    // E.164 format: +[country code][number]
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    
    return phoneRegex.test(cleaned);
  }

  async testConfiguration() {
    if (this.mode === 'SIMULATION') {
      return {
        success: true,
        message: 'Twilio in simulation mode - no real SMS will be sent',
        mode: 'SIMULATION',
        simulated: true
      };
    }

    if (!this.isConfigured) {
      return {
        success: false,
        message: 'Twilio not configured',
        mode: 'NOT CONFIGURED',
        simulated: true
      };
    }

    try {
      // Test by fetching account details
      const account = await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      
      console.log('✅ Twilio configuration test PASSED');
      console.log('📊 Account:', account.friendlyName);
      console.log('📊 Status:', account.status);
      console.log('📊 Type:', account.type);
      
      return {
        success: true,
        message: 'Twilio configured successfully',
        account: {
          friendlyName: account.friendlyName,
          status: account.status,
          type: account.type
        },
        mode: 'REAL SMS',
        simulated: false
      };
    } catch (error) {
      console.error('❌ Twilio configuration test FAILED:', error.message);
      return {
        success: false,
        message: 'Twilio configuration test failed',
        error: error.message,
        mode: 'FAILED',
        simulated: true
      };
    }
  }

  // Method to get configuration status
  getStatus() {
    return {
      isConfigured: this.isConfigured,
      mode: this.mode,
      accountSid: this.isConfigured ? process.env.TWILIO_ACCOUNT_SID?.substring(0, 8) + '...' : 'Not set',
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || 'Not set'
    };
  }
}

// Create singleton instance
const twilioService = new TwilioService();

module.exports = twilioService;