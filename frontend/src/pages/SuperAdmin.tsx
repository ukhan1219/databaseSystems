import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import './SuperAdmin.css';

interface Event {
  Event_ID: number;
  Name: string;
  Description: string;
  Time: string;
  Date: string;
  Location: string;
  Phone: string;
  Email: string;
}

interface RSO {
  RSO_ID: number;
  Name: string;
  Admin: string;
}

const SuperAdmin: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [rsos, setRSOs] = useState<RSO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch unapproved events
        const eventsResponse = await fetch('http://localhost:8000/api/events/unapproved', {
          credentials: 'include',
        });
        
        if (!eventsResponse.ok) {
          throw new Error('Failed to fetch unapproved events');
        }
        
        const eventsData = await eventsResponse.json();
        setEvents(eventsData);
        
        // Fetch unapproved RSOs
        const rsosResponse = await fetch('http://localhost:8000/api/rsos/unapproved', {
          credentials: 'include',
        });
        
        if (!rsosResponse.ok) {
          throw new Error('Failed to fetch unapproved RSOs');
        }
        
        const rsosData = await rsosResponse.json();
        setRSOs(rsosData);
        
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleApproveEvent = async (eventId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/events/${eventId}/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to approve event');
      }

      // Remove approved event from list
      setEvents(events.filter(event => event.Event_ID !== eventId));
      setMessage('Event approved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleApproveRSO = async (rsoId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/rsos/${rsoId}/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to approve RSO');
      }

      // Remove approved RSO from list
      setRSOs(rsos.filter(rso => rso.RSO_ID !== rsoId));
      setMessage('RSO approved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <>
      <Header />
      <div className="super-admin-container">
        <h1 className="page-title">Super Admin Portal</h1>
        
        {message && <div className="message">{message}</div>}
        
        <div className="content-container">
          <div className="unapproved-section">
            <h2>Unapproved Events</h2>
            <ul className="event-list">
              {events.length === 0 ? (
                <p>No unapproved events.</p>
              ) : (
                events.map((event) => (
                  <li key={event.Event_ID} className="event-item">
                    <h3>Name: {event.Name}</h3>
                    <div className="event-details">
                      <p>Description: {event.Description}</p>
                      <p>Time: {event.Time}</p>
                      <p>Date: {event.Date}</p>
                    </div>
                    <div className="event-contact">
                      <p>Location: {event.Location}</p>
                      <p>Contact Phone: {event.Phone}</p>
                      <p>Contact Email: {event.Email}</p>
                    </div>
                    <button 
                      className="approve-button"
                      onClick={() => handleApproveEvent(event.Event_ID)}
                    >
                      Approve
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
          
          <div className="unapproved-section">
            <h2>Unapproved RSO</h2>
            <ul className="rso-list">
              {rsos.length === 0 ? (
                <p>No unapproved RSOs.</p>
              ) : (
                rsos.map((rso) => (
                  <li key={rso.RSO_ID} className="rso-item">
                    <h3>Name: {rso.Name}</h3>
                    <h4>Admin: {rso.Admin}</h4>
                    <button 
                      className="approve-button"
                      onClick={() => handleApproveRSO(rso.RSO_ID)}
                    >
                      Approve
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default SuperAdmin; 