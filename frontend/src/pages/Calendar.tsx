import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import Header from '../components/Header';
import './Calendar.css';

interface Event {
  event_id: number;
  event_name: string;
  event_description: string;
  event_date: string;
  event_time: string;
  event_type: 'public' | 'private' | 'rso';
  event_category: string;
  location_name: string;
  is_approved: boolean;
}

interface User {
  user_id: number;
  university_id: number | null;
  role: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  description?: string;
  location?: string;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps: {
    event_id: number;
    event_type: string;
    event_description: string;
    location_name: string;
  };
}

const Calendar: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDayModal, setShowDayModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  // First fetch the current user
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

  // Fetch all events
  useEffect(() => {
    const fetchEvents = async () => {
      if (!user) return;
      
      try {
        const response = await fetch('http://localhost:5001/api/events', {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }
        
        const data = await response.json();
        setEvents(data.events || []);
        
        // Transform events for FullCalendar
        const transformedEvents = (data.events || []).map((event: Event) => {
          // Extract hours and minutes from event_time (format: "HH:MM:SS" or "HH:MM")
          const timeParts = event.event_time.split(':');
          const hours = parseInt(timeParts[0], 10);
          const minutes = parseInt(timeParts[1], 10);
          
          // Instead of using new Date(event.event_date) which treats a YYYY-MM-DD string as UTC,
          // split the date parts and create the date in local time.
          const [year, month, day] = event.event_date.split('-');
          const startDate = new Date(
            parseInt(year, 10),
            parseInt(month, 10) - 1,
            parseInt(day, 10),
            hours,
            minutes,
            0
          );
          
          // Create an end date (start date + 2 hours by default)
          const endDate = new Date(startDate);
          endDate.setHours(endDate.getHours() + 2);
          
          // Set color based on event type
          let backgroundColor;
          switch (event.event_type) {
            case 'public':
              backgroundColor = '#2196f3'; // Blue
              break;
            case 'private':
              backgroundColor = '#9c27b0'; // Purple
              break;
            case 'rso':
              backgroundColor = '#ff9800'; // Orange
              break;
            default:
              backgroundColor = '#4caf50'; // Green
          }
          
          return {
            id: event.event_id.toString(),
            title: event.event_name,
            start: startDate,
            end: endDate,
            backgroundColor,
            borderColor: backgroundColor,
            extendedProps: {
              event_id: event.event_id,
              event_type: event.event_type,
              event_description: event.event_description,
              location_name: event.location_name
            }
          };
        });
        
        setCalendarEvents(transformedEvents);
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
  }, [user]);

  const handleEventClick = (info: any) => {
    const eventId = info.event.extendedProps.event_id;
    navigate(`/events/${eventId}`);
  };

  const handleDateClick = (info: any) => {
    const clickedDate = info.date; // Use the Date object provided by FullCalendar
    setSelectedDate(clickedDate);
    
    // Filter events for the clicked day using local time comparison
    const eventsOnSelectedDay = calendarEvents.filter(event => {
      const eventDate = new Date(event.start);
      return (
        eventDate.getFullYear() === clickedDate.getFullYear() &&
        eventDate.getMonth() === clickedDate.getMonth() &&
        eventDate.getDate() === clickedDate.getDate()
      );
    });
    
    // Sort events by time
    eventsOnSelectedDay.sort((a, b) => {
      const timeA = new Date(a.start).getTime();
      const timeB = new Date(b.start).getTime();
      return timeA - timeB;
    });
    
    setSelectedDayEvents(eventsOnSelectedDay);
    setShowDayModal(true);
  };

  const closeEventDetails = () => {
    setSelectedEvent(null);
  };
  
  const closeDayModal = () => {
    setShowDayModal(false);
    setSelectedDayEvents([]);
    setSelectedDate(null);
  };
  
  const navigateToEventDetails = (eventId: number) => {
    navigate(`/events/${eventId}`);
  };

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="loading">Loading calendar...</div>
      </>
    );
  }
  
  if (error) {
    return (
      <>
        <Header />
        <div className="error">{error}</div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="calendar-container">
        <h1 className="page-title">Event Calendar</h1>
        
        <div className="calendar-legend">
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#2196f3' }}></span>
            <span>Public Events</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#9c27b0' }}></span>
            <span>Private Events</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#ff9800' }}></span>
            <span>RSO Events</span>
          </div>
        </div>
        
        <div className="calendar-wrapper">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            events={calendarEvents}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              meridiem: 'short'
            }}
            height="auto"
          />
        </div>
        
        {/* Modal for showing events on a specific day */}
        {showDayModal && selectedDate && (
          <div className="day-events-modal">
            <div className="day-events-content">
              <button className="close-btn" onClick={closeDayModal}>×</button>
              <h2>Events on {formatDate(selectedDate)}</h2>
              
              {selectedDayEvents.length === 0 ? (
                <p className="no-events-message">No events scheduled for this day.</p>
              ) : (
                <div className="day-events-list">
                  {selectedDayEvents.map((event) => (
                    <div 
                      key={event.id} 
                      className={`day-event-item ${event.extendedProps.event_type}`}
                      onClick={() => navigateToEventDetails(event.extendedProps.event_id)}
                    >
                      <div className="day-event-time">
                        {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="day-event-content">
                        <h3>{event.title}</h3>
                        <div className="day-event-tag">{event.extendedProps.event_type}</div>
                        <p className="day-event-location">{event.extendedProps.location_name}</p>
                        <p className="day-event-description">
                          {event.extendedProps.event_description.length > 100
                            ? `${event.extendedProps.event_description.substring(0, 100)}...`
                            : event.extendedProps.event_description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {selectedEvent && (
          <div className="event-details-modal">
            <div className="event-details-content">
              <button className="close-btn" onClick={closeEventDetails}>×</button>
              <h2>{selectedEvent.title}</h2>
              <p className="event-type">{selectedEvent.extendedProps.event_type.toUpperCase()}</p>
              <p className="event-description">{selectedEvent.extendedProps.event_description}</p>
              <p><strong>Location:</strong> {selectedEvent.extendedProps.location_name}</p>
              <p><strong>Date:</strong> {new Date(selectedEvent.start).toLocaleDateString()}</p>
              <p><strong>Time:</strong> {new Date(selectedEvent.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <button 
                className="view-details-button"
                onClick={() => navigate(`/events/${selectedEvent.extendedProps.event_id}`)}
              >
                View Full Details
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Calendar;
