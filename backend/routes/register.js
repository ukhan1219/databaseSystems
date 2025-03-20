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
    res.render("register", {message: "", uni: rows});
  } catch (err) {
    console.log(err);
    next(err);
  }
});

/* POST register new user */
router.post('/', async function(req, res, next) {
  try {
    const { username, password, email, university_id } = req.body;
    
    // Check for missing required fields
    if (!username || !password || !email || !university_id) {
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
    
    // Insert new user - with role defaulting to 'student'
    const insertUser = "INSERT INTO users (username, password_hash, email, university_id) VALUES (?, ?, ?, ?)";
    const result = await pool.query(insertUser, [username, password, email, university_id]);
    
    // Set session with user ID
    req.session.userId = result.insertId;
    req.session.username = username;
    
    // Return success
    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      userId: result.insertId
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
