import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/auth';
import { usersAPI } from '../services/api'; // Import the API service
import '../styles/Settings.css';

const Settings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    shakeDetection: true,
    voiceCommands: true,
    smsFallback: true,
    communityHelp: false,
    decoyPIN: ''
  });
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    email: '',
    relationship: 'friend',
    isPrimary: false
  });

  useEffect(() => {
    if (user) {
      setSettings(user.settings || {});
      setEmergencyContacts(user.emergencyContacts || []);
    }
  }, [user]);

  const handleSettingsUpdate = async (field, value) => {
    const newSettings = { ...settings, [field]: value };
    setSettings(newSettings);

    try {
      await usersAPI.updateProfile({ settings: newSettings });
    } catch (error) {
      console.error('Error updating settings:', error);
      // Revert on error
      setSettings(prev => ({ ...prev, [field]: !value }));
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    
    try {
      if (editingContact) {
        // Update existing contact
        const response = await usersAPI.updateContact(editingContact._id, contactForm);
        setEmergencyContacts(response.data.contacts);
      } else {
        // Add new contact
        const response = await usersAPI.addContact(contactForm);
        setEmergencyContacts(response.data.contacts);
      }
      
      setShowContactForm(false);
      setEditingContact(null);
      setContactForm({
        name: '',
        phone: '',
        email: '',
        relationship: 'friend',
        isPrimary: false
      });
      
      alert(editingContact ? 'Contact updated successfully!' : 'Emergency contact added successfully!');
    } catch (error) {
      console.error('Error saving contact:', error);
      alert('Error saving contact. Please try again.');
    }
  };

  const handleEditContact = (contact) => {
    setEditingContact(contact);
    setContactForm({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || '',
      relationship: contact.relationship,
      isPrimary: contact.isPrimary
    });
    setShowContactForm(true);
  };

  const handleRemoveContact = async (contactId) => {
    if (window.confirm('Are you sure you want to remove this emergency contact?')) {
      try {
        const response = await usersAPI.removeContact(contactId);
        setEmergencyContacts(response.data.contacts);
        alert('Contact removed successfully!');
      } catch (error) {
        console.error('Error removing contact:', error);
        alert('Error removing contact. Please try again.');
      }
    }
  };

  const handleSetPrimary = async (contactId) => {
    try {
      const response = await usersAPI.updateContact(contactId, {
        isPrimary: true
      });
      setEmergencyContacts(response.data.contacts);
    } catch (error) {
      console.error('Error setting primary contact:', error);
      alert('Error setting primary contact. Please try again.');
    }
  };

  const cancelEdit = () => {
    setShowContactForm(false);
    setEditingContact(null);
    setContactForm({
      name: '',
      phone: '',
      email: '',
      relationship: 'friend',
      isPrimary: false
    });
  };

  return (
    <div className="settings">
      <h2>Safety Settings</h2>

      <div className="settings-section">
        <h3>Emergency Features</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <label>Shake Detection</label>
            <p>Shake phone 3 times to trigger emergency alert</p>
          </div>
          <div className="setting-control">
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.shakeDetection}
                onChange={(e) => handleSettingsUpdate('shakeDetection', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Voice Commands</label>
            <p>Use "Help Me" for SOS or "Check In Safe" to check in</p>
          </div>
          <div className="setting-control">
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.voiceCommands}
                onChange={(e) => handleSettingsUpdate('voiceCommands', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>SMS Fallback</label>
            <p>Send SMS alerts when internet is unavailable</p>
          </div>
          <div className="setting-control">
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.smsFallback}
                onChange={(e) => handleSettingsUpdate('smsFallback', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Community Help</label>
            <p>Notify nearby app users in case of emergency</p>
          </div>
          <div className="setting-control">
            <label className="switch">
              <input
                type="checkbox"
                checked={settings.communityHelp}
                onChange={(e) => handleSettingsUpdate('communityHelp', e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <label>Decoy PIN</label>
            <p>Enter this PIN to send silent emergency alert</p>
          </div>
          <div className="setting-control">
            <input
              type="text"
              placeholder="Set 4-digit PIN"
              value={settings.decoyPIN || ''}
              onChange={(e) => handleSettingsUpdate('decoyPIN', e.target.value)}
              maxLength="4"
              className="pin-input"
            />
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="section-header">
          <h3>Emergency Contacts</h3>
          <button 
            onClick={() => setShowContactForm(true)}
            className="btn btn-primary"
          >
            + Add Contact
          </button>
        </div>

        {showContactForm && (
          <form onSubmit={handleAddContact} className="contact-form">
            <h4>{editingContact ? 'Edit Contact' : 'Add New Contact'}</h4>
            
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={contactForm.name}
                onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                placeholder="Full name"
                required
              />
            </div>

            <div className="form-group">
              <label>Phone Number *</label>
              <input
                type="tel"
                value={contactForm.phone}
                onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
                placeholder="+91XXXXXXXXXX (with country code)"
                required
              />
              <small>Format: +91 followed by 10-digit number</small>
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                placeholder="email@example.com"
              />
            </div>

            <div className="form-group">
              <label>Relationship</label>
              <select
                value={contactForm.relationship}
                onChange={(e) => setContactForm({...contactForm, relationship: e.target.value})}
              >
                <option value="family">Family</option>
                <option value="friend">Friend</option>
                <option value="colleague">Colleague</option>
                <option value="neighbor">Neighbor</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={contactForm.isPrimary}
                  onChange={(e) => setContactForm({...contactForm, isPrimary: e.target.checked})}
                />
                Set as primary contact
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingContact ? 'Update Contact' : 'Add Contact'}
              </button>
              <button 
                type="button" 
                onClick={cancelEdit}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="contacts-list">
          {emergencyContacts.length === 0 ? (
            <div className="no-contacts">
              <p>📞 No emergency contacts added yet.</p>
              <p>Add contacts to receive emergency alerts.</p>
            </div>
          ) : (
            emergencyContacts.map(contact => (
              <div key={contact._id} className={`contact-card ${contact.isPrimary ? 'primary' : ''}`}>
                <div className="contact-header">
                  <div className="contact-info">
                    <h4>{contact.name}</h4>
                    <div className="contact-meta">
                      <span className="relationship">{contact.relationship}</span>
                      {contact.isPrimary && <span className="primary-badge">Primary</span>}
                    </div>
                  </div>
                  <div className="contact-actions">
                    {!contact.isPrimary && (
                      <button
                        onClick={() => handleSetPrimary(contact._id)}
                        className="btn btn-small btn-outline"
                        title="Set as primary"
                      >
                        ⭐
                      </button>
                    )}
                    <button
                      onClick={() => handleEditContact(contact)}
                      className="btn btn-small btn-outline"
                      title="Edit contact"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleRemoveContact(contact._id)}
                      className="btn btn-small btn-danger"
                      title="Remove contact"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="contact-details">
                  <p><strong>Phone:</strong> {contact.phone}</p>
                  {contact.email && <p><strong>Email:</strong> {contact.email}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;