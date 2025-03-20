var express = require('express');
var router = express.Router();
var http = require('http');
var url = require('url');

// Use the centralized database connection
const pool = require('../config/db');

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
