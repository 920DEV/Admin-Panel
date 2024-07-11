const express = require("express");
const router = express.Router();
const myController = require("../controllers/userController");

router.get("/", myController.getHome);
router.get("/login", myController.getLogin);
router.get("/signup", myController.getSignup);


router.get("/admin", myController.getAdmin);
router.get("/states", myController.getStates);
router.get("/cities/:stateId", myController.getCities);
router.post("/signup", myController.signup);
router.get("/verify", myController.verifyEmail);
router.post("/login", myController.login);
router.get("/admin/:page", myController.adminPage);
router.post("/admin/update/:userId", myController.updateUser);
router.post("/admin/deactivate/:userId", myController.deactivateUser);
router.post("/admin/activate/:userId", myController.activateUser);
router.post("/admin/delete/:userId", myController.deleteUser);
router.get("/logout", myController.logout);

module.exports = router;
