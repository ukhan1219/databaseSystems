var express = require('express');
var router = express.Router();

// Use the centralized database connection
const pool = require('../config/db');

/* GET all RSOs for user's university */
router.get('/', async function(req, res, next) {
	
  if(req.session.username)
  {
    console.log("User: " + req.session.username + " logged in");
    
    try {
      // Get user's university
      const userQuery = "SELECT university_id FROM users WHERE username = ?";
      const [userResult] = await pool.query(userQuery, [req.session.username]);
      
      if (!userResult.length) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }
      
      const universityId = userResult[0].university_id;
      
      // Get all active RSOs in user's university
      const queryString = `
        SELECT r.* FROM rso r
        JOIN users u ON r.admin_user_id = u.user_id
        WHERE r.is_active = TRUE AND u.university_id = ?
      `;

      const [rows] = await pool.query(queryString, [universityId]);
      res.render('orgs', {orgs: rows, message: ""});
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

/* GET specific RSO details */
router.get('/:rsoid', async function(req, res, next) {
  const rsoId = req.params.rsoid;
  console.log("Viewing RSO ID:", rsoId);

  if(req.session.username)
  {
    try {
      // Check if user is a member of this RSO
      const membershipQuery = `
        SELECT rm.* FROM rso_membership rm
        JOIN users u ON rm.user_id = u.user_id
        WHERE rm.rso_id = ? AND u.username = ?
      `;
      const [memberRows] = await pool.query(membershipQuery, [rsoId, req.session.username]);
      
      const joinStatus = memberRows.length > 0 ? 0 : 1; // 0 = already member, 1 = can join
      
      if(joinStatus === 1) {
        console.log("User can join this RSO");
      } else {
        console.log("User is already a member");
      }
        
      // Get RSO details
      const rsoQuery = `
        SELECT r.*, u.username as admin_username, univ.name as university_name
        FROM rso r
        JOIN users u ON r.admin_user_id = u.user_id
        JOIN university univ ON u.university_id = univ.university_id
        WHERE r.rso_id = ?
      `;

      const [rsoRows] = await pool.query(rsoQuery, [rsoId]);
      
      if (!rsoRows.length) {
        return res.status(404).send("RSO not found");
      }
      
      console.log(rsoRows);
      res.render('viewRSO', {orgs: rsoRows, joinStatus: joinStatus});
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
