/* PUT update user's university */
router.put('/university', async function(req, res, next) {
  if (!req.session.username) {
    return res.status(401).json({
      success: false,
      message: "Not logged in"
    });
  }
  
  try {
    const { university_id } = req.body;
    
    if (!university_id) {
      return res.status(400).json({
        success: false,
        message: "University ID is required"
      });
    }
    
    // Check if university exists
    const universityQuery = "SELECT * FROM university WHERE university_id = ?";
    const [universityResult] = await pool.query(universityQuery, [university_id]);
    
    if (!universityResult.length) {
      return res.status(404).json({
        success: false,
        message: "University not found"
      });
    }
    
    // Check if user is super_admin
    const userQuery = "SELECT * FROM users WHERE username = ? AND role = 'super_admin'";
    const [userResult] = await pool.query(userQuery, [req.session.username]);
    
    if (!userResult.length) {
      return res.status(403).json({
        success: false,
        message: "Only super administrators can change their university"
      });
    }
    
    // Update the user's university
    const updateQuery = "UPDATE users SET university_id = ? WHERE username = ?";
    await pool.query(updateQuery, [university_id, req.session.username]);
    
    return res.status(200).json({
      success: true,
      message: "University updated successfully"
    });
    
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: "Failed to update university: " + err.message
    });
  }
}); 