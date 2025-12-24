const SafeZone = require('../models/SafeZone');


const getSafeZones = async (req, res) => {
  try {
    const safeZones = await SafeZone.find({ user: req.user.id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: safeZones.length,
      safeZones
    });
  } catch (error) {
    console.error('Get safe zones error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching safe zones'
    });
  }
};

const createSafeZone = async (req, res) => {
  try {
    const { name, latitude, longitude, radius, address, type } = req.body;

    const existingZone = await SafeZone.findOne({ 
      user: req.user.id, 
      name: name 
    });

    if (existingZone) {
      return res.status(400).json({
        success: false,
        message: 'You already have a safe zone with this name'
      });
    }

    const safeZone = await SafeZone.create({
      user: req.user.id,
      name,
      location: { 
        latitude: parseFloat(latitude), 
        longitude: parseFloat(longitude) 
      },
      radius: parseInt(radius),
      address: address || `${name} Location`,
      type: type || 'other'
    });

    const populatedSafeZone = await SafeZone.findById(safeZone._id);

    res.status(201).json({
      success: true,
      safeZone: populatedSafeZone,
      message: 'Safe zone created successfully'
    });
  } catch (error) {
    console.error('Create safe zone error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error creating safe zone'
    });
  }
};


const updateSafeZone = async (req, res) => {
  try {
    const { safeZoneId } = req.params;
    const { name, latitude, longitude, radius, address, type, isActive } = req.body;

    // Find safe zone and verify ownership
    let safeZone = await SafeZone.findOne({ 
      _id: safeZoneId, 
      user: req.user.id 
    });

    if (!safeZone) {
      return res.status(404).json({
        success: false,
        message: 'Safe zone not found'
      });
    }

    // Check for duplicate name if name is being updated
    if (name && name !== safeZone.name) {
      const existingZone = await SafeZone.findOne({ 
        user: req.user.id, 
        name: name,
        _id: { $ne: safeZoneId }
      });

      if (existingZone) {
        return res.status(400).json({
          success: false,
          message: 'You already have another safe zone with this name'
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (name) updateData.name = name;
    if (latitude !== undefined && longitude !== undefined) {
      updateData.location = { 
        latitude: parseFloat(latitude), 
        longitude: parseFloat(longitude) 
      };
    }
    if (radius) updateData.radius = parseInt(radius);
    if (address !== undefined) updateData.address = address;
    if (type) updateData.type = type;
    if (isActive !== undefined) updateData.isActive = isActive;

    safeZone = await SafeZone.findByIdAndUpdate(
      safeZoneId,
      updateData,
      { 
        new: true, 
        runValidators: true 
      }
    );

    res.status(200).json({
      success: true,
      safeZone,
      message: 'Safe zone updated successfully'
    });
  } catch (error) {
    console.error('Update safe zone error:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error updating safe zone'
    });
  }
};

// @desc    Delete safe zone
// @route   DELETE /api/safe-zones/:safeZoneId
// @access  Private
const deleteSafeZone = async (req, res) => {
  try {
    const { safeZoneId } = req.params;

    const safeZone = await SafeZone.findOneAndDelete({
      _id: safeZoneId,
      user: req.user.id
    });

    if (!safeZone) {
      return res.status(404).json({
        success: false,
        message: 'Safe zone not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Safe zone deleted successfully',
      deletedSafeZone: {
        id: safeZone._id,
        name: safeZone.name
      }
    });
  } catch (error) {
    console.error('Delete safe zone error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting safe zone'
    });
  }
};

// @desc    Check if location is within any safe zone
// @route   POST /api/safe-zones/check-safety
// @access  Private
const checkLocationSafety = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    const safeZones = await SafeZone.find({ 
      user: req.user.id,
      isActive: true 
    });

    if (safeZones.length === 0) {
      return res.json({
        success: true,
        isSafe: false,
        message: 'No active safe zones configured',
        results: []
      });
    }

    const safetyResults = safeZones.map(zone => {
      const distance = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        zone.location.latitude,
        zone.location.longitude
      );
      
      const isWithin = distance <= zone.radius;
      
      return {
        safeZone: {
          id: zone._id,
          name: zone.name,
          type: zone.type,
          radius: zone.radius
        },
        isWithin,
        distance: Math.round(distance),
        safetyStatus: isWithin ? 'safe' : 'outside'
      };
    });

    const isInAnySafeZone = safetyResults.some(result => result.isWithin);
    const nearestSafeZone = safetyResults.reduce((nearest, current) => {
      if (!nearest || current.distance < nearest.distance) {
        return current;
      }
      return nearest;
    }, null);

    res.status(200).json({
      success: true,
      isSafe: isInAnySafeZone,
      totalZonesChecked: safeZones.length,
      inSafeZones: safetyResults.filter(r => r.isWithin).length,
      nearestSafeZone: nearestSafeZone ? {
        name: nearestSafeZone.safeZone.name,
        distance: nearestSafeZone.distance,
        type: nearestSafeZone.safeZone.type
      } : null,
      results: safetyResults
    });
  } catch (error) {
    console.error('Check location safety error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error checking location safety'
    });
  }
};

// @desc    Toggle safe zone active status
// @route   PATCH /api/safe-zones/:safeZoneId/toggle
// @access  Private
const toggleSafeZone = async (req, res) => {
  try {
    const { safeZoneId } = req.params;

    const safeZone = await SafeZone.findOne({ 
      _id: safeZoneId, 
      user: req.user.id 
    });

    if (!safeZone) {
      return res.status(404).json({
        success: false,
        message: 'Safe zone not found'
      });
    }

    safeZone.isActive = !safeZone.isActive;
    await safeZone.save();

    res.status(200).json({
      success: true,
      safeZone,
      message: `Safe zone ${safeZone.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Toggle safe zone error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error toggling safe zone'
    });
  }
};

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c * 1000; // Convert to meters
  
  return distance;
};

const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};

module.exports = {
  getSafeZones,
  createSafeZone,
  updateSafeZone,
  deleteSafeZone,
  checkLocationSafety,
  toggleSafeZone
};