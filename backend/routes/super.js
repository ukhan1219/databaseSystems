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
      
      res.status(200).json({
        success: true,
        message: "",
        orgs: rsoRows,
        events: eventRows
      });
          } catch (err) {
      console.log(err);
      next(err);
    }
  }
  else
  {
    console.log("user not logged in");
    res.status(401).json({
      success: false,
      message: "Not logged in"
    });
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
        
        // Check if RSO exists
        const rsoQuery = "SELECT * FROM rso WHERE rso_id = ?";
        const [rsoResult] = await pool.query(rsoQuery, [rsoId]);
        
        if (!rsoResult.length) {
          return res.status(404).json({
            success: false,
            message: "RSO not found"
          });
        }
        
        // Check if RSO has at least 5 members
        const memberCountQuery = "SELECT COUNT(*) as member_count FROM rso_membership WHERE rso_id = ?";
        const [countResult] = await pool.query(memberCountQuery, [rsoId]);
        const memberCount = countResult[0].member_count;
        
        if (memberCount < 5) {
          return res.status(400).json({
            success: false,
            message: "RSO needs at least 5 members to be activated",
            memberCount: memberCount
          });
        }
        
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
        
        return res.status(200).json({
          success: true,
          message: "RSO approved and admin role updated",
          memberCount: memberCount
        });
      } else {
        console.log("User is not a super admin");
        return res.status(403).json({
          success: false,
          message: "Access denied: Only super administrators can approve RSOs"
        });
      }
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        success: false,
        message: "Failed to approve RSO: " + err.message
      });
    }
  }
  else
  {
    console.log("user not logged in");
    return res.status(401).json({
      success: false,
      message: "Not logged in"
    });
  }
});

/* Approve Event */
router.get('/Event/:eventid/approve', async function(req, res, next) {
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
        
        // Check if event exists and needs approval
        const eventQuery = "SELECT * FROM event WHERE event_id = ? AND approved_by IS NULL";
        const [eventResult] = await pool.query(eventQuery, [eventId]);
        
        if (!eventResult.length) {
          return res.status(404).json({
            success: false,
            message: "Event not found or already processed"
          });
        }
        
        // Approve event by setting the approved_by field to the super admin's user_id
        const approveQuery = "UPDATE event SET approved_by = ? WHERE event_id = ?";
        await pool.query(approveQuery, [superAdminResult[0].user_id, eventId]);
        
        console.log("Event approved");
        
        return res.status(200).json({
          success: true,
          message: "Event approved"
        });
      } else {
        console.log("User is not a super admin");
        return res.status(403).json({
          success: false,
          message: "Access denied: Only super administrators can approve events"
        });
      }
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        success: false,
        message: "Failed to approve event: " + err.message
      });
    }
  }
  else
  {
    console.log("user not logged in");
    return res.status(401).json({
      success: false,
      message: "Not logged in"
    });
  }
});

/* Reject Event */
router.get('/Event/:eventid/reject', async function(req, res, next) {
  const eventId = req.params.eventid;
  console.log("Rejecting Event ID:", eventId);

  if(req.session.username)
  {
    try {
      // Verify user is a super_admin
      const superAdminCheck = "SELECT user_id FROM users WHERE username = ? AND role = 'super_admin'";
      const [superAdminResult] = await pool.query(superAdminCheck, [req.session.username]);

      if(superAdminResult.length > 0) {
        console.log("User: " + req.session.username + " is super_admin");
        
        // Check if event exists and needs approval
        const eventQuery = "SELECT * FROM event WHERE event_id = ? AND approved_by IS NULL";
        const [eventResult] = await pool.query(eventQuery, [eventId]);
        
        if (!eventResult.length) {
          return res.status(404).json({
            success: false,
            message: "Event not found or already processed"
          });
        }
        
        // Delete the rejected event
        const deleteQuery = "DELETE FROM event WHERE event_id = ?";
        await pool.query(deleteQuery, [eventId]);
        
        console.log("Event rejected and removed");
        
        return res.status(200).json({
          success: true,
          message: "Event rejected and removed"
        });
      } else {
        console.log("User is not a super admin");
        return res.status(403).json({
          success: false,
          message: "Access denied: Only super administrators can reject events"
        });
      }
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        success: false,
        message: "Failed to reject event: " + err.message
      });
    }
  }
  else
  {
    console.log("user not logged in");
    return res.status(401).json({
      success: false,
      message: "Not logged in"
    });
  }
});

module.exports = router;
