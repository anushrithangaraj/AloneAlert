const express = require('express');
const { body } = require('express-validator');
const {
  triggerSOS,
  checkMissedCheckin,
  getUserAlerts,
  resolveAlert
} = require('../controllers/alerts');
const { protect } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// All routes protected
router.use(protect);

// Trigger SOS alert
router.post('/sos', [
  body('tripId').optional().isMongoId(),
  body('type').optional().isIn(['sos', 'shake_trigger', 'voice_trigger', 'duress_pin']),
  body('location.latitude').optional().isFloat({ min: -90, max: 90 }),
  body('location.longitude').optional().isFloat({ min: -180, max: 180 }),
  body('batteryLevel').optional().isInt({ min: 0, max: 100 })
], handleValidationErrors, triggerSOS);

// Check missed check-in
router.post('/check-missed-checkin', [
  body('tripId').isMongoId()
], handleValidationErrors, checkMissedCheckin);

// Get user alerts
router.get('/', getUserAlerts);

// Resolve alert
router.patch('/:alertId/resolve', resolveAlert);

module.exports = router;