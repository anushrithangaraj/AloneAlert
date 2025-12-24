const express = require('express');
const { body } = require('express-validator');
const {
  getProfile,
  updateProfile,
  addEmergencyContact,
  updateEmergencyContact,
  removeEmergencyContact,
  updateFCMToken,
  updateLocation
} = require('../controllers/users');
const { protect } = require('../middleware/auth');
const { handleValidationErrors, validatePhone } = require('../middleware/validation');

const router = express.Router();

// All routes protected
router.use(protect);

// Get profile
router.get('/profile', getProfile);

// Update profile
router.put('/profile', [
  body('name')
    .optional()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  body('phone')
    .optional()
    .custom(validatePhone)
    .withMessage('Please include a valid phone number')
], handleValidationErrors, updateProfile);

// Emergency contacts
router.get('/contacts', (req, res) => {
  // This will be handled by getProfile
  getProfile(req, res);
});

router.post('/contacts', [
  body('name').notEmpty(),
  body('phone').custom(validatePhone),
  body('email').optional().isEmail(),
  body('relationship').isIn(['family', 'friend', 'colleague', 'neighbor', 'other'])
], handleValidationErrors, addEmergencyContact);

router.put('/contacts/:contactId', [
  body('name').optional().notEmpty(),
  body('phone').optional().custom(validatePhone),
  body('email').optional().isEmail(),
  body('relationship').optional().isIn(['family', 'friend', 'colleague', 'neighbor', 'other'])
], handleValidationErrors, updateEmergencyContact);

router.delete('/contacts/:contactId', removeEmergencyContact);

// Update FCM token
router.post('/fcm-token', [
  body('fcmToken').notEmpty()
], handleValidationErrors, updateFCMToken);

// Update location
router.post('/location', [
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
  body('batteryLevel').optional().isInt({ min: 0, max: 100 })
], handleValidationErrors, updateLocation);

module.exports = router;