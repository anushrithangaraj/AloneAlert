const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startLocation: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  endLocation: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  plannedRoute: {
    polyline: String,
    waypoints: [{
      latitude: Number,
      longitude: Number
    }]
  },
  safeZones: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SafeZone'
  }],
  duration: {
    planned: Number, // in minutes
    actual: Number   // in minutes
  },
  reminderTime: {
    type: Number, // in minutes before trip ends
    default: 2
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled', 'alerted'],
    default: 'active'
  },
  tripEndTime: Date, // When the trip should automatically end
  reminderSent: {
    type: Boolean,
    default: false
  },
  checkInTimer: {
    nextCheckIn: Date,
    interval: Number, // in minutes
    lastCheckIn: Date
  },
  companions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: Date
  }],
  currentLocation: {
    latitude: Number,
    longitude: Number,
    timestamp: Date,
    batteryLevel: Number
  },
  alerts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Alert'
  }]
}, {
  timestamps: true
});

tripSchema.index({ user: 1, status: 1 });
tripSchema.index({ 'currentLocation': '2dsphere' });

module.exports = mongoose.model('Trip', tripSchema);