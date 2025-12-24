const express = require('express');
const { body } = require('express-validator');
const {
  startTrip,
  checkIn,
  endTrip,
  updateLocation,
  getActiveTrip,
  getTripStatus
} = require('../controllers/trips');
const { protect } = require('../middleware/auth');
const { handleValidationErrors, validateCoordinates } = require('../middleware/validation');

const router = express.Router();

// All routes protected
router.use(protect);

// Start trip
router.post('/start', [
  body('startLocation.latitude').isFloat({ min: -90, max: 90 }),
  body('startLocation.longitude').isFloat({ min: -180, max: 180 }),
  body('endLocation.latitude').isFloat({ min: -90, max: 90 }),
  body('endLocation.longitude').isFloat({ min: -180, max: 180 }),
  body('duration').isInt({ min: 1, max: 1440 }), // 1min to 24h
  body('reminderMinutes').optional().isInt({ min: 1, max: 60 }) // 1min to 1h before
], handleValidationErrors, validateCoordinates, startTrip);

// Check in
router.post('/checkin', [
  body('tripId').isMongoId(),
  body('location.latitude').isFloat({ min: -90, max: 90 }),
  body('location.longitude').isFloat({ min: -180, max: 180 }),
  body('batteryLevel').optional().isInt({ min: 0, max: 100 })
], handleValidationErrors, validateCoordinates, checkIn);

// End trip
router.post('/end', [
  body('tripId').isMongoId()
], handleValidationErrors, endTrip);

// Update location
router.post('/location', [
  body('tripId').isMongoId(),
  body('location.latitude').isFloat({ min: -90, max: 90 }),
  body('location.longitude').isFloat({ min: -180, max: 180 }),
  body('batteryLevel').optional().isInt({ min: 0, max: 100 })
], handleValidationErrors, validateCoordinates, updateLocation);

// Get active trip for current user
router.get('/active', getActiveTrip);

// Get trip status
router.get('/status/:tripId', getTripStatus);

// Get trip history with pagination and filtering
router.get('/history', protect, async (req, res) => {
  try {
    const Trip = require('../models/Trip');
    const { page = 1, limit = 50, status, startDate, endDate } = req.query;
    
    // Build filter object
    const filter = { user: req.user.id };
    
    // Status filter
    if (status && status !== 'all') {
      filter.status = status;
    }
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    const trips = await Trip.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('alerts', 'type severity createdAt')
      .select('startLocation endLocation duration status createdAt completedAt alerts currentLocation');

    const total = await Trip.countDocuments(filter);

    res.json({
      success: true,
      trips,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Error fetching trip history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trip history'
    });
  }
});
// Add this route to your existing trips.js
router.get('/stats/user', async (req, res) => {
  try {
    const Trip = require('../models/Trip');
    const Alert = require('../models/Alert');
    const mongoose = require('mongoose');
    
    const userId = req.user.id;
    
    // Get user-specific stats
    const totalTrips = await Trip.countDocuments({ user: userId });
    const completedTrips = await Trip.countDocuments({ user: userId, status: 'completed' });
    const alertedTrips = await Trip.countDocuments({ user: userId, status: 'alerted' });
    const activeTrips = await Trip.countDocuments({ user: userId, status: 'active' });
    
    // Get average duration for user
    const durationStats = await Trip.aggregate([
      { $match: { user: mongoose.Types.ObjectId(userId), 'duration.actual': { $exists: true } } },
      { $group: { 
        _id: null, 
        avgDuration: { $avg: '$duration.actual' },
        totalDuration: { $sum: '$duration.actual' }
      }}
    ]);
    
    // Get alert stats for user
    const alertStats = await Alert.aggregate([
      { $match: { user: mongoose.Types.ObjectId(userId) } },
      { $group: { 
        _id: '$type', 
        count: { $sum: 1 }
      }}
    ]);

    // Get recent trips for timeline
    const recentTrips = await Trip.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('status createdAt duration');

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
        alertTypes: alertStats,
        recentTrips
      }
    });
  } catch (error) {
    console.error('Error fetching user trip stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trip statistics'
    });
  }
});

// Add export endpoint
router.get('/export', async (req, res) => {
  try {
    const Trip = require('../models/Trip');
    
    const trips = await Trip.find({ user: req.user.id })
      .populate('alerts')
      .sort({ createdAt: -1 });

    // Convert to export format
    const exportData = trips.map(trip => ({
      'Trip ID': trip._id,
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
    console.error('Error exporting trip data:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting trip data'
    });
  }
});

module.exports = router;