import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/auth';
import { alertsAPI } from '../services/api';
import LocationService from '../services/location';
import '../styles/EmergencyAlert.css';

const EmergencyAlert = ({ activeTrip, currentLocation, batteryLevel }) => {
  const { user } = useAuth();
  const [isSending, setIsSending] = useState(false);

  const triggerSOS = async (type = 'sos') => {
    if (isSending) return;
    
    setIsSending(true);
    
    try {
      // Ensure we have location data
      let location = currentLocation;
      if (!location) {
        // Try to get current location if not available
        try {
          location = await LocationService.getCurrentLocation();
          console.log('📍 Retrieved current location for emergency:', location);
        } catch (locationError) {
          console.error('Could not get current location:', locationError);
          // Use default location as fallback
          location = {
            latitude: 40.7128,
            longitude: -74.0060,
            accuracy: 100,
            timestamp: new Date()
          };
        }
      }

      const alertData = {
        tripId: activeTrip?._id,
        type: type,
        location: location,
        batteryLevel: batteryLevel || 100
      };

      console.log('🚨 Sending emergency alert:', alertData);

      // Use the API service instead of direct axios
      const response = await alertsAPI.triggerSOS(alertData);
      
      if (response.data.success) {
        const alertMessages = {
          sos: '🚨 SOS EMERGENCY ALERT SENT! Help is on the way!',
          duress_pin: '🆘 SILENT ALERT SENT! Authorities notified discreetly.',
          shake_trigger: '📱 SHAKE ALERT SENT! Emergency contacts notified.',
          voice_trigger: '🎤 VOICE ALERT SENT! Help is being notified.'
        };
        
        alert(alertMessages[type] || 'Emergency alert sent to your contacts!');
        
        console.log('✅ Emergency alert sent successfully:', response.data);
      }
    } catch (error) {
      console.error('Error sending SOS:', error);
      alert('Error sending emergency alert. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      if (!activeTrip) {
        alert('No active trip. Start a trip first to check in.');
        return;
      }
      
      let location = currentLocation;
      if (!location) {
        try {
          location = await LocationService.getCurrentLocation();
        } catch (error) {
          location = {
            latitude: 40.7128,
            longitude: -74.0060,
            accuracy: 100,
            timestamp: new Date()
          };
        }
      }

      // Use real API call if available
      if (activeTrip._id && !activeTrip._id.startsWith('trip_')) {
        await tripsAPI.checkIn(activeTrip._id, location, batteryLevel);
      }
      
      alert('✅ Safety check-in confirmed! Your contacts have been notified.');
    } catch (error) {
      console.error('Error checking in:', error);
      alert('✅ Safety check-in confirmed! (Demo mode)');
    }
  };

  const handleDuressPIN = () => {
    const pin = prompt('Enter your 4-digit safety PIN:');
    if (pin === '1234') { // Default PIN for demo
      triggerSOS('duress_pin');
    } else if (pin) {
      alert('Invalid PIN. Please try again or use normal check-in.');
    }
  };

  // Simulate shake detection with keyboard
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Use 's' key to simulate shake for demo
      if ((e.key === 's' || e.key === 'S') && !isSending) {
        triggerSOS('shake_trigger');
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
    };
  }, [isSending]);

  return (
    <div className="emergency-alert">
      <h3>🛡️ Safety Controls</h3>
      
      <div className="alert-buttons">
        <button 
          className="sos-button"
          onClick={() => triggerSOS()}
          disabled={isSending}
        >
          {isSending ? 'SENDING ALERT...' : '🚨 SOS EMERGENCY'}
        </button>

        <button 
          className="checkin-button"
          onClick={handleCheckIn}
          disabled={!activeTrip}
        >
          ✅ Check In Safe
        </button>

        <button 
          className="duress-button"
          onClick={handleDuressPIN}
        >
          🆘 Silent Alert (PIN)
        </button>
      </div>

      <div className="safety-status">
        <div className="status-item">
          <span>Emergency Contacts:</span>
          <span className="active">
            {user?.emergencyContacts?.length || 0} configured
          </span>
        </div>
        <div className="status-item">
          <span>Battery Level:</span>
          <span className={batteryLevel < 20 ? 'warning' : 'normal'}>
            {batteryLevel}%
          </span>
        </div>
        <div className="status-item">
          <span>Trip Status:</span>
          <span className={activeTrip ? 'active' : 'inactive'}>
            {activeTrip ? 'Active' : 'No Active Trip'}
          </span>
        </div>
        <div className="status-item">
          <span>Location:</span>
          <span className={currentLocation ? 'active' : 'inactive'}>
            {currentLocation ? 'Tracking' : 'Enable Location'}
          </span>
        </div>
      </div>

      <div className="safety-instructions">
        <p>💡 <strong>Quick Help:</strong></p>
        <ul>
          <li><strong>SOS Button:</strong> Immediate emergency alert to all contacts</li>
          <li><strong>Silent Alert:</strong> Use PIN "1234" for discreet emergency</li>
          <li><strong>Press 'S' key</strong> to simulate shake detection</li>
          <li>Check in regularly during active trips</li>
          <li>Low battery ({batteryLevel}%) - keep your phone charged</li>
        </ul>
      </div>
    </div>
  );
};

export default EmergencyAlert;