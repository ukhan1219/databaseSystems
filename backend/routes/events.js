var express = require('express');
var router = express.Router();
var http = require('http');
var url = require('url');
var bodyParser = require('body-parser');

// Use the centralized database connection
const pool = require('../config/db');

// Parse JSON requests
router.use(bodyParser.json());

/* GET users listing. */
router.get('/', async function(req, res, next) {
  if(req.session.username) {
    console.log(req.url);
    try {
      // Get user's university
      const queryUser = "SELECT university_id FROM users WHERE username = ?";
      const [userRows] = await pool.query(queryUser, [req.session.username]);
      
      if (!userRows.length) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }
      
      const userUniversityId = userRows[0].university_id;
      console.log("User: " + req.session.username + " logged in");
      
      // Default query for all accessible events
      let queryString = `
        SELECT DISTINCT e.*, u.name as university_name,
        (SELECT AVG(rating_value) FROM rating WHERE event_id = e.event_id) as avg_rating
        FROM event e 
        LEFT JOIN university u ON e.university_id = u.university_id
        LEFT JOIN rso_membership rm ON e.rso_id = rm.rso_id AND rm.user_id = (SELECT user_id FROM users WHERE username = ?)
        WHERE 
          (e.approved_by IS NOT NULL AND e.event_type = 'public') OR 
          (e.university_id = ? AND e.event_type = 'private') OR 
          (rm.user_id IS NOT NULL AND e.event_type = 'rso')
      `;
      
      console.log(queryString);
      
      // Get RSOs where user is admin
      const RSOString = `
        SELECT r.* FROM rso r 
        INNER JOIN users u ON r.admin_user_id = u.user_id 
        WHERE u.username = ?
      `;
      
      // Filter by event type if specified
      if(req.query.selection === "private") {
         queryString = `
           SELECT e.*, u.name as university_name,
           (SELECT AVG(rating_value) FROM rating WHERE rating.event_id = e.event_id) as avg_rating 
           FROM event e
           JOIN university u ON e.university_id = u.university_id
           WHERE e.university_id = ? AND e.event_type = 'private' AND e.approved_by IS NOT NULL
         `;
        console.log("filter:private");
      }    
      else if(req.query.selection === "rso") {
         queryString = `
           SELECT DISTINCT e.*, u.name as university_name,
           (SELECT AVG(rating_value) FROM rating WHERE event_id = e.event_id) as avg_rating
           FROM event e
           JOIN university u ON e.university_id = u.university_id
           INNER JOIN rso_membership rm ON e.rso_id = rm.rso_id
           INNER JOIN users u2 ON rm.user_id = u2.user_id
           WHERE u2.username = ? AND e.event_type = 'rso' AND e.approved_by IS NOT NULL
         `;
        console.log("filter:rso");
      }    
      else if(req.query.selection === "public") {
         queryString = `
           SELECT e.*, u.name as university_name,
           (SELECT AVG(rating_value) FROM rating WHERE rating.event_id = e.event_id) as avg_rating
           FROM event e
           JOIN university u ON e.university_id = u.university_id
           WHERE e.event_type = 'public' AND e.approved_by IS NOT NULL
         `;
        console.log("filter:public");
      }
      
      console.log(queryString+" right before connection");
      
      // Execute query based on selection
      let erows;
      if(req.query.selection === "private") {
        [erows] = await pool.query(queryString, [userUniversityId]);
      } else if(req.query.selection === "rso") {
        [erows] = await pool.query(queryString, [req.session.username]);
      } else if(req.query.selection === "public") {
        [erows] = await pool.query(queryString);
      } else {
        [erows] = await pool.query(queryString, [req.session.username, userUniversityId]);
      }
      
      const [rows] = await pool.query(RSOString, [req.session.username]);
      
      // Get university name for display
      const [uniRow] = await pool.query("SELECT name FROM university WHERE university_id = ?", [userUniversityId]);
      const universityName = uniRow[0]?.name || '';
      
      res.status(200).json({
        success: true,
        university: universityName,
        events: erows,
        rsos: rows
      });
            
    } catch (err) {
      console.log(err);
      next(err);
    }
  }
  else {
    console.log("user not logged in");
    res.redirect('/');
  }
});

/* POST create new event */
router.post('/', async function(req, res, next) {
  if (!req.session.username) {
    return res.status(401).json({
      success: false,
      message: "Not logged in"
    });
  }
  
  try {
    // Get user id and role
    const userQuery = "SELECT user_id, role, university_id FROM users WHERE username = ?";
    const [userResult] = await pool.query(userQuery, [req.session.username]);
    
    if (!userResult.length) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    const userId = userResult[0].user_id;
    const userRole = userResult[0].role;
    const userUniversityId = userResult[0].university_id;
    
    const { 
      event_name, 
      event_type, 
      event_category, 
      event_description, 
      event_date, 
      event_time,
      location_name,
      address,
      contact_phone,
      contact_email,
      rso_id
    } = req.body;
    
    // Check for missing required fields
    if (!event_name || !event_type || !event_category || !event_date || !event_time) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields" 
      });
    }
    
    // Validate event type
    if (!['public', 'private', 'rso'].includes(event_type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event type. Must be 'public', 'private', or 'rso'"
      });
    }
    
    // Check for event time and location conflicts
    const conflictCheckQuery = `
      SELECT e.* FROM event e 
      WHERE e.event_date = ? 
      AND e.event_time = ? 
      AND LOWER(e.location_name) = LOWER(?)
    `;
    
    const [conflictResult] = await pool.query(conflictCheckQuery, [
      event_date, 
      event_time, 
      location_name
    ]);
    
    if (conflictResult.length > 0) {
      return res.status(409).json({
        success: false,
        message: "An event is already scheduled at this location and time"
      });
    }
    
    // Set approval based on event type and user role
    let approvedBy = null;
    
    // RSO events can only be created by RSO admins
    if (event_type === 'rso' && rso_id) {
      // Check if user is admin of the RSO
      const adminCheck = "SELECT * FROM rso WHERE rso_id = ? AND admin_user_id = ?";
      const [adminResult] = await pool.query(adminCheck, [rso_id, userId]);
      
      if (!adminResult.length) {
        return res.status(403).json({
          success: false,
          message: "Only RSO admins can create RSO events"
        });
      }
      
      // RSO events are auto-approved when created by the RSO admin
      approvedBy = userId;
    }
    
    // Super admins can auto-approve public events
    if (event_type === 'public' && userRole === 'super_admin') {
      approvedBy = userId;
    }
    
    // Private events for user's university are auto-approved for admins
    if (event_type === 'private' && (userRole === 'admin' || userRole === 'super_admin')) {
      approvedBy = userId;
    }
    
    // Insert new event with the new address field
    const insertEvent = `
      INSERT INTO event (
        event_name, 
        event_type, 
        event_category, 
        event_description, 
        event_date, 
        event_time,
        location_name,
        address,
        contact_phone,
        contact_email,
        rso_id,
        university_id,
        approved_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await pool.query(insertEvent, [
      event_name,
      event_type,
      event_category,
      event_description || null,
      event_date,
      event_time,
      location_name || null,
      address || null,
      contact_phone || null,
      contact_email || null,
      rso_id || null,
      userUniversityId,
      approvedBy
    ]);
    
    const eventId = result[0].insertId;
    
    // Return success
    return res.status(201).json({
      success: true,
      message: approvedBy ? "Event created and approved" : "Event created and pending approval",
      eventId: eventId,
      approved: !!approvedBy
    });
    
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Event creation failed: " + err.message
    });
  }
});

/* POST add comment to event */
router.post('/:eventid/comment', async function(req, res, next) {
  const eventId = req.params.eventid;
  
  if (!req.session.username) {
    return res.status(401).json({
      success: false,
      message: "Not logged in"
    });
  }
  
  try {
    // Get user id and university
    const userQuery = "SELECT user_id, university_id FROM users WHERE username = ?";
    const [userResult] = await pool.query(userQuery, [req.session.username]);
    
    if (!userResult.length) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    const userId = userResult[0].user_id;
    const userUniversityId = userResult[0].university_id;
    const { comment_text } = req.body;
    
    // Check if comment text is provided
    if (!comment_text) {
      return res.status(400).json({
        success: false,
        message: "Comment text is required"
      });
    }
    
    // Check if event exists and user has access to it
    const eventAccessQuery = `
      SELECT DISTINCT e.* FROM event e 
      LEFT JOIN rso_membership rm ON e.rso_id = rm.rso_id AND rm.user_id = ?
      WHERE e.event_id = ? AND (
          (e.event_type = 'public' AND e.approved_by IS NOT NULL) OR 
          (e.event_type = 'private' AND e.university_id = ?) OR 
          (e.event_type = 'rso' AND rm.user_id IS NOT NULL)
      )
    `;
    
    const [eventResult] = await pool.query(eventAccessQuery, [userId, eventId, userUniversityId]);
    
    if (!eventResult.length) {
      return res.status(403).json({
        success: false,
        message: "Event not found or you don't have permission to comment on it"
      });
    }
    
    // Add comment
    const insertComment = `
      INSERT INTO comment (
        event_id,
        user_id,
        comment_text
      ) VALUES (?, ?, ?)
    `;
    
    const result = await pool.query(insertComment, [
      eventId,
      userId,
      comment_text
    ]);
    
    return res.status(201).json({
      success: true,
      message: "Comment added successfully",
      commentId: result[0].insertId
    });
    
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Failed to add comment: " + err.message
    });
  }
});

/* POST rate event */
router.post('/:eventid/rate', async function(req, res, next) {
  const eventId = req.params.eventid;
  
  if (!req.session.username) {
    return res.status(401).json({
      success: false,
      message: "Not logged in"
    });
  }
  
  try {
    // Get user id and university
    const userQuery = "SELECT user_id, university_id FROM users WHERE username = ?";
    const [userResult] = await pool.query(userQuery, [req.session.username]);
    
    if (!userResult.length) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    const userId = userResult[0].user_id;
    const userUniversityId = userResult[0].university_id;
    const { rating_value } = req.body;
    
    // Check if rating is provided and valid
    if (!rating_value || rating_value < 1 || rating_value > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5"
      });
    }
    
    // Check if event exists and user has access to it
    const eventAccessQuery = `
      SELECT DISTINCT e.* FROM event e 
      LEFT JOIN rso_membership rm ON e.rso_id = rm.rso_id AND rm.user_id = ?
      WHERE e.event_id = ? AND (
          (e.event_type = 'public' AND e.approved_by IS NOT NULL) OR 
          (e.event_type = 'private' AND e.university_id = ?) OR 
          (e.event_type = 'rso' AND rm.user_id IS NOT NULL)
      )
    `;
    
    const [eventResult] = await pool.query(eventAccessQuery, [userId, eventId, userUniversityId]);
    
    if (!eventResult.length) {
      return res.status(403).json({
        success: false,
        message: "Event not found or you don't have permission to rate it"
      });
    }
    
    // Check if user already rated this event
    const ratingQuery = "SELECT * FROM rating WHERE event_id = ? AND user_id = ?";
    const [ratingResult] = await pool.query(ratingQuery, [eventId, userId]);
    
    if (ratingResult.length > 0) {
      // Update existing rating
      const updateRating = "UPDATE rating SET rating_value = ? WHERE event_id = ? AND user_id = ?";
      await pool.query(updateRating, [rating_value, eventId, userId]);
      
      return res.status(200).json({
        success: true,
        message: "Rating updated successfully"
      });
    } else {
      // Add new rating
      const insertRating = "INSERT INTO rating (event_id, user_id, rating_value) VALUES (?, ?, ?)";
      await pool.query(insertRating, [eventId, userId, rating_value]);
      
      return res.status(201).json({
        success: true,
        message: "Rating added successfully"
      });
    }
    
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Failed to rate event: " + err.message
    });
  }
});

/* GET specific event by ID */
router.get('/:eventid', async function(req, res, next) {
  const eventId = req.params.eventid;
  console.log("Fetching event: " + eventId);

  if(req.session.username) {
    console.log("User: " + req.session.username + " logged in");
    
    try {
      // Get user's university
      const getUserQuery = "SELECT university_id FROM users WHERE username = ?";
      const [userResult] = await pool.query(getUserQuery, [req.session.username]);
      
      if (!userResult.length) {
        return res.status(404).send("User not found");
      }
      
      const userUniversityId = userResult[0].university_id;
      
      // Check if event exists and user has access based on university
      const eventAccessQuery = `
        SELECT DISTINCT e.*, u.name as university_name,
        (SELECT AVG(rating_value) FROM rating WHERE event_id = e.event_id) as avg_rating 
        FROM event e
        LEFT JOIN university u ON e.university_id = u.university_id
        LEFT JOIN rso_membership rm ON e.rso_id = rm.rso_id AND rm.user_id = (SELECT user_id FROM users WHERE username = ?)
        WHERE e.event_id = ? AND (
            (e.event_type = 'public' AND e.approved_by IS NOT NULL) OR 
            (e.event_type = 'private' AND e.university_id = ?) OR 
            (e.event_type = 'rso' AND rm.user_id IS NOT NULL)
        )
      `;
      
      const [eventResult] = await pool.query(eventAccessQuery, [req.session.username, eventId, userUniversityId]);
      
      if (!eventResult.length) {
        return res.status(403).json({
          success: false,
          message: "You don't have access to this event or the event doesn't exist"
        });
      }
      
      const queryComments = `
        SELECT c.*, u.username 
        FROM comment c
        JOIN users u ON c.user_id = u.user_id
        WHERE c.event_id = ?
        ORDER BY c.created_at DESC
      `;
      const [comments] = await pool.query(queryComments, [eventId]);
      
      console.log("Comments: " + JSON.stringify(comments));
      
      res.status(200).json({
        success: true,
        event: eventResult[0],
        comments: comments
      });
    } catch (err) {
      console.log(err);
      next(err);
    }
  }
  else {
    console.log("user not logged in");
    res.redirect('/');
  }
});

/* GET comments for a specific event */
router.get('/:eventid/comments', async function(req, res, next) {
  const eventId = req.params.eventid;
  
  if (!req.session.username) {
    return res.status(401).json({
      success: false,
      message: "Not logged in"
    });
  }
  
  try {
    // Get user's university
    const userQuery = "SELECT user_id, university_id FROM users WHERE username = ?";
    const [userResult] = await pool.query(userQuery, [req.session.username]);
    
    if (!userResult.length) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    const userId = userResult[0].user_id;
    const userUniversityId = userResult[0].university_id;
    
    // Check if event exists and user has access to it
    const eventAccessQuery = `
      SELECT DISTINCT e.* FROM event e 
      LEFT JOIN rso_membership rm ON e.rso_id = rm.rso_id AND rm.user_id = ?
      WHERE e.event_id = ? AND (
          (e.event_type = 'public' AND e.approved_by IS NOT NULL) OR 
          (e.event_type = 'private' AND e.university_id = ?) OR 
          (e.event_type = 'rso' AND rm.user_id IS NOT NULL)
      )
    `;
    
    const [eventResult] = await pool.query(eventAccessQuery, [userId, eventId, userUniversityId]);
    
    if (!eventResult.length) {
      return res.status(404).json({
        success: false,
        message: "Event not found or you don't have access to it"
      });
    }
    
    // Get all comments for the event
    const commentsQuery = `
      SELECT c.comment_id, c.comment_text, c.created_at, c.updated_at,
             u.user_id, u.username
      FROM comment c
      JOIN users u ON c.user_id = u.user_id
      WHERE c.event_id = ?
      ORDER BY c.created_at DESC
    `;
    
    const [commentsResult] = await pool.query(commentsQuery, [eventId]);
    
    return res.status(200).json({
      success: true,
      comments: commentsResult
    });
    
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Failed to get comments: " + err.message
    });
  }
});

/* GET comments for a specific event (alternative route) */
router.get('/:eventid/comment', async function(req, res, next) {
  const eventId = req.params.eventid;
  
  if (!req.session.username) {
    return res.status(401).json({
      success: false,
      message: "Not logged in"
    });
  }
  
  try {
    // Get user's university
    const userQuery = "SELECT user_id, university_id FROM users WHERE username = ?";
    const [userResult] = await pool.query(userQuery, [req.session.username]);
    
    if (!userResult.length) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    const userId = userResult[0].user_id;
    const userUniversityId = userResult[0].university_id;
    
    // Check if event exists and user has access to it
    const eventAccessQuery = `
      SELECT DISTINCT e.* FROM event e 
      LEFT JOIN rso_membership rm ON e.rso_id = rm.rso_id AND rm.user_id = ?
      WHERE e.event_id = ? AND (
          (e.event_type = 'public' AND e.approved_by IS NOT NULL) OR 
          (e.event_type = 'private' AND e.university_id = ?) OR 
          (e.event_type = 'rso' AND rm.user_id IS NOT NULL)
      )
    `;
    
    const [eventResult] = await pool.query(eventAccessQuery, [userId, eventId, userUniversityId]);
    
    if (!eventResult.length) {
      return res.status(404).json({
        success: false,
        message: "Event not found or you don't have access to it"
      });
    }
    
    // Get all comments for the event
    const commentsQuery = `
      SELECT c.comment_id, c.comment_text, c.created_at, c.updated_at,
             u.user_id, u.username,
             (SELECT rating_value FROM rating WHERE user_id = u.user_id AND event_id = ?) as rating_value
      FROM comment c
      JOIN users u ON c.user_id = u.user_id
      WHERE c.event_id = ?
      ORDER BY c.created_at DESC
    `;
    
    const [commentsResult] = await pool.query(commentsQuery, [eventId, eventId]);
    
    return res.status(200).json({
      success: true,
      comments: commentsResult
    });
    
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Failed to get comments: " + err.message
    });
  }
});

/* GET ratings for a specific event */
router.get('/:eventid/ratings', async function(req, res, next) {
  const eventId = req.params.eventid;
  
  if (!req.session.username) {
    return res.status(401).json({
      success: false,
      message: "Not logged in"
    });
  }
  
  try {
    // Get user's university and ID
    const userQuery = "SELECT user_id, university_id FROM users WHERE username = ?";
    const [userResult] = await pool.query(userQuery, [req.session.username]);
    
    if (!userResult.length) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    const currentUserId = userResult[0].user_id;
    const userUniversityId = userResult[0].university_id;
    
    // Check if event exists and user has access to it
    const eventAccessQuery = `
      SELECT DISTINCT e.* FROM event e 
      LEFT JOIN rso_membership rm ON e.rso_id = rm.rso_id AND rm.user_id = ?
      WHERE e.event_id = ? AND (
          (e.event_type = 'public' AND e.approved_by IS NOT NULL) OR 
          (e.event_type = 'private' AND e.university_id = ?) OR 
          (e.event_type = 'rso' AND rm.user_id IS NOT NULL)
      )
    `;
    
    const [eventResult] = await pool.query(eventAccessQuery, [currentUserId, eventId, userUniversityId]);
    
    if (!eventResult.length) {
      return res.status(403).json({
        success: false,
        message: "Event not found or you don't have access to it"
      });
    }
    
    // Get average rating for the event
    const avgRatingQuery = "SELECT AVG(rating_value) as average_rating FROM rating WHERE event_id = ?";
    const [avgResult] = await pool.query(avgRatingQuery, [eventId]);
    
    // Get all ratings (if admin or for analytical purposes)
    const ratingsQuery = "SELECT user_id, rating_value FROM rating WHERE event_id = ?";
    const [ratingsResult] = await pool.query(ratingsQuery, [eventId]);
    
    // Get user's own rating
    const userRatingQuery = "SELECT rating_value FROM rating WHERE event_id = ? AND user_id = ?";
    const [userRatingResult] = await pool.query(userRatingQuery, [eventId, currentUserId]);
    
    return res.status(200).json({
      success: true,
      averageRating: avgResult[0].average_rating || 0,
      userRating: userRatingResult.length ? userRatingResult[0].rating_value : null,
      ratings: ratingsResult,
      totalRatings: ratingsResult.length
    });
    
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Failed to get ratings: " + err.message
    });
  }
});

/* DELETE comment */
router.delete('/:eventid/comments/:commentid', async function(req, res, next) {
  const eventId = req.params.eventid;
  const commentId = req.params.commentid;
  
  if (!req.session.username) {
    return res.status(401).json({
      success: false,
      message: "Not logged in"
    });
  }
  
  try {
    // Get current user's ID and role
    const userQuery = "SELECT user_id, role FROM users WHERE username = ?";
    const [userResult] = await pool.query(userQuery, [req.session.username]);
    
    if (!userResult.length) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    const currentUserId = userResult[0].user_id;
    const userRole = userResult[0].role;
    
    // Check if comment exists and belongs to the user
    const commentQuery = "SELECT * FROM comment WHERE comment_id = ? AND event_id = ?";
    const [commentResult] = await pool.query(commentQuery, [commentId, eventId]);
    
    if (!commentResult.length) {
      return res.status(404).json({
        success: false,
        message: "Comment not found"
      });
    }
    
    // Only allow deletion if user is comment author or an admin
    if (commentResult[0].user_id !== currentUserId && userRole !== 'super_admin' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this comment"
      });
    }
    
    // Delete comment
    const deleteQuery = "DELETE FROM comment WHERE comment_id = ?";
    await pool.query(deleteQuery, [commentId]);
    
    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully"
    });
    
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete comment: " + err.message
    });
  }
});

/* DELETE an event */
router.delete('/:eventid', async function(req, res, next) {
  const eventId = req.params.eventid;
  
  if (!req.session.username) {
    return res.status(401).json({
      success: false,
      message: "Not logged in"
    });
  }
  
  try {
    // Get current user's ID and role
    const userQuery = "SELECT user_id, role FROM users WHERE username = ?";
    const [userResult] = await pool.query(userQuery, [req.session.username]);
    
    if (!userResult.length) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    const currentUserId = userResult[0].user_id;
    const userRole = userResult[0].role;
    
    // Check if event exists
    const eventQuery = `
      SELECT e.*, r.admin_user_id as rso_admin_id
      FROM event e
      LEFT JOIN rso r ON e.rso_id = r.rso_id
      WHERE e.event_id = ?
    `;
    
    const [eventResult] = await pool.query(eventQuery, [eventId]);
    
    if (!eventResult.length) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }
    
    const event = eventResult[0];
    
    // Check if user has permission to delete the event
    let hasPermission = false;
    
    // Super admin can delete any event
    if (userRole === 'super_admin') {
      hasPermission = true;
    }
    // RSO admin can delete their RSO's events
    else if (event.event_type === 'rso' && event.rso_admin_id === currentUserId) {
      hasPermission = true;
    }
    // Admin can delete their university's events
    else if (userRole === 'admin' && event.event_type === 'private') {
      // Check if admin is from the same university as the event
      const universityCheck = `
        SELECT * FROM users 
        WHERE user_id = ? AND university_id = ?
      `;
      
      const [universityResult] = await pool.query(universityCheck, [currentUserId, event.university_id]);
      
      if (universityResult.length > 0) {
        hasPermission = true;
      }
    }
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this event"
      });
    }
    
    // Delete event
    const deleteQuery = "DELETE FROM event WHERE event_id = ?";
    await pool.query(deleteQuery, [eventId]);
    
    return res.status(200).json({
      success: true,
      message: "Event deleted successfully"
    });
    
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete event: " + err.message
    });
  }
});

/* PUT update an event */
router.put('/:eventid', async function(req, res, next) {
  const eventId = req.params.eventid;
  
  if (!req.session.username) {
    return res.status(401).json({
      success: false,
      message: "Not logged in"
    });
  }
  
  try {
    // Get current user's ID and role
    const userQuery = "SELECT user_id, role, university_id FROM users WHERE username = ?";
    const [userResult] = await pool.query(userQuery, [req.session.username]);
    
    if (!userResult.length) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    const currentUserId = userResult[0].user_id;
    const userRole = userResult[0].role;
    const userUniversityId = userResult[0].university_id;
    
    // Check if event exists
    const eventQuery = `
      SELECT e.*, r.admin_user_id as rso_admin_id
      FROM event e
      LEFT JOIN rso r ON e.rso_id = r.rso_id
      WHERE e.event_id = ?
    `;
    
    const [eventResult] = await pool.query(eventQuery, [eventId]);
    
    if (!eventResult.length) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }
    
    const event = eventResult[0];
    
    // Check if user has permission to update the event
    let hasPermission = false;
    
    // Super admin can update any event
    if (userRole === 'super_admin') {
      hasPermission = true;
    }
    // RSO admin can update their RSO's events
    else if (event.event_type === 'rso' && event.rso_admin_id === currentUserId) {
      hasPermission = true;
    }
    // Admin can update their university's events
    else if (userRole === 'admin' && event.university_id === userUniversityId) {
      hasPermission = true;
    }
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this event"
      });
    }
    
    const { 
      event_name, 
      event_category, 
      event_description, 
      event_date, 
      event_time,
      location_name,
      contact_phone,
      contact_email
    } = req.body;
    
    // Check for required fields
    if (!event_name || !event_category || !event_date || !event_time) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }
    
    // Update event
    const updateQuery = `
      UPDATE event SET
        event_name = ?,
        event_category = ?,
        event_description = ?,
        event_date = ?,
        event_time = ?,
        location_name = ?,
        contact_phone = ?,
        contact_email = ?
      WHERE event_id = ?
    `;
    
    await pool.query(updateQuery, [
      event_name,
      event_category,
      event_description || null,
      event_date,
      event_time,
      location_name || null,
      contact_phone || null,
      contact_email || null,
      eventId
    ]);
    
    return res.status(200).json({
      success: true,
      message: "Event updated successfully"
    });
    
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Failed to update event: " + err.message
    });
  }
});

module.exports = router;
