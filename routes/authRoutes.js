const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { isNotLoggedIn, isLoggedIn } = require("../middleware/auth");

// GET /auth/signup
router.get("/signup", isNotLoggedIn, authController.getSignup);

// POST /auth/signup
router.post("/signup", isNotLoggedIn, authController.postSignup);

// GET /auth/login
router.get("/login", isNotLoggedIn, authController.getLogin);

// POST /auth/login
router.post("/login", isNotLoggedIn, authController.postLogin);

// POST /auth/logout
router.post("/logout", isLoggedIn, authController.logout);

module.exports = router;