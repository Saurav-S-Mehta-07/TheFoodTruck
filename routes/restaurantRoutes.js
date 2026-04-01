const express = require("express");
const router = express.Router();
const restaurantController = require("../controllers/restaurantController");
const { isLoggedIn, isOwner } = require("../middleware/auth");

// Owner dashboard
router.get("/dashboard", isLoggedIn, isOwner, restaurantController.getOwnerDashboard);

// Restaurant CRUD
router.get("/", isLoggedIn, isOwner, restaurantController.getMyRestaurants);
router.get("/create", isLoggedIn, isOwner, restaurantController.getCreateRestaurant);
router.post("/create", isLoggedIn, isOwner, restaurantController.postCreateRestaurant);
router.get("/:id/edit", isLoggedIn, isOwner, restaurantController.getEditRestaurant);
router.post("/:id/edit", isLoggedIn, isOwner, restaurantController.postUpdateRestaurant);
router.delete("/:id", isLoggedIn, isOwner, restaurantController.deleteRestaurant);

// Owner menu CRUD (scoped by restaurant)
router.get("/:restaurantId/menu", isLoggedIn, isOwner, restaurantController.getRestaurantMenu);
router.get("/:restaurantId/menu/create", isLoggedIn, isOwner, restaurantController.getCreateMenuItem);
router.post(
  "/:restaurantId/menu/create",
  isLoggedIn,
  isOwner,
  restaurantController.upload.single("image"),
  restaurantController.postCreateMenuItem
);
router.get("/:restaurantId/menu/:id/edit", isLoggedIn, isOwner, restaurantController.getEditMenuItem);
router.post(
  "/:restaurantId/menu/:id/edit",
  isLoggedIn,
  isOwner,
  restaurantController.upload.single("image"),
  restaurantController.postUpdateMenuItem
);
router.delete("/:restaurantId/menu/:id", isLoggedIn, isOwner, restaurantController.deleteMenuItem);

// Owner order management
router.get("/:restaurantId/orders", isLoggedIn, isOwner, restaurantController.getRestaurantOrders);
router.post("/:restaurantId/orders/:orderId/status", isLoggedIn, isOwner, restaurantController.updateOrderStatus);

// Owner coupon CRUD
router.get("/:restaurantId/coupons", isLoggedIn, isOwner, restaurantController.getRestaurantCoupons);
router.get("/:restaurantId/coupons/create", isLoggedIn, isOwner, restaurantController.getCreateCoupon);
router.post("/:restaurantId/coupons/create", isLoggedIn, isOwner, restaurantController.postCreateCoupon);
router.get("/:restaurantId/coupons/:couponId/edit", isLoggedIn, isOwner, restaurantController.getEditCoupon);
router.post("/:restaurantId/coupons/:couponId/edit", isLoggedIn, isOwner, restaurantController.postUpdateCoupon);
router.delete("/:restaurantId/coupons/:couponId", isLoggedIn, isOwner, restaurantController.deleteCoupon);

module.exports = router;
