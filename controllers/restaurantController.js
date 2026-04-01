const fs = require("fs");
const path = require("path");
const multer = require("multer");

const Restaurant = require("../models/Restaurant");
const MenuItem = require("../models/MenuItem");
const Order = require("../models/Orders");
const Category = require("../models/Category");
const Coupon = require("../models/Coupon");

const uploadDir = path.join(__dirname, "..", "public", "uploads", "owner");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"), false);
  },
});

const ORDER_STATUSES = ["Placed", "Confirmed", "Preparing", "Out for Delivery", "Delivered"];

async function getOwnedRestaurant(ownerId, restaurantId) {
  return Restaurant.findOne({ _id: restaurantId, owner: ownerId });
}

module.exports = {
  upload,

  getOwnerDashboard: async (req, res) => {
    try {
      const restaurants = await Restaurant.find({ owner: req.user._id }).select("_id name isActive").lean();
      const restaurantIds = restaurants.map((r) => r._id);

      const stats = {
        totalRestaurants: restaurants.length,
        totalMenuItems: 0,
        totalOrders: 0,
        pendingOrders: 0,
        totalCoupons: 0,
        thisMonthIncome: 0,
        totalIncome: 0,
      };

      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const now = new Date();
      const currentYear = now.getFullYear();
      const startOfYear = new Date(currentYear, 0, 1);
      const startOfNextYear = new Date(currentYear + 1, 0, 1);
      const thisMonthIndex = now.getMonth();

      let monthlyIncome = monthNames.map((m) => ({ month: m, income: 0, orders: 0 }));
      let recentOrders = [];
      let ownerMenuItems = [];

      if (restaurantIds.length) {
        const [totalMenuItems, totalOrders, pendingOrders, totalCoupons, monthlyAgg] = await Promise.all([
          MenuItem.countDocuments({ restaurant: { $in: restaurantIds } }),
          Order.countDocuments({ restaurant: { $in: restaurantIds } }),
          Order.countDocuments({ restaurant: { $in: restaurantIds }, orderStatus: { $in: ["Placed", "Confirmed", "Preparing"] } }),
          Coupon.countDocuments({ restaurant: { $in: restaurantIds } }),
          Order.aggregate([
            {
              $match: {
                restaurant: { $in: restaurantIds },
                createdAt: { $gte: startOfYear, $lt: startOfNextYear },
                paymentStatus: { $ne: "failed" },
              },
            },
            {
              $group: {
                _id: { $month: "$createdAt" },
                income: { $sum: "$totalAmount" },
                orders: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ]),
        ]);

        stats.totalMenuItems = totalMenuItems;
        stats.totalOrders = totalOrders;
        stats.pendingOrders = pendingOrders;
        stats.totalCoupons = totalCoupons;

        monthlyAgg.forEach((row) => {
          const idx = row._id - 1;
          if (idx >= 0 && idx < 12) {
            monthlyIncome[idx].income = Number(row.income || 0);
            monthlyIncome[idx].orders = Number(row.orders || 0);
          }
        });

        stats.thisMonthIncome = monthlyIncome[thisMonthIndex].income;
        stats.totalIncome = monthlyIncome.reduce((sum, x) => sum + x.income, 0);

        recentOrders = await Order.find({ restaurant: { $in: restaurantIds } })
          .populate("user", "name email")
          .populate("restaurant", "name")
          .sort({ createdAt: -1 })
          .limit(10)
          .lean();

        ownerMenuItems = await MenuItem.find({ restaurant: { $in: restaurantIds }, isAvailable: true })
          .populate("restaurant", "name")
          .sort({ orderCount: -1, createdAt: -1 })
          .limit(20)
          .lean();
      }

      res.render("owner/dashboard", {
        stats,
        restaurants,
        monthlyIncome,
        recentOrders,
        ownerMenuItems,
        currentYear,
        messages: req.flash(),
      });
    } catch (err) {
      console.error(err);
      req.flash("error", "Error loading owner dashboard");
      res.redirect("/");
    }
  },

  getMyRestaurants: async (req, res) => {
    try {
      const restaurants = await Restaurant.find({ owner: req.user._id }).sort({ createdAt: -1 }).lean();
      res.render("owner/restaurants/index", { restaurants, messages: req.flash() });
    } catch (err) {
      console.error(err);
      req.flash("error", "Error loading restaurants");
      res.redirect("/restaurants/dashboard");
    }
  },

  getCreateRestaurant: (req, res) => {
    res.render("owner/restaurants/create", { messages: req.flash() });
  },

  postCreateRestaurant: async (req, res) => {
    try {
      const { name, description, phone, email, street, city, state, pincode, cuisine, imageUrl } = req.body;

      await Restaurant.create({
        name,
        description,
        phone,
        email,
        imageUrl,
        cuisine: cuisine ? cuisine.split(",").map((c) => c.trim()).filter(Boolean) : [],
        owner: req.user._id,
        address: { street, city, state, pincode },
      });

      req.flash("success", "Restaurant created successfully");
      res.redirect("/restaurants");
    } catch (err) {
      console.error(err);
      req.flash("error", "Error creating restaurant");
      res.redirect("/restaurants/create");
    }
  },

  getEditRestaurant: async (req, res) => {
    try {
      const restaurant = await Restaurant.findOne({ _id: req.params.id, owner: req.user._id }).lean();
      if (!restaurant) {
        req.flash("error", "Restaurant not found");
        return res.redirect("/restaurants");
      }
      res.render("owner/restaurants/edit", { restaurant, messages: req.flash() });
    } catch (err) {
      console.error(err);
      req.flash("error", "Error loading restaurant");
      res.redirect("/restaurants");
    }
  },

  postUpdateRestaurant: async (req, res) => {
    try {
      const { name, description, phone, email, street, city, state, pincode, cuisine, imageUrl, isActive } = req.body;

      const updated = await Restaurant.findOneAndUpdate(
        { _id: req.params.id, owner: req.user._id },
        {
          name,
          description,
          phone,
          email,
          imageUrl,
          cuisine: cuisine ? cuisine.split(",").map((c) => c.trim()).filter(Boolean) : [],
          isActive: isActive === "on",
          address: { street, city, state, pincode },
        },
        { new: true }
      );

      if (!updated) {
        req.flash("error", "Restaurant not found");
        return res.redirect("/restaurants");
      }

      req.flash("success", "Restaurant updated successfully");
      res.redirect("/restaurants");
    } catch (err) {
      console.error(err);
      req.flash("error", "Error updating restaurant");
      res.redirect(`/restaurants/${req.params.id}/edit`);
    }
  },

  deleteRestaurant: async (req, res) => {
    try {
      const restaurant = await Restaurant.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
      if (!restaurant) {
        req.flash("error", "Restaurant not found");
        return res.redirect("/restaurants");
      }

      await Promise.all([
        MenuItem.deleteMany({ restaurant: restaurant._id }),
        Coupon.deleteMany({ restaurant: restaurant._id }),
      ]);

      req.flash("success", "Restaurant deleted successfully");
      res.redirect("/restaurants");
    } catch (err) {
      console.error(err);
      req.flash("error", "Error deleting restaurant");
      res.redirect("/restaurants");
    }
  },

  getRestaurantMenu: async (req, res) => {
    try {
      const restaurant = await getOwnedRestaurant(req.user._id, req.params.restaurantId);
      if (!restaurant) {
        req.flash("error", "Restaurant not found");
        return res.redirect("/restaurants");
      }

      const menuItems = await MenuItem.find({ restaurant: restaurant._id }).populate("category").sort({ createdAt: -1 }).lean();
      res.render("owner/menu/index", { restaurant, menuItems, messages: req.flash() });
    } catch (err) {
      console.error(err);
      req.flash("error", "Error loading menu items");
      res.redirect("/restaurants");
    }
  },

  getCreateMenuItem: async (req, res) => {
    try {
      const restaurant = await getOwnedRestaurant(req.user._id, req.params.restaurantId);
      if (!restaurant) {
        req.flash("error", "Restaurant not found");
        return res.redirect("/restaurants");
      }

      const categories = await Category.find({ isActive: true }).sort({ name: 1 }).lean();
      res.render("owner/menu/create", { restaurant, categories, messages: req.flash() });
    } catch (err) {
      console.error(err);
      req.flash("error", "Error loading menu form");
      res.redirect(`/restaurants/${req.params.restaurantId}/menu`);
    }
  },

  postCreateMenuItem: async (req, res) => {
    try {
      const restaurant = await getOwnedRestaurant(req.user._id, req.params.restaurantId);
      if (!restaurant) {
        req.flash("error", "Restaurant not found");
        return res.redirect("/restaurants");
      }

      const { title, category, foodType, description, price, originalPrice, calories, tags, customizable, isAvailable } = req.body;
      const imageUrl = req.file ? `/uploads/owner/${req.file.filename}` : req.body.imageUrl || null;

      await MenuItem.create({
        title,
        category,
        restaurant: restaurant._id,
        foodType,
        description,
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        calories: calories ? parseInt(calories, 10) : null,
        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        customizable: customizable === "on",
        isAvailable: isAvailable !== "off",
        imageUrl,
      });

      req.flash("success", "Menu item created successfully");
      res.redirect(`/restaurants/${restaurant._id}/menu`);
    } catch (err) {
      console.error(err);
      req.flash("error", "Error creating menu item");
      res.redirect(`/restaurants/${req.params.restaurantId}/menu/create`);
    }
  },

  getEditMenuItem: async (req, res) => {
    try {
      const restaurant = await getOwnedRestaurant(req.user._id, req.params.restaurantId);
      if (!restaurant) {
        req.flash("error", "Restaurant not found");
        return res.redirect("/restaurants");
      }

      const menuItem = await MenuItem.findOne({ _id: req.params.id, restaurant: restaurant._id }).lean();
      if (!menuItem) {
        req.flash("error", "Menu item not found");
        return res.redirect(`/restaurants/${restaurant._id}/menu`);
      }

      const categories = await Category.find({ isActive: true }).sort({ name: 1 }).lean();
      res.render("owner/menu/edit", { restaurant, menuItem, categories, messages: req.flash() });
    } catch (err) {
      console.error(err);
      req.flash("error", "Error loading menu item");
      res.redirect(`/restaurants/${req.params.restaurantId}/menu`);
    }
  },

  postUpdateMenuItem: async (req, res) => {
    try {
      const restaurant = await getOwnedRestaurant(req.user._id, req.params.restaurantId);
      if (!restaurant) {
        req.flash("error", "Restaurant not found");
        return res.redirect("/restaurants");
      }

      const { title, category, foodType, description, price, originalPrice, calories, tags, customizable, isAvailable } = req.body;

      const updateData = {
        title,
        category,
        foodType,
        description,
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        calories: calories ? parseInt(calories, 10) : null,
        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        customizable: customizable === "on",
        isAvailable: isAvailable === "on",
      };

      if (req.file) updateData.imageUrl = `/uploads/owner/${req.file.filename}`;
      else if (req.body.imageUrl) updateData.imageUrl = req.body.imageUrl;

      const updated = await MenuItem.findOneAndUpdate(
        { _id: req.params.id, restaurant: restaurant._id },
        updateData,
        { new: true }
      );

      if (!updated) {
        req.flash("error", "Menu item not found");
        return res.redirect(`/restaurants/${restaurant._id}/menu`);
      }

      req.flash("success", "Menu item updated successfully");
      res.redirect(`/restaurants/${restaurant._id}/menu`);
    } catch (err) {
      console.error(err);
      req.flash("error", "Error updating menu item");
      res.redirect(`/restaurants/${req.params.restaurantId}/menu/${req.params.id}/edit`);
    }
  },

  deleteMenuItem: async (req, res) => {
    try {
      const restaurant = await getOwnedRestaurant(req.user._id, req.params.restaurantId);
      if (!restaurant) {
        req.flash("error", "Restaurant not found");
        return res.redirect("/restaurants");
      }

      await MenuItem.findOneAndDelete({ _id: req.params.id, restaurant: restaurant._id });
      req.flash("success", "Menu item deleted successfully");
      res.redirect(`/restaurants/${restaurant._id}/menu`);
    } catch (err) {
      console.error(err);
      req.flash("error", "Error deleting menu item");
      res.redirect(`/restaurants/${req.params.restaurantId}/menu`);
    }
  },

  getRestaurantOrders: async (req, res) => {
    try {
      const restaurant = await getOwnedRestaurant(req.user._id, req.params.restaurantId);
      if (!restaurant) {
        req.flash("error", "Restaurant not found");
        return res.redirect("/restaurants");
      }

      const filter = { restaurant: restaurant._id };
      if (req.query.status) filter.orderStatus = req.query.status;

      const orders = await Order.find(filter)
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .lean();

      res.render("owner/orders/index", {
        restaurant,
        orders,
        statuses: ORDER_STATUSES,
        query: req.query,
        messages: req.flash(),
      });
    } catch (err) {
      console.error(err);
      req.flash("error", "Error loading orders");
      res.redirect("/restaurants");
    }
  },

  updateOrderStatus: async (req, res) => {
    try {
      const restaurant = await getOwnedRestaurant(req.user._id, req.params.restaurantId);
      if (!restaurant) {
        req.flash("error", "Restaurant not found");
        return res.redirect("/restaurants");
      }

      const { orderStatus } = req.body;
      if (!ORDER_STATUSES.includes(orderStatus)) {
        req.flash("error", "Invalid order status");
        return res.redirect(`/restaurants/${restaurant._id}/orders`);
      }

      await Order.findOneAndUpdate(
        { _id: req.params.orderId, restaurant: restaurant._id },
        { orderStatus }
      );

      req.flash("success", "Order status updated");
      res.redirect(`/restaurants/${restaurant._id}/orders`);
    } catch (err) {
      console.error(err);
      req.flash("error", "Error updating order status");
      res.redirect(`/restaurants/${req.params.restaurantId}/orders`);
    }
  },

  getRestaurantCoupons: async (req, res) => {
    try {
      const restaurant = await getOwnedRestaurant(req.user._id, req.params.restaurantId);
      if (!restaurant) {
        req.flash("error", "Restaurant not found");
        return res.redirect("/restaurants");
      }

      const coupons = await Coupon.find({ restaurant: restaurant._id }).sort({ createdAt: -1 }).lean();
      res.render("owner/coupons/index", { restaurant, coupons, messages: req.flash() });
    } catch (err) {
      console.error(err);
      req.flash("error", "Error loading coupons");
      res.redirect("/restaurants");
    }
  },

  getCreateCoupon: async (req, res) => {
    try {
      const restaurant = await getOwnedRestaurant(req.user._id, req.params.restaurantId);
      if (!restaurant) {
        req.flash("error", "Restaurant not found");
        return res.redirect("/restaurants");
      }
      res.render("owner/coupons/create", { restaurant, messages: req.flash() });
    } catch (err) {
      console.error(err);
      req.flash("error", "Error loading coupon form");
      res.redirect(`/restaurants/${req.params.restaurantId}/coupons`);
    }
  },

  postCreateCoupon: async (req, res) => {
    try {
      const restaurant = await getOwnedRestaurant(req.user._id, req.params.restaurantId);
      if (!restaurant) {
        req.flash("error", "Restaurant not found");
        return res.redirect("/restaurants");
      }

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
        isActive,
      } = req.body;

      await Coupon.create({
        code: code.toUpperCase(),
        restaurant: restaurant._id,
        description,
        discountType,
        discountValue: parseFloat(discountValue),
        minimumOrderAmount: parseFloat(minimumOrderAmount) || 0,
        maximumDiscount: maximumDiscount ? parseFloat(maximumDiscount) : null,
        usageLimit: usageLimit ? parseInt(usageLimit, 10) : null,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        applicableMealTypes: applicableMealTypes
          ? applicableMealTypes.split(",").map((x) => x.trim()).filter(Boolean)
          : [],
        isActive: isActive === "on",
      });

      req.flash("success", "Coupon created successfully");
      res.redirect(`/restaurants/${restaurant._id}/coupons`);
    } catch (err) {
      console.error(err);
      req.flash("error", err.code === 11000 ? "Coupon code already exists" : "Error creating coupon");
      res.redirect(`/restaurants/${req.params.restaurantId}/coupons/create`);
    }
  },

  getEditCoupon: async (req, res) => {
    try {
      const restaurant = await getOwnedRestaurant(req.user._id, req.params.restaurantId);
      if (!restaurant) {
        req.flash("error", "Restaurant not found");
        return res.redirect("/restaurants");
      }

      const coupon = await Coupon.findOne({ _id: req.params.couponId, restaurant: restaurant._id }).lean();
      if (!coupon) {
        req.flash("error", "Coupon not found");
        return res.redirect(`/restaurants/${restaurant._id}/coupons`);
      }

      res.render("owner/coupons/edit", { restaurant, coupon, messages: req.flash() });
    } catch (err) {
      console.error(err);
      req.flash("error", "Error loading coupon");
      res.redirect(`/restaurants/${req.params.restaurantId}/coupons`);
    }
  },

  postUpdateCoupon: async (req, res) => {
    try {
      const restaurant = await getOwnedRestaurant(req.user._id, req.params.restaurantId);
      if (!restaurant) {
        req.flash("error", "Restaurant not found");
        return res.redirect("/restaurants");
      }

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
        isActive,
      } = req.body;

      const coupon = await Coupon.findOne({ _id: req.params.couponId, restaurant: restaurant._id });
      if (!coupon) {
        req.flash("error", "Coupon not found");
        return res.redirect(`/restaurants/${restaurant._id}/coupons`);
      }

      coupon.code = code.toUpperCase();
      coupon.description = description;
      coupon.discountType = discountType;
      coupon.discountValue = parseFloat(discountValue);
      coupon.minimumOrderAmount = parseFloat(minimumOrderAmount) || 0;
      coupon.maximumDiscount = maximumDiscount ? parseFloat(maximumDiscount) : null;
      coupon.usageLimit = usageLimit ? parseInt(usageLimit, 10) : null;
      coupon.validFrom = new Date(validFrom);
      coupon.validUntil = new Date(validUntil);
      coupon.applicableMealTypes = applicableMealTypes
        ? applicableMealTypes.split(",").map((x) => x.trim()).filter(Boolean)
        : [];
      coupon.isActive = isActive === "on";

      await coupon.save();
      req.flash("success", "Coupon updated successfully");
      res.redirect(`/restaurants/${restaurant._id}/coupons`);
    } catch (err) {
      console.error(err);
      req.flash("error", err.code === 11000 ? "Coupon code already exists" : "Error updating coupon");
      res.redirect(`/restaurants/${req.params.restaurantId}/coupons/${req.params.couponId}/edit`);
    }
  },

  deleteCoupon: async (req, res) => {
    try {
      const restaurant = await getOwnedRestaurant(req.user._id, req.params.restaurantId);
      if (!restaurant) {
        req.flash("error", "Restaurant not found");
        return res.redirect("/restaurants");
      }

      await Coupon.findOneAndDelete({ _id: req.params.couponId, restaurant: restaurant._id });
      req.flash("success", "Coupon deleted successfully");
      res.redirect(`/restaurants/${restaurant._id}/coupons`);
    } catch (err) {
      console.error(err);
      req.flash("error", "Error deleting coupon");
      res.redirect(`/restaurants/${req.params.restaurantId}/coupons`);
    }
  },
};

