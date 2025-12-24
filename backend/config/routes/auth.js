const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  getMe,
  updateProfile,
  updateSettings,
  changePassword,
  logout,
  deleteAccount,
  forgotPassword,
  resetPassword,
  verifyEmail
} = require('../controllers/auth');
const { protect } = require('../middleware/auth');
const { handleValidationErrors, validatePhone } = require('../middleware/validation');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  body('email')
    .isEmail()
    .withMessage('Please include a valid email'),
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .custom(validatePhone)
    .withMessage('Please include a valid phone number'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
], handleValidationErrors, register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email')
    .isEmail()
    .withMessage('Please include a valid email'),
  body('password')
    .exists()
    .withMessage('Password is required')
], handleValidationErrors, login);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, getMe);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', [
  body('name')
    .optional()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters'),
  body('phone')
    .optional()
    .custom(validatePhone)
    .withMessage('Please include a valid phone number')
], protect, handleValidationErrors, updateProfile);

// @route   PUT /api/auth/settings
// @desc    Update user settings
// @access  Private
router.put('/settings', protect, updateSettings);

// @route   PUT /api/auth/password
// @desc    Change password
// @access  Private
router.put('/password', [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
], protect, handleValidationErrors, changePassword);

// @route   POST /api/auth/forgotpassword
// @desc    Forgot password
// @access  Public
router.post('/forgotpassword', [
  body('email')
    .isEmail()
    .withMessage('Please include a valid email')
], handleValidationErrors, forgotPassword);

// @route   PUT /api/auth/resetpassword/:resettoken
// @desc    Reset password
// @access  Public
router.put('/resetpassword/:resettoken', [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
], handleValidationErrors, resetPassword);

// @route   GET /api/auth/verify/:token
// @desc    Verify email
// @access  Public
router.get('/verify/:token', verifyEmail);

// @route   GET /api/auth/logout
// @desc    Logout user
// @access  Private
router.get('/logout', protect, logout);

// @route   DELETE /api/auth/account
// @desc    Delete user account
// @access  Private
router.delete('/account', [
  body('password')
    .notEmpty()
    .withMessage('Password is required to delete account')
], protect, handleValidationErrors, deleteAccount);

module.exports = router;