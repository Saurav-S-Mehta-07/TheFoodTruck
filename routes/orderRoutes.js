const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { isUser, isAdmin } = require("../middleware/auth");

// GET /orders/checkout
router.get("/checkout", isUser, orderController.getCheckout);

// GET /orders/bulk
router.get("/bulk", isUser, orderController.getBulkOrderPage);

// POST /orders/bulk/create
router.post("/bulk/create", isUser, orderController.createBulkOrder);

// GET /orders
router.get("/", isUser, orderController.getOrders);

// POST /orders/create
router.post("/create", isUser, orderController.createOrder);

// POST /orders/direct
router.post("/direct", isUser, orderController.createDirectOrder);

// GET /orders/:id/payment
router.get("/:id/payment", isUser, orderController.getPaymentPage);

// POST /orders/:id/payment
router.post("/:id/payment", isUser, orderController.processPayment);

// Admin routes
router.get("/admin", isAdmin, orderController.getAdminOrders);
router.post("/admin/:id/status", isAdmin, orderController.updateOrderStatus);
router.post("/admin/clear-all", isAdmin, orderController.clearAllOrders);

// GET /orders/:id
router.get("/:id", isUser, orderController.getOrderDetails);

module.exports = router;
