const express = require("express");
const router = express.Router();
const menuController = require("../controllers/menuController");
const { isUser, isAdmin } = require("../middleware/auth");

// Public routes
// GET /menu
router.get("/", menuController.getMenu);

// Admin routes
// GET /menu/admin
router.get("/admin", isAdmin, menuController.getAdminMenu);

// GET /menu/admin/create
router.get("/admin/create", isAdmin, menuController.getCreateMenuItem);

// POST /menu/admin/create
router.post("/admin/create", isAdmin, menuController.upload.single("image"), menuController.postCreateMenuItem);

// GET /menu/admin/edit/:id
router.get("/admin/edit/:id", isAdmin, menuController.getEditMenuItem);

// POST /menu/admin/edit/:id
router.post("/admin/edit/:id", isAdmin, menuController.upload.single("image"), menuController.postUpdateMenuItem);

// DELETE /menu/admin/:id
router.delete("/admin/:id", isAdmin, menuController.deleteMenuItem);

// POST /menu/:id/reviews
router.post("/:id/reviews", isUser, menuController.postReview);

// GET /menu/:id
router.get("/:id", menuController.getShowMenuItem);

module.exports = router;

