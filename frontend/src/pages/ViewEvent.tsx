import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import './ViewEvent.css';

interface Event {
  event_id: number;
  event_name: string;
  event_description: string;
  event_date: string;
  event_time: string;
  event_type: 'public' | 'private' | 'rso';
  event_category: string;
  location_name: string;
  contact_phone: string;
  contact_email: string;
  is_approved: boolean;
  university_id: number;
  university_name: string;
  avg_rating?: number;
}

interface Comment {
  comment_id: number;
  user_id: number;
  username: string;
  event_id: number;
  rating: number;
  text: string;
  created_at: string;
  updated_at: string;
}

interface User {
  user_id: number;
  username: string;
  role: string;
  university_id: number | null;
}

const ViewEvent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  
  // Comment form state
  const [newComment, setNewComment] = useState<string>('');
  const [rating, setRating] = useState<number>(0);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);

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

  // Then fetch event details and comments
  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!user || !id) return;

      try {
        const eventResponse = await fetch(`http://localhost:5001/api/events/${id}`, {
          credentials: 'include'
        });
        
        if (!eventResponse.ok) {
          throw new Error('Failed to fetch event details');
        }
        
        const eventData = await eventResponse.json();
        if (!eventData.event) {
          throw new Error('Event not found');
        }
        
        setEvent(eventData.event);
        
        // Check if user has permission to view this event
        const eventType = eventData.event.event_type;
        
        if (eventType === 'private' && eventData.event.university_id !== user.university_id) {
          navigate('/events');
          return;
        }
        
        if (eventType === 'rso') {
          // Check if user is a member of this RSO - this check should be done on the backend
          // but we'll do a client-side check as well
          const response = await fetch(`http://localhost:5001/api/orgs/check-member/${eventData.event.rso_id}`, {
            credentials: 'include'
          });
          
          if (!response.ok) {
            navigate('/events');
            return;
          }
        }
        
        // Fetch comments
        const commentsResponse = await fetch(`http://localhost:5001/api/events/${id}/comments`, {
          credentials: 'include'
        });
        
        if (commentsResponse.ok) {
          const commentsData = await commentsResponse.json();
          setComments(commentsData.comments || []);
        }
        
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      }
    };

    if (user) {
      fetchEventDetails();
    }
  }, [id, user, navigate]);

  const handleRatingChange = (selectedRating: number) => {
    setRating(selectedRating);
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewComment(e.target.value);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }
    
    try {
      if (editingComment) {
        // Update existing comment
        const response = await fetch(`http://localhost:5001/api/events/${id}/comments/${editingComment.comment_id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rating,
            text: newComment,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update comment');
        }
        
        // Update the comment in the local state
        setComments(comments.map(comment => 
          comment.comment_id === editingComment.comment_id 
            ? { ...comment, rating, text: newComment, updated_at: new Date().toISOString() } 
            : comment
        ));
        
        // Clear editing state
        setEditingComment(null);
      } else {
        // Add new comment
        const response = await fetch(`http://localhost:5001/api/events/${id}/comments`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rating,
            text: newComment,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to submit comment');
        }

        const data = await response.json();
        
        if (data.comment) {
          // Add the new comment to the local state
          setComments([...comments, data.comment]);
          
          // Update the event's average rating if returned
          if (data.avg_rating && event) {
            setEvent({
              ...event,
              avg_rating: data.avg_rating
            });
          }
        } else {
          // Fallback: refresh comments
          const commentsResponse = await fetch(`http://localhost:5001/api/events/${id}/comments`, {
            credentials: 'include'
          });
          
          if (commentsResponse.ok) {
            const commentsData = await commentsResponse.json();
            setComments(commentsData.comments || []);
          }
        }
      }

      // Reset form
      setNewComment('');
      setRating(0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditingComment(comment);
    setNewComment(comment.text);
    setRating(comment.rating);
    
    // Scroll to the comment form
    document.querySelector('.comment-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
    setNewComment('');
    setRating(0);
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      const response = await fetch(`http://localhost:5001/api/events/${id}/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      // Remove comment from state
      setComments(comments.filter(comment => comment.comment_id !== commentId));
      
      // If we were editing this comment, reset the form
      if (editingComment && editingComment.comment_id === commentId) {
        handleCancelEdit();
      }
      
      // Refresh the average rating if provided in the response
      try {
        const data = await response.json();
        if (data.avg_rating !== undefined && event) {
          setEvent({
            ...event,
            avg_rating: data.avg_rating
          });
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (loading) return (
    <>
      <Header />
      <div className="loading">Loading event details...</div>
    </>
  );
  
  if (error) return (
    <>
      <Header />
      <div className="error">{error}</div>
    </>
  );
  
  if (!event) return (
    <>
      <Header />
      <div className="not-found">Event not found</div>
    </>
  );

  // Check if this comment belongs to the current user
  const isUserComment = (comment: Comment) => {
    return user && user.user_id === comment.user_id;
  };

  // Format date to be more readable
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <>
      <Header />
      <div className="view-event-container">
        <div className="event-header">
          <h1 className="event-title">{event.event_name}</h1>
          <div className="event-type-badge">{event.event_type}</div>
          
          {event.avg_rating !== undefined && (
            <div className="event-average-rating">
              <span className="avg-rating-stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span 
                    key={i} 
                    className={`star ${i < Math.round(event.avg_rating || 0) ? 'filled' : ''}`}
                  >★</span>
                ))}
              </span>
              <span className="avg-rating-value">({event.avg_rating.toFixed(1)})</span>
            </div>
          )}
        </div>
        
        <div className="event-details">
          <div className="detail-section">
            <h3>About this Event</h3>
            <p className="event-description">{event.event_description}</p>
          </div>
          
          <div className="detail-section">
            <h3>Date & Time</h3>
            <p><strong>Date:</strong> {new Date(event.event_date).toLocaleDateString()}</p>
            <p><strong>Time:</strong> {event.event_time}</p>
            <p><strong>Category:</strong> {event.event_category}</p>
          </div>
          
          <div className="detail-section">
            <h3>Location & Contact</h3>
            <p><strong>University:</strong> {event.university_name}</p>
            <p><strong>Location:</strong> {event.location_name}</p>
            {event.contact_phone && <p><strong>Phone:</strong> {event.contact_phone}</p>}
            <p><strong>Email:</strong> {event.contact_email}</p>
          </div>
        </div>
        
        <div className="event-interaction">
          <div className="comment-section">
            <h2>Reviews & Comments</h2>
            
            <form onSubmit={handleSubmitComment} className="comment-form">
              <h3>{editingComment ? 'Edit Your Review' : 'Add Your Review'}</h3>
              
              <div className="rating-control">
                <p>Your Rating:</p>
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star-button ${rating >= star ? 'selected' : ''}`}
                      onClick={() => handleRatingChange(star)}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="comment-control">
                <label htmlFor="comment-text">Your Comment:</label>
                <textarea
                  id="comment-text"
                  value={newComment}
                  onChange={handleCommentChange}
                  placeholder="Share your thoughts about this event..."
                  rows={4}
                ></textarea>
              </div>
              
              <div className="form-actions">
                {editingComment ? (
                  <>
                    <button type="submit" className="submit-button">Update</button>
                    <button 
                      type="button" 
                      onClick={handleCancelEdit}
                      className="cancel-button"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button type="submit" className="submit-button">Submit</button>
                )}
              </div>
            </form>
            
            <div className="comments-list">
              <h3>All Reviews {comments.length > 0 && `(${comments.length})`}</h3>
              
              {comments.length === 0 ? (
                <p className="no-comments">No reviews yet. Be the first to share your thoughts!</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.comment_id} className="comment-card">
                    <div className="comment-header">
                      <div className="comment-user">
                        <span className="username">{comment.username}</span>
                        <span className="comment-date">
                          {comment.updated_at !== comment.created_at 
                            ? `Updated on ${formatDate(comment.updated_at)}` 
                            : formatDate(comment.created_at)}
                        </span>
                      </div>
                      
                      <div className="comment-rating">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span 
                            key={i} 
                            className={`star ${i < comment.rating ? 'filled' : ''}`}
                          >★</span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="comment-body">
                      <p>{comment.text}</p>
                    </div>
                    
                    {isUserComment(comment) && (
                      <div className="comment-actions">
                        <button
                          onClick={() => handleEditComment(comment)}
                          className="edit-button"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteComment(comment.comment_id)}
                          className="delete-button"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ViewEvent; 