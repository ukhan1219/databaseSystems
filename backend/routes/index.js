var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');

// Use the centralized database connection
const pool = require('../config/db');

router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());

/* GET home page. */
router.get('/', function(req, res, next) {
  //res.sendFile("../views/index.ejs");
  res.status(200).json({
    success: true,
    message: "Welcome to the API"
  });
  });

/* POST login user */
router.post('/login', async function(req, res, next) {
  try {
    const { username, password } = req.body;
    
    // Check for missing required fields
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Username and password are required" 
      });
    }
    
    // Check if user exists and password matches
    const loginQuery = "SELECT user_id, username, role FROM users WHERE username = ? AND password_hash = ?";
    const [userRows] = await pool.query(loginQuery, [username, password]);
    
    if (!userRows.length) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid username or password" 
      });
    }
    
    // Set session
    req.session.userId = userRows[0].user_id;
    req.session.username = userRows[0].username;
    req.session.role = userRows[0].role;
    
    // Return success
    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        userId: userRows[0].user_id,
        username: userRows[0].username,
        role: userRows[0].role
      }
    });
    
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false, 
      message: "Login failed: " + err.message
    });
  }
});

/* GET logout user */
router.get('/logout', function(req, res, next) {
  // Destroy session
  req.session.destroy(function(err) {
    if (err) {
      console.log(err);
      return res.status(500).json({
        success: false,
        message: "Logout failed: " + err.message
      });
    }
    
    return res.status(200).json({
      success: true,
      message: "Logout successful"
    });
  });
});

/* GET current user */
router.get('/me', async function(req, res, next) {
  if (!req.session.username) {
    return res.status(401).json({
      success: false,
      message: "Not logged in"
    });
  }
  
  try {
    const userQuery = "SELECT user_id, username, email, role, university_id FROM users WHERE username = ?";
    const [userRows] = await pool.query(userQuery, [req.session.username]);
    
    if (!userRows.length) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    return res.status(200).json({
      success: true,
      user: userRows[0]
    });
    
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Failed to get user info: " + err.message
    });
  }
});

module.exports = router;
