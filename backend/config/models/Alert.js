const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  trip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: false  // Changed from true to false - SOS can be without trip
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'sos',
      'checkin_missed',
      'route_deviation',
      'battery_low',
      'safe_zone_breach',
      'duress_pin',
      'shake_trigger',
      'voice_trigger'
    ],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  message: {
    type: String,
    required: true
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String,
    accuracy: Number,
    timestamp: Date
  },
  batteryLevel: Number,
  isResolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: Date,
  notificationsSent: [{
    contact: String,
    method: String, // sms, push, email
    sentAt: Date,
    status: String,
    error: String,
    sid: String
  }],
  communityNotified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for better query performance
alertSchema.index({ user: 1, createdAt: -1 });
alertSchema.index({ trip: 1 });
alertSchema.index({ type: 1 });

module.exports = mongoose.model('Alert', alertSchema);