const express = require("express");
const router = express.Router();
const db = require("../db/database");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const flash = require("express-flash");

// Middleware for using flash messages
router.use(flash());

// Render the forgot password page
router.get("/forgotPassword", (req, res) => {
  res.render("forgotPassword", { message: req.flash("success")[0] || "", errorMessage: req.flash("error")[0] || "" });
});

// resetPasswrod route.
router.get("/resetPassword", (req, res) => {
  console.log("forget password", req.query.token);
  const token = req.query.token;
  res.render("resetPassword", { errorMessage: "", successMessage: "", token: token });
});

// Generating a reset token and sending a reset link to the user's email
function generateVerificationToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const resetTokenExpiry = Date.now() + 60 * 60 * 1000; // Token valid for 1 hour
  return { token, resetTokenExpiry };
}

router.post("/forgotPassword", async (req, res) => {
  const { email } = req.body;
  
  // Generate a reset token and its expiry
  const { token, resetTokenExpiry } = generateVerificationToken();

  // Save the token and expiration time in the database
  let verificationData = {
    token: token,
    email: email,
    expires: new Date(resetTokenExpiry),
  };

  db.query(
    "INSERT INTO emailverificaiton SET ?",
    verificationData,
    (error, results) => {
      if (error) {
        console.error("Error inserting reset token:", error);
        req.flash("error", "Internal Server Error");
        res.redirect("/forgotPassword");
      } else {
        // verification link and email content
        const verificationLink = `${'http://localhost:3000'}/resetPassword?token=${token}`;

        const mailOptions = {
          from: "devc0440@gmail.com",
          to: email,
          subject: "Password Reset",
          html: `<h1>Password Reset Link</h1><p>Click <a href="${verificationLink}">here</a> to reset your password.</p>`,
        };

        // Creating a nodemailer transporter for sending the email
        const transporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          auth: {
            user: "vanessa.goldner53@ethereal.email",
            pass: "Jkm8r7rb5bRkX64H1v",
          },
        });

        // Sending the reset email
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error("Error sending email:", error);
            req.flash("error", "Error sending password reset email");
            res.redirect("/forgotPassword");
          } else {
            console.log("Password reset email sent:", info.response);
            req.flash("success", "Password reset link sent to your email.");
            res.redirect("/forgotPassword");
          }
        });
      }
    }
  );
});


// route for reset password 

router.post("/resetPassword", async (req, res) => {
  const token = req.body.token;
  const currentTime = new Date();
  const { newPassword, confirmNewPassword } = req.body;

  if (newPassword !== confirmNewPassword) {
    req.flash("error", "Passwords don't match. Please try again.");
    res.redirect("/resetPassword?token=" + token);
    return;
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  db.query(
    "SELECT * FROM emailverificaiton WHERE token = ?",
    [token],
    (error, results) => {
      if (error || results.length === 0) {
        req.flash("error", "Invalid or expired token");
        res.redirect("/resetPassword?token=" + token);
      } else {
        const dbExpiresTimestamp = new Date(results[0].expires);

        if (dbExpiresTimestamp > currentTime) {
          const email = results[0].email;
          
          db.query(
            "UPDATE users SET password = ? WHERE email = ?",
            [hashedPassword, email],
            (error, results) => {
              if (error) {
                req.flash("error", "Internal server error");
                res.redirect("/resetPassword?token=" + token);
              } else {
                db.query(
                  "DELETE FROM emailverificaiton WHERE token = ?",
                  [token],
                  (error, results) => {
                    if (error) {
                      console.log("Error deleting verification token:", error);
                    } else {
                      res.redirect("/login");
                      req.flash("success", "Password Reset Successful! Please Login");
                    }
                  }
                );
              }
            }
          );
        } else {
          req.flash("error", "Expired token");
          // redrecting to the resetpassword with the token in url
          res.redirect("/resetPassword?token=" + token);
        }
      }
    }
  );
});

module.exports = router;
