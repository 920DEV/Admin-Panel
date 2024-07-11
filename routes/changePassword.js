const express = require("express");
const router = express.Router();
const db = require("../db/database");
const bcrypt = require("bcrypt");

// Rendering the change password page
router.get("/changePassword", (req, res) => {

  if (!req.session.userId || !req.session.userName) {
    
    res.redirect("/login");   // Redirect to the login page if not logged in or active
  }
    const isLoggedIn = req.session.userId && req.session.userName ;
console.log("session id :" ,req.session.userId);

     console.log('isLoggedIn',isLoggedIn);
     res.render("changePassword",{isLoggedIn:isLoggedIn,errorMessage:" " ,successMessage: ""});

 return ;
});

// Handling the change password form submission
router.post("/changePassword", async (req, res) => {
const userId = req.session.userId; // Assuming you're using sessions to track user login
const isLoggedIn = req.session.userId && req.session.userName ;
console.log(userId);
  // Retrieve form data
    const { oldPassword, newPassword, confirmNewPassword } = req.body;

  try {
    // Fetch the user's current password from the database
    db.query("SELECT password FROM users WHERE id = ?", [userId], async (error, results) => {
      if (error) {
        console.error("Error fetching user data:", error);
        return res.status(500).send("Internal Server Error");
      }

      const user = results[0];

      // Compare old password with the stored password
      const passwordMatch = await bcrypt.compare(oldPassword, user.password);

      if (!passwordMatch) {
        return res.render("changePassword", { errorMessage: "Incorrect old password.",isLoggedIn });
      }

      // Validate new password and confirm new password
      if (newPassword !== confirmNewPassword) {
        return res.render("changePassword", { errorMessage: "New passwords do not match." ,isLoggedIn});
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the user's password in the database
      db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId], (error, result) => {
        if (error) {  
          console.error("Error updating password:", error);
          return res.status(500).send("Internal Server Error");
        }
        console.log("Password change sucessfully");
        res.redirect('/logout');
      });
    });


  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).send("Internal Server Error");
  }
});

// ... (other routes)

module.exports = router;
