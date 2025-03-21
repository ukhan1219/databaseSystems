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

  if(req.session.username)
  {
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
        SELECT DISTINCT e.* FROM event e 
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
      if(req.query.selection === "private")
      {
         queryString = `
           SELECT * FROM event 
           WHERE university_id = ? AND event_type = 'private' AND approved_by IS NOT NULL
         `;
        console.log("filter:private");
      }    
      else if(req.query.selection === "rso")
      {
         queryString = `
           SELECT DISTINCT e.* FROM event e
           INNER JOIN rso_membership rm ON e.rso_id = rm.rso_id
           INNER JOIN users u ON rm.user_id = u.user_id
           WHERE u.username = ? AND e.event_type = 'rso' AND e.approved_by IS NOT NULL
         `;
        console.log("filter:rso");
      }    
      else if(req.query.selection === "public")
      {
         queryString = `
           SELECT * FROM event 
           WHERE event_type = 'public' AND approved_by IS NOT NULL
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
      
      res.render("events", {events: erows, RSO: rows, uni: universityName});
      
    } catch (err) {
      console.log(err);
      next(err);
    }
  }
  else
  {
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
      latitude,
      longitude,
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
    
    // Insert new event
    const insertEvent = `
      INSERT INTO event (
        event_name, 
        event_type, 
        event_category, 
        event_description, 
        event_date, 
        event_time,
        location_name,
        latitude,
        longitude,
        contact_phone,
        contact_email,
        rso_id,
        university_id,
        approved_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await pool.query(insertEvent, [
      event_name,
      event_type,
      event_category,
      event_description || null,
      event_date,
      event_time,
      location_name || null,
      latitude || null,
      longitude || null,
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
    // Get user id
    const userQuery = "SELECT user_id FROM users WHERE username = ?";
    const [userResult] = await pool.query(userQuery, [req.session.username]);
    
    if (!userResult.length) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    const userId = userResult[0].user_id;
    const { comment_text } = req.body;
    
    // Check if comment text is provided
    if (!comment_text) {
      return res.status(400).json({
        success: false,
        message: "Comment text is required"
      });
    }
    
    // Check if event exists
    const eventQuery = "SELECT * FROM event WHERE event_id = ?";
    const [eventResult] = await pool.query(eventQuery, [eventId]);
    
    if (!eventResult.length) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
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
    // Get user id
    const userQuery = "SELECT user_id FROM users WHERE username = ?";
    const [userResult] = await pool.query(userQuery, [req.session.username]);
    
    if (!userResult.length) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    const userId = userResult[0].user_id;
    const { rating_value } = req.body;
    
    // Check if rating is provided and valid
    if (!rating_value || rating_value < 1 || rating_value > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5"
      });
    }
    
    // Check if event exists
    const eventQuery = "SELECT * FROM event WHERE event_id = ?";
    const [eventResult] = await pool.query(eventQuery, [eventId]);
    
    if (!eventResult.length) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
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

  if(req.session.username)
  {
    console.log("User: " + req.session.username + " logged in");
    
    try {
      const queryComments = `
        SELECT c.*, u.username 
        FROM comment c
        JOIN users u ON c.user_id = u.user_id
        WHERE c.event_id = ?
        ORDER BY c.created_at DESC
      `;
      const [comments] = await pool.query(queryComments, [eventId]);
      
      console.log("Comments: " + JSON.stringify(comments));
      
      const queryEvent = `
        SELECT e.*, u.name as university_name 
        FROM event e
        LEFT JOIN university u ON e.university_id = u.university_id
        WHERE e.event_id = ?
      `;
      const [rows] = await pool.query(queryEvent, [eventId]);
      
      if (!rows.length) {
        return res.status(404).send("Event not found");
      }
      
      console.log(rows);
      res.render('viewevent', {events: rows, comments: comments});
    } catch (err) {
      console.log(err);
      next(err);
    }
  }
  else
  {
    console.log("user not logged in");
    res.redirect('/');
  }
});

module.exports = router;
