const express = require('express');
const { body } = require('express-validator');
const {
  getSafeZones,
  createSafeZone,
  updateSafeZone,
  deleteSafeZone,
  checkLocationSafety
} = require('../controllers/safeZones');
const { protect } = require('../middleware/auth');
const { handleValidationErrors, validateCoordinates } = require('../middleware/validation');

const router = express.Router();

// All routes protected
router.use(protect);

// Get safe zones
router.get('/', getSafeZones);

// Create safe zone
router.post('/', [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('radius')
    .isInt({ min: 50, max: 5000 })
    .withMessage('Radius must be between 50 and 5000 meters'),
  body('type')
    .isIn(['home', 'work', 'school', 'other'])
    .withMessage('Type must be home, work, school, or other'),
  body('address')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Address must be less than 500 characters')
], handleValidationErrors, validateCoordinates, createSafeZone);

// Update safe zone
router.put('/:safeZoneId', [
  body('name')
    .optional()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('radius')
    .optional()
    .isInt({ min: 50, max: 5000 })
    .withMessage('Radius must be between 50 and 5000 meters'),
  body('type')
    .optional()
    .isIn(['home', 'work', 'school', 'other'])
    .withMessage('Type must be home, work, school, or other'),
  body('address')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Address must be less than 500 characters')
], handleValidationErrors, validateCoordinates, updateSafeZone);

// Delete safe zone
router.delete('/:safeZoneId', deleteSafeZone);

// Check location safety
router.post('/check-safety', [
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180')
], handleValidationErrors, validateCoordinates, checkLocationSafety);

module.exports = router;