const Trip = require('../models/Trip');
const Alert = require('../models/Alert');
const User = require('../models/User');
const twilioService = require('../services/twilio');

const activeTripTimers = new Map();

const startTrip = async (req, res) => {
  try {
    const {
      startLocation,
      endLocation,
      plannedRoute,
      safeZones,
      duration,
      reminderMinutes = 1
    } = req.body;

   
    if (!duration || duration < 1) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be at least 1 minute'
      });
    }

    if (reminderMinutes >= duration) {
      return res.status(400).json({
        success: false,
        message: 'Reminder time must be less than trip duration'
      });
    }

    const tripEndTime = new Date(Date.now() + duration * 60000);
    const reminderTime = new Date(Date.now() + (duration - reminderMinutes) * 60000);

    console.log('🚀 Creating trip:');
    console.log('⏰ Duration:', duration, 'minutes');
    console.log('🔔 Reminder:', reminderMinutes, 'minutes before end');
    console.log('🕒 Trip ends at:', tripEndTime.toLocaleString());

    const trip = await Trip.create({
      user: req.user.id,
      startLocation,
      endLocation,
      plannedRoute,
      safeZones,
      duration: { 
        planned: duration,
        actual: null
      },
      checkInTimer: {
        nextCheckIn: new Date(Date.now() + 30 * 60000),
        interval: 30,
        lastCheckIn: new Date()
      },
      tripEndTime: tripEndTime,
      reminderTime: reminderTime,
      reminderMinutes: reminderMinutes,
      status: 'active',
      currentLocation: startLocation
    });

    scheduleTripTimers(trip);

    res.status(201).json({
      success: true,
      trip: {
        _id: trip._id,
        user: trip.user,
        startLocation: trip.startLocation,
        endLocation: trip.endLocation,
        duration: trip.duration,
        tripEndTime: trip.tripEndTime,
        reminderTime: trip.reminderTime,
        reminderMinutes: trip.reminderMinutes,
        status: trip.status,
        createdAt: trip.createdAt,
        currentLocation: trip.currentLocation
      },
      message: 'Trip started successfully'
    });
  } catch (error) {
    console.error('Error starting trip:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting trip'
    });
  }
};
const scheduleTripTimers = (trip) => {
  const tripId = trip._id.toString();
  
  console.log(`⏰ Scheduling timers for trip ${tripId}`);
  console.log(`🕒 Trip ends at: ${trip.tripEndTime.toLocaleString()}`);
  console.log(`🔔 Reminder at: ${trip.reminderTime.toLocaleString()}`);

  if (activeTripTimers.has(tripId)) {
    const oldTimers = activeTripTimers.get(tripId);
    oldTimers.forEach(timer => clearTimeout(timer));
  }

  const timers = [];

  const reminderDelay = trip.reminderTime - new Date();
  if (reminderDelay > 0) {
    const reminderTimer = setTimeout(async () => {
      await sendTripReminder(tripId);
    }, reminderDelay);
    timers.push(reminderTimer);
    console.log(`⏰ Reminder scheduled in ${Math.round(reminderDelay / 60000)} minutes`);
  }

  const alertDelay = trip.tripEndTime - new Date();
  if (alertDelay > 0) {
    const alertTimer = setTimeout(async () => {
      await checkTripCompletion(tripId);
    }, alertDelay);
    timers.push(alertTimer);
    console.log(`🚨 Auto-alert scheduled in ${Math.round(alertDelay / 60000)} minutes`);
  }

  activeTripTimers.set(tripId, timers);
};

const sendTripReminder = async (tripId) => {
  try {
    console.log(`🔔 SENDING REMINDER for trip ${tripId}`);
    
    const trip = await Trip.findById(tripId).populate('user');
    if (!trip || trip.status !== 'active') {
      console.log(`⏰ Trip ${tripId} not active, skipping reminder`);
      return;
    }

    if (trip.user.phone) {
      const message = `⏰ Alone Alert - Trip Reminder\n\nYour trip is ending soon. Please check in to confirm your safety.\n\nTrip started: ${trip.createdAt.toLocaleString()}\nSafe travels! 🛡️`;
      
      const smsResult = await twilioService.sendSMS(trip.user.phone, message);
      console.log(`📱 SMS reminder sent to ${trip.user.phone}:`, smsResult.success);
    }

    console.log(`✅ Reminder sent for trip ${tripId}`);
  } catch (error) {
    console.error(`❌ Error sending reminder for trip ${tripId}:`, error);
  }
};

const checkTripCompletion = async (tripId) => {
  try {
    console.log(`🚨 CHECKING AUTO-ALERT for trip ${tripId}`);
    
    const trip = await Trip.findById(tripId).populate('user');
    if (!trip) {
      console.log(`⏰ Trip ${tripId} not found`);
      return;
    }

    if (trip.status === 'active') {
      console.log(`👤 User: ${trip.user.name}`);
      console.log(`📞 Emergency contacts: ${trip.user.emergencyContacts?.length || 0}`);

      const alert = await Alert.create({
        trip: tripId,
        user: trip.user._id,
        type: 'checkin_missed',
        severity: 'high',
        message: 'User missed trip completion check-in',
        location: trip.currentLocation || trip.startLocation,
        batteryLevel: trip.currentLocation?.batteryLevel || trip.user.batteryLevel
      });

      trip.status = 'alerted';
      trip.alerts.push(alert._id);
      await trip.save();

      if (trip.user.emergencyContacts && trip.user.emergencyContacts.length > 0) {
        console.log(`📱 Notifying ${trip.user.emergencyContacts.length} emergency contacts`);
        await notifyEmergencyContacts(trip.user, alert);
        
        console.log(`🚨 AUTO-ALERT SENT for trip ${tripId} to ${trip.user.emergencyContacts.length} contacts`);
      } else {
        console.log('⚠️ No emergency contacts to notify');
      }

      if (activeTripTimers.has(tripId)) {
        const timers = activeTripTimers.get(tripId);
        timers.forEach(timer => clearTimeout(timer));
        activeTripTimers.delete(tripId);
      }

      console.log(`🚨 AUTO-ALERT PROCESS COMPLETED for trip ${tripId}`);
    } else {
      console.log(`⏰ Trip ${tripId} status is ${trip.status}, skipping auto-alert`);
    }
  } catch (error) {
    console.error(`❌ Error in trip completion check: ${error.message}`);
  }
};

const checkIn = async (req, res) => {
  try {
    const { tripId, location, batteryLevel } = req.body;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    trip.checkInTimer.lastCheckIn = new Date();
    trip.checkInTimer.nextCheckIn = new Date(Date.now() + trip.checkInTimer.interval * 60000);
    trip.currentLocation = location;
    
    if (batteryLevel) {
      trip.currentLocation.batteryLevel = batteryLevel;
    }

    await trip.save();

    await User.findByIdAndUpdate(req.user.id, {
      lastKnownLocation: location,
      batteryLevel: batteryLevel
    });

    res.json({
      success: true,
      message: 'Check-in successful',
      nextCheckIn: trip.checkInTimer.nextCheckIn
    });
  } catch (error) {
    console.error('Error during check-in:', error);
    res.status(500).json({
      success: false,
      message: 'Error during check-in'
    });
  }
};

const endTrip = async (req, res) => {
  try {
    const { tripId } = req.body;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    const duration = Math.round((new Date() - trip.createdAt) / 60000);

    trip.status = 'completed';
    trip.duration.actual = duration;
    await trip.save();

    if (activeTripTimers.has(tripId)) {
      const timers = activeTripTimers.get(tripId);
      timers.forEach(timer => clearTimeout(timer));
      activeTripTimers.delete(tripId);
    }

    console.log(`🏁 Trip ${tripId} ended manually`);

    res.json({
      success: true,
      message: 'Trip completed successfully'
    });
  } catch (error) {
    console.error('Error ending trip:', error);
    res.status(500).json({
      success: false,
      message: 'Error ending trip'
    });
  }
};

const updateLocation = async (req, res) => {
  try {
    const { tripId, location, batteryLevel } = req.body;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    trip.currentLocation = {
      ...location,
      timestamp: new Date(),
      batteryLevel
    };

    await trip.save();

    await checkRouteDeviation(trip, location);

    res.json({
      success: true,
      message: 'Location updated'
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating location'
    });
  }
};

const getActiveTrip = async (req, res) => {
  try {
    const trip = await Trip.findOne({ 
      user: req.user.id, 
      status: 'active' 
    }).populate('safeZones');

    res.json({
      success: true,
      trip: trip || null
    });
  } catch (error) {
    console.error('Error fetching active trip:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching active trip'
    });
  }
};

const getTripStatus = async (req, res) => {
  try {
    const { tripId } = req.params;
    
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    const now = new Date();
    const timeRemaining = trip.tripEndTime ? Math.round((trip.tripEndTime - now) / 60000) : null;

    res.json({
      success: true,
      trip: {
        _id: trip._id,
        status: trip.status,
        createdAt: trip.createdAt,
        tripEndTime: trip.tripEndTime,
        reminderTime: trip.reminderTime,
        timeRemaining: timeRemaining > 0 ? timeRemaining : 0,
        currentLocation: trip.currentLocation
      }
    });
  } catch (error) {
    console.error('Error fetching trip status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trip status'
    });
  }
};

const notifyEmergencyContacts = async (user, alert) => {
  try {
    const notificationPromises = user.emergencyContacts.map(async (contact) => {
      if (user.settings.smsFallback) {
        const smsResult = await twilioService.sendEmergencyAlert(contact, user, alert);
        
        alert.notificationsSent.push({
          contact: contact.phone,
          method: 'sms',
          sentAt: new Date(),
          status: smsResult.success ? 'sent' : 'failed'
        });
      }
    });

    await Promise.all(notificationPromises);
    await alert.save();
  } catch (error) {
    console.error('Error notifying contacts:', error);
  }
};

const checkRouteDeviation = async (trip, currentLocation) => {
  const deviationThreshold = 100; 
  
  console.log(`📍 Route check for trip ${trip._id}`);
  
  return false;
};

module.exports = {
  startTrip,
  checkIn,
  endTrip,
  updateLocation,
  getActiveTrip,
  getTripStatus
};