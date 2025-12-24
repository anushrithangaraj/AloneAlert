import { LOW_BATTERY_THRESHOLD } from './constants';

// Format time duration
export const formatDuration = (minutes) => {
  if (minutes < 60) {
    return `${minutes} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
};

// Format date
export const formatDate = (dateString, includeTime = true) => {
  const date = new Date(dateString);
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return date.toLocaleDateString('en-US', options);
};

// Calculate distance between two coordinates (Haversine formula)
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c * 1000; // Convert to meters
  return Math.round(distance);
};

const deg2rad = (deg) => {
  return deg * (Math.PI/180);
};

// Check if battery level is low
export const isBatteryLow = (batteryLevel) => {
  return batteryLevel <= LOW_BATTERY_THRESHOLD;
};

// Validate email format
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number (basic international format)
export const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

// Generate random ID
export const generateId = (length = 8) => {
  return Math.random().toString(36).substr(2, length);
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Get color based on severity
export const getSeverityColor = (severity) => {
  switch (severity) {
    case 'critical': return '#dc3545';
    case 'high': return '#fd7e14';
    case 'medium': return '#ffc107';
    case 'low': return '#28a745';
    default: return '#6c757d';
  }
};

// Get icon based on alert type
export const getAlertIcon = (type) => {
  switch (type) {
    case 'sos': return '🚨';
    case 'checkin_missed': return '⏰';
    case 'route_deviation': return '🔄';
    case 'battery_low': return '🔋';
    case 'safe_zone_breach': return '🚧';
    case 'duress_pin': return '🆘';
    case 'shake_trigger': return '📱';
    case 'voice_trigger': return '🎤';
    default: return '⚠️';
  }
};

// Capitalize first letter
export const capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Format coordinate for display
export const formatCoordinate = (coord, precision = 6) => {
  return parseFloat(coord).toFixed(precision);
};

// Check if device is mobile
export const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Check if browser supports required features
export const checkBrowserSupport = () => {
  const supports = {
    geolocation: 'geolocation' in navigator,
    serviceWorker: 'serviceWorker' in navigator,
    notifications: 'Notification' in navigator,
    vibration: 'vibrate' in navigator,
    battery: 'getBattery' in navigator,
    speechRecognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
  };

  return supports;
};

// Get browser support warnings
export const getBrowserWarnings = () => {
  const supports = checkBrowserSupport();
  const warnings = [];

  if (!supports.geolocation) {
    warnings.push('Location services are not supported in your browser.');
  }
  if (!supports.vibration) {
    warnings.push('Vibration is not supported. Shake detection may not work.');
  }
  if (!supports.speechRecognition) {
    warnings.push('Voice commands are not supported in your browser.');
  }

  return warnings;
};

export default {
  formatDuration,
  formatDate,
  calculateDistance,
  isBatteryLow,
  isValidEmail,
  isValidPhone,
  generateId,
  debounce,
  throttle,
  formatFileSize,
  getSeverityColor,
  getAlertIcon,
  capitalize,
  formatCoordinate,
  isMobileDevice,
  checkBrowserSupport,
  getBrowserWarnings
};