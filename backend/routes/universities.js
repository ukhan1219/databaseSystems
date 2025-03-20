var express = require('express');
var router = express.Router();

// Use the centralized database connection
const pool = require('../config/db');

/* GET users listing. */
router.get('/', async function(req, res, next) {
  if(req.session.username)
  {
    console.log("User: " + req.session.username + " logged in");
    var queryString = "SELECT * FROM university";

    try {
      const [rows] = await pool.query(queryString);
      res.render('universities', {message: "", unis: rows});
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
