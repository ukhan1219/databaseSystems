import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import './RSOs.css';

interface RSO {
  rso_id: number;
  rso_name: string;
  description: string;
  is_active: boolean;
  admin_user_id: number;
  admin_name?: string;
  member_count?: number;
  is_member?: boolean;
  is_admin?: boolean;
}

interface Event {
  event_id: number;
  event_name: string;
  event_date: string;
  event_time: string;
  location_name: string;
  rso_id: number;
  event_type: string;
  avg_rating?: number;
}

interface User {
  user_id: number;
  university_id: number | null;
  role: string;
}

const RSOs: React.FC = () => {
  const [userRSOs, setUserRSOs] = useState<RSO[]>([]);
  const [availableRSOs, setAvailableRSOs] = useState<RSO[]>([]);
  const [rsoEvents, setRSOEvents] = useState<{[key: number]: Event[]}>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showSearchView, setShowSearchView] = useState<boolean>(false);
  const navigate = useNavigate();

  // First fetch the current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('http://localhost:5001/api/auth/me', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          // If not logged in, redirect to login page
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

  // Fetch RSOs that the user is a member of
  useEffect(() => {
    const fetchUserRSOs = async () => {
      if (!user) return;
      
      try {
        console.log("Fetching user's RSOs...");
        // Fetch RSOs that the user is a member of
        const memberResponse = await fetch('http://localhost:5001/api/rsos/my', {
          credentials: 'include'
        });
        
        if (!memberResponse.ok) {
          console.error("Failed to fetch user RSOs:", memberResponse.status, memberResponse.statusText);
          const errorText = await memberResponse.text();
          console.error("Error response:", errorText);
          throw new Error('Failed to fetch user RSOs');
        }
        
        const memberData = await memberResponse.json();
        console.log("Received user's RSOs data:", memberData);
        setUserRSOs(memberData.rsos || []);
        
        // For each RSO the user is a member of, fetch its events
        const eventsPromises = memberData.rsos.map(async (rso: RSO) => {
          console.log(`Fetching events for RSO ${rso.rso_id}: ${rso.rso_name}`);
          const eventsResponse = await fetch(`http://localhost:5001/api/rsos/${rso.rso_id}/events`, {
            credentials: 'include'
          });
          
          if (eventsResponse.ok) {
            const eventsData = await eventsResponse.json();
            console.log(`Received events for RSO ${rso.rso_id}:`, eventsData);
            // Include all events for this RSO (removed filter that was only keeping 'rso' type events)
            return { rsoId: rso.rso_id, events: eventsData.events || [] };
          }
          console.error(`Failed to fetch events for RSO ${rso.rso_id}:`, eventsResponse.status);
          return { rsoId: rso.rso_id, events: [] };
        });
        
        const rsoEventsResults = await Promise.all(eventsPromises);
        const eventsMap: {[key: number]: Event[]} = {};
        
        rsoEventsResults.forEach(result => {
          eventsMap[result.rsoId] = result.events;
        });
        
        setRSOEvents(eventsMap);
        setLoading(false);
      } catch (err) {
        console.error("Error in fetchUserRSOs:", err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      }
    };

    if (user) {
      fetchUserRSOs();
    }
  }, [user]);

  // Fetch available RSOs only when search view is active
  useEffect(() => {
    const fetchAvailableRSOs = async () => {
      if (!user || !showSearchView) return;
      
      try {
        console.log("Fetching available RSOs...");
        // Fetch all RSOs at the user's university
        const response = await fetch('http://localhost:5001/api/rsos', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          console.error("Failed to fetch available RSOs:", response.status, response.statusText);
          throw new Error('Failed to fetch RSOs');
        }
        
        const data = await response.json();
        console.log("Received available RSOs data:", data);
        
        // Filter out RSOs the user is already a member of
        const userRsoIds = userRSOs.map(rso => rso.rso_id);
        const available = (data.rsos || []).filter(
          (rso: RSO) => !userRsoIds.includes(rso.rso_id)
        );
        
        setAvailableRSOs(available);
      } catch (err) {
        console.error("Error in fetchAvailableRSOs:", err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    };

    if (showSearchView) {
      fetchAvailableRSOs();
    }
  }, [user, showSearchView, userRSOs]);

  const handleJoinRSO = async (rsoId: number) => {
    try {
      const response = await fetch(`http://localhost:5001/api/rsos/${rsoId}/join`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // Update the RSO lists
        setShowSearchView(false);
        
        // Refresh the RSOs lists
        const memberResponse = await fetch('http://localhost:5001/api/rsos/my', {
          credentials: 'include'
        });
        
        if (memberResponse.ok) {
          const memberData = await memberResponse.json();
          setUserRSOs(memberData.rsos || []);
        }
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to join RSO');
      }
    } catch (err) {
      setError('Error joining RSO');
      console.error(err);
    }
  };

  const toggleView = () => {
    setShowSearchView(!showSearchView);
  };

  if (loading) return (
    <>
      <Header />
      <div className="loading">Loading RSOs...</div>
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
      <div className="rsos-container">
        <div className="rsos-header">
          <h1 className="page-title">
            {showSearchView ? 'Find RSOs to Join' : 'Your RSOs'}
          </h1>
          <div className="rsos-actions">
            <button 
              className="create-rso-button"
              onClick={() => navigate('/rsos/create')}
            >
              Create New RSO
            </button>
            {userRSOs.length > 0 && !showSearchView && (
              <button 
                className="toggle-view-button"
                onClick={toggleView}
              >
                Find RSOs to Join
              </button>
            )}
            {showSearchView && (
              <button 
                className="toggle-view-button"
                onClick={toggleView}
              >
                Back to Your RSOs
              </button>
            )}
          </div>
        </div>
        
        {!showSearchView ? (
          // My RSOs View
          <div className="my-rsos-view">
            {userRSOs.length === 0 ? (
              <div className="no-rsos-message">
                <p>You are not a member of any RSOs.</p>
                <button 
                  className="toggle-view-button primary"
                  onClick={toggleView}
                >
                  Find RSOs to Join
                </button>
              </div>
            ) : (
              <div className="user-rsos-list">
                {userRSOs.map(rso => (
                  <div key={rso.rso_id} className="rso-section">
                    <div className="rso-header">
                      <h2>{rso.rso_name}</h2>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className="rso-badges">
                          {rso.is_admin && <span className="badge admin-badge">Admin</span>}
                          <span className={`badge status-badge ${rso.is_active ? 'active' : 'inactive'}`}>
                            {rso.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <Link to={`/rsos/${rso.rso_id}`} className="view-details-button">
                          View RSO Details
                        </Link>
                      </div>
                    </div>
                    
                    <div className="rso-details">
                      <p className="rso-description">{rso.description}</p>
                      <p><strong>Members:</strong> {rso.member_count}</p>
                      <p><strong>Admin:</strong> {rso.admin_name}</p>
                    </div>
                    
                    <h3>RSO Events</h3>
                    <div className="rso-events">
                      {rsoEvents[rso.rso_id]?.length > 0 ? (
                        <div className="events-list">
                          {rsoEvents[rso.rso_id].map(event => (
                            <div key={event.event_id} className="event-card rso">
                              <h3 className="event-name">{event.event_name}</h3>
                              {event.avg_rating !== undefined && (
                                <div className="event-rating">
                                  <span className="rating-stars">
                                    {Array.from({ length: 5 }).map((_, i) => {
                                      // Convert to number and handle null/undefined values
                                      const avgRating = event.avg_rating ? parseFloat(String(event.avg_rating)) : 0;
                                      return (
                                        <span 
                                          key={i} 
                                          className={`star ${i < Math.round(avgRating) ? 'filled' : ''}`}
                                        >★</span>
                                      );
                                    })}
                                  </span>
                                  <span className="rating-value">
                                    ({event.avg_rating ? parseFloat(String(event.avg_rating)).toFixed(1) : '0.0'})
                                  </span>
                                </div>
                              )}
                              <div className="event-meta">
                                <p><strong>Date:</strong> {new Date(event.event_date).toLocaleDateString()}</p>
                                <p><strong>Time:</strong> {event.event_time}</p>
                                <p><strong>Location:</strong> {event.location_name}</p>
                              </div>
                              <Link to={`/events/${event.event_id}`} className="view-details-button">
                                View
                              </Link>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>No events for this RSO</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Find RSOs View
          <div className="search-rsos-view">
            <h2>Available RSOs at Your University</h2>
            <div className="available-rsos-list">
              {availableRSOs.length === 0 ? (
                <p className="no-rsos">No more RSOs available to join at your university.</p>
              ) : (
                availableRSOs.map((rso) => (
                  <div key={rso.rso_id} className="rso-card">
                    <h2 className="rso-name">{rso.rso_name}</h2>
                    <div className="rso-status-badge">
                      <span className={`badge status-badge ${rso.is_active ? 'active' : 'inactive'}`}>
                        {rso.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {rso.description && <p className="rso-description">{rso.description}</p>}
                    {rso.member_count && <p className="rso-members">Members: {rso.member_count}</p>}
                    
                    {!rso.is_active && (
                      <div className="rso-inactive-info">
                        <p>This RSO needs at least 5 members to be approved by a super admin.</p>
                      </div>
                    )}
                    
                    <div className="rso-actions">
                      <button 
                        onClick={() => handleJoinRSO(rso.rso_id)}
                        className="join-button"
                      >
                        Join RSO
                      </button>
                      <Link to={`/rsos/${rso.rso_id}`} className="view-details-button">
                  View Details
                </Link>
                    </div>
              </div>
            ))
          )}
        </div>
          </div>
        )}
      </div>
    </>
  );
};

export default RSOs; 