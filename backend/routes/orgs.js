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
      
      // Get all RSOs in user's university (both active and inactive)
      const queryString = `
        SELECT r.*, 
               (SELECT COUNT(*) FROM rso_membership rm WHERE rm.rso_id = r.rso_id) as member_count 
        FROM rso r
        JOIN users u ON r.admin_user_id = u.user_id
        WHERE u.university_id = ?
        ORDER BY r.is_active DESC, r.rso_name ASC
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
    const { rso_name, description, initial_members } = req.body;
    
    // Check for missing required fields
    if (!rso_name) {
      return res.status(400).json({ 
        success: false, 
        message: "RSO name is required" 
      });
    }
    
    // Insert new RSO (initially inactive until it has 5 members and is approved)
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
    
    // If initial members are provided, add them too
    let memberCount = 1; // Start with 1 (the creator)
    
    if (initial_members && Array.isArray(initial_members) && initial_members.length > 0) {
      // Validate all provided members exist and are from the same university
      const memberListStr = Array(initial_members.length).fill('?').join(',');
      const memberQuery = `
        SELECT user_id, university_id, username FROM users 
        WHERE username IN (${memberListStr})
      `;
      
      const [membersResult] = await pool.query(memberQuery, initial_members);
      
      // Filter out members from different universities
      const validMembers = membersResult.filter(m => m.university_id === userUniversityId);
      
      if (validMembers.length > 0) {
        // Add valid members to the RSO
        const membersInsertValues = validMembers.map(m => [m.user_id, rsoId]);
        const addMembersQuery = `
          INSERT INTO rso_membership 
          (user_id, rso_id) 
          VALUES ?
        `;
        
        await pool.query(addMembersQuery, [membersInsertValues]);
        memberCount += validMembers.length;
      }
    }
    
    let message = "RSO created successfully. It will remain inactive until it has 5 members and is approved by an administrator.";
    
    // If already 5+ members, update the message
    if (memberCount >= 5) {
      message = "RSO created successfully with 5+ members. Awaiting administrator approval.";
    }
    
    // Return success
    return res.status(201).json({
      success: true,
      message: message,
      rsoId: rsoId,
      memberCount: memberCount,
      isActive: false
    });
    
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false, 
      message: "RSO creation failed: " + err.message
    });
  }
});

/* GET RSOs where user is admin */
router.get('/admin', async function(req, res, next) {
  if (!req.session.username) {
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
    
    // Get all RSOs where user is admin
    const adminRSOsQuery = `
      SELECT r.*, 
             (SELECT COUNT(*) FROM rso_membership rm WHERE rm.rso_id = r.rso_id) as member_count 
      FROM rso r 
      WHERE r.admin_user_id = ?
      ORDER BY r.is_active DESC, r.rso_name ASC
    `;
    
    const [adminRSOs] = await pool.query(adminRSOsQuery, [userId]);
    
    return res.status(200).json({
      success: true,
      rsos: adminRSOs
    });
    
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin RSOs: " + err.message
    });
  }
});

/* GET RSOs that user is a member of */
router.get('/my', async function(req, res, next) {
  if (!req.session.username) {
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
    
    // Get all RSOs where user is a member
    const memberRSOsQuery = `
      SELECT r.*, 
             (SELECT COUNT(*) FROM rso_membership rm WHERE rm.rso_id = r.rso_id) as member_count,
             (r.admin_user_id = ?) as is_admin,
             (SELECT u.username FROM users u WHERE u.user_id = r.admin_user_id) as admin_name 
      FROM rso r 
      JOIN rso_membership rm ON r.rso_id = rm.rso_id
      WHERE rm.user_id = ?
      ORDER BY r.is_active DESC, r.rso_name ASC
    `;
    
    const [memberRSOs] = await pool.query(memberRSOsQuery, [userId, userId]);
    
    // Enhance data with boolean properties instead of 0/1
    const enhancedRSOs = memberRSOs.map(rso => ({
      ...rso,
      is_admin: !!rso.is_admin,
      is_member: true
    }));
    
    return res.status(200).json({
      success: true,
      rsos: enhancedRSOs
    });
    
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch member RSOs: " + err.message
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
      // Get user information
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
      
      // Check if user is a member of this RSO
      const membershipQuery = `
        SELECT rm.* FROM rso_membership rm
        JOIN users u ON rm.user_id = u.user_id
        WHERE rm.rso_id = ? AND u.username = ?
      `;
      const [memberRows] = await pool.query(membershipQuery, [rsoId, req.session.username]);
      
      // 0 = already member, 1 = can join
      const joinStatus = memberRows.length > 0 ? 0 : 1; 
      
      const joinStatusText = joinStatus === 0 ? "Member" : "Can Join";
      const isMember = joinStatus === 0;
      
      if(joinStatus === 1) {
        console.log("User can join this RSO");
      } else {
        console.log("User is already a member");
      }
        
      // Get RSO details with extended information
      const rsoQuery = `
        SELECT r.*, u.username as admin_username, u.email as admin_email, 
               u.role as admin_role, univ.name as university_name,
               univ.university_id
        FROM rso r
        JOIN users u ON r.admin_user_id = u.user_id
        JOIN university univ ON u.university_id = univ.university_id
        WHERE r.rso_id = ?
      `;

      const [rsoRows] = await pool.query(rsoQuery, [rsoId]);
      
      if (!rsoRows.length) {
        return res.status(404).send("RSO not found");
      }
      
      // Get member count
      const countQuery = "SELECT COUNT(*) as member_count FROM rso_membership WHERE rso_id = ?";
      const [countResult] = await pool.query(countQuery, [rsoId]);
      const memberCount = countResult[0].member_count;
      
      // Get upcoming events for this RSO
      const eventsQuery = `
        SELECT event_id, event_name, event_date, event_time
        FROM event
        WHERE rso_id = ? AND event_date >= CURDATE()
        ORDER BY event_date ASC, event_time ASC
        LIMIT 3
      `;
      const [eventsResult] = await pool.query(eventsQuery, [rsoId]);
      
      // Check if user is the RSO admin
      const isAdmin = rsoRows[0].admin_user_id === userId;
      
      // Check if user can join (from same university and not already a member)
      const canJoin = joinStatus === 1 && rsoRows[0].university_id === userUniversityId;
      
      console.log(rsoRows);
      res.status(200).json({
        success: true,
        rso: {
          ...rsoRows[0],
          member_count: memberCount,
          has_enough_members: memberCount >= 5
        },
        membership: {
          isMember: isMember,
          isAdmin: isAdmin,
          joinStatus: joinStatus,
          joinStatusText: joinStatusText,
          canJoin: canJoin
        },
        upcoming_events: eventsResult
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
    // Get user ID and university
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
    
    // Check if RSO exists
    const rsoQuery = `
      SELECT r.*, u.university_id 
      FROM rso r
      JOIN users u ON r.admin_user_id = u.user_id
      WHERE r.rso_id = ?
    `;
    const [rsoResult] = await pool.query(rsoQuery, [rsoId]);
    
    if (!rsoResult.length) {
      return res.status(404).json({
        success: false,
        message: "RSO not found"
      });
    }
    
    // Check if user is from the same university as the RSO admin
    if (rsoResult[0].university_id !== userUniversityId) {
      return res.status(403).json({
        success: false,
        message: "You can only join RSOs from your own university"
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
    
    // Check total membership count after adding the new member
    const countQuery = "SELECT COUNT(*) as member_count FROM rso_membership WHERE rso_id = ?";
    const [countResult] = await pool.query(countQuery, [rsoId]);
    const memberCount = countResult[0].member_count;
    
    let message = "Successfully joined RSO";
    
    // Check if RSO now has 5+ members but is not yet active
    if (memberCount >= 5 && !rsoResult[0].is_active) {
      message = "Successfully joined RSO. The RSO now has 5+ members and is awaiting administrator approval.";
    }
    
    return res.status(200).json({
      success: true,
      message: message,
      memberCount: memberCount,
      isActive: rsoResult[0].is_active
    });
    
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Failed to join RSO: " + err.message
    });
  }
});

/* POST leave RSO */
router.post('/:rsoid/leave', async function(req, res, next) {
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
    
    // Check if RSO exists
    const rsoQuery = "SELECT * FROM rso WHERE rso_id = ?";
    const [rsoResult] = await pool.query(rsoQuery, [rsoId]);
    
    if (!rsoResult.length) {
      return res.status(404).json({
        success: false,
        message: "RSO not found"
      });
    }
    
    // Check if user is the RSO admin
    if (rsoResult[0].admin_user_id === userId) {
      return res.status(403).json({
        success: false,
        message: "RSO admins cannot leave their RSOs. Transfer admin role or delete the RSO."
      });
    }
    
    // Check if user is a member
    const memberQuery = "SELECT * FROM rso_membership WHERE user_id = ? AND rso_id = ?";
    const [memberResult] = await pool.query(memberQuery, [userId, rsoId]);
    
    if (!memberResult.length) {
      return res.status(404).json({
        success: false,
        message: "You are not a member of this RSO"
      });
    }
    
    // Remove the user from the RSO
    const leaveQuery = "DELETE FROM rso_membership WHERE user_id = ? AND rso_id = ?";
    await pool.query(leaveQuery, [userId, rsoId]);
    
    // Check if RSO still has enough members to remain active
    const countQuery = "SELECT COUNT(*) as member_count FROM rso_membership WHERE rso_id = ?";
    const [countResult] = await pool.query(countQuery, [rsoId]);
    const memberCount = countResult[0].member_count;
    
    // If membership drops below 5, set RSO to inactive if it's currently active
    if (memberCount < 5 && rsoResult[0].is_active) {
      const updateQuery = "UPDATE rso SET is_active = FALSE WHERE rso_id = ?";
      await pool.query(updateQuery, [rsoId]);
    }
    
    return res.status(200).json({
      success: true,
      message: "Successfully left the RSO",
      memberCount: memberCount
    });
    
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Failed to leave RSO: " + err.message
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
    
    // Get RSO information
    const rsoData = rsoResult[0];
    const adminUserId = rsoData.admin_user_id;
    
    // Get all members with more detailed information
    const membersQuery = `
      SELECT u.user_id, u.username, u.email, u.role as user_role, rm.joined_date,
             (u.user_id = ?) as is_admin
      FROM rso_membership rm
      JOIN users u ON rm.user_id = u.user_id
      WHERE rm.rso_id = ?
      ORDER BY is_admin DESC, rm.joined_date ASC
    `;
    
    const [membersResult] = await pool.query(membersQuery, [adminUserId, rsoId]);
    
    // Determine membership status for each member
    const enhancedMembers = membersResult.map(member => {
      return {
        ...member,
        is_admin: !!member.is_admin,
        rso_role: member.is_admin ? 'admin' : 'member',
        membership_duration: calculateMembershipDuration(member.joined_date)
      };
    });
    
    return res.status(200).json({
      success: true,
      rso: {
        rso_id: rsoData.rso_id,
        rso_name: rsoData.rso_name,
        description: rsoData.description,
        is_active: rsoData.is_active,
        total_members: enhancedMembers.length
      },
      members: enhancedMembers
    });
    
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Failed to get RSO members: " + err.message
    });
  }
});

// Helper function to calculate membership duration
function calculateMembershipDuration(joinedDate) {
  const now = new Date();
  const joined = new Date(joinedDate);
  const diffTime = Math.abs(now - joined);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 30) {
    return `${diffDays} days`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''}`;
  } else {
    const years = Math.floor(diffDays / 365);
    const remainingMonths = Math.floor((diffDays % 365) / 30);
    return `${years} year${years > 1 ? 's' : ''}${remainingMonths ? ` and ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`;
  }
}

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

/* GET events for a specific RSO */
router.get('/:rsoid/events', async function(req, res, next) {
  const rsoId = req.params.rsoid;
  
  if (!req.session.username) {
    return res.status(401).json({
      success: false,
      message: "Not logged in"
    });
  }
  
  try {
    // Check if user is a member of this RSO
    const membershipCheck = `
      SELECT rm.* FROM rso_membership rm
      JOIN users u ON rm.user_id = u.user_id
      WHERE rm.rso_id = ? AND u.username = ?
    `;
    
    const [memberResult] = await pool.query(membershipCheck, [rsoId, req.session.username]);
    
    // Only allow members to see RSO events
    if (!memberResult.length) {
      return res.status(403).json({
        success: false,
        message: "You must be a member of this RSO to view its events"
      });
    }
    
    // Get all events for this RSO, including ratings
    const eventsQuery = `
      SELECT e.*, 
             (SELECT AVG(rating_value) FROM rating WHERE event_id = e.event_id) as avg_rating
      FROM event e
      WHERE e.rso_id = ? AND e.approved_by IS NOT NULL
      ORDER BY e.event_date ASC, e.event_time ASC
    `;
    
    const [events] = await pool.query(eventsQuery, [rsoId]);
    
    return res.status(200).json({
      success: true,
      events: events
    });
    
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch RSO events: " + err.message
    });
  }
});

module.exports = router;
