const twilioService = require('./twilio');

class SMSService {
  constructor() {
    this.providers = [
      {
        name: 'twilio',
        service: twilioService,
        priority: 1
      }
      // Add other providers here later
    ];
  }

  async sendSMS(to, message) {
    // Try Twilio first
    let result = await twilioService.sendSMS(to, message);
    
    if (result.success) {
      console.log('✅ SMS sent via Twilio');
      return result;
    }

    // If Twilio fails with account suspension, use fallback
    if (result.code === 30044 || result.error?.includes('suspended')) {
      console.log('⚠️ Twilio account suspended, using fallback...');
      return await this.fallbackSMS(to, message);
    }

    return result;
  }

  async fallbackSMS(to, message) {
    console.log('📱 Using fallback SMS method');
    
    // For now, just log the message since we don't have alternative providers set up
    console.log('💬 [FALLBACK SMS] To:', to);
    console.log('📝 Message:', message);
    console.log('---');
    
    // Simulate successful sending
    return {
      success: true,
      sid: 'fallback_' + Date.now(),
      status: 'simulated',
      simulated: true,
      note: 'Twilio account suspended - message logged instead'
    };
  }

  async sendEmergencyAlert(contact, user, alert) {
    const message = this.formatEmergencyMessage(user, alert);
    const result = await this.sendSMS(contact.phone, message);
    
    return {
      ...result,
      contactName: contact.name,
      contactPhone: contact.phone
    };
  }

  formatEmergencyMessage(user, alert) {
    // Simplified message without emojis for better delivery
    const alertTypes = {
      'sos': 'SOS EMERGENCY',
      'checkin_missed': 'Missed Check-in',
      'route_deviation': 'Route Deviation',
      'battery_low': 'Low Battery',
      'safe_zone_breach': 'Safe Zone Breach',
      'duress_pin': 'Silent Emergency',
      'shake_trigger': 'Shake Trigger',
      'voice_trigger': 'Voice Trigger'
    };

    const alertType = alertTypes[alert.type] || 'Emergency Alert';
    const locationInfo = alert.location?.address || 
      `Location: ${alert.location?.latitude?.toFixed(4)}, ${alert.location?.longitude?.toFixed(4)}`;

    return `ALONE ALERT - ${alertType}

User: ${user.name}
Type: ${alertType}
Time: ${new Date().toLocaleString()}
${locationInfo}
Battery: ${alert.batteryLevel || 'Unknown'}%

View location: https://maps.google.com/?q=${alert.location?.latitude},${alert.location?.longitude}

Please check on them immediately.

- Alone Alert Safety System`;
  }
}

module.exports = new SMSService();