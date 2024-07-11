var express = require("express");
var router = express.Router();
var nodemailer = require("nodemailer");
var randtoken = require("rand-token");

var db = require("../db/database.js");

//send email
function sendEmail(email, token) {
  var email = email;
  var token = token;

  var mail = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "", // Your email id
      pass: "", // Your password
    },
  });

  var mailOptions = {
    from: "devc0440@gmail.com",
    to: email,
    subject: "Email verification - devc0440@gmail.com",
    html:
      '<p>You requested for email verification, kindly use this <a href="http://localhost:3000/verify-email?token=' +
      token +
      '">link</a> to verify your email address</p>',
  };

  mail.sendMail(mailOptions, function (error, info) {
    if (error) {
      return 1;
    } else {
      return 0;
    }
  });
}

/* send verification link */
router.post("/send-email", function (req, res, next) {
  var email = req.body.email;

  // Generate a token for email verification
  var token = randtoken.generate(20);

  // Call the sendEmail function to send the verification email
  var sent = sendEmail(email, token);

  if (sent === 0) {
    // Save the token in the database
    var data = {
      email: email,
      token: token,
      verify: 0, // verify is initially set to 0
    };

    db.query(
      "INSERT INTO emailverificaiton SET ?",
      data,
      function (err, result) {
        if (err) throw err;
        // Redirect to a success page or display a message
        req.flash(
          "success",
          "The verification link has been sent to your email address"
        );
        res.redirect("/");
      }
    );
  } else {
    // Handle the case where email sending failed
	console.log("error", "Something went wrong. Please try again");
    res.redirect("/");
  }
});

/* verification email link */
router.get("/verify-email", function (req, res, next) {
  db.query(
    'SELECT * FROM emailverificaiton WHERE token ="' + req.query.token + '"',
    function (err, result) {
      if (err) throw err;

      var type;
      var msg;

      if (result[0].verify == 0) {
        if (result.length > 0) {
          var data = {
            verify: 1,
          };

          db.query(
            'UPDATE emailverificaiton SET ? WHERE email ="' +
              result[0].email +
              '"',
            data,
            function (err, result) {
              if (err) throw err;
            }
          );

          type = "success";
          msg = "Your email has been verified";

          // Redirect to the /signup route after successful verification
          res.redirect("/signup");
        } else {
          type = "success";
          msg = "The email has already been verified";
        }
      } else {
        type = "error";
        msg = "The email has already been verified";
      }

      req.flash(type, msg);
      res.redirect("/");
    }
  );
});

module.exports = router;
