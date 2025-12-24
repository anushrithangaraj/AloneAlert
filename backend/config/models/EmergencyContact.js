const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    lowercase: true
  },
  relationship: {
    type: String,
    enum: ['family', 'friend', 'colleague', 'neighbor', 'other'],
    default: 'friend'
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  notificationsEnabled: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

emergencyContactSchema.index({ user: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model('EmergencyContact', emergencyContactSchema);