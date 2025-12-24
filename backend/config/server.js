const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/trips', require('./routes/trips'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/users', require('./routes/users'));
app.use('/api/safe-zones', require('./routes/safeZones'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Alone Alert API is running',
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to check active trips
app.get('/api/debug/active-trips', async (req, res) => {
  try {
    const Trip = require('./models/Trip');
    const activeTrips = await Trip.find({ status: 'active' })
      .populate('user', 'name email phone')
      .select('_id status createdAt tripEndTime user');
    
    res.json({
      success: true,
      activeTrips,
      count: activeTrips.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Debug endpoint to check trip data
app.get('/api/debug/trip/:tripId', async (req, res) => {
  try {
    const { tripId } = req.params;
    const Trip = require('./models/Trip');
    const trip = await Trip.findById(tripId);
    
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }
    
    res.json({
      success: true,
      trip: {
        _id: trip._id,
        duration: trip.duration,
        tripEndTime: trip.tripEndTime,
        reminderTime: trip.reminderTime,
        reminderMinutes: trip.reminderMinutes,
        status: trip.status,
        createdAt: trip.createdAt
      },
      debug: {
        currentTime: new Date(),
        timeUntilEnd: trip.tripEndTime ? Math.round((trip.tripEndTime - new Date()) / 60000) : null,
        timeUntilReminder: trip.reminderTime ? Math.round((trip.reminderTime - new Date()) / 60000) : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Debug endpoint for timers
app.get('/api/debug/timers', (req, res) => {
  try {
    const { activeTripTimers } = require('./controllers/trips');
    const timerInfo = [];
    
    // If activeTripTimers is a Map, convert to array
    if (activeTripTimers && typeof activeTripTimers.entries === 'function') {
      for (let [tripId, timers] of activeTripTimers.entries()) {
        timerInfo.push({
          tripId,
          timerCount: timers ? timers.length : 0,
          hasReminder: timers && timers.length > 0,
          hasAlert: timers && timers.length > 1
        });
      }
    }
    
    res.json({
      success: true,
      activeTimers: timerInfo,
      totalTrips: timerInfo.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Debug endpoint to manually trigger reminder
app.post('/api/debug/trigger-reminder/:tripId', async (req, res) => {
  try {
    const { sendTripReminder } = require('./controllers/trips');
    await sendTripReminder(req.params.tripId);
    res.json({ success: true, message: 'Reminder triggered manually' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Debug endpoint to manually trigger auto-alert
app.post('/api/debug/trigger-alert/:tripId', async (req, res) => {
  try {
    const { checkTripCompletion } = require('./controllers/trips');
    await checkTripCompletion(req.params.tripId);
    res.json({ success: true, message: 'Auto-alert triggered manually' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Trip statistics endpoint
app.get('/api/trips/stats', async (req, res) => {
  try {
    const Trip = require('./models/Trip');
    const Alert = require('./models/Alert');
    
    // Get basic trip stats
    const totalTrips = await Trip.countDocuments();
    const completedTrips = await Trip.countDocuments({ status: 'completed' });
    const alertedTrips = await Trip.countDocuments({ status: 'alerted' });
    const activeTrips = await Trip.countDocuments({ status: 'active' });
    
    // Get average duration
    const durationStats = await Trip.aggregate([
      { $match: { 'duration.actual': { $exists: true } } },
      { $group: { 
        _id: null, 
        avgDuration: { $avg: '$duration.actual' },
        totalDuration: { $sum: '$duration.actual' }
      }}
    ]);
    
    // Get alert stats
    const alertStats = await Alert.aggregate([
      { $group: { 
        _id: '$type', 
        count: { $sum: 1 }
      }}
    ]);
    
    res.json({
      success: true,
      stats: {
        totalTrips,
        completedTrips,
        alertedTrips,
        activeTrips,
        completionRate: totalTrips > 0 ? (completedTrips / totalTrips * 100).toFixed(1) : 0,
        averageDuration: durationStats.length > 0 ? Math.round(durationStats[0].avgDuration) : 0,
        totalTravelTime: durationStats.length > 0 ? durationStats[0].totalDuration : 0,
        alertTypes: alertStats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export trip data
app.get('/api/trips/export', async (req, res) => {
  try {
    const Trip = require('./models/Trip');
    
    const trips = await Trip.find()
      .populate('user', 'name email')
      .populate('alerts')
      .sort({ createdAt: -1 });
    
    // Convert to export format
    const exportData = trips.map(trip => ({
      'Trip ID': trip._id,
      'User': trip.user?.name || 'Unknown',
      'Start Location': trip.startLocation?.address || 'Unknown',
      'End Location': trip.endLocation?.address || 'Unknown',
      'Planned Duration (min)': trip.duration?.planned || 0,
      'Actual Duration (min)': trip.duration?.actual || 0,
      'Status': trip.status,
      'Start Time': trip.createdAt,
      'End Time': trip.completedAt || 'N/A',
      'Alerts Count': trip.alerts?.length || 0,
      'Last Location': trip.currentLocation ? 
        `${trip.currentLocation.latitude}, ${trip.currentLocation.longitude}` : 'N/A'
    }));
    
    res.json({
      success: true,
      data: exportData,
      format: 'JSON',
      total: trips.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Backend API: http://localhost:${PORT}/api`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});