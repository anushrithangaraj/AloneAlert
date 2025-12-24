import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Health check
export const healthAPI = {
  check: () => api.get('/health')
};

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/me')
};

// Trips API
export const tripsAPI = {
  start: (tripData) => api.post('/trips/start', tripData),
  checkIn: (tripId, location, batteryLevel) => 
    api.post('/trips/checkin', { tripId, location, batteryLevel }),
  end: (tripId) => api.post('/trips/end', { tripId }),
  updateLocation: (tripId, location, batteryLevel) =>
    api.post('/trips/location', { tripId, location, batteryLevel }),
  getActive: () => api.get('/trips/active'),
  getStatus: (tripId) => api.get(`/trips/status/${tripId}`)
};

// Alerts API
export const alertsAPI = {
  triggerSOS: (alertData) => api.post('/alerts/sos', alertData),
  getAlerts: (page = 1, limit = 20) => 
    api.get(`/alerts?page=${page}&limit=${limit}`),
  resolveAlert: (alertId) => api.patch(`/alerts/${alertId}/resolve`)
};

// Users API
export const usersAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (profileData) => api.put('/users/profile', profileData),
  addContact: (contactData) => api.post('/users/contacts', contactData),
  updateContact: (contactId, contactData) => 
    api.put(`/users/contacts/${contactId}`, contactData),
  removeContact: (contactId) => api.delete(`/users/contacts/${contactId}`),
  updateLocation: (locationData) => api.post('/users/location', locationData)
};

// Safe Zones API
export const safeZonesAPI = {
  getSafeZones: () => api.get('/safe-zones'),
  createSafeZone: (zoneData) => api.post('/safe-zones', zoneData),
  updateSafeZone: (zoneId, zoneData) => api.put(`/safe-zones/${zoneId}`, zoneData),
  deleteSafeZone: (zoneId) => api.delete(`/safe-zones/${zoneId}`),
  checkSafety: (latitude, longitude) => 
    api.post('/safe-zones/check-safety', { latitude, longitude })
};

// Debug API
export const debugAPI = {
  getActiveTrips: () => api.get('/debug/active-trips')
};

export default api;