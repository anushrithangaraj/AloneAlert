const mongoose = require('mongoose');

const safeZoneSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  name: {
    type: String,
    required: [true, 'Safe zone name is required'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  location: {
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    }
  },
  radius: {
    type: Number,
    required: [true, 'Radius is required'],
    min: [50, 'Radius must be at least 50 meters'],
    max: [5000, 'Radius cannot exceed 5000 meters'],
    default: 100
  },
  address: {
    type: String,
    trim: true,
    maxlength: [500, 'Address cannot be more than 500 characters']
  },
  type: {
    type: String,
    enum: {
      values: ['home', 'work', 'school', 'other'],
      message: 'Type must be home, work, school, or other'
    },
    default: 'other'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update the updatedAt field before saving
safeZoneSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Compound index for user and name (unique per user)
safeZoneSchema.index({ user: 1, name: 1 }, { unique: true });

// Geospatial index for location-based queries
safeZoneSchema.index({ location: '2dsphere' });

// Index for user and active status
safeZoneSchema.index({ user: 1, isActive: 1 });

// Virtual for formatted location
safeZoneSchema.virtual('formattedLocation').get(function() {
  return `${this.location.latitude.toFixed(6)}, ${this.location.longitude.toFixed(6)}`;
});

// Instance method to check if a point is within this safe zone
safeZoneSchema.methods.isPointWithin = function(lat, lng) {
  const distance = calculateDistance(
    lat,
    lng,
    this.location.latitude,
    this.location.longitude
  );
  return distance <= this.radius;
};

// Static method to find safe zones containing a point
safeZoneSchema.statics.findZonesContainingPoint = async function(userId, lat, lng) {
  const safeZones = await this.find({ 
    user: userId, 
    isActive: true 
  });
  
  return safeZones.filter(zone => zone.isPointWithin(lat, lng));
};

// Helper function for distance calculation
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

module.exports = mongoose.model('SafeZone', safeZoneSchema);