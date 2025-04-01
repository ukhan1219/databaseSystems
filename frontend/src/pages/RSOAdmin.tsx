import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import './RSOAdmin.css';

interface RSO {
  rso_id: number;
  rso_name: string;
  description: string;
  is_active: boolean;
  admin_user_id: number;
  member_count: number;
}

interface Event {
  event_id: number;
  event_name: string;
  event_category: string;
  event_description: string;
  event_date: string;
  event_time: string;
  location_name: string;
  contact_phone: string;
  contact_email: string;
  rso_id: number;
}

interface User {
  user_id: number;
  username: string;
  role: string;
}

const RSOAdmin: React.FC = () => {
  const [adminRSOs, setAdminRSOs] = useState<RSO[]>([]);
  const [selectedRSO, setSelectedRSO] = useState<number | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  
  // Event form state
  const [eventName, setEventName] = useState('');
  const [eventCategory, setEventCategory] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [locationName, setLocationName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  // New state to capture the full address from Google Maps
  const [address, setAddress] = useState('');
  
  const navigate = useNavigate();

  // Create a ref for the Location input field
  const locationRef = useRef<HTMLInputElement>(null);

  /*
  
  *don't know why we need this? can uncomment in future if causing issues*

  // Helper to dynamically load Google Maps API
  const loadGoogleMapsScript = (callback: () => void) => {
    if (document.getElementById('google-maps-script')) {
      callback();
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = 'https://maps.googleapis.com/maps/api/js?key=KEY_LOCATION&libraries=places';
    script.async = true;
    script.defer = true;
    script.onload = callback;
    document.body.appendChild(script);
  };
*/

  const waitForGoogleMaps = (callback: () => void) => {
      const checkInterval = setInterval(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
          clearInterval(checkInterval);
          callback();
        }
      }, 100); // check every 100ms
    };

  
  // Attach autocomplete to the location input (no restrictions on place types)
  useEffect(() => {
    waitForGoogleMaps(() => {
      if (locationRef.current) {
        const autocomplete = new window.google.maps.places.Autocomplete(locationRef.current);
        autocomplete.setFields(['formatted_address', 'name']);
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place.formatted_address) {
            setAddress(place.formatted_address);
          }
          if (place.name) {
            setLocationName(place.name);
          } else if (place.formatted_address) {
            setLocationName(place.formatted_address);
          }
        });
      }
    });
  }, []);
  

  // Check if user is an admin
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
        
        if (data.user.role !== 'admin') {
          navigate('/events');
          return;
        }
        
        setUser(data.user);
      } catch (err) {
        setError('Failed to authenticate user');
        navigate('/login');
      }
    };

    fetchUser();
  }, [navigate]);

  // Fetch RSOs where user is admin
  useEffect(() => {
    const fetchAdminRSOs = async () => {
      if (!user) return;
      
      try {
        console.log("Fetching admin RSOs...");
        const response = await fetch('http://localhost:5001/api/rsos/admin', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          console.error("Failed to fetch RSOs:", response.status, response.statusText);
          const errorText = await response.text();
          console.error("Error response:", errorText);
          throw new Error('Failed to fetch RSOs');
        }
        
        const data = await response.json();
        console.log("Received RSO data:", data);
        setAdminRSOs(data.rsos || []);
        
        if (data.rsos && data.rsos.length > 0) {
          setSelectedRSO(data.rsos[0].rso_id);
        }
      } catch (err) {
        console.error("Error fetching RSOs:", err);
        setError('Error fetching RSOs');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchAdminRSOs();
    }
  }, [user]);

  // Fetch events for selected RSO
  useEffect(() => {
    const fetchRSOEvents = async () => {
      if (!selectedRSO) return;
      
      try {
        console.log("Fetching events for RSO:", selectedRSO);
        const response = await fetch(`http://localhost:5001/api/rsos/${selectedRSO}/events`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          console.error("Failed to fetch events:", response.status, response.statusText);
          throw new Error('Failed to fetch events');
        }
        
        const data = await response.json();
        console.log("Received events data:", data);
        setEvents(data.events || []);
      } catch (err) {
        console.error('Error fetching RSO events:', err);
      }
    };

    if (selectedRSO) {
      fetchRSOEvents();
    } else {
      setEvents([]);
    }
  }, [selectedRSO]);

  const handleRSOChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedRSO(parseInt(event.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    
    if (!selectedRSO) {
      setFormError('Please select an RSO to create an event');
      return;
    }
    
    // Check if the selected RSO is active
    const selectedRSOObj = adminRSOs.find(rso => rso.rso_id === selectedRSO);
    if (selectedRSOObj && !selectedRSOObj.is_active) {
      setFormError('Cannot create events for inactive RSOs. The RSO needs at least 5 members and must be approved by a super admin.');
      return;
    }
    
    // Form validation
    if (!eventName || !eventCategory || !eventDescription || !eventDate || 
        !eventTime || !locationName || !contactEmail) {
      setFormError('Please fill all required fields');
      return;
    }
    
    try {
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
          event_type: 'rso',
          location_name: locationName,
          address: address, // Send the full address captured from Google Maps
          contact_phone: contactPhone,
          contact_email: contactEmail,
          rso_id: selectedRSO
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setFormSuccess('Event created successfully!');
        
        // Reset form
        setEventName('');
        setEventCategory('');
        setEventDescription('');
        setEventDate('');
        setEventTime('');
        setLocationName('');
        setContactPhone('');
        setContactEmail('');
        setAddress('');
        
        // Refresh events list
        const updatedResponse = await fetch(`http://localhost:5001/api/rsos/${selectedRSO}/events`, {
          credentials: 'include'
        });
        
        if (updatedResponse.ok) {
          const updatedData = await updatedResponse.json();
          setEvents(updatedData.events || []);
        }
      } else {
        setFormError(data.message || 'Failed to create event');
      }
    } catch (err) {
      setFormError('Error creating event');
      console.error(err);
    }
  };

  if (loading) return (
    <>
      <Header />
      <div className="loading">Loading RSO admin panel...</div>
    </>
  );
  
  if (error) return (
    <>
      <Header />
      <div className="error">{error}</div>
    </>
  );

  return (
    <>
      <Header />
      <div className="rso-admin-container">
        <h1 className="page-title">RSO Administration</h1>
        
        {adminRSOs.length === 0 ? (
          <div className="no-rsos-message">
            <p>You are not an admin of any RSOs.</p>
            <p>To create events for an RSO, you need to be the admin of that RSO.</p>
          </div>
        ) : (
          <div className="rso-admin-content">
            <div className="rso-selector">
              <label htmlFor="rso-select">Select RSO:</label>
              <select 
                id="rso-select" 
                value={selectedRSO || ''} 
                onChange={handleRSOChange}
              >
                {adminRSOs.map(rso => (
                  <option key={rso.rso_id} value={rso.rso_id}>
                    {rso.rso_name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="rso-admin-sections">
              <div className="create-event-section">
                <h2>Create RSO Event</h2>
                
                {formError && <div className="form-error">{formError}</div>}
                {formSuccess && <div className="form-success">{formSuccess}</div>}
                
                {selectedRSO && adminRSOs.find(rso => rso.rso_id === selectedRSO && !rso.is_active) && (
                  <div className="rso-inactive-warning">
                    <p>This RSO is currently inactive. You need at least 5 members and approval from a super admin to create events.</p>
                    <p>Current member count: {adminRSOs.find(rso => rso.rso_id === selectedRSO)?.member_count || '?'}</p>
                  </div>
                )}
                
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
                      ref={locationRef}
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
                  
                  <button type="submit" className="create-button">Create Event</button>
                </form>
              </div>
              
              <div className="existing-events-section">
                <h2>Existing RSO Events</h2>
                
                {events.length === 0 ? (
                  <p>No events found for this RSO.</p>
                ) : (
                  <div className="events-list">
                    {events.map(event => (
                      <div key={event.event_id} className="event-card rso">
                        <h3>{event.event_name}</h3>
                        <p className="event-description">{event.event_description.substring(0, 100)}...</p>
                        <div className="event-meta">
                          <p><strong>Date:</strong> {new Date(event.event_date).toLocaleDateString()}</p>
                          <p><strong>Time:</strong> {new Date(`1970-01-01T${event.event_time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                          <p><strong>Location:</strong> {event.location_name}</p>
                          <p><strong>Category:</strong> {event.event_category}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default RSOAdmin;
