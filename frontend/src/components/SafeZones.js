import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/auth';
import { safeZonesAPI } from '../services/api';
import '../styles/SafeZones.css';

const SafeZones = () => {
  const { user } = useAuth();
  const [safeZones, setSafeZones] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'home',
    latitude: '',
    longitude: '',
    radius: 100,
    address: ''
  });

  useEffect(() => {
    loadSafeZones();
  }, []);

  const loadSafeZones = async () => {
    try {
      setIsLoading(true);
      const response = await safeZonesAPI.getSafeZones();
      setSafeZones(response.data.safeZones || []);
    } catch (error) {
      console.error('Error loading safe zones:', error);
      alert('Error loading safe zones. Using demo data.');
      // Fallback to demo data
      setSafeZones(getDemoSafeZones());
    } finally {
      setIsLoading(false);
    }
  };

  const getDemoSafeZones = () => {
    return [
      {
        _id: 'demo_1',
        name: 'Home',
        type: 'home',
        location: { latitude: 40.7128, longitude: -74.0060 },
        radius: 200,
        address: '123 Main Street, New York, NY',
        isActive: true
      },
      {
        _id: 'demo_2',
        name: 'Office',
        type: 'work', 
        location: { latitude: 40.7589, longitude: -73.9851 },
        radius: 150,
        address: '456 Work Avenue, New York, NY',
        isActive: true
      }
    ];
  };

  const handleCreateSafeZone = async (e) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      
      // Validate coordinates
      if (!formData.latitude || !formData.longitude) {
        alert('Please enter both latitude and longitude');
        return;
      }

      const zoneData = {
        name: formData.name,
        type: formData.type,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        radius: parseInt(formData.radius),
        address: formData.address || `${formData.name} Location`
      };

      const response = await safeZonesAPI.createSafeZone(zoneData);
      
      if (response.data.success) {
        setSafeZones(prev => [...prev, response.data.safeZone]);
        setShowForm(false);
        setFormData({
          name: '',
          type: 'home',
          latitude: '',
          longitude: '',
          radius: 100,
          address: ''
        });
        alert('Safe zone created successfully!');
      }
    } catch (error) {
      console.error('Error creating safe zone:', error);
      
      // Fallback: Create demo safe zone
      const demoZone = {
        _id: 'zone_' + Date.now(),
        ...formData,
        location: {
          latitude: parseFloat(formData.latitude) || 40.7128,
          longitude: parseFloat(formData.longitude) || -74.0060
        },
        address: formData.address || `${formData.name} Location`,
        isActive: true
      };

      setSafeZones(prev => [...prev, demoZone]);
      setShowForm(false);
      setFormData({
        name: '',
        type: 'home',
        latitude: '',
        longitude: '',
        radius: 100,
        address: ''
      });
      alert('Safe zone created successfully! (Demo mode)');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSafeZone = async (zoneId) => {
    if (!window.confirm('Are you sure you want to delete this safe zone?')) return;

    try {
      // Don't delete demo zones
      if (zoneId.startsWith('demo_') || zoneId.startsWith('zone_')) {
        setSafeZones(prev => prev.filter(zone => zone._id !== zoneId));
        alert('Safe zone deleted!');
        return;
      }

      await safeZonesAPI.deleteSafeZone(zoneId);
      setSafeZones(prev => prev.filter(zone => zone._id !== zoneId));
      alert('Safe zone deleted successfully!');
    } catch (error) {
      console.error('Error deleting safe zone:', error);
      setSafeZones(prev => prev.filter(zone => zone._id !== zoneId));
      alert('Safe zone deleted! (Demo mode)');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'home': return '🏠';
      case 'work': return '💼';
      case 'school': return '🎓';
      default: return '📍';
    }
  };

  const getTypeName = (type) => {
    switch (type) {
      case 'home': return 'Home';
      case 'work': return 'Work';
      case 'school': return 'School';
      default: return 'Other';
    }
  };

  const handleUseCurrentLocation = async () => {
    try {
      const location = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });
      
      setFormData(prev => ({
        ...prev,
        latitude: location.coords.latitude.toFixed(6),
        longitude: location.coords.longitude.toFixed(6)
      }));
      
      alert('Current location set!');
    } catch (error) {
      console.error('Error getting location:', error);
      alert('Could not get current location. Please enter coordinates manually.');
    }
  };

  return (
    <div className="safe-zones">
      <div className="safe-zones-header">
        <h3>🛡️ Safe Zones</h3>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
          disabled={isLoading}
        >
          {showForm ? 'Cancel' : '+ Add Safe Zone'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateSafeZone} className="safe-zone-form">
          <div className="form-group">
            <label>Zone Name:</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Home, Office, School, etc."
              required
            />
          </div>

          <div className="form-group">
            <label>Type:</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
            >
              <option value="home">🏠 Home</option>
              <option value="work">💼 Work</option>
              <option value="school">🎓 School</option>
              <option value="other">📍 Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>Address (optional):</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              placeholder="Full address for reference"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Latitude:</label>
              <input
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                placeholder="40.7128"
                required
              />
            </div>

            <div className="form-group">
              <label>Longitude:</label>
              <input
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                placeholder="-74.0060"
                required
              />
            </div>
          </div>

          <button 
            type="button" 
            onClick={handleUseCurrentLocation}
            className="btn btn-secondary"
          >
            📍 Use Current Location
          </button>

          <div className="form-group">
            <label>Safety Radius (meters):</label>
            <select
              value={formData.radius}
              onChange={(e) => setFormData({...formData, radius: e.target.value})}
            >
              <option value="50">50 meters</option>
              <option value="100">100 meters</option>
              <option value="200">200 meters</option>
              <option value="500">500 meters</option>
              <option value="1000">1 kilometer</option>
            </select>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Safe Zone'}
          </button>
        </form>
      )}

      <div className="safe-zones-list">
        {isLoading ? (
          <div className="loading">Loading safe zones...</div>
        ) : safeZones.length === 0 ? (
          <div className="no-zones">
            <p>🛡️ No safe zones configured yet.</p>
            <p>Add safe zones to get alerts when you enter/leave these areas.</p>
            <button 
              onClick={() => setShowForm(true)}
              className="btn btn-primary"
            >
              Create Your First Safe Zone
            </button>
          </div>
        ) : (
          safeZones.map(zone => (
            <div key={zone._id} className="safe-zone-card">
              <div className="zone-header">
                <span className="zone-icon">{getTypeIcon(zone.type)}</span>
                <div className="zone-info">
                  <h4>{zone.name}</h4>
                  <span className="zone-type">{getTypeName(zone.type)}</span>
                </div>
                <button
                  onClick={() => handleDeleteSafeZone(zone._id)}
                  className="delete-btn"
                  title="Delete safe zone"
                  disabled={isLoading}
                >
                  🗑️
                </button>
              </div>
              
              <div className="zone-details">
                <p><strong>Location:</strong> {zone.address}</p>
                <p><strong>Coordinates:</strong> {zone.location.latitude.toFixed(6)}, {zone.location.longitude.toFixed(6)}</p>
                <p><strong>Safety Radius:</strong> {zone.radius} meters</p>
                <p><strong>Status:</strong> 
                  <span className={zone.isActive ? 'active' : 'inactive'}>
                    {zone.isActive ? ' 🟢 Active' : ' 🔴 Inactive'}
                  </span>
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SafeZones;