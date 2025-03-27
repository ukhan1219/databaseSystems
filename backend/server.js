const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const session = require("express-session");
const path = require("path");
require("dotenv").config();

// Database connections
const mysql = require('mysql');
const connection = require('./config/db');


// Route imports
const indexRouter = require("./routes/index");
const eventsRouter = require("./routes/events");
const orgsRouter = require("./routes/orgs");
const superRouter = require("./routes/super");
const registerRouter = require("./routes/register");

const app = express();

// Middleware
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // set to true if using https
}));

// Static files - serve React build files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/build')));
}

// API Routes
app.use('/api', indexRouter);
app.use('/api/events', eventsRouter);
app.use('/api/orgs', orgsRouter);
app.use('/api/super', superRouter);
app.use('/api/register', registerRouter);

// Handle React routing, return all requests to React app
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;

// Connect to database and start server
app.listen(PORT, async () => {
  try {
    // Test the connection
    const conn = await connection.getConnection();
    console.log('Connected to database');
    conn.release();
    
    console.log(`Server running on port ${PORT}`);
  } catch (err) {
    console.error('Error connecting to database:', err);
  }
});
