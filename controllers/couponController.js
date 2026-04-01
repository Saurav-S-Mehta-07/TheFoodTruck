const Coupon = require("../models/Coupon");
const Restaurant = require("../models/Restaurant");

module.exports = {
  // Validate coupon (API endpoint for AJAX)
  validateCoupon: async (req, res) => {
    try {
      const { code, orderAmount, mealType } = req.body;

      if (!code) {
        return res.json({ valid: false, message: "Coupon code is required" });
      }

      const coupon = await Coupon.findOne({
        code: code.toUpperCase(),
        isActive: true
      });

      if (!coupon) {
        return res.json({ valid: false, message: "Invalid coupon code" });
      }

      if (!coupon.canApply(orderAmount, mealType)) {
        let message = "Coupon cannot be applied";
        if (coupon.minimumOrderAmount > 0 && orderAmount < coupon.minimumOrderAmount) {
          message = `Minimum order amount of ₹${coupon.minimumOrderAmount} required`;
        } else if (coupon.applicableMealTypes.length > 0 && !coupon.applicableMealTypes.includes(mealType)) {
          message = `Coupon not applicable for ${mealType}`;
        }
        return res.json({ valid: false, message });
      }

      const discount = coupon.calculateDiscount(orderAmount);

      res.json({
        valid: true,
        coupon: {
          _id: coupon._id,
          code: coupon.code,
          description: coupon.description,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          discount: discount
        },
        message: `Coupon applied! You save ₹${discount}`
      });
    } catch (err) {
      console.error(err);
      res.json({ valid: false, message: "Error validating coupon" });
    }
  },

  // Admin: List all coupons
  listCoupons: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;

      const coupons = await Coupon.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const totalCoupons = await Coupon.countDocuments();
      const totalPages = Math.ceil(totalCoupons / limit);

      res.render("admin/coupons/index", {
        coupons,
        currentPage: page,
        totalPages,
        messages: req.flash()
      });
    } catch (err) {
      console.error(err);
      req.flash("error", "Error loading coupons");
      res.redirect("/admin");
    }
  },

  // Admin: Create coupon form
  createCouponForm: (req, res) => {
    res.render("admin/coupons/create", { messages: req.flash() });
  },

  // Admin: Create coupon
  createCoupon: async (req, res) => {
    try {
      const {
        code,
        description,
        discountType,
        discountValue,
        minimumOrderAmount,
        maximumDiscount,
        usageLimit,
        validFrom,
        validUntil,
        applicableMealTypes
      } = req.body;
      let restaurantId = req.body.restaurant;
      if (!restaurantId) {
        const restaurant = await Restaurant.findOne().select("_id");
        restaurantId = restaurant ? restaurant._id : null;
      }

      if (!restaurantId) {
        req.flash("error", "Please create a restaurant before creating coupons");
        return res.redirect("/admin/restaurants/create");
      }

      const coupon = new Coupon({
        code: code.toUpperCase(),
        restaurant: restaurantId,
        description,
        discountType,
        discountValue: parseFloat(discountValue),
        minimumOrderAmount: parseFloat(minimumOrderAmount) || 0,
        maximumDiscount: maximumDiscount ? parseFloat(maximumDiscount) : null,
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        applicableMealTypes: applicableMealTypes ? applicableMealTypes.split(',').map(type => type.trim()) : []
      });

      await coupon.save();
      req.flash("success", "Coupon created successfully");
      res.redirect("/admin/coupons");
    } catch (err) {
      console.error(err);
      if (err.code === 11000) {
        req.flash("error", "Coupon code already exists");
      } else {
        req.flash("error", "Error creating coupon");
      }
      res.redirect("/admin/coupons/create");
    }
  },

  // Admin: Edit coupon form
  editCouponForm: async (req, res) => {
    try {
      const coupon = await Coupon.findById(req.params.id);
      if (!coupon) {
        req.flash("error", "Coupon not found");
        return res.redirect("/admin/coupons");
      }

      res.render("admin/coupons/edit", { coupon, messages: req.flash() });
    } catch (err) {
      console.error(err);
      req.flash("error", "Error loading coupon");
      res.redirect("/admin/coupons");
    }
  },

  // Admin: Update coupon
  updateCoupon: async (req, res) => {
    try {
      const {
        code,
        description,
        discountType,
        discountValue,
        minimumOrderAmount,
        maximumDiscount,
        usageLimit,
        validFrom,
        validUntil,
        applicableMealTypes,
        isActive
      } = req.body;

      const coupon = await Coupon.findById(req.params.id);
      if (!coupon) {
        req.flash("error", "Coupon not found");
        return res.redirect("/admin/coupons");
      }

      coupon.code = code.toUpperCase();
      coupon.description = description;
      coupon.discountType = discountType;
      coupon.discountValue = parseFloat(discountValue);
      coupon.minimumOrderAmount = parseFloat(minimumOrderAmount) || 0;
      coupon.maximumDiscount = maximumDiscount ? parseFloat(maximumDiscount) : null;
      coupon.usageLimit = usageLimit ? parseInt(usageLimit) : null;
      coupon.validFrom = new Date(validFrom);
      coupon.validUntil = new Date(validUntil);
      coupon.applicableMealTypes = applicableMealTypes ? applicableMealTypes.split(',').map(type => type.trim()) : [];
      coupon.isActive = isActive === 'on';

      await coupon.save();
      req.flash("success", "Coupon updated successfully");
      res.redirect("/admin/coupons");
    } catch (err) {
      console.error(err);
      if (err.code === 11000) {
        req.flash("error", "Coupon code already exists");
      } else {
        req.flash("error", "Error updating coupon");
      }
      res.redirect(`/admin/coupons/edit/${req.params.id}`);
    }
  },

  // Admin: Delete coupon
  deleteCoupon: async (req, res) => {
    try {
      const coupon = await Coupon.findByIdAndDelete(req.params.id);
      if (!coupon) {
        req.flash("error", "Coupon not found");
        return res.redirect("/admin/coupons");
      }

      req.flash("success", "Coupon deleted successfully");
      res.redirect("/admin/coupons");
    } catch (err) {
      console.error(err);
      req.flash("error", "Error deleting coupon");
      res.redirect("/admin/coupons");
    }
  }
};
