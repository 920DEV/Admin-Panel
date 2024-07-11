// route.js

const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

// ... Existing route code ...

// Signup route
router.post("/signup", userController.signup);

// ... Other routes ...

module.exports = router;
