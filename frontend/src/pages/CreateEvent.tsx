import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import './CreateEvent.css';

interface User {
  user_id: number;
  username: string;
  university_id: number | null;
  role: string;
}

const CreateEvent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState('');
  const navigate = useNavigate();
  
  // Form state
  const [eventName, setEventName] = useState('');
  const [eventCategory, setEventCategory] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventType, setEventType] = useState('public');
  const [locationName, setLocationName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  
  // Fetch user data and check authorization
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/auth/me', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          navigate('/login');
          return;
        }
        
        const data = await response.json();
        const userData = data.user;
        
        // Only allow admin and super_admin to access this page
        if (userData.role !== 'admin' && userData.role !== 'super_admin') {
          navigate('/events');
          return;
        }
        
        setUser(userData);
        setLoading(false);
        
      } catch (err) {
        setError('Failed to authenticate user');
        navigate('/login');
      }
    };

    fetchUser();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFormSuccess('');
    
    try {
      // Form validation
      if (!eventName || !eventCategory || !eventDescription || !eventDate || 
          !eventTime || !locationName || !contactEmail) {
        setError('Please fill all required fields');
        return;
      }
      
      // Make API call to create event
      const response = await fetch('http://localhost:5001/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          event_name: eventName,
          event_category: eventCategory,
          event_description: eventDescription,
          event_date: eventDate,
          event_time: eventTime,
          event_type: eventType,
          location_name: locationName,
          contact_phone: contactPhone,
          contact_email: contactEmail
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setFormSuccess(data.message || 'Event created successfully!');
        
        // Reset form
        setEventName('');
        setEventCategory('');
        setEventDescription('');
        setEventDate('');
        setEventTime('');
        setLocationName('');
        setContactPhone('');
        setContactEmail('');
        
        // Redirect after a delay
        setTimeout(() => {
          navigate('/events');
        }, 2000);
      } else {
        setError(data.message || 'Failed to create event');
      }
    } catch (err) {
      setError('Error creating event');
      console.error(err);
    }
  };

  if (loading) return (
    <>
      <Header />
      <div className="loading">Loading...</div>
    </>
  );

  return (
    <>
      <Header />
      <div className="create-event-container">
        <h1 className="page-title">Create Public Event</h1>
        
        <div className="form-container">
          {error && <div className="form-error">{error}</div>}
          {formSuccess && <div className="form-success">{formSuccess}</div>}
          
          <form onSubmit={handleSubmit} className="event-form">
            <div className="form-group">
              <label htmlFor="event-name">Event Name:</label>
              <input 
                type="text" 
                id="event-name" 
                value={eventName} 
                onChange={(e) => setEventName(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="event-category">Category:</label>
              <input 
                type="text" 
                id="event-category" 
                value={eventCategory} 
                onChange={(e) => setEventCategory(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="event-type">Event Type:</label>
              <select 
                id="event-type" 
                value={eventType} 
                onChange={(e) => setEventType(e.target.value)}
                required
              >
                <option value="public">Public</option>
                <option value="private">Private (University Only)</option>
              </select>
              <p className="form-hint">
                {user?.role === 'super_admin' 
                  ? 'As a Super Admin, your events are automatically approved.' 
                  : 'Public events require approval from a Super Admin.'}
              </p>
            </div>
            
            <div className="form-group">
              <label htmlFor="event-description">Description:</label>
              <textarea 
                id="event-description" 
                value={eventDescription} 
                onChange={(e) => setEventDescription(e.target.value)}
                required
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="event-date">Date:</label>
                <input 
                  type="date" 
                  id="event-date" 
                  value={eventDate} 
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="event-time">Time:</label>
                <input 
                  type="time" 
                  id="event-time" 
                  value={eventTime} 
                  onChange={(e) => setEventTime(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="location-name">Location:</label>
              <input 
                type="text" 
                id="location-name" 
                value={locationName} 
                onChange={(e) => setLocationName(e.target.value)}
                required
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="contact-phone">Contact Phone (optional):</label>
                <input 
                  type="tel" 
                  id="contact-phone" 
                  value={contactPhone} 
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="contact-email">Contact Email:</label>
                <input 
                  type="email" 
                  id="contact-email" 
                  value={contactEmail} 
                  onChange={(e) => setContactEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            
            <div className="form-actions">
              <button type="button" onClick={() => navigate('/events')} className="cancel-button">
                Cancel
              </button>
              <button type="submit" className="submit-button">
                Create Event
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default CreateEvent; 