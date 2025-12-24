// Alert types
export const ALERT_TYPES = {
  SOS: 'sos',
  CHECKIN_MISSED: 'checkin_missed',
  ROUTE_DEVIATION: 'route_deviation',
  BATTERY_LOW: 'battery_low',
  SAFE_ZONE_BREACH: 'safe_zone_breach',
  DURESS_PIN: 'duress_pin',
  SHAKE_TRIGGER: 'shake_trigger',
  VOICE_TRIGGER: 'voice_trigger'
};

// Alert severity levels
export const ALERT_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Trip status
export const TRIP_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ALERTED: 'alerted'
};

// Safe zone types
export const SAFE_ZONE_TYPES = {
  HOME: 'home',
  WORK: 'work',
  SCHOOL: 'school',
  OTHER: 'other'
};

// Emergency contact relationships
export const CONTACT_RELATIONSHIPS = {
  FAMILY: 'family',
  FRIEND: 'friend',
  COLLEAGUE: 'colleague',
  NEIGHBOR: 'neighbor',
  OTHER: 'other'
};

// App settings defaults
export const DEFAULT_SETTINGS = {
  shakeDetection: true,
  voiceCommands: true,
  smsFallback: true,
  communityHelp: false,
  decoyPIN: ''
};

// Check-in intervals (in minutes)
export const CHECKIN_INTERVALS = [15, 30, 45, 60, 90, 120];

// Trip duration options (in minutes)
export const TRIP_DURATIONS = [
  15, 30, 45, 60, 90, 120, 180, 240, 360, 480, 720, 1440
];

// Safe zone radius options (in meters)
export const SAFE_ZONE_RADIUS = [50, 100, 200, 500, 1000, 2000, 5000];

// Battery threshold for low battery alerts
export const LOW_BATTERY_THRESHOLD = 20;

// Shake detection threshold
export const SHAKE_THRESHOLD = 15;

// Maximum distance for community help (meters)
export const COMMUNITY_HELP_DISTANCE = 500;

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    PROFILE: '/auth/me'
  },
  TRIPS: {
    START: '/trips/start',
    CHECKIN: '/trips/checkin',
    END: '/trips/end',
    LOCATION: '/trips/location'
  },
  ALERTS: {
    SOS: '/alerts/sos',
    LIST: '/alerts',
    RESOLVE: '/alerts/:id/resolve'
  },
  USERS: {
    PROFILE: '/users/profile',
    CONTACTS: '/users/contacts',
    LOCATION: '/users/location'
  },
  SAFE_ZONES: {
    LIST: '/safe-zones',
    CREATE: '/safe-zones',
    CHECK_SAFETY: '/safe-zones/check-safety'
  }
};

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'Please log in to continue.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  LOCATION_ERROR: 'Unable to access your location. Please enable location services.',
  BATTERY_ERROR: 'Unable to access battery information.'
};

// Success messages
export const SUCCESS_MESSAGES = {
  TRIP_STARTED: 'Trip started successfully!',
  TRIP_ENDED: 'Trip completed successfully!',
  CHECKIN_SUCCESS: 'Check-in successful!',
  ALERT_SENT: 'Emergency alert sent to your contacts!',
  SETTINGS_SAVED: 'Settings saved successfully!',
  CONTACT_ADDED: 'Emergency contact added successfully!',
  CONTACT_REMOVED: 'Emergency contact removed successfully!',
  SAFE_ZONE_CREATED: 'Safe zone created successfully!'
};

export default {
  ALERT_TYPES,
  ALERT_SEVERITY,
  TRIP_STATUS,
  SAFE_ZONE_TYPES,
  CONTACT_RELATIONSHIPS,
  DEFAULT_SETTINGS,
  CHECKIN_INTERVALS,
  TRIP_DURATIONS,
  SAFE_ZONE_RADIUS,
  LOW_BATTERY_THRESHOLD,
  SHAKE_THRESHOLD,
  COMMUNITY_HELP_DISTANCE,
  API_ENDPOINTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
};