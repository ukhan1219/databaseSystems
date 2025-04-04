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
  rating_value?: number;
  comment_text: string;
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
  const [userRated, setUserRated] = useState<boolean>(false);
  const [userRating, setUserRating] = useState<number>(0);
  
  // Comment form state
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editCommentText, setEditCommentText] = useState<string>(''); // For inline editing
  const [newComment, setNewComment] = useState<string>('');
  const [rating, setRating] = useState<number>(0);

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

  // Check localStorage for rating even before API calls
  useEffect(() => {
    // Try to get rating from localStorage first for immediate UI update
    if (id) {
      const savedRating = localStorage.getItem(`event_${id}_rating`);
      const hasRated = localStorage.getItem(`event_${id}_has_rated`);
      
      if (hasRated === 'true' && savedRating) {
        setUserRated(true);
        setUserRating(Number(savedRating));
        setRating(Number(savedRating));
      }
    }
  }, [id]);

  // Then fetch event details and comments
  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!user || !id) return;

      try {
        console.log("Fetching event with ID:", id);
        const eventResponse = await fetch(`http://localhost:5001/api/events/${id}`, {
          credentials: 'include'
        });
        
        if (!eventResponse.ok) {
          console.error("Error fetching event:", eventResponse.status, eventResponse.statusText);
          const errorText = await eventResponse.text();
          console.error("Error response:", errorText);
          throw new Error(`Failed to fetch event details: ${eventResponse.status}`);
        }
        
        const eventData = await eventResponse.json();
        console.log("Event data received:", eventData);
        
        if (!eventData.event) {
          throw new Error('Event not found in response');
        }
        
        setEvent(eventData.event);
        
        // Check if user has permission to view this event
        const eventType = eventData.event.event_type;
        
        if (eventType === 'private' && eventData.event.university_id !== user.university_id) {
          navigate('/events');
          return;
        }
        
        if (eventType === 'rso' && eventData.event.rso_id) {
          console.log("Event belongs to RSO ID:", eventData.event.rso_id);
          // The backend already handled the access check when returning the event
          // If we got this far, the user is authorized to view the event
          // No need for an additional API call that doesn't exist
        }
        
        // Fetch comments
        const commentsResponse = await fetch(`http://localhost:5001/api/events/${id}/comment`, {
          credentials: 'include'
        });
        
        if (commentsResponse.ok) {
          const commentsData = await commentsResponse.json();
          console.log("Comments data:", commentsData);
          setComments(preserveCommentOrder(commentsData.comments || []));
        } else {
          console.error("Failed to fetch comments:", commentsResponse.status);
        }
        
        // Check if the user has already rated this event
        await fetchUserRating();
        
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

  // Refresh event data to get updated ratings
  const refreshEventData = async () => {
    if (!id) return;
    
    try {
      const response = await fetch(`http://localhost:5001/api/events/${id}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.event && event) {
          console.log("Refreshed event data with updated rating:", data.event.avg_rating);
          setEvent(data.event);
        }
      } else {
        console.error("Failed to refresh event data:", response.status);
      }
    } catch (err) {
      console.error("Error refreshing event data:", err);
    }
  };

  // Fetch user's current rating for this event
  const fetchUserRating = async () => {
    if (!id) return;
    
    try {
      // Since the GET endpoint for user rating doesn't exist,
      // we'll rely on localStorage for the UI and handle server state with the rate POST endpoint
      const savedRating = localStorage.getItem(`event_${id}_rating`);
      const hasRated = localStorage.getItem(`event_${id}_has_rated`);
      
      if (hasRated === 'true' && savedRating) {
        setUserRated(true);
        setUserRating(Number(savedRating));
        setRating(Number(savedRating));
      } else {
        setUserRated(false);
        setUserRating(0);
      }
    } catch (err) {
      console.error("Error with user rating:", err);
    }
  };

  const handleRatingChange = (selectedRating: number) => {
    setRating(selectedRating);
  };

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewComment(e.target.value);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate comment
    if (newComment.trim() === '') {
      setError('Please enter a comment');
      return;
    }
    
    try {
      // Add new comment
      const commentResponse = await fetch(`http://localhost:5001/api/events/${id}/comment`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment_text: newComment,
        }),
      });

      if (!commentResponse.ok) {
        const errorText = await commentResponse.text();
        console.error("Add comment error:", errorText);
        throw new Error(`Failed to submit comment: ${commentResponse.status}`);
      }

      const commentData = await commentResponse.json();
      
      // Refresh comments to get updated data
      try {
        const commentsResponse = await fetch(`http://localhost:5001/api/events/${id}/comment`, {
          credentials: 'include'
        });
        
        if (commentsResponse.ok) {
          const commentsData = await commentsResponse.json();
          setComments(preserveCommentOrder(commentsData.comments || []));
        } else {
          console.error("Failed to refresh comments:", commentsResponse.status);
          // Add the new comment to the list manually if refresh fails
          if (commentData.commentId && user) {
            const newCommentObj: Comment = {
              comment_id: commentData.commentId,
              user_id: user.user_id,
              username: user.username,
              event_id: parseInt(id || '0'),
              comment_text: newComment,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            setComments([...comments, newCommentObj]);
          }
        }
      } catch (err) {
        console.error("Error refreshing data:", err);
      }

      // Reset form
      setNewComment('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditingComment(comment);
    setEditCommentText(comment.comment_text);
    // Keep the current rating but don't display it in the UI
    setRating(comment.rating_value || 0);
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
    setEditCommentText('');
    setRating(0);
  };

  const handleSaveComment = async (commentId: number) => {
    if (!editingComment) return;
    
    try {
      // First store the original comment's creation date to ensure we preserve it
      const originalCreationDate = editingComment.created_at;
      
      // Create a direct PATCH request to update the comment in the database
      const commentResponse = await fetch(`http://localhost:5001/api/events/${id}/comments/${commentId}`, {
        method: 'DELETE',  // Delete first, then we'll create a new one
        credentials: 'include',
      });

      if (!commentResponse.ok) {
        const errorText = await commentResponse.text();
        console.error("Delete for update error:", errorText);
        throw new Error(`Failed to update comment: ${commentResponse.status}`);
      }
      
      // Now create a new comment with the updated text but preserve original timestamp
      const addResponse = await fetch(`http://localhost:5001/api/events/${id}/comment`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment_text: editCommentText,
          original_timestamp: editingComment.created_at // Send original creation date to backend
        }),
      });

      if (!addResponse.ok) {
        const errorText = await addResponse.text();
        console.error("Add comment error:", errorText);
        throw new Error(`Failed to submit comment: ${addResponse.status}`);
      }
      
      // Get the new comment data including the new ID
      const commentData = await addResponse.json();
      console.log("New comment data after edit:", commentData);
      
      // Only add rating if user provided one
      if (rating > 0) {
        const rateResponse = await fetch(`http://localhost:5001/api/events/${id}/rate`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rating_value: rating,
          }),
        });
        
        if (!rateResponse.ok) {
          console.error("Failed to add rating:", await rateResponse.text());
        } else {
          console.log("Rating updated successfully:", rating);
          // Add a small delay to ensure the rating is processed
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      // Manual update to comments array
      // Remove the old comment and add the new one with original creation date
      const updatedComments = comments.filter(c => c.comment_id !== commentId);
      if (commentData.commentId && user) {
        const newCommentObj: Comment = {
          comment_id: commentData.commentId,
          user_id: user.user_id,
          username: user.username,
          event_id: parseInt(id || '0'),
          rating_value: rating > 0 ? rating : editingComment.rating_value,
          comment_text: editCommentText,
          created_at: originalCreationDate, // Use the saved original date
          updated_at: new Date().toISOString()
        };
        updatedComments.push(newCommentObj);
        setComments(updatedComments);
      }
      
      // Refresh the event data with the updated rating
      await refreshEventData();

      // Fetch the user's updated rating to ensure UI state is consistent
      await fetchUserRating();

      // Reset edit state
      setEditingComment(null);
      setEditCommentText('');
      setRating(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      const response = await fetch(`http://localhost:5001/api/events/${id}/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Delete comment error:", errorText);
        throw new Error(`Failed to delete comment: ${response.status}`);
      }

      // Remove comment from state
      setComments(comments.filter(comment => comment.comment_id !== commentId));
      
      // If we were editing this comment, reset the form
      if (editingComment && editingComment.comment_id === commentId) {
        handleCancelEdit();
      }
      
      // Refresh the event data with the updated rating
      await refreshEventData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  // Helper function to ensure comments maintain their order even after updates
  const preserveCommentOrder = (newComments: Comment[]): Comment[] => {
    // Get a map of existing comment IDs to their creation dates
    const existingDates = new Map(
      comments.map(comment => [comment.comment_id, comment.created_at])
    );
    
    // For each new comment, preserve its original creation date if it existed before
    return newComments.map(comment => {
      const originalDate = existingDates.get(comment.comment_id);
      if (originalDate) {
        return { ...comment, created_at: originalDate };
      }
      return comment;
    });
  };

  const handleSubmitRating = async () => {
    if (rating === 0) {
      setError('Please select a rating before submitting');
      return;
    }
    
    try {
      // Store the rating in localStorage immediately to ensure persistence
      localStorage.setItem(`event_${id}_rating`, rating.toString());
      localStorage.setItem(`event_${id}_has_rated`, 'true');
      
      // Update UI state immediately for a responsive feel
      setUserRated(true);
      setUserRating(rating);
      
      const rateResponse = await fetch(`http://localhost:5001/api/events/${id}/rate`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating_value: rating,
        }),
      });
      
      if (!rateResponse.ok) {
        const errorText = await rateResponse.text();
        console.error("Failed to submit rating:", errorText);
        throw new Error(`Failed to submit rating: ${rateResponse.status}`);
      }
      
      console.log("Rating submitted successfully:", rating);
      
      // Add a small delay to ensure the rating is processed
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Refresh the event data with the updated rating
      await refreshEventData();
      
      // This will update the UI and ensure localStorage is in sync with server
      await fetchUserRating();
      
      // Clear any errors
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleDeleteRating = async () => {
    try {
      // Update UI immediately for better responsiveness
      setUserRated(false);
      setUserRating(0);
      setRating(0);
      
      // Clear localStorage
      localStorage.removeItem(`event_${id}_rating`);
      localStorage.removeItem(`event_${id}_has_rated`);
      
      // Since the DELETE endpoint doesn't exist, we'll have to just update the UI state
      // and trust localStorage to track whether the user has rated
      
      // Refresh the event data with the updated average rating
      await refreshEventData();
      
      // Clear any errors
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      
      // On error, restore the previous state from localStorage
      const savedRating = localStorage.getItem(`event_${id}_rating`);
      const hasRated = localStorage.getItem(`event_${id}_has_rated`);
      
      if (hasRated === 'true' && savedRating) {
        setUserRated(true);
        setUserRating(Number(savedRating));
        setRating(Number(savedRating));
      }
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

  // Format date to be more readable using local time
  const formatDate = (dateString: string) => {
    // If it's an ISO string from the server, convert it
    if (dateString) {
      const date = new Date(dateString);
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return new Date().toLocaleString(); // Fallback to current time
  };

  return (
    <>
      <Header />
      <div className="view-event-container">
        <div className="back-navigation">
          <button className="back-button" onClick={() => navigate('/events')}>
            &larr; Back to Events
          </button>
        </div>
        
        <div className="event-header">
          <h1 className="event-title">{event.event_name}</h1>
          <div className="event-type-badge">{event.event_type}</div>
          
          {event.avg_rating !== undefined && event.avg_rating !== null && (
            <div className="event-average-rating">
              <span className="rating-label">Average Rating: </span>
              <span className="avg-rating-stars">
                {Array.from({ length: 5 }).map((_, i) => {
                  // Parse the rating value to ensure it's treated as a number
                  const avgRating = parseFloat(String(event.avg_rating || '0'));
                  return (
                    <span 
                      key={i} 
                      className={`star ${i < Math.round(avgRating) ? 'filled' : ''}`}
                    >★</span>
                  );
                })}
              </span>
              <span className="avg-rating-value">
                ({isNaN(parseFloat(String(event.avg_rating))) ? '0.0' : parseFloat(String(event.avg_rating)).toFixed(1)})
              </span>
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
            <p><strong>Time:</strong> {new Date(`1970-01-01T${event.event_time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
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

        <div className="standalone-rating-section">
              <h3>{userRated ? 'Your Rating' : 'Rate This Event'}</h3>
              {userRated ? (
                <div className="current-rating-display">
                  <p className="your-rating-note">
                    <span className="rating-value-display">{userRating}.0/5.0</span> 
                    You've already rated this event. You can update or remove your rating.
                  </p>
                </div>
              ) : (
                <p className="rating-instructions">
                  Select a star rating below to rate this event. Your rating will contribute to the overall score.
                </p>
              )}
              <div className="rating-control">
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star-button large ${rating >= star ? 'selected' : ''}`}
                      onClick={() => handleRatingChange(star)}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <div className="rating-actions">
                  {rating > 0 && (
                    <>
                      <button 
                        type="button" 
                        className="submit-rating-button"
                        onClick={handleSubmitRating}
                      >
                        {userRated ? 'Update Rating' : 'Submit Rating'}
                      </button>
                      <button 
                        type="button" 
                        className="clear-rating-button" 
                        onClick={userRated ? handleDeleteRating : () => setRating(0)}
                      >
                        {userRated ? 'Remove Rating' : 'Clear'}
                      </button>
                    </>
                  )}
                  <p className="rating-note">Your rating contributes to the overall score but is not shown publicly</p>
                </div>
              </div>
            </div>
          
          <div className="comment-section">
            <h2>Comments</h2>
            
            
            
            <form onSubmit={handleSubmitComment} className="comment-form">
              <h3>Add Your Comment</h3>
              
              <div className="comment-form-divider">
                <p>Your comment will be public and visible to all users</p>
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
                <button type="submit" className="submit-button">Submit</button>
              </div>
            </form>
            
            <div className="comments-list">
              <h3>Comments {comments.length > 0 && `(${comments.length})`}</h3>
              
              {comments.length === 0 ? (
                <p className="no-comments">No comments yet. Be the first to share your thoughts!</p>
              ) : (
                // Keep comments in a fixed order based on the original creation date
                [...comments]
                  .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) // Sort by original comment creation date
                  .map((comment) => (
                    <div key={comment.comment_id} className="comment-card">
                      <div className="comment-header">
                        <div className="comment-user">
                          <span className="username">{comment.username}</span>
                          <span className="comment-date">
                            {comment.updated_at !== comment.created_at 
                              ? <><span className="original-date">Posted {formatDate(comment.created_at)}</span> · <span className="edit-note">Edited {formatDate(comment.updated_at)}</span></>
                              : <>Posted {formatDate(comment.created_at)}</>
                            }
                          </span>
                        </div>
                      </div>
                      
                      <div className="comment-body">
                        {editingComment?.comment_id === comment.comment_id ? (
                          <>
                            <textarea
                              className="inline-edit-textarea"
                              value={editCommentText}
                              onChange={(e) => setEditCommentText(e.target.value)}
                              rows={3}
                            ></textarea>
                            {/* Hidden rating control to preserve the rating without showing it */}
                            <div className="hidden-rating-control">
                              <span className="subtle-text">Your rating will be preserved but not displayed to others</span>
                            </div>
                          </>
                        ) : (
                          <p>{comment.comment_text}</p>
                        )}
                      </div>
                      
                      {isUserComment(comment) && (
                        <div className="comment-actions">
                          {editingComment?.comment_id === comment.comment_id ? (
                            <>
                              <button
                                onClick={() => handleSaveComment(comment.comment_id)}
                                className="save-button"
                              >
                                Save
                              </button>
                              <button 
                                onClick={handleCancelEdit}
                                className="cancel-button"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
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
                            </>
                          )}
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