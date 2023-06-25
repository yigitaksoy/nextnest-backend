const express = require("express");
const userController = require("../controllers/userController");
const { verifyToken } = require("../middleware/verifyToken");
const admin = require("../config/firebaseAdmin");

const router = express.Router();

router.post("/register", userController.register);

router.use(verifyToken(admin)); // Apply the verifyToken middleware to the routes below
router.get("/search", userController.getUserSearch);
router.post("/search", userController.saveUserSearch);

module.exports = router;
