var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');

// Use the centralized database connection
const pool = require('../config/db');

// Parse JSON requests
router.use(bodyParser.json());

/* GET universities listing. */
router.get('/', async function(req, res, next) {
  if(req.session.username)
  {
    console.log("User: " + req.session.username + " logged in");
    var queryString = "SELECT * FROM university";

    try {
      const [rows] = await pool.query(queryString);
      res.status(200).json({
        success: true,
        universities: rows
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

/* POST create new university */
router.post('/', async function(req, res, next) {
  if(!req.session.username) {
    return res.status(401).json({
      success: false,
      message: "Not logged in"
    });
  }

  try {
    // Check if user is a super_admin
    const superAdminCheck = "SELECT * FROM users WHERE username = ? AND role = 'super_admin'";
    const [superAdminResult] = await pool.query(superAdminCheck, [req.session.username]);
    
    if (!superAdminResult.length) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Only super administrators can create universities"
      });
    }

    const { name, location, description, number_of_students } = req.body;
    
    // Check for missing required fields
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: "University name is required" 
      });
    }
    
    // Insert new university
    const insertUniversity = `
      INSERT INTO university 
      (name, location, description, number_of_students) 
      VALUES (?, ?, ?, ?)
    `;

    const result = await pool.query(insertUniversity, [
      name, 
      location || null, 
      description || null, 
      number_of_students || null
    ]);
    
    const universityId = result[0].insertId;
    
    // Update the super admin's university to the one they just created if they don't have one
    const updateSuperAdmin = `
      UPDATE users 
      SET university_id = ? 
      WHERE username = ? AND role = 'super_admin' AND (university_id IS NULL OR university_id = 0)
    `;
    
    await pool.query(updateSuperAdmin, [universityId, req.session.username]);
    
    // Return success
    return res.status(201).json({
      success: true,
      message: "University created successfully",
      universityId: universityId
    });
    
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false, 
      message: "University creation failed: " + err.message
    });
  }
});

/* GET university by ID */
router.get('/:id', async function(req, res, next) {
  const universityId = req.params.id;

  if(!req.session.username) {
    return res.status(401).json({
      success: false,
      message: "Not logged in"
    });
  }

  try {
    const queryString = "SELECT * FROM university WHERE university_id = ?";
    const [rows] = await pool.query(queryString, [universityId]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "University not found"
      });
    }
    
    res.status(200).json({
      success: true,
      university: rows[0]
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch university: " + err.message
    });
  }
});

module.exports = router;
