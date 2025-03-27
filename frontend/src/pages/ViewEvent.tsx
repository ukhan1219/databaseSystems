import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import './ViewEvent.css';

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

interface Comment {
  id: number;
  owner: string;
  rating: number;
  commentString: string;
}

const ViewEvent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState<string>('');
  const [rating, setRating] = useState<number>(0);

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        // Replace with your actual API endpoints
        const eventResponse = await fetch(`http://localhost:8000/api/events/${id}`);
        
        if (!eventResponse.ok) {
          throw new Error('Failed to fetch event details');
        }
        
        const eventData = await eventResponse.json();
        setEvent(eventData);
        
        // Fetch comments
        const commentsResponse = await fetch(`http://localhost:8000/api/events/${id}/comments`);
        
        if (commentsResponse.ok) {
          const commentsData = await commentsResponse.json();
          setComments(commentsData);
        }
        
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [id]);

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
      const response = await fetch(`http://localhost:8000/api/events/${id}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          commentString: newComment,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit comment');
      }

      // Refresh comments
      const commentsResponse = await fetch(`http://localhost:8000/api/events/${id}/comments`);
      if (commentsResponse.ok) {
        const commentsData = await commentsResponse.json();
        setComments(commentsData);
      }

      // Reset form
      setNewComment('');
      setRating(0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      // Remove comment from state
      setComments(comments.filter(comment => comment.id !== commentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!event) return <div className="not-found">Event not found</div>;

  return (
    <>
      <Header />
      <div className="view-event-container">
        <h1 className="page-title">Event Details</h1>
        
        <div className="event-details">
          <h3 className="event-name">Name: {event.Name}</h3>
          <div className="event-info">
            <p>Description: {event.Description}</p>
            <p>Time: {event.Time}</p>
            <p>Date: {event.Date}</p>
          </div>
          <div className="event-contact">
            <p>Location: {event.Location}</p>
            <p>Contact Phone: {event.Phone}</p>
            <p>Contact Email: {event.Email}</p>
          </div>
        </div>
        
        <div className="event-sections">
          <div className="left-section">
            <h2>Add Review</h2>
            <form onSubmit={handleSubmitComment}>
              <div className="rating-wrapper">
                {[5, 4, 3, 2, 1].map((star) => (
                  <React.Fragment key={star}>
                    <input
                      type="radio"
                      id={`star-${star}`}
                      className="rating-input"
                      name="rating"
                      checked={rating === star}
                      onChange={() => handleRatingChange(star)}
                    />
                    <label 
                      htmlFor={`star-${star}`} 
                      className="rating-star"
                      onClick={() => handleRatingChange(star)}
                    ></label>
                  </React.Fragment>
                ))}
              </div>
              
              <textarea
                name="comments"
                rows={3}
                className="comment-textarea"
                placeholder="Comment here..."
                value={newComment}
                onChange={handleCommentChange}
              ></textarea>
              
              <div className="form-buttons">
                <button type="submit" className="submit-button">Submit</button>
                <button 
                  type="button" 
                  className="reset-button"
                  onClick={() => {
                    setNewComment('');
                    setRating(0);
                  }}
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
          
          <div className="right-section">
            <h2>Reviews</h2>
            <ul className="comments-list">
              {comments.length === 0 ? (
                <p>No reviews yet.</p>
              ) : (
                comments.map((comment) => (
                  <li key={comment.id} className="comment-item">
                    <button 
                      className="delete-button" 
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      X
                    </button>
                    <h3>Username: {comment.owner}</h3>
                    <h4>Stars: {comment.rating}</h4>
                    <h4>Comment: {comment.commentString}</h4>
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

export default ViewEvent; 