const express = require("express");
const router = express.Router();
const couponController = require("../controllers/couponController");
const { isUser, isAdmin } = require("../middleware/auth");

// POST /coupons/validate (API for AJAX validation)
router.post("/validate", isUser, couponController.validateCoupon);

// Admin routes
router.get("/admin", isAdmin, couponController.listCoupons);
router.get("/admin/create", isAdmin, couponController.createCouponForm);
router.post("/admin/create", isAdmin, couponController.createCoupon);
router.get("/admin/edit/:id", isAdmin, couponController.editCouponForm);
router.post("/admin/edit/:id", isAdmin, couponController.updateCoupon);
router.delete("/admin/delete/:id", isAdmin, couponController.deleteCoupon);

module.exports = router;
