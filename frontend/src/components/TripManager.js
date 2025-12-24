import React, { useState, useEffect } from 'react';
import { tripsAPI } from '../services/api';
import { useAuth } from '../services/auth';
import LocationService from '../services/location';
import '../styles/TripManager.css';

const TripManager = ({ activeTrip, onTripStart, onTripEnd, currentLocation, batteryLevel = 100 }) => {
  const { user } = useAuth();
  const [isStartingTrip, setIsStartingTrip] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [showReminder, setShowReminder] = useState(false);
  const [hasTriggeredReminder, setHasTriggeredReminder] = useState(false);
  const [tripData, setTripData] = useState({
    destination: '',
    duration: '2',
    reminderMinutes: '1'
  });

  // Helper functions
  const getStatusColor = () => {
    switch (backendStatus) {
      case 'connected': return 'status-connected';
      case 'disconnected': return 'status-disconnected';
      default: return 'status-checking';
    }
  };

  const getStatusText = () => {
    switch (backendStatus) {
      case 'connected': return '✅ Backend Connected';
      case 'disconnected': return '❌ Backend Disconnected';
      default: return '🔍 Checking Connection...';
    }
  };

  // Format seconds to live countdown
  const formatTime = (seconds) => {
    if (seconds === null || seconds < 0) return '0s';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Send popup notification
  const sendPopupNotification = (title, message) => {
    console.log(`🔔 POPUP: ${title} - ${message}`);
    
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/logo192.png',
        requireInteraction: true // Keep notification until user interacts
      });
    }
    
    // ALWAYS SHOW ALERT POPUP - This is the main fix
    alert(`🔔 ${title}\n\n${message}\n\nClick OK to acknowledge.`);
  };

  // DEBUG: Log trip data
  useEffect(() => {
    if (activeTrip) {
      console.log('🔍 ACTIVE TRIP DEBUG DATA:');
      console.log('Trip end time:', activeTrip.tripEndTime);
      console.log('Reminder minutes:', activeTrip.reminderMinutes);
      console.log('Duration:', activeTrip.duration);
      
      if (activeTrip.tripEndTime) {
        const now = new Date();
        const endTime = new Date(activeTrip.tripEndTime);
        const remainingMs = endTime - now;
        const remainingSeconds = Math.floor(remainingMs / 1000);
        console.log('Initial time remaining:', remainingSeconds, 'seconds');
        setTimeRemaining(remainingSeconds);
      }
    }
  }, [activeTrip]);

  // REAL-TIME COUNTDOWN TIMER WITH WORKING POPUP REMINDERS
  useEffect(() => {
    let interval;
    
    if (activeTrip && activeTrip.tripEndTime) {
      console.log('⏰ STARTING COUNTDOWN TIMER');
      console.log('Reminder will trigger at:', activeTrip.reminderMinutes, 'minutes remaining');
      
      // Reset reminder trigger when starting new trip
      setHasTriggeredReminder(false);
      setShowReminder(false);

      interval = setInterval(() => {
        const now = new Date();
        const endTime = new Date(activeTrip.tripEndTime);
        const remainingMs = endTime - now;
        const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
        const remainingMinutes = Math.floor(remainingSeconds / 60);
        
        setTimeRemaining(remainingSeconds);
        
        const reminderMinutes = parseInt(activeTrip.reminderMinutes || 1);
        
        console.log(`⏰ Countdown: ${remainingSeconds}s (${remainingMinutes}m) | Reminder set for: ${reminderMinutes}m remaining`);

        // FIXED: Reminder trigger logic
        if (remainingMinutes === reminderMinutes && !hasTriggeredReminder && remainingMinutes > 0) {
          console.log(`🔔🔔🔔 REMINDER POPUP TRIGGERED! ${remainingMinutes} minutes remaining`);
          sendPopupNotification('⏰ TRIP REMINDER', 
            `Your trip is ending in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}!\n\n` +
            `Destination: ${activeTrip.endLocation?.address || 'Unknown'}\n` +
            `Please check in now to confirm your safety.`
          );
          setHasTriggeredReminder(true);
          setShowReminder(true);
        }

        // Handle trip completion
        if (remainingMs <= 0) {
          console.log('⏰ TIME EXPIRED - Auto-alert should trigger');
          clearInterval(interval);
          setTimeRemaining(0);
          
          if (activeTrip.status === 'active') {
            console.log('🚨 AUTO-ALERT TRIGGERED');
            sendPopupNotification('🚨 EMERGENCY ALERT', 
              'Trip completed without check-in!\n\n' +
              'Emergency contacts have been notified with your last location.\n' +
              'Please check in immediately if you are safe.'
            );
            handleAutoEnd();
          }
        }
        
      }, 1000); // Update every second
    }

    return () => {
      if (interval) {
        clearInterval(interval);
        console.log('⏰ Countdown timer cleaned up');
      }
    };
  }, [activeTrip, hasTriggeredReminder]); // Added hasTriggeredReminder to dependencies

  // Poll for backend status
  useEffect(() => {
    let pollInterval;

    if (activeTrip && activeTrip._id) {
      pollInterval = setInterval(async () => {
        try {
          const response = await tripsAPI.getStatus(activeTrip._id);
          if (response.data.success) {
            const updatedTrip = response.data.trip;
            
            // Check if backend triggered an alert
            if (updatedTrip.status === 'alerted' && activeTrip.status !== 'alerted') {
              console.log('🚨 BACKEND AUTO-ALERT DETECTED');
              sendPopupNotification('🚨 EMERGENCY ALERT', 
                'Auto-alert was sent to your emergency contacts!\n\n' +
                'They have been notified with your location. Please check in immediately.'
              );
              handleAutoEnd();
            }
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 10000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [activeTrip]);

  const handleAutoEnd = async () => {
    console.log('🔄 Auto-ending trip');
    if (activeTrip && activeTrip._id) {
      try {
        await tripsAPI.end(activeTrip._id);
        console.log('✅ Trip auto-ended successfully');
      } catch (error) {
        console.error('Error auto-ending trip:', error);
      }
    }
    onTripEnd();
    setTimeRemaining(null);
    setShowReminder(false);
    setHasTriggeredReminder(false);
  };

  const checkBackendConnection = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/health');
      if (response.ok) {
        setBackendStatus('connected');
      } else {
        setBackendStatus('disconnected');
      }
    } catch (error) {
      setBackendStatus('disconnected');
    }
  };

  const checkActiveTrip = async () => {
    try {
      const response = await tripsAPI.getActive();
      if (response.data.success && response.data.trip) {
        console.log('✅ Found active trip:', response.data.trip);
        onTripStart(response.data.trip);
      }
    } catch (error) {
      console.log('No active trip found');
    }
  };

  const handleStartTrip = async (e) => {
    e.preventDefault();
    
    if (!tripData.destination || !tripData.duration || !tripData.reminderMinutes) {
      alert('Please fill in all fields');
      return;
    }

    const duration = parseInt(tripData.duration);
    const reminderMinutes = parseInt(tripData.reminderMinutes);

    // Frontend validation
    if (duration < 1) {
      alert('❌ Trip duration must be at least 1 minute');
      return;
    }

    if (reminderMinutes >= duration) {
      alert(`❌ Reminder must be before trip ends (${reminderMinutes} minutes >= ${duration} minutes)`);
      return;
    }

    if (reminderMinutes < 1) {
      alert('❌ Reminder must be at least 1 minute');
      return;
    }

    setIsStartingTrip(true);

    try {
      const location = currentLocation || await LocationService.getCurrentLocation();
      
      const tripPayload = {
        startLocation: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: "Current Location"
        },
        endLocation: {
          latitude: location.latitude + 0.01,
          longitude: location.longitude + 0.01,
          address: tripData.destination
        },
        duration: duration,
        reminderMinutes: reminderMinutes,
        safeZones: []
      };

      console.log('🚀 Starting trip with payload:', tripPayload);

      const response = await tripsAPI.start(tripPayload);
      
      if (response.data.success) {
        console.log('✅ Trip created successfully:', response.data.trip);
        onTripStart(response.data.trip);
        setIsStartingTrip(false);
        setBackendStatus('connected');
        
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              console.log('✅ Notification permission granted');
            }
          });
        }
        
        // Show confirmation with reminder info
        alert(`✅ TRIP STARTED!\n\n` +
          `Duration: ${duration} minutes\n` +
          `Reminder: ${reminderMinutes} minutes before end\n` +
          `You will get a popup reminder when ${reminderMinutes} minute${reminderMinutes > 1 ? 's' : ''} remain.\n\n` +
          `Watch the countdown timer!`);
        
        // Reset form
        setTripData({
          destination: '',
          duration: '2',
          reminderMinutes: '1'
        });
      }
    } catch (error) {
      console.error('❌ Trip start error:', error);
      
      if (error.response?.data?.message) {
        alert(`❌ Backend Error: ${error.response.data.message}`);
      } else {
        alert('❌ Cannot connect to backend. Check if server is running.');
      }
      
      setBackendStatus('disconnected');
      setIsStartingTrip(false);
    }
  };

  const handleEndTrip = async () => {
    try {
      if (activeTrip._id) {
        await tripsAPI.end(activeTrip._id);
      }
      onTripEnd();
      setTimeRemaining(null);
      setShowReminder(false);
      setHasTriggeredReminder(false);
      sendPopupNotification('✅ Trip Ended Safely', 'Thank you for completing your trip safely!');
    } catch (error) {
      console.error('Error ending trip:', error);
      alert('Error ending trip.');
    }
  };

  const handleCheckIn = async () => {
    try {
      if (activeTrip._id && currentLocation) {
        await tripsAPI.checkIn(activeTrip._id, currentLocation, batteryLevel);
      }
      onTripEnd();
      setTimeRemaining(null);
      setShowReminder(false);
      setHasTriggeredReminder(false);
      sendPopupNotification('✅ Check-in Successful', 'Thank you for checking in safely! Your emergency contacts have been notified.');
    } catch (error) {
      console.error('Error checking in:', error);
      alert('Error checking in.');
    }
  };

  // Initial setup
  useEffect(() => {
    checkBackendConnection();
    checkActiveTrip();
    
    // Request notification permission on startup
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  if (activeTrip) {
    const displayDuration = activeTrip.duration?.planned || activeTrip.duration || 'Unknown';
    const displayReminder = activeTrip.reminderMinutes || '1';
    
    return (
      <div className="trip-manager active-trip">
        <div className="connection-statuses">
          <div className={`backend-status ${getStatusColor()}`}>
            {getStatusText()}
          </div>
          <div className="battery-status">
            🔋 {batteryLevel}%
          </div>
          <div className="polling-status">
            🔄 Active
          </div>
        </div>

        <h3>🚀 Active Trip</h3>
        
        {showReminder && (
          <div className="trip-reminder-alert">
            <div className="reminder-header">
              <span>⏰</span>
              <strong>REMINDER ACTIVE!</strong>
            </div>
            <p>Trip ending soon! Please check in now.</p>
          </div>
        )}
        
        <div className="trip-info">
          <div className="trip-status active">ACTIVE</div>
          <div className="trip-details">
            <p><strong>Destination:</strong> {activeTrip.endLocation?.address || 'Unknown'}</p>
            <p><strong>Started:</strong> {new Date(activeTrip.createdAt).toLocaleTimeString()}</p>
            <p><strong>Duration:</strong> {displayDuration} minutes</p>
            <p><strong>Reminder:</strong> {displayReminder} minutes before end</p>
            
            {timeRemaining !== null && (
              <div className="time-remaining-container">
                <p className="time-remaining">
                  <strong>Live Countdown: </strong>
                  <span className={timeRemaining < 60 ? 'warning' : ''}>
                    {formatTime(timeRemaining)}
                  </span>
                </p>
                {timeRemaining < 120 && timeRemaining > 0 && (
                  <div className="countdown-alert">
                    ⏰ Ending soon: {formatTime(timeRemaining)}
                  </div>
                )}
                {timeRemaining === 0 && (
                  <div className="countdown-finished">
                    🚨 Time expired! Emergency alert sent.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="trip-actions">
          <button onClick={handleCheckIn} className="btn btn-primary">
            ✅ Check In Safe
          </button>
          <button onClick={handleEndTrip} className="btn btn-secondary">
            🏁 End Trip
          </button>
        </div>

        <div className="popup-info">
          <p>💡 <strong>Popup reminders will appear automatically!</strong></p>
          <p>You'll get a popup when {displayReminder} minute{displayReminder > 1 ? 's' : ''} remain.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="trip-manager">
      <div className="connection-statuses">
        <div className={`backend-status ${getStatusColor()}`}>
          {getStatusText()}
        </div>
      </div>

      <h3>🚀 Start New Safety Trip</h3>
      
      <form onSubmit={handleStartTrip} className="trip-form">
        <div className="form-group">
          <label>Destination:</label>
          <input
            type="text"
            value={tripData.destination}
            onChange={(e) => setTripData({...tripData, destination: e.target.value})}
            placeholder="Where are you going?"
            required
          />
        </div>

        <div className="form-group">
          <label>Trip Duration (minutes):</label>
          <input
            type="number"
            min="1"
            max="1440"
            value={tripData.duration}
            onChange={(e) => setTripData({...tripData, duration: e.target.value})}
            placeholder="Enter minutes (1-1440)"
            required
          />
          <small>Minimum: 1 minute, Maximum: 24 hours (1440 minutes)</small>
        </div>

        <div className="form-group">
          <label>Reminder Before End (minutes):</label>
          <input
            type="number"
            min="1"
            max="60"
            value={tripData.reminderMinutes}
            onChange={(e) => setTripData({...tripData, reminderMinutes: e.target.value})}
            placeholder="Enter minutes (1-60)"
            required
          />
          <small>When to show popup reminder before trip ends</small>
        </div>

        <button 
          type="submit" 
          className="btn btn-primary start-trip-btn"
          disabled={isStartingTrip || backendStatus === 'disconnected'}
        >
          {isStartingTrip ? 'Starting...' : '🚀 Start Safety Trip'}
        </button>

       
      </form>
    </div>
  );
};

export default TripManager;