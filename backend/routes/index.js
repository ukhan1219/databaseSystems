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
  res.render('index',{message: ""});
});



module.exports = router;
