import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../services/auth';
import '../styles/Notifications.css';

const Notifications = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [activeTab, setActiveTab] = useState('alerts');
  
  // Filter states for trips
  const [tripFilters, setTripFilters] = useState({
    status: 'all',
    dateRange: 'all',
    search: ''
  });
  
  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });

  const dateRanges = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' }
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'completed', label: 'Completed' },
    { value: 'alerted', label: 'Alerted' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'active', label: 'Active' }
  ];

  useEffect(() => {
    loadAlerts();
    loadTrips();
  }, []);

  useEffect(() => {
    loadTrips();
  }, [tripFilters, pagination.page]);

  const loadAlerts = async () => {
    try {
      const response = await axios.get('/api/alerts');
      setAlerts(response.data.alerts || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
      // If endpoint doesn't exist, show empty state
      setAlerts([]);
    }
  };

  const loadTrips = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(tripFilters.status !== 'all' && { status: tripFilters.status })
      };

      const response = await axios.get('/api/trips/history', { params });
      
      if (response.data.success) {
        setTrips(response.data.trips || []);
        setPagination(prev => ({
          ...prev,
          total: response.data.total,
          totalPages: response.data.totalPages
        }));
      }
    } catch (error) {
      console.error('Error loading trips:', error);
      // If endpoint doesn't exist, show empty state
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAlert = async (alertId) => {
    try {
      await axios.patch(`/api/alerts/${alertId}/resolve`);
      setAlerts(prev => prev.map(alert => 
        alert._id === alertId ? { ...alert, isResolved: true, resolvedAt: new Date() } : alert
      ));
      alert('Alert marked as resolved!');
    } catch (error) {
      console.error('Error resolving alert:', error);
      alert('Error resolving alert. Please try again.');
    }
  };

  // Filter trips based on current filters
  const getFilteredTrips = () => {
    let filtered = trips;

    // Date range filter (frontend)
    const now = new Date();
    filtered = filtered.filter(trip => {
      const tripDate = new Date(trip.createdAt);
      
      switch (tripFilters.dateRange) {
        case 'today':
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return tripDate >= today;
        case 'week':
          const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
          return tripDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
          return tripDate >= monthAgo;
        default:
          return true;
      }
    });

    // Search filter
    if (tripFilters.search) {
      const searchTerm = tripFilters.search.toLowerCase();
      filtered = filtered.filter(trip => {
        const startAddress = trip.startLocation?.address?.toLowerCase() || '';
        const endAddress = trip.endLocation?.address?.toLowerCase() || '';
        const status = trip.status.toLowerCase();
        
        return startAddress.includes(searchTerm) || 
               endAddress.includes(searchTerm) || 
               status.includes(searchTerm);
      });
    }

    return filtered;
  };

  const getAlertIcon = (type) => {
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

  const getAlertSeverity = (severity) => {
    switch (severity) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low': return 'low';
      default: return 'medium';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return <span className="status-badge completed">✅ Completed</span>;
      case 'alerted': return <span className="status-badge alerted">🚨 Alerted</span>;
      case 'cancelled': return <span className="status-badge cancelled">❌ Cancelled</span>;
      case 'active': return <span className="status-badge active">🟢 Active</span>;
      default: return <span className="status-badge unknown">❓ {status}</span>;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const calculateDurationDifference = (planned, actual) => {
    if (!actual || !planned) return 'N/A';
    const difference = actual - planned;
    if (difference === 0) return 'On time';
    return difference > 0 ? `+${difference}m` : `${difference}m`;
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const filteredTrips = getFilteredTrips();

  if (loading && trips.length === 0 && alerts.length === 0) {
    return <div className="loading">Loading safety history...</div>;
  }

  return (
    <div className="notifications">
      <div className="notifications-header">
        <h2>Safety History</h2>
        <div className="header-actions">
          <button 
            className={`tab-button ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            🔔 Alerts ({alerts.length})
          </button>
          <button 
            className={`tab-button ${activeTab === 'trips' ? 'active' : ''}`}
            onClick={() => setActiveTab('trips')}
          >
            🗓️ Trips ({pagination.total})
          </button>
          <button onClick={activeTab === 'alerts' ? loadAlerts : loadTrips} className="btn btn-secondary">
            Refresh
          </button>
        </div>
      </div>

      {activeTab === 'alerts' ? (
        <div className="alerts-container">
          {alerts.length === 0 ? (
            <div className="no-alerts">
              <div className="no-alerts-icon">✅</div>
              <h3>No Safety Alerts</h3>
              <p>You haven't triggered any safety alerts yet.</p>
            </div>
          ) : (
            <div className="alerts-list">
              {alerts.map(alert => (
                <div 
                  key={alert._id} 
                  className={`alert-card ${getAlertSeverity(alert.severity)} ${alert.isResolved ? 'resolved' : 'active'}`}
                  onClick={() => setSelectedAlert(alert)}
                >
                  <div className="alert-header">
                    <div className="alert-icon">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="alert-info">
                      <h4>{alert.type.replace(/_/g, ' ').toUpperCase()}</h4>
                      <span className="alert-time">
                        {formatDate(alert.createdAt)}
                      </span>
                    </div>
                    <div className="alert-status">
                      {alert.isResolved ? (
                        <span className="status resolved">Resolved</span>
                      ) : (
                        <span className="status active">Active</span>
                      )}
                    </div>
                  </div>

                  <div className="alert-details">
                    <p>{alert.message}</p>
                    
                    {alert.location && (
                      <div className="alert-location">
                        <strong>Location:</strong> 
                        {alert.location.address || `${alert.location.latitude?.toFixed(4)}, ${alert.location.longitude?.toFixed(4)}`}
                      </div>
                    )}

                    {alert.batteryLevel && (
                      <div className="alert-battery">
                        <strong>Battery:</strong> {alert.batteryLevel}%
                      </div>
                    )}
                  </div>

                  {!alert.isResolved && (
                    <div className="alert-actions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResolveAlert(alert._id);
                        }}
                        className="btn btn-small btn-primary"
                      >
                        Mark Resolved
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="trips-container">
          {/* Filters */}
          <div className="trips-filters">
            <div className="filter-group">
              <label>Status:</label>
              <select 
                value={tripFilters.status}
                onChange={(e) => {
                  setTripFilters({...tripFilters, status: e.target.value});
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Date Range:</label>
              <select 
                value={tripFilters.dateRange}
                onChange={(e) => setTripFilters({...tripFilters, dateRange: e.target.value})}
              >
                {dateRanges.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Search:</label>
              <input
                type="text"
                placeholder="Search locations..."
                value={tripFilters.search}
                onChange={(e) => setTripFilters({...tripFilters, search: e.target.value})}
              />
            </div>

            <div className="filter-stats">
              Showing {filteredTrips.length} of {pagination.total} trips
            </div>
          </div>

          {/* Trips Table */}
          {filteredTrips.length === 0 ? (
            <div className="no-trips">
              <div className="no-trips-icon">🗺️</div>
              <h3>No Trips Found</h3>
              <p>{trips.length === 0 ? 'You haven\'t taken any trips yet.' : 'No trips match your current filters.'}</p>
            </div>
          ) : (
            <>
              <div className="trips-table-container">
                <table className="trips-table">
                  <thead>
                    <tr>
                      <th>Route</th>
                      <th>Date & Time</th>
                      <th>Planned Duration</th>
                      <th>Actual Duration</th>
                      <th>Difference</th>
                      <th>Status</th>
                      <th>Alerts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrips.map(trip => (
                      <tr key={trip._id} className="trip-row">
                        <td className="route-cell">
                          <div className="route-info">
                            <div className="route-from">
                              <span className="route-marker">📍</span>
                              {trip.startLocation?.address || 'Unknown Start'}
                            </div>
                            <div className="route-to">
                              <span className="route-marker">🎯</span>
                              {trip.endLocation?.address || 'Unknown Destination'}
                            </div>
                          </div>
                        </td>
                        <td className="date-cell">
                          <div className="trip-date">
                            {new Date(trip.createdAt).toLocaleDateString()}
                          </div>
                          <div className="trip-time">
                            {new Date(trip.createdAt).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="duration-cell">
                          {formatDuration(trip.duration?.planned)}
                        </td>
                        <td className="duration-cell">
                          {formatDuration(trip.duration?.actual)}
                        </td>
                        <td className="difference-cell">
                          <span className={
                            trip.duration?.actual && trip.duration?.planned ? 
                              (trip.duration.actual > trip.duration.planned ? 'duration-over' : 'duration-under') 
                              : 'duration-unknown'
                          }>
                            {calculateDurationDifference(trip.duration?.planned, trip.duration?.actual)}
                          </span>
                        </td>
                        <td className="status-cell">
                          {getStatusBadge(trip.status)}
                        </td>
                        <td className="alerts-cell">
                          {trip.alerts && trip.alerts.length > 0 ? (
                            <div className="trip-alerts">
                              <span className="alert-count">{trip.alerts.length}</span>
                              <span className="alert-text">alert(s)</span>
                            </div>
                          ) : (
                            <span className="no-alerts">No alerts</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="pagination">
                  <button 
                    disabled={pagination.page === 1}
                    onClick={() => handlePageChange(pagination.page - 1)}
                    className="pagination-btn"
                  >
                    Previous
                  </button>
                  
                  <span className="pagination-info">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  
                  <button 
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => handlePageChange(pagination.page + 1)}
                    className="pagination-btn"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}

          {/* Trips Summary */}
          {trips.length > 0 && (
            <div className="trips-summary">
              <h4>Trips Summary</h4>
              <div className="summary-stats">
                <div className="stat-item">
                  <span className="stat-value">{trips.filter(t => t.status === 'completed').length}</span>
                  <span className="stat-label">Completed Safely</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{trips.filter(t => t.status === 'alerted').length}</span>
                  <span className="stat-label">With Alerts</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">
                    {trips.filter(t => t.duration?.actual).length > 0 
                      ? Math.round(trips.filter(t => t.duration?.actual).reduce((acc, t) => acc + t.duration.actual, 0) / trips.filter(t => t.duration?.actual).length)
                      : 0
                    }m
                  </span>
                  <span className="stat-label">Avg. Duration</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{trips.length}</span>
                  <span className="stat-label">Total Trips</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div className="modal-overlay" onClick={() => setSelectedAlert(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Alert Details</h3>
              <button 
                onClick={() => setSelectedAlert(null)}
                className="close-btn"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-item">
                <label>Type:</label>
                <span>{selectedAlert.type.replace(/_/g, ' ').toUpperCase()}</span>
              </div>

              <div className="detail-item">
                <label>Severity:</label>
                <span className={`severity ${getAlertSeverity(selectedAlert.severity)}`}>
                  {selectedAlert.severity.toUpperCase()}
                </span>
              </div>

              <div className="detail-item">
                <label>Time:</label>
                <span>{formatDate(selectedAlert.createdAt)}</span>
              </div>

              <div className="detail-item">
                <label>Message:</label>
                <span>{selectedAlert.message}</span>
              </div>

              {selectedAlert.location && (
                <div className="detail-item">
                  <label>Location:</label>
                  <span>
                    {selectedAlert.location.address || 
                     `${selectedAlert.location.latitude}, ${selectedAlert.location.longitude}`}
                  </span>
                </div>
              )}

              {selectedAlert.batteryLevel && (
                <div className="detail-item">
                  <label>Battery Level:</label>
                  <span>{selectedAlert.batteryLevel}%</span>
                </div>
              )}

              {selectedAlert.notificationsSent && selectedAlert.notificationsSent.length > 0 && (
                <div className="detail-item">
                  <label>Notifications Sent:</label>
                  <div className="notifications-list">
                    {selectedAlert.notificationsSent.map((notification, index) => (
                      <div key={index} className="notification-item">
                        <span>{notification.contact}</span>
                        <span className={`status ${notification.status}`}>
                          {notification.status}
                        </span>
                        <span>{formatDate(notification.sentAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedAlert.resolvedAt && (
                <div className="detail-item">
                  <label>Resolved At:</label>
                  <span>{formatDate(selectedAlert.resolvedAt)}</span>
                </div>
              )}
            </div>

            <div className="modal-actions">
              {!selectedAlert.isResolved && (
                <button
                  onClick={() => {
                    handleResolveAlert(selectedAlert._id);
                    setSelectedAlert(null);
                  }}
                  className="btn btn-primary"
                >
                  Mark as Resolved
                </button>
              )}
              <button
                onClick={() => setSelectedAlert(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;