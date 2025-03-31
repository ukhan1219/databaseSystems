import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import './Events.css';

interface Event {
  event_id: number;
  event_name: string;
  event_description: string;
  event_date: string;
  event_time: string;
  event_type: 'public' | 'private' | 'rso';
  event_category: string;
  location_name: string;
  address?: string;
  contact_phone: string;
  contact_email: string;
  is_approved: boolean;
  university_id: number;
  avg_rating?: number;
  university_name?: string;
}

interface User {
  user_id: number;
  university_id: number | null;
  role: string;
}

type FilterType = 'all' | 'public' | 'private';

const Events: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  // Fetch current user
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
        setUser(data.user);
      } catch (err) {
        setError('Failed to authenticate user');
        navigate('/login');
      }
    };

    fetchUser();
  }, [navigate]);

  // Fetch events based on filter
  useEffect(() => {
    const fetchEvents = async () => {
      if (!user) return;
      
      try {
        let url = 'http://localhost:5001/api/events';
        if (activeFilter !== 'all') {
          url += `?selection=${activeFilter}`;
        }
        
        const response = await fetch(url, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }
        
        const data = await response.json();
        console.log('Fetched events:', data.events);
        setEvents(data.events || []);
        setFilteredEvents(data.events || []);
      } catch (err) {
        console.error('Error fetching events:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchEvents();
    }
  }, [user, activeFilter]);

  const handleFilterClick = (filter: FilterType) => {
    setActiveFilter(filter);
    setLoading(true);
  };

  // Only admins or super_admins can create events
  const canCreateEvents = user && (user.role === 'admin' || user.role === 'super_admin');

  if (loading)
    return (
      <>
        <Header />
        <div className="loading">Loading events...</div>
      </>
    );
  
  if (error)
    return (
      <>
        <Header />
        <div className="error">{error}</div>
      </>
    );

  return (
    <>
      <Header />
      <div className="events-container">
        <h1 className="page-title">Events</h1>
        
        <div className="event-filter">
          <div className="filter-tags">
            <button
              className={`filter-button ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterClick('all')}
            >
              All
            </button>
            <button
              className={`filter-button public ${activeFilter === 'public' ? 'active' : ''}`}
              onClick={() => handleFilterClick('public')}
            >
              Public
            </button>
            <button
              className={`filter-button private ${activeFilter === 'private' ? 'active' : ''}`}
              onClick={() => handleFilterClick('private')}
            >
              Private
            </button>
            
            {canCreateEvents && (
              <Link to="/create-event" className="create-event-button">
                Create Event
              </Link>
            )}
          </div>
        </div>
        
        <div className="events-list">
          {filteredEvents.length === 0 ? (
            <p className="no-events">
              {activeFilter === 'all'
                ? 'No events found.'
                : `No ${activeFilter} events found.`}
            </p>
          ) : (
            filteredEvents.map((event) => (
              <div key={event.event_id} className={`event-card ${event.event_type}`}>
                <div className="event-type-tag">{event.event_type}</div>
                <h2 className="event-name">{event.event_name}</h2>
                {event.avg_rating !== null && event.avg_rating !== undefined && (
                  <div className="event-rating">
                    <span className="rating-stars">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const avgRating = event.avg_rating ? parseFloat(String(event.avg_rating)) : 0;
                        return (
                          <span key={i} className={`star ${i < Math.round(avgRating) ? 'filled' : ''}`}>
                            ★
                          </span>
                        );
                      })}
                    </span>
                    <span className="rating-value">
                      ({event.avg_rating ? parseFloat(String(event.avg_rating)).toFixed(1) : '0.0'})
                    </span>
                  </div>
                )}
                <p className="event-description">
                  {event.event_description.length > 150
                    ? `${event.event_description.substring(0, 150)}...`
                    : event.event_description}
                </p>
                <div className="event-meta">
                  <p>
                    <strong>Date:</strong> {new Date(event.event_date).toLocaleDateString()}
                  </p>
                  <p>
                    <strong>Time:</strong> {event.event_time}
                  </p>
                  {event.university_name && (
                    <p>
                      <strong>University:</strong> {event.university_name}
                    </p>
                  )}
                  <p>
                    <strong>Location:</strong> {event.location_name}
                  </p>
                  {event.address && (
                    <p>
                      <strong>Address:</strong> {event.address}
                    </p>
                  )}
                  <p>
                    <strong>Category:</strong> {event.event_category}
                  </p>
                </div>
                <Link to={`/events/${event.event_id}`} className="view-details-button">
                  View
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
