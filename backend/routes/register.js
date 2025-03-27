var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');

// Use the centralized database connection
const pool = require('../config/db');

/* GET home page. */
router.get('/', async function(req, res, next) {
  try {
    var queryString = "SELECT university_id, name FROM university";
    const [rows] = await pool.query(queryString);
    res.status(200).json({
      success: true,
      universities: rows
    });
      } catch (err) {
    console.log(err);
    next(err);
  }
});

/* POST register new user */
router.post('/', async function(req, res, next) {
  try {
    const { username, password, email, university_id, role } = req.body;
    
    // Default role to 'student' if not provided or invalid
    let userRole = 'student';
    if (role && ['student', 'admin', 'super_admin'].includes(role)) {
      userRole = role;
    }
    
    // Check for missing required fields - university_id is optional for super_admin
    if (!username || !password || !email || (!university_id && userRole !== 'super_admin')) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields" 
      });
    }
    
    // Check if user already exists
    const checkUser = "SELECT COUNT(*) as count FROM users WHERE username = ?";
    const [userExists] = await pool.query(checkUser, [username]);
    
    if (userExists[0].count > 0) {
      return res.status(409).json({ 
        success: false, 
        message: "Username already exists" 
      });
    }
    
    // Insert new user with the specified or default role
    const insertUser = "INSERT INTO users (username, password_hash, email, university_id, role) VALUES (?, ?, ?, ?, ?)";
    const result = await pool.query(insertUser, [username, password, email, university_id || null, userRole]);
    
    // Set session with user ID and role
    req.session.userId = result[0].insertId;
    req.session.username = username;
    req.session.role = userRole;
    
    // Return success
    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      userId: result[0].insertId,
      role: userRole
    });
    
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false, 
      message: "Registration failed: " + err.message
    });
  }
});

module.exports = router;
