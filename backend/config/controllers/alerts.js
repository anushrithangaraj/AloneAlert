const Alert = require('../models/Alert');
const Trip = require('../models/Trip');
const User = require('../models/User');
const twilioService = require('../services/twilio');
const fcmService = require('../services/fcm');

// Trigger SOS alert
const triggerSOS = async (req, res) => {
  try {
    const { tripId, type, location, batteryLevel } = req.body;

    const user = await User.findById(req.user.id).populate('emergencyContacts');
    let trip = null;

    if (tripId) {
      trip = await Trip.findById(tripId);
    }

    const alert = await Alert.create({
      trip: tripId,
      user: req.user.id,
      type: type || 'sos',
      severity: 'critical',
      message: 'SOS emergency triggered by user',
      location: location || user.lastKnownLocation,
      batteryLevel: batteryLevel || user.batteryLevel
    });

    // Update trip status if active
    if (trip) {
      trip.status = 'alerted';
      trip.alerts.push(alert._id);
      await trip.save();
    }

    // Notify emergency contacts
    await notifyEmergencyContacts(user, alert);

    // Notify nearby community helpers if enabled
    if (user.settings.communityHelp) {
      await notifyCommunityHelpers(user, alert);
    }

    // Emit real-time alert
    const io = req.app.get('io');
    if (io) {
      io.emit(`user-${req.user.id}-emergency`, {
        alertId: alert._id,
        type: alert.type,
        location: alert.location,
        timestamp: alert.createdAt
      });
    }

    res.status(201).json({
      success: true,
      alert,
      message: 'Emergency alert sent to your contacts'
    });
  } catch (error) {
    console.error('Error triggering SOS:', error);
    res.status(500).json({
      success: false,
      message: 'Error triggering emergency alert'
    });
  }
};

// Check for missed check-in
const checkMissedCheckin = async (req, res) => {
  try {
    const { tripId } = req.body;

    const trip = await Trip.findById(tripId).populate('user');
    if (!trip || trip.status !== 'active') {
      return res.status(404).json({
        success: false,
        message: 'Active trip not found'
      });
    }

    const now = new Date();
    if (now > trip.checkInTimer.nextCheckIn) {
      const alert = await Alert.create({
        trip: tripId,
        user: trip.user._id,
        type: 'checkin_missed',
        severity: 'high',
        message: 'User missed scheduled check-in',
        location: trip.currentLocation,
        batteryLevel: trip.currentLocation.batteryLevel
      });

      // Notify emergency contacts
      await notifyEmergencyContacts(trip.user, alert);

      res.json({
        success: true,
        alert,
        message: 'Missed check-in alert processed'
      });
    } else {
      res.json({
        success: true,
        message: 'Check-in not yet missed'
      });
    }
  } catch (error) {
    console.error('Error checking missed check-in:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking missed check-in'
    });
  }
};

// Get user alerts
const getUserAlerts = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, resolved } = req.query;

    const filter = { user: req.user.id };
    
    if (type) {
      filter.type = type;
    }
    
    if (resolved !== undefined) {
      filter.isResolved = resolved === 'true';
    }

    const alerts = await Alert.find(filter)
      .populate('trip')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Alert.countDocuments(filter);

    res.json({
      success: true,
      alerts,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching alerts'
    });
  }
};

// Resolve alert
const resolveAlert = async (req, res) => {
  try {
    const { alertId } = req.params;

    const alert = await Alert.findById(alertId);
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    // Check if user owns this alert
    if (alert.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to resolve this alert'
      });
    }

    alert.isResolved = true;
    alert.resolvedAt = new Date();
    await alert.save();

    res.json({
      success: true,
      alert,
      message: 'Alert resolved successfully'
    });
  } catch (error) {
    console.error('Error resolving alert:', error);
    res.status(500).json({
      success: false,
      message: 'Error resolving alert'
    });
  }
};

// Get alert statistics
const getAlertStats = async (req, res) => {
  try {
    const totalAlerts = await Alert.countDocuments({ user: req.user.id });
    const resolvedAlerts = await Alert.countDocuments({ 
      user: req.user.id, 
      isResolved: true 
    });
    const criticalAlerts = await Alert.countDocuments({ 
      user: req.user.id, 
      severity: 'critical' 
    });

    // Get alerts by type
    const alertsByType = await Alert.aggregate([
      { $match: { user: req.user._id } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    // Get recent alert trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentAlerts = await Alert.countDocuments({
      user: req.user.id,
      createdAt: { $gte: thirtyDaysAgo }
    });

    res.json({
      success: true,
      stats: {
        total: totalAlerts,
        resolved: resolvedAlerts,
        critical: criticalAlerts,
        recent: recentAlerts,
        byType: alertsByType
      }
    });
  } catch (error) {
    console.error('Error fetching alert stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching alert statistics'
    });
  }
};

// Add this test endpoint to verify SMS functionality
const testSMS = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('emergencyContacts');
    
    if (!user.emergencyContacts || user.emergencyContacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No emergency contacts to test with'
      });
    }

    const testAlert = {
      type: 'sos',
      location: user.lastKnownLocation || { latitude: 0, longitude: 0 },
      batteryLevel: 85,
      _id: 'test_' + Date.now()
    };

    console.log('🧪 Testing REAL SMS functionality...');
    
    const results = await twilioService.sendEmergencyAlertsToAllContacts(
      user.emergencyContacts,
      user,
      testAlert
    );

    const successful = results.filter(r => r.success).length;
    const total = results.length;

    res.json({
      success: true,
      message: `SMS test completed: ${successful}/${total} successful`,
      twilioStatus: twilioService.getStatus(),
      results: results
    });

  } catch (error) {
    console.error('SMS test error:', error);
    res.status(500).json({
      success: false,
      message: 'SMS test failed',
      error: error.message
    });
  }
};

// Notify emergency contacts
const notifyEmergencyContacts = async (user, alert) => {
  try {
    // Validate user and contacts
    if (!user) {
      console.error('❌ User is null in notifyEmergencyContacts');
      return;
    }

    if (!user.emergencyContacts || user.emergencyContacts.length === 0) {
      console.log('⚠️ No emergency contacts to notify for user:', user.name);
      return;
    }

    console.log('🚨 Starting emergency notification process...');
    console.log('👤 User:', user.name);
    console.log('📞 Contacts:', user.emergencyContacts.length);
    console.log('🚨 Alert Type:', alert.type);

    const notificationPromises = user.emergencyContacts.map(async (contact) => {
      if (!contact || !contact.phone) {
        console.log('⚠️ Skipping invalid contact');
        return;
      }

      console.log(`🚨 Sending EMERGENCY ALERT to: ${contact.name} (${contact.phone})`);
      
      // Send SMS
      if (user.settings?.smsFallback !== false) { // Default to true if not set
        console.log('📱 SMS Mode: REAL SMS');
        const smsResult = await twilioService.sendEmergencyAlert(contact, user, alert);
        
        // Add to alert notifications
        if (alert.notificationsSent) {
          alert.notificationsSent.push({
            contact: contact.phone,
            method: 'sms',
            sentAt: new Date(),
            status: smsResult.success ? 'sent' : 'failed',
            provider: smsResult.simulated ? 'simulated' : 'twilio',
            sid: smsResult.sid,
            note: smsResult.note || ''
          });
        }

        console.log(smsResult.success ? '✅ SMS sent successfully' : '❌ SMS failed');
        if (smsResult.sid) {
          console.log('📊 Message SID:', smsResult.sid);
        }
      }
    });

    await Promise.all(notificationPromises);
    
    try {
      await alert.save();
    } catch (saveError) {
      console.error('Error saving alert notifications:', saveError);
    }
    
    console.log('✅ Emergency notification process completed');
  } catch (error) {
    console.error('❌ Error in notifyEmergencyContacts:', error);
  }
};

// Helper function to notify community helpers
const notifyCommunityHelpers = async (user, alert) => {
  try {
    // Find registered helpers within 500m radius
    const helpers = await User.find({
      'settings.communityHelp': true,
      'lastKnownLocation': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [alert.location.longitude, alert.location.latitude]
          },
          $maxDistance: 500 // 500 meters
        }
      },
      _id: { $ne: user._id }
    });

    console.log(`Notifying ${helpers.length} community helpers`);

    // Send push notifications to helpers
    const notificationPromises = helpers.map(async (helper) => {
      if (helper.fcmToken) {
        return await fcmService.sendCommunityAlert(helper.fcmToken, user, alert);
      }
      return null;
    });

    await Promise.all(notificationPromises);

    alert.communityNotified = true;
    await alert.save();
  } catch (error) {
    console.error('Error notifying community:', error);
  }
};

// Delete alert
const deleteAlert = async (req, res) => {
  try {
    const { alertId } = req.params;

    const alert = await Alert.findOneAndDelete({
      _id: alertId,
      user: req.user.id
    });

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    res.json({
      success: true,
      message: 'Alert deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting alert:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting alert'
    });
  }
};

module.exports = {
  triggerSOS,
  checkMissedCheckin,
  getUserAlerts,
  resolveAlert,
  getAlertStats,
  testSMS,
  deleteAlert
};