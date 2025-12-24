const User = require('../models/User');

// Get user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        emergencyContacts: user.emergencyContacts,
        settings: user.settings,
        lastKnownLocation: user.lastKnownLocation,
        batteryLevel: user.batteryLevel,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { name, phone, settings } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, phone, settings },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        emergencyContacts: user.emergencyContacts,
        settings: user.settings
      },
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
};
// Add emergency contact
const addEmergencyContact = async (req, res) => {
  try {
    const { name, phone, email, relationship, isPrimary } = req.body;

    const user = await User.findById(req.user.id);
    
    // If setting as primary, remove primary from others
    if (isPrimary) {
      user.emergencyContacts.forEach(contact => {
        contact.isPrimary = false;
      });
    }

    user.emergencyContacts.push({
      name,
      phone,
      email,
      relationship,
      isPrimary: isPrimary || false
    });

    await user.save();

    res.status(201).json({
      success: true,
      contacts: user.emergencyContacts,
      message: 'Emergency contact added successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding emergency contact'
    });
  }
};

// Update emergency contact
const updateEmergencyContact = async (req, res) => {
  try {
    const { contactId } = req.params;
    const { name, phone, email, relationship, isPrimary } = req.body;

    const user = await User.findById(req.user.id);
    const contact = user.emergencyContacts.id(contactId);
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // If setting as primary, remove primary from others
    if (isPrimary) {
      user.emergencyContacts.forEach(c => {
        c.isPrimary = false;
      });
    }

    contact.name = name || contact.name;
    contact.phone = phone || contact.phone;
    contact.email = email || contact.email;
    contact.relationship = relationship || contact.relationship;
    contact.isPrimary = isPrimary !== undefined ? isPrimary : contact.isPrimary;

    await user.save();

    res.json({
      success: true,
      contacts: user.emergencyContacts,
      message: 'Contact updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating contact'
    });
  }
};

// Remove emergency contact
const removeEmergencyContact = async (req, res) => {
  try {
    const { contactId } = req.params;

    const user = await User.findById(req.user.id);
    user.emergencyContacts.pull(contactId);
    await user.save();

    res.json({
      success: true,
      contacts: user.emergencyContacts,
      message: 'Contact removed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error removing contact'
    });
  }
};

// Update FCM token
const updateFCMToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;

    await User.findByIdAndUpdate(req.user.id, { fcmToken });

    res.json({
      success: true,
      message: 'FCM token updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating FCM token'
    });
  }
};

// Update location
const updateLocation = async (req, res) => {
  try {
    const { latitude, longitude, batteryLevel } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        lastKnownLocation: {
          latitude,
          longitude,
          timestamp: new Date()
        },
        batteryLevel
      },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Location updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating location'
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  addEmergencyContact,
  updateEmergencyContact,
  removeEmergencyContact,
  updateFCMToken,
  updateLocation
};