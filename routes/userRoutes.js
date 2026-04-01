const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { isUser } = require("../middleware/auth");

// User profile routes
// GET /user/profile
router.get("/profile", isUser, userController.getProfile);

// POST /user/profile
router.post("/profile", isUser, userController.updateProfile);

// GET /user/orders
router.get("/orders", isUser, userController.getUserOrders);

// GET /user/orders/:id
router.get("/orders/:id", isUser, userController.getUserOrderDetails);

// POST /user/change-password
router.post("/change-password", isUser, userController.changePassword);

module.exports = router;
