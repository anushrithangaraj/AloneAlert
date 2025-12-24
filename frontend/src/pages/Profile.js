import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/auth';
import axios from 'axios';
import '../styles/Profile.css';

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await axios.put('/api/users/profile', profile);
      
      if (response.data.success) {
        setMessage('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage('Error updating profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStats = () => {
    // Mock stats - in real app, fetch from API
    return {
      totalTrips: 12,
      completedTrips: 10,
      alertsTriggered: 2,
      safeZones: 3
    };
  };

  const stats = getStats();

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>Your Profile</h1>
        <p>Manage your account settings and view your safety statistics</p>
      </div>

      <div className="profile-content">
        <div className="profile-stats">
          <h3>Safety Statistics</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{stats.totalTrips}</div>
              <div className="stat-label">Total Trips</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.completedTrips}</div>
              <div className="stat-label">Completed Safely</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.alertsTriggered}</div>
              <div className="stat-label">Alerts Triggered</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.safeZones}</div>
              <div className="stat-label">Safe Zones</div>
            </div>
          </div>
        </div>

        <div className="profile-form-section">
          <h3>Personal Information</h3>
          
          {message && (
            <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={profile.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={profile.email}
                onChange={handleChange}
                required
                disabled
              />
              <small>Email cannot be changed</small>
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={profile.phone}
                onChange={handleChange}
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
          </form>
        </div>

        <div className="profile-actions">
          <h3>Account Actions</h3>
          <div className="action-buttons">
            <button className="btn btn-secondary">
              Export Trip Data
            </button>
            <button className="btn btn-secondary">
              Change Password
            </button>
            <button className="btn btn-danger">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;