const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  emergencyContacts: [{
    name: String,
    phone: String,
    email: String,
    relationship: String,
    isPrimary: Boolean
  }],
  settings: {
    shakeDetection: { type: Boolean, default: true },
    voiceCommands: { type: Boolean, default: true },
    smsFallback: { type: Boolean, default: true },
    communityHelp: { type: Boolean, default: false },
    decoyPIN: String
  },
  fcmToken: String,
  batteryLevel: Number,
  lastKnownLocation: {
    latitude: Number,
    longitude: Number,
    timestamp: Date
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

module.exports = mongoose.model('User', userSchema);