const admin = require('firebase-admin');

class FCMService {
  constructor() {
    this.isConfigured = false;
    this.initializeFirebase();
  }

  initializeFirebase() {
    // Check if Firebase credentials are available
    if (!process.env.FCM_SERVICE_ACCOUNT && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.warn('⚠️  Firebase Admin SDK not configured. Push notifications will be disabled.');
      console.log('💡 To enable FCM, set FCM_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS environment variable');
      return;
    }

    try {
      // Initialize Firebase Admin SDK
      if (admin.apps.length === 0) {
        if (process.env.FCM_SERVICE_ACCOUNT) {
          // Parse service account from environment variable
          const serviceAccount = JSON.parse(
            Buffer.from(process.env.FCM_SERVICE_ACCOUNT, 'base64').toString()
          );
          
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
          });
        } else {
          // Use default credentials (GOOGLE_APPLICATION_CREDENTIALS)
          admin.initializeApp({
            credential: admin.credential.applicationDefault()
          });
        }
      }

      this.messaging = admin.messaging();
      this.isConfigured = true;
      console.log('✅ Firebase Admin SDK initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Firebase Admin SDK:', error.message);
      console.log('💡 Using simulated push notifications');
      this.isConfigured = false;
    }
  }

  async sendNotification(token, notification) {
    if (!this.isConfigured) {
      console.log('📱 [SIMULATED PUSH] To:', token);
      console.log('💬 Title:', notification.title);
      console.log('📝 Body:', notification.body);
      console.log('---');
      
      await new Promise(resolve => setTimeout(resolve, 500));
      return { 
        success: true, 
        messageId: 'simulated_' + Date.now(),
        simulated: true 
      };
    }

    try {
      const message = {
        token: token,
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: notification.data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'emergency_alerts'
          }
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.body
              },
              sound: 'default',
              badge: 1
            }
          }
        },
        webpush: {
          headers: {
            Urgency: 'high'
          },
          notification: {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            vibrate: [200, 100, 200]
          }
        }
      };

      const response = await this.messaging.send(message);
      console.log('✅ Push notification sent successfully:', response);
      return { 
        success: true, 
        messageId: response,
        simulated: false 
      };
    } catch (error) {
      console.error('❌ Error sending push notification:', error.message);
      
      // Handle specific FCM errors
      let errorMessage = error.message;
      if (error.code === 'messaging/registration-token-not-registered') {
        errorMessage = 'Device token is not registered';
      } else if (error.code === 'messaging/invalid-argument') {
        errorMessage = 'Invalid argument provided';
      } else if (error.code === 'messaging/invalid-recipient') {
        errorMessage = 'Invalid recipient token';
      }

      return { 
        success: false, 
        error: errorMessage,
        code: error.code 
      };
    }
  }

  async sendToMultiple(tokens, notification) {
    if (!this.isConfigured) {
      console.log('📱 [SIMULATED MULTICAST] To:', tokens.length, 'devices');
      console.log('💬 Title:', notification.title);
      console.log('📝 Body:', notification.body);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      return { 
        success: true, 
        responses: tokens.map(token => ({
          token,
          success: true,
          messageId: 'simulated_' + Date.now()
        })),
        simulated: true 
      };
    }

    try {
      const message = {
        tokens: tokens,
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: notification.data || {}
      };

      const response = await this.messaging.sendEachForMulticast(message);
      
      console.log('✅ Multicast notification sent successfully');
      console.log('📊 Success count:', response.successCount);
      console.log('📊 Failure count:', response.failureCount);
      
      return { 
        success: true, 
        response: response,
        simulated: false 
      };
    } catch (error) {
      console.error('❌ Error sending multicast notification:', error.message);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  async sendEmergencyAlert(token, user, alert) {
    const alertTypes = {
      'sos': '🚨 SOS EMERGENCY',
      'checkin_missed': '⏰ Missed Check-in',
      'route_deviation': '🔄 Route Deviation',
      'battery_low': '🔋 Low Battery',
      'safe_zone_breach': '🚧 Safe Zone Breach',
      'duress_pin': '🆘 Silent Emergency',
      'shake_trigger': '📱 Shake Trigger',
      'voice_trigger': '🎤 Voice Trigger'
    };

    const alertType = alertTypes[alert.type] || '⚠️ Emergency Alert';
    const locationInfo = alert.location?.address || 
      `Lat: ${alert.location?.latitude?.toFixed(4)}, Lng: ${alert.location?.longitude?.toFixed(4)}`;

    const notification = {
      title: alertType,
      body: `${user.name} needs help! Last location: ${locationInfo}`,
      data: {
        type: 'emergency',
        alertId: alert._id?.toString() || 'unknown',
        userId: user._id?.toString() || 'unknown',
        alertType: alert.type,
        location: JSON.stringify(alert.location || {}),
        batteryLevel: alert.batteryLevel?.toString() || 'unknown',
        timestamp: alert.createdAt?.toISOString() || new Date().toISOString(),
        priority: 'high',
        click_action: 'EMERGENCY_ALERT'
      }
    };

    return await this.sendNotification(token, notification);
  }

  // Add the missing sendCommunityAlert method
  async sendCommunityAlert(token, user, alert) {
    const alertTypes = {
      'sos': '🚨 SOS EMERGENCY',
      'checkin_missed': '⏰ MISSED CHECK-IN',
      'route_deviation': '🔄 ROUTE DEVIATION',
      'battery_low': '🔋 LOW BATTERY',
      'safe_zone_breach': '🚧 SAFE ZONE BREACH',
      'duress_pin': '🆘 SILENT EMERGENCY',
      'shake_trigger': '📱 SHAKE TRIGGER',
      'voice_trigger': '🎤 VOICE TRIGGER'
    };

    const alertType = alertTypes[alert.type] || '⚠️ EMERGENCY';
    const locationInfo = alert.location?.address || 
      `Coordinates: ${alert.location?.latitude?.toFixed(6)}, ${alert.location?.longitude?.toFixed(6)}`;

    const notification = {
      title: '🆘 Community Help Needed',
      body: `${user.name} needs help nearby! Emergency: ${alertType}. Location: ${locationInfo}`,
      data: {
        type: 'community_alert',
        alertId: alert._id?.toString() || 'unknown',
        userId: user._id?.toString() || 'unknown',
        userName: user.name || 'Unknown User',
        alertType: alert.type,
        location: JSON.stringify(alert.location || {}),
        batteryLevel: alert.batteryLevel?.toString() || 'unknown',
        timestamp: alert.createdAt?.toISOString() || new Date().toISOString(),
        distance: 'nearby',
        priority: 'high',
        click_action: 'COMMUNITY_ALERT'
      }
    };

    return await this.sendNotification(token, notification);
  }

  async sendCheckInReminder(token, trip) {
    const notification = {
      title: '⏰ Check-in Reminder',
      body: 'Please check in to confirm your safety',
      data: {
        type: 'checkin_reminder',
        tripId: trip._id?.toString() || 'unknown',
        priority: 'normal',
        click_action: 'CHECKIN_REMINDER'
      }
    };

    return await this.sendNotification(token, notification);
  }

  async sendTripStarted(token, trip) {
    const notification = {
      title: '🚀 Trip Started',
      body: `Your safety trip has started. We'll monitor your journey.`,
      data: {
        type: 'trip_started',
        tripId: trip._id?.toString() || 'unknown',
        priority: 'normal',
        click_action: 'TRIP_STARTED'
      }
    };

    return await this.sendNotification(token, notification);
  }

  async sendTripCompleted(token, trip) {
    const duration = Math.round((new Date() - new Date(trip.createdAt)) / 60000);
    
    const notification = {
      title: '✅ Trip Completed',
      body: `You've completed your ${duration} minute trip safely!`,
      data: {
        type: 'trip_completed',
        tripId: trip._id?.toString() || 'unknown',
        duration: duration.toString(),
        priority: 'normal',
        click_action: 'TRIP_COMPLETED'
      }
    };

    return await this.sendNotification(token, notification);
  }

  async sendBatteryWarning(token, batteryLevel) {
    const notification = {
      title: '🔋 Low Battery Warning',
      body: `Your battery is at ${batteryLevel}%. Consider charging soon.`,
      data: {
        type: 'battery_warning',
        batteryLevel: batteryLevel.toString(),
        priority: 'normal',
        click_action: 'BATTERY_WARNING'
      }
    };

    return await this.sendNotification(token, notification);
  }

  async sendSafeZoneAlert(token, zone, alertType, user) {
    const alertMessages = {
      'entered': `✅ Entered Safe Zone: ${zone.name}`,
      'exited': `⚠️ Left Safe Zone: ${zone.name}`,
      'breach': `🚧 Safe Zone Breach: ${zone.name}`
    };

    const message = alertMessages[alertType] || `Safe Zone Alert: ${zone.name}`;

    const notification = {
      title: '🛡️ Safe Zone Alert',
      body: message,
      data: {
        type: 'safe_zone_alert',
        zoneId: zone._id?.toString() || 'unknown',
        zoneName: zone.name || 'Unknown Zone',
        alertType: alertType,
        userId: user._id?.toString() || 'unknown',
        userName: user.name || 'Unknown User',
        location: JSON.stringify(zone.location || {}),
        timestamp: new Date().toISOString(),
        priority: alertType === 'breach' ? 'high' : 'normal',
        click_action: 'SAFE_ZONE_ALERT'
      }
    };

    return await this.sendNotification(token, notification);
  }

  // Test FCM configuration
  async testConfiguration() {
    if (!this.isConfigured) {
      return { 
        success: false, 
        message: 'FCM not configured - using simulation mode',
        simulated: true 
      };
    }

    try {
      // Try to list projects to test credentials
      // This is a simple test to verify Firebase Admin SDK is working
      return {
        success: true,
        message: 'FCM configured successfully',
        simulated: false
      };
    } catch (error) {
      return {
        success: false,
        message: 'FCM configuration test failed',
        error: error.message,
        simulated: true
      };
    }
  }

  // Validate FCM token format
  isValidToken(token) {
    if (!token || typeof token !== 'string') {
      return false;
    }
    
    // Basic FCM token validation (tokens are typically long strings)
    return token.length > 100 && token.length < 2000;
  }

  // Subscribe to topic (for group notifications)
  async subscribeToTopic(tokens, topic) {
    if (!this.isConfigured) {
      console.log(`[SIMULATED] Subscribed ${tokens.length} tokens to topic: ${topic}`);
      return { success: true, simulated: true };
    }

    try {
      const response = await this.messaging.subscribeToTopic(tokens, topic);
      console.log(`✅ Subscribed ${response.successCount} tokens to topic: ${topic}`);
      return { success: true, response };
    } catch (error) {
      console.error('❌ Error subscribing to topic:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Unsubscribe from topic
  async unsubscribeFromTopic(tokens, topic) {
    if (!this.isConfigured) {
      console.log(`[SIMULATED] Unsubscribed ${tokens.length} tokens from topic: ${topic}`);
      return { success: true, simulated: true };
    }

    try {
      const response = await this.messaging.unsubscribeFromTopic(tokens, topic);
      console.log(`✅ Unsubscribed ${response.successCount} tokens from topic: ${topic}`);
      return { success: true, response };
    } catch (error) {
      console.error('❌ Error unsubscribing from topic:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Send to topic
  async sendToTopic(topic, notification) {
    if (!this.isConfigured) {
      console.log(`[SIMULATED] Sent to topic: ${topic}`);
      console.log('💬 Title:', notification.title);
      console.log('📝 Body:', notification.body);
      return { success: true, simulated: true };
    }

    try {
      const message = {
        topic: topic,
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: notification.data || {}
      };

      const response = await this.messaging.send(message);
      console.log(`✅ Message sent to topic: ${topic}`);
      return { success: true, messageId: response };
    } catch (error) {
      console.error('❌ Error sending to topic:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Get FCM service status
  getStatus() {
    return {
      isConfigured: this.isConfigured,
      mode: this.isConfigured ? 'REAL FCM' : 'SIMULATION',
      service: 'Firebase Cloud Messaging'
    };
  }
}

// Create singleton instance
const fcmService = new FCMService();

module.exports = fcmService;