var express = require('express');
var router = express.Router();

// Use the centralized database connection
const pool = require('../config/db');

/* GET super admin dashboard */
router.get('/', async function(req, res, next) {

  if(req.session.username)
  {
    console.log("User: " + req.session.username + " logged in");
    
    try {
      // Check if user is a super_admin
      const superAdminCheck = "SELECT * FROM users WHERE username = ? AND role = 'super_admin'";
      const [superAdminResult] = await pool.query(superAdminCheck, [req.session.username]);
      
      if (!superAdminResult.length) {
        console.log("User is not a super admin");
        return res.status(403).send("Access denied: Only super administrators can access this page");
      }
      
      // Get pending RSOs
      const rsoQuery = "SELECT * FROM rso WHERE is_active = FALSE";
      
      // Get pending events
      const eventQuery = "SELECT * FROM event WHERE approved_by IS NULL";

      const [eventRows] = await pool.query(eventQuery);
      const [rsoRows] = await pool.query(rsoQuery);
      
      res.render('super', {message: "", orgs: rsoRows, events: eventRows});
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

/* Approve RSO */
router.get('/RSO/:rsoid', async function(req, res, next) {
  const rsoId = req.params.rsoid;
  console.log("Approving RSO ID:", rsoId);

  if(req.session.username)
  {
    try {
      // Verify user is a super_admin
      const superAdminCheck = "SELECT user_id FROM users WHERE username = ? AND role = 'super_admin'";
      const [superAdminResult] = await pool.query(superAdminCheck, [req.session.username]);

      if(superAdminResult.length > 0) {
        console.log("User: " + req.session.username + " is super_admin");
        
        // Approve RSO
        const approveQuery = "UPDATE rso SET is_active = TRUE WHERE rso_id = ?";
        await pool.query(approveQuery, [rsoId]);
        
        // Find RSO admin and update their role to 'admin'
        const findAdminQuery = "SELECT admin_user_id FROM rso WHERE rso_id = ?";
        const [adminResult] = await pool.query(findAdminQuery, [rsoId]);
        
        if (adminResult.length > 0) {
          const adminId = adminResult[0].admin_user_id;
          const updateAdminQuery = "UPDATE users SET role = 'admin' WHERE user_id = ? AND role = 'student'";
          await pool.query(updateAdminQuery, [adminId]);
        }
        
        console.log("RSO approved and admin role updated");
      } else {
        console.log("User is not a super admin");
        return res.status(403).send("Access denied");
      }
    } catch (err) {
      console.log(err);
      next(err);
    }
    res.redirect('/super');
  }
  else
  {
    console.log("user not logged in");
    res.redirect('/');
  }
});

/* Approve Event */
router.get('/Event/:eventid', async function(req, res, next) {
  const eventId = req.params.eventid;
  console.log("Approving Event ID:", eventId);

  if(req.session.username)
  {
    try {
      // Verify user is a super_admin
      const superAdminCheck = "SELECT user_id FROM users WHERE username = ? AND role = 'super_admin'";
      const [superAdminResult] = await pool.query(superAdminCheck, [req.session.username]);

      if(superAdminResult.length > 0) {
        console.log("User: " + req.session.username + " is super_admin");
        
        // Approve event by setting the approved_by field to the super admin's user_id
        const approveQuery = "UPDATE event SET approved_by = ? WHERE event_id = ?";
        await pool.query(approveQuery, [superAdminResult[0].user_id, eventId]);
        
        console.log("Event approved");
      } else {
        console.log("User is not a super admin");
        return res.status(403).send("Access denied");
      }
    } catch (err) {
      console.log(err);
      next(err);
    }
    res.redirect('/super');
  }
  else
  {
    console.log("user not logged in");
    res.redirect('/');
  }
});

module.exports = router;
