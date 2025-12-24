import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/auth';
import TripManager from '../components/TripManager';
import EmergencyAlert from '../components/EmergencyAlert';
import MapComponent from '../components/MapComponent';
import SafeZones from '../components/SafeZones';
import Notifications from '../components/Notifications';
import Settings from '../components/Settings';
import LocationService from '../services/location';
import { tripsAPI } from '../services/api';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeTrip, setActiveTrip] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [locationStatus, setLocationStatus] = useState('inactive');
  const [connectionStatus, setConnectionStatus] = useState('online');
  const [lastUpdate, setLastUpdate] = useState(new Date());
useEffect(() => {
  console.log('📍 Starting location tracking...');
  LocationService.startTracking((location) => {
    if (location && typeof location.latitude === 'number' && typeof location.longitude === 'number') {
      console.log('📍 Valid location update:', location);
      setCurrentLocation(location);
      
      if (activeTrip) {
        updateTripLocation(location);
      }
    } else {
      console.warn('📍 Invalid location data:', location);
    }
  });

}, [activeTrip]);
  useEffect(() => {
    console.log('🚀 Initializing Dashboard services...');
    
    const startLocationTracking = async () => {
      try {
        console.log('📍 Starting location tracking...');
        LocationService.startTracking((location) => {
          setCurrentLocation(location);
          setLocationStatus('active');
          setLastUpdate(new Date());
                if (activeTrip && activeTrip._id) {
            updateTripLocation(location);
          }
        });
      } catch (error) {
        console.error('❌ Location tracking error:', error);
        setLocationStatus('error');
      }
    };

    startLocationTracking();

    // Monitor battery level
    const monitorBattery = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await navigator.getBattery();
          
          const updateBatteryLevel = () => {
            const level = Math.round(battery.level * 100);
            setBatteryLevel(level);
            console.log(`🔋 Battery level: ${level}%`);
            setLastUpdate(new Date());
          };
          
          // Set initial level
          updateBatteryLevel();
          
          // Listen for changes
          battery.addEventListener('levelchange', updateBatteryLevel);
          battery.addEventListener('chargingchange', updateBatteryLevel);
          
        } catch (error) {
          console.error('❌ Battery API error:', error);
          setBatteryLevel(85); // Fallback value
        }
      } else {
        console.log('⚠️ Battery API not supported, using fallback');
        setBatteryLevel(85); // Fallback for unsupported browsers
      }
    };

    monitorBattery();

    // Monitor online/offline status
    const handleOnline = () => {
      setConnectionStatus('online');
      setLastUpdate(new Date());
      console.log('✅ Back online');
    };
    
    const handleOffline = () => {
      setConnectionStatus('offline');
      console.log('❌ Offline mode');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check for existing active trip
    checkActiveTrip();

    // Update last update time periodically
    const updateInterval = setInterval(() => {
      setLastUpdate(new Date());
    }, 30000); // Update every 30 seconds

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up Dashboard services...');
      LocationService.stopTracking();
      clearInterval(updateInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [activeTrip]);

  // Update trip location on backend
  const updateTripLocation = async (location) => {
    try {
      await tripsAPI.updateLocation(activeTrip._id, location, batteryLevel);
      console.log('📍 Location updated on server');
    } catch (error) {
      console.error('Error updating trip location:', error);
    }
  };

  // Check for existing active trip
  const checkActiveTrip = async () => {
    try {
      const response = await tripsAPI.getActive();
      if (response.data.success && response.data.trip) {
        console.log('✅ Found active trip:', response.data.trip);
        setActiveTrip(response.data.trip);
      }
    } catch (error) {
      console.log('No active trip found');
    }
  };

  // Handle trip start
  const handleTripStart = (tripData) => {
    console.log(`🎯 Starting trip: ${tripData._id}`);
    setActiveTrip(tripData);
    setLastUpdate(new Date());
  };

  // Handle trip end
  const handleTripEnd = () => {
    console.log('🏁 Ending trip');
    setActiveTrip(null);
    setLastUpdate(new Date());
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="dashboard-content">
            <div className="left-panel">
              <TripManager 
                activeTrip={activeTrip}
                onTripStart={handleTripStart}
                onTripEnd={handleTripEnd}
                currentLocation={currentLocation}
                batteryLevel={batteryLevel}
              />
              
              <EmergencyAlert 
                activeTrip={activeTrip}
                currentLocation={currentLocation}
                batteryLevel={batteryLevel}
              />
            </div>

            <div className="right-panel">
              <MapComponent 
                activeTrip={activeTrip}
                currentLocation={currentLocation}
              />
              
              <SafeZones />
            </div>
          </div>
        );
      
      case 'notifications':
        return <Notifications />;
      
      case 'settings':
        return <Settings />;
      
      default:
        return (
          <div className="welcome-message">
            <h2>Welcome to Alone Alert Safety System</h2>
            <p>Select a tab to get started with your safety monitoring.</p>
            <div className="feature-highlights">
              <div className="feature">
                <span className="icon">🚀</span>
                <h3>Start Safety Trips</h3>
                <p>Begin monitored journeys with automatic alerts</p>
              </div>
              <div className="feature">
                <span className="icon">🚨</span>
                <h3>Emergency Alerts</h3>
                <p>Instant SOS and automatic safety notifications</p>
              </div>
              <div className="feature">
                <span className="icon">📍</span>
                <h3>Live Tracking</h3>
                <p>Real-time location monitoring and safe zones</p>
              </div>
            </div>
          </div>
        );
    }
  };

  const getLocationStatusText = () => {
    return locationStatus === 'active' ? '📍 Location Active' : 
           locationStatus === 'error' ? '❌ Location Error' : '📍 Location Inactive';
  };

  const getConnectionStatusText = () => {
    return connectionStatus === 'online' ? '🟢 Online' : '🔴 Offline';
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div className="header-main">
          <h1>Welcome back, {user?.name}!</h1>
          <p>Your safety is our priority</p>
        </div>
        <div className="status-indicators">
          <div className={`battery-indicator ${batteryLevel < 20 ? 'low' : ''}`}>
            🔋 {batteryLevel}%
            {batteryLevel < 20 && <span className="pulse-alert">LOW</span>}
          </div>
          <div className={`connection-status ${connectionStatus}`}>
            {getConnectionStatusText()}
          </div>
          <div className={`location-status ${locationStatus}`}>
            {getLocationStatusText()}
          </div>
          
          {activeTrip && (
            <div className="active-trip-indicator">
              🚶 Active Trip
            </div>
          )}
        </div>
      </div>

      <nav className="dashboard-nav">
        <button 
          className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          🏠 Dashboard
        </button>
        <button 
          className={`nav-tab ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          🔔 Notifications
          {activeTrip && <span className="notification-badge">!</span>}
        </button>
        <button 
          className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Settings
        </button>
      </nav>

      <main className="dashboard-main">
        {renderContent()}
      </main>

      {/* Emergency Quick Access */}
      <div className="emergency-quick-access">
        <button 
          className="quick-sos-btn"
          onClick={() => {
            // Trigger emergency even if no active trip
            const emergencyAlert = document.querySelector('.sos-button');
            if (emergencyAlert) {
              emergencyAlert.click();
            } else {
              alert('🚨 Please go to Dashboard and use the SOS button for emergencies!');
            }
          }}
          title="Quick SOS Emergency"
        >
          🚨 SOS
        </button>
      </div>

      {/* System Status Footer */}
      <footer className="system-status-footer">
        <div className="status-item">
          <span className="label">Connection:</span>
          <span className={`value ${connectionStatus}`}>
            {connectionStatus === 'online' ? 'Connected' : 'Offline'}
          </span>
        </div>
        <div className="status-item">
          <span className="label">Location:</span>
          <span className={`value ${locationStatus}`}>
            {locationStatus === 'active' ? 'Tracking' : 'Inactive'}
          </span>
        </div>
        <div className="status-item">
          <span className="label">Battery:</span>
          <span className={`value ${batteryLevel < 20 ? 'low' : 'normal'}`}>
            {batteryLevel}%
          </span>
        </div>
        <div className="status-item">
          <span className="label">Last Update:</span>
          <span className="value">{lastUpdate.toLocaleTimeString()}</span>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;