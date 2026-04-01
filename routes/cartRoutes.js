const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const { isUser } = require("../middleware/auth");

// GET /cart
router.get("/", isUser, cartController.getCart);

// POST /cart/add
router.post("/add", isUser, cartController.addToCart);

// POST /cart/update
router.post("/update", isUser, cartController.updateCartItem);

// DELETE /cart/remove/:menuItemId
router.delete("/remove/:menuItemId", isUser, cartController.removeFromCart);

// POST /cart/clear
router.post("/clear", isUser, cartController.clearCart);

// POST /cart/apply-coupon
router.post("/apply-coupon", isUser, cartController.applyCoupon);

module.exports = router;
