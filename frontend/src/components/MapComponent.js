import React, { useEffect, useRef, useState } from 'react';
import '../styles/MapComponent.css';

const MapComponent = ({ activeTrip, currentLocation }) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [mapError, setMapError] = useState('');

  useEffect(() => {
    if (window.google && mapRef.current) {
      try {
        // Set a default center (New York) as fallback
        const defaultCenter = { lat: 40.7128, lng: -74.0060 };
        
        // Use current location if available, otherwise use default
        const center = currentLocation && currentLocation.latitude && currentLocation.longitude
          ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
          : defaultCenter;

        const googleMap = new window.google.maps.Map(mapRef.current, {
          zoom: 15,
          center: center,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true
        });

        setMap(googleMap);
        setMapError('');
      } catch (error) {
        console.error('Error initializing map:', error);
        setMapError('Failed to load map');
      }
    } else {
      setMapError('Google Maps not loaded');
    }
  }, []);

  // Update map when current location changes
  useEffect(() => {
    if (map && currentLocation && currentLocation.latitude && currentLocation.longitude) {
      try {
        const position = { 
          lat: currentLocation.latitude, 
          lng: currentLocation.longitude 
        };
        
        map.setCenter(position);
        
        // Clear existing current location marker
        const currentMarkers = markers.filter(m => m.type !== 'current');
        setMarkers(currentMarkers);

        // Add new current location marker
        const newMarker = new window.google.maps.Marker({
          position: position,
          map: map,
          title: 'Your Current Location',
          icon: {
            url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDNy41ODYgMiA0IDUuNTg2IDQgMTBDNCAxNC40MTQgNy41ODYgMTggMTIgMThDMTYuNDE0IDE4IDIwIDE0LjQxNCAyMCAxMEMyMCA1LjU4NiAxNi40MTQgMiAxMiAyWk0xMiAxNkM4LjY4NiAxNiA2IDEzLjMxNCA2IDEwQzYgNi42ODYgOC42ODYgNCAxMiA0QzE1LjMxNCA0IDE4IDYuNjg2IDE4IDEwQzE4IDEzLjMxNCAxNS4zMTQgMTYgMTIgMTZaIiBmaWxsPSIjNDI4NUY0Ii8+CjxjaXJjbGUgY3g9IjEyIiBjeT0iMTAiIHI9IjMiIGZpbGw9IiM0Mjg1RjQiLz4KPC9zdmc+',
            scaledSize: new window.google.maps.Size(30, 30),
            anchor: new window.google.maps.Point(15, 15)
          }
        });

        setMarkers(prev => [...prev, { marker: newMarker, type: 'current' }]);
      } catch (error) {
        console.error('Error updating map location:', error);
      }
    }
  }, [map, currentLocation]);

  // Draw trip route if active trip exists
  useEffect(() => {
    if (map && activeTrip && activeTrip.plannedRoute) {
      try {
        // Clear existing route
        markers.forEach(({ marker, type }) => {
          if (type === 'route') {
            marker.setMap(null);
          }
        });

        // Decode polyline and draw route
        const decodedPath = decodePolyline(activeTrip.plannedRoute.polyline);
        const route = new window.google.maps.Polyline({
          path: decodedPath,
          geodesic: true,
          strokeColor: '#4285F4',
          strokeOpacity: 1.0,
          strokeWeight: 3,
          map: map
        });

        setMarkers(prev => [...prev, { marker: route, type: 'route' }]);

        // Add start and end markers if coordinates exist
        if (activeTrip.startLocation?.latitude && activeTrip.startLocation?.longitude) {
          const startMarker = new window.google.maps.Marker({
            position: { 
              lat: activeTrip.startLocation.latitude, 
              lng: activeTrip.startLocation.longitude 
            },
            map: map,
            title: 'Start',
            icon: {
              url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiMwMEJBNTAiLz4KPC9zdmc+',
              scaledSize: new window.google.maps.Size(20, 20)
            }
          });

          setMarkers(prev => [...prev, { marker: startMarker, type: 'start' }]);
        }

        if (activeTrip.endLocation?.latitude && activeTrip.endLocation?.longitude) {
          const endMarker = new window.google.maps.Marker({
            position: { 
              lat: activeTrip.endLocation.latitude, 
              lng: activeTrip.endLocation.longitude 
            },
            map: map,
            title: 'Destination',
            icon: {
              url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiIGZpbGw9IiNGNDQzMzYiLz4KPC9zdmc+',
              scaledSize: new window.google.maps.Size(20, 20)
            }
          });

          setMarkers(prev => [...prev, { marker: endMarker, type: 'end' }]);
        }
      } catch (error) {
        console.error('Error drawing trip route:', error);
      }
    }
  }, [map, activeTrip]);

  // Decode Google Maps polyline
  const decodePolyline = (encoded) => {
    if (!encoded) return [];
    
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
        lat: lat / 1e5,
        lng: lng / 1e5
      });
    }

    return points;
  };

  // Safe number formatting with fallback
  const safeToFixed = (value, decimals = 6) => {
    if (value === null || value === undefined || isNaN(value)) {
      return 'N/A';
    }
    return parseFloat(value).toFixed(decimals);
  };

  return (
    <div className="map-component">
      <h3>Live Location Map</h3>
      
      {mapError && (
        <div className="map-error">
          <p>⚠️ {mapError}</p>
          <p>Please check your Google Maps API key and ensure it's properly configured.</p>
        </div>
      )}
      
      <div ref={mapRef} className="map-container"></div>
      
      {currentLocation && (
        <div className="location-info">
          <p><strong>Current Location:</strong></p>
          <p>Lat: {safeToFixed(currentLocation.latitude)}</p>
          <p>Lng: {safeToFixed(currentLocation.longitude)}</p>
          <p>Accuracy: {currentLocation.accuracy ? `±${currentLocation.accuracy}m` : 'Unknown'}</p>
          <p>Last Updated: {currentLocation.timestamp ? new Date(currentLocation.timestamp).toLocaleTimeString() : 'Unknown'}</p>
        </div>
      )}

      {!currentLocation && (
        <div className="location-info">
          <p><strong>Location Status:</strong></p>
          <p>📍 Waiting for location access...</p>
          <p>Please allow location permissions to see your position on the map.</p>
        </div>
      )}

      {/* Map Legend */}
      <div className="map-legend">
        <div className="legend-item">
          <div className="legend-color current"></div>
          <span>Your Location</span>
        </div>
        {activeTrip && (
          <>
            <div className="legend-item">
              <div className="legend-color start"></div>
              <span>Trip Start</span>
            </div>
            <div className="legend-item">
              <div className="legend-color end"></div>
              <span>Destination</span>
            </div>
            <div className="legend-item">
              <div className="legend-color route"></div>
              <span>Planned Route</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MapComponent;