class LocationService {
  constructor() {
    this.watchId = null;
    this.callbacks = [];
    this.isTracking = false;
    this.lastLocation = null;
  }

  startTracking(callback) {
    if (callback && typeof callback === 'function') {
      this.callbacks.push(callback);
    }

    if (this.watchId) {
      console.log('📍 Location tracking already active');
      return;
    }

    if (!('geolocation' in navigator)) {
      console.error('❌ Geolocation not supported by browser');
      this.handlePositionError({ code: 0, message: 'Geolocation not supported' });
      return;
    }

    console.log('📍 Starting location tracking...');
    this.isTracking = true;

    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePositionUpdate(position),
      (error) => this.handlePositionError(error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );

    // Also get initial position
    this.getCurrentLocation().then(location => {
      console.log('📍 Initial location acquired:', location);
    }).catch(error => {
      console.error('❌ Error getting initial location:', error);
    });
  }

  stopTracking() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isTracking = false;
      this.callbacks = [];
      console.log('📍 Location tracking stopped');
    }
  }

  handlePositionUpdate(position) {
    const location = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: new Date(position.timestamp)
    };

    this.lastLocation = location;
    
    console.log('📍 Location updated:', {
      lat: location.latitude.toFixed(6),
      lng: location.longitude.toFixed(6),
      accuracy: location.accuracy
    });

    // Call all registered callbacks
    this.callbacks.forEach(callback => {
      try {
        callback(location);
      } catch (error) {
        console.error('❌ Error in location callback:', error);
      }
    });
  }

  handlePositionError(error) {
    console.error('❌ Location error:', {
      code: error.code,
      message: error.message
    });

    const errorMessages = {
      1: 'Location permission denied',
      2: 'Location unavailable',
      3: 'Location timeout'
    };

    const errorMessage = errorMessages[error.code] || 'Unknown location error';
    
    console.warn(`⚠️ ${errorMessage}`);

    // Still call callbacks with error information
    this.callbacks.forEach(callback => {
      try {
        callback({ 
          error: true, 
          message: errorMessage,
          code: error.code 
        });
      } catch (callbackError) {
        console.error('❌ Error in error callback:', callbackError);
      }
    });
  }

  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            altitudeAccuracy: position.coords.altitudeAccuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            timestamp: new Date(position.timestamp)
          };
          this.lastLocation = location;
          resolve(location);
        },
        (error) => {
          this.handlePositionError(error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000
        }
      );
    });
  }

  async getAddressFromCoords(latitude, longitude) {
    try {
      if (!process.env.REACT_APP_GOOGLE_MAPS_API_KEY) {
        console.warn('⚠️ Google Maps API key not configured');
        return 'Unknown location (API key missing)';
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        return data.results[0].formatted_address;
      }
      return 'Unknown location';
    } catch (error) {
      console.error('❌ Error getting address:', error);
      return 'Unknown location (error)';
    }
  }

  // Calculate distance between two coordinates in meters
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // Check if location is within radius of another location
  isWithinRadius(location1, location2, radiusMeters) {
    const distance = this.calculateDistance(
      location1.latitude,
      location1.longitude,
      location2.latitude,
      location2.longitude
    );
    return distance <= radiusMeters;
  }

  // Get tracking status
  getTrackingStatus() {
    return {
      isTracking: this.isTracking,
      hasPermission: 'geolocation' in navigator,
      lastLocation: this.lastLocation
    };
  }

  // Request location permission
  async requestPermission() {
    if (!('geolocation' in navigator)) {
      throw new Error('Geolocation not supported');
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve(true),
        (error) => resolve(false),
        { timeout: 5000 }
      );
    });
  }
}

// Create singleton instance
const locationService = new LocationService();

export default locationService;