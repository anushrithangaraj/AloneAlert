const axios = require('axios');

class LocationService {
  constructor() {
    this.googleMapsClient = axios.create({
      baseURL: 'https://maps.googleapis.com/maps/api',
      params: {
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });
  }

  // Get route between two points
  async getRoute(origin, destination, waypoints = []) {
    try {
      const response = await this.googleMapsClient.get('/directions/json', {
        params: {
          origin: `${origin.latitude},${origin.longitude}`,
          destination: `${destination.latitude},${destination.longitude}`,
          waypoints: waypoints.map(wp => `${wp.latitude},${wp.longitude}`).join('|'),
          mode: 'walking'
        }
      });

      if (response.data.status === 'OK') {
        const route = response.data.routes[0];
        return {
          polyline: route.overview_polyline.points,
          distance: route.legs[0].distance,
          duration: route.legs[0].duration,
          waypoints: this.decodePolyline(route.overview_polyline.points)
        };
      } else {
        throw new Error(`Google Maps API error: ${response.data.status}`);
      }
    } catch (error) {
      console.error('Error getting route:', error);
      throw error;
    }
  }

  // Reverse geocoding - get address from coordinates
  async getAddressFromCoords(latitude, longitude) {
    try {
      const response = await this.googleMapsClient.get('/geocode/json', {
        params: {
          latlng: `${latitude},${longitude}`
        }
      });

      if (response.data.status === 'OK' && response.data.results.length > 0) {
        return response.data.results[0].formatted_address;
      }
      return 'Unknown location';
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return 'Unknown location';
    }
  }

  // Calculate distance between two points
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c * 1000; // Convert to meters
    return distance;
  }

  // Check if location is within safe zone
  isInSafeZone(location, safeZone) {
    const distance = this.calculateDistance(
      location.latitude,
      location.longitude,
      safeZone.location.latitude,
      safeZone.location.longitude
    );
    return distance <= safeZone.radius;
  }

  // Decode polyline string to coordinates
  decodePolyline(encoded) {
    const points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5
      });
    }

    return points;
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }
}

module.exports = new LocationService();