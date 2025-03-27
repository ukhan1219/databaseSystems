import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import './Events.css';

interface Event {
  Event_ID: number;
  Name: string;
  Description: string;
  Time: string;
  Date: string;
  Location: string;
}

const Events: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/events');
        
        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }
        
        const data = await response.json();
        setEvents(data);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <>
      <Header />
      <div className="events-container">
        <h1 className="page-title">Events</h1>
        
        <div className="events-list">
          {events.length === 0 ? (
            <p className="no-events">No events found.</p>
          ) : (
            events.map((event) => (
              <div key={event.Event_ID} className="event-card">
                <h2 className="event-name">{event.Name}</h2>
                <p className="event-description">{event.Description}</p>
                <div className="event-meta">
                  <p><strong>Date:</strong> {event.Date}</p>
                  <p><strong>Time:</strong> {event.Time}</p>
                  <p><strong>Location:</strong> {event.Location}</p>
                </div>
                <Link to={`/events/${event.Event_ID}`} className="view-details-button">
                  View Details
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default Events; 