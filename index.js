const express = require("express");

const bodyParser = require("body-parser");
const app = express();
const flash = require("express-flash");
const path = require("path");
var createError = require('http-errors');
// var cookieParser = require('cookie-parser');
var session = require('express-session');

// Import the routes and database modules
const routes = require("./routes/route.js");
const forgotPasswordRoute = require("./routes/forgotPassword.js");

const changePassword = require("./routes/changePassword.js");

// const tokenroutes = require("./routes/tokenSender.js")
const db = require("./db/database");

app.use(express.static(path.join(__dirname, "views")));
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(flash());
// Middleware for session
app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
  })
);

// Database connection
db.connect((err) => {
  if (err) {
    throw err;
  } else {
    console.log("connected to the Mysql database");
  }
});

// Use the routes module for all the routes

app.use("/", routes);
app.use("/",forgotPasswordRoute);
app.use("/",changePassword);
// tokensender route.
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

});


