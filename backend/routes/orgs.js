var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');

// Use the centralized database connection
const pool = require('../config/db');

// Parse JSON requests
router.use(bodyParser.json());

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
      res.status(200).json({
        success: true,
        rsos: rows
      });
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

/* POST create new RSO */
router.post('/', async function(req, res, next) {
  if(!req.session.username) {
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
    const { rso_name, description } = req.body;
    
    // Check for missing required fields
    if (!rso_name) {
      return res.status(400).json({ 
        success: false, 
        message: "RSO name is required" 
      });
    }
    
    // Insert new RSO (initially inactive until approved)
    const insertRSO = `
      INSERT INTO rso 
      (rso_name, description, admin_user_id, is_active) 
      VALUES (?, ?, ?, FALSE)
    `;

    const result = await pool.query(insertRSO, [
      rso_name, 
      description || null, 
      userId
    ]);
    
    const rsoId = result[0].insertId;
    
    // Add the creator as the first member
    const addMember = `
      INSERT INTO rso_membership 
      (user_id, rso_id) 
      VALUES (?, ?)
    `;
    
    await pool.query(addMember, [userId, rsoId]);
    
    // Return success
    return res.status(201).json({
      success: true,
      message: "RSO created successfully and pending approval",
      rsoId: rsoId
    });
    
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false, 
      message: "RSO creation failed: " + err.message
    });
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
      res.status(200).json({
        success: true,
        rso: rsoRows[0],
        joinStatus: joinStatus
      });
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

/* POST join RSO */
router.post('/:rsoid/join', async function(req, res, next) {
  const rsoId = req.params.rsoid;
  
  if(!req.session.username) {
    return res.status(401).json({
      success: false,
      message: "Not logged in"
    });
  }
  
  try {
    // Get user ID
    const userQuery = "SELECT user_id FROM users WHERE username = ?";
    const [userResult] = await pool.query(userQuery, [req.session.username]);
    
    if (!userResult.length) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    const userId = userResult[0].user_id;
    
    // Check if RSO exists and is active
    const rsoQuery = "SELECT * FROM rso WHERE rso_id = ? AND is_active = TRUE";
    const [rsoResult] = await pool.query(rsoQuery, [rsoId]);
    
    if (!rsoResult.length) {
      return res.status(404).json({
        success: false,
        message: "RSO not found or not active"
      });
    }
    
    // Check if user is already a member
    const memberQuery = "SELECT * FROM rso_membership WHERE user_id = ? AND rso_id = ?";
    const [memberResult] = await pool.query(memberQuery, [userId, rsoId]);
    
    if (memberResult.length > 0) {
      return res.status(409).json({
        success: false,
        message: "User is already a member of this RSO"
      });
    }
    
    // Add user to RSO
    const joinQuery = "INSERT INTO rso_membership (user_id, rso_id) VALUES (?, ?)";
    await pool.query(joinQuery, [userId, rsoId]);
    
    return res.status(200).json({
      success: true,
      message: "Successfully joined RSO"
    });
    
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Failed to join RSO: " + err.message
    });
  }
});

/* GET all members of a specific RSO */
router.get('/:rsoid/members', async function(req, res, next) {
  const rsoId = req.params.rsoid;
  
  if(!req.session.username) {
    return res.status(401).json({
      success: false,
      message: "Not logged in"
    });
  }
  
  try {
    // Check if RSO exists
    const rsoQuery = "SELECT * FROM rso WHERE rso_id = ?";
    const [rsoResult] = await pool.query(rsoQuery, [rsoId]);
    
    if (!rsoResult.length) {
      return res.status(404).json({
        success: false,
        message: "RSO not found"
      });
    }
    
    // Get all members
    const membersQuery = `
      SELECT u.user_id, u.username, u.email, rm.joined_date 
      FROM rso_membership rm
      JOIN users u ON rm.user_id = u.user_id
      WHERE rm.rso_id = ?
      ORDER BY rm.joined_date ASC
    `;
    
    const [membersResult] = await pool.query(membersQuery, [rsoId]);
    
    return res.status(200).json({
      success: true,
      members: membersResult
    });
    
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Failed to get RSO members: " + err.message
    });
  }
});

/* PUT update RSO details */
router.put('/:rsoid', async function(req, res, next) {
  const rsoId = req.params.rsoid;
  
  if(!req.session.username) {
    return res.status(401).json({
      success: false,
      message: "Not logged in"
    });
  }
  
  try {
    // Check if RSO exists and user is admin
    const rsoQuery = `
      SELECT r.* FROM rso r
      JOIN users u ON r.admin_user_id = u.user_id
      WHERE r.rso_id = ? AND u.username = ?
    `;
    
    const [rsoResult] = await pool.query(rsoQuery, [rsoId, req.session.username]);
    
    if (!rsoResult.length) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this RSO"
      });
    }
    
    const { rso_name, description } = req.body;
    
    // Check for required fields
    if (!rso_name) {
      return res.status(400).json({
        success: false,
        message: "RSO name is required"
      });
    }
    
    // Update RSO details
    const updateQuery = "UPDATE rso SET rso_name = ?, description = ? WHERE rso_id = ?";
    await pool.query(updateQuery, [rso_name, description || null, rsoId]);
    
    return res.status(200).json({
      success: true,
      message: "RSO updated successfully"
    });
    
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Failed to update RSO: " + err.message
    });
  }
});

/* DELETE remove a member from RSO */
router.delete('/:rsoid/members/:userid', async function(req, res, next) {
  const rsoId = req.params.rsoid;
  const targetUserId = req.params.userid;
  
  if(!req.session.username) {
    return res.status(401).json({
      success: false,
      message: "Not logged in"
    });
  }
  
  try {
    // Get current user's ID
    const userQuery = "SELECT user_id FROM users WHERE username = ?";
    const [userResult] = await pool.query(userQuery, [req.session.username]);
    
    if (!userResult.length) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    const currentUserId = userResult[0].user_id;
    
    // Check if user is RSO admin or the member themselves
    const rsoQuery = "SELECT admin_user_id FROM rso WHERE rso_id = ?";
    const [rsoResult] = await pool.query(rsoQuery, [rsoId]);
    
    if (!rsoResult.length) {
      return res.status(404).json({
        success: false,
        message: "RSO not found"
      });
    }
    
    // Only allow removal if current user is RSO admin or the member themselves
    if (rsoResult[0].admin_user_id !== currentUserId && targetUserId != currentUserId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to remove this member"
      });
    }
    
    // Prevent removing the admin (would break the RSO)
    if (targetUserId == rsoResult[0].admin_user_id) {
      return res.status(400).json({
        success: false,
        message: "Cannot remove the RSO admin"
      });
    }
    
    // Remove member
    const removeQuery = "DELETE FROM rso_membership WHERE rso_id = ? AND user_id = ?";
    await pool.query(removeQuery, [rsoId, targetUserId]);
    
    return res.status(200).json({
      success: true,
      message: "Member removed successfully"
    });
    
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Failed to remove member: " + err.message
    });
  }
});

module.exports = router;
