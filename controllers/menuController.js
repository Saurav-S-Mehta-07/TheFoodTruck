const MenuItem = require("../models/MenuItem");
const Category = require("../models/Category");
const Restaurant = require("../models/Restaurant");
const Order = require("../models/Orders");
const Review = require("../models/Review");
const User = require("../models/Users");
const Cart = require("../models/Cart");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads/"),
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
    else cb(new Error("Only image files are allowed!"), false);
  },
});

module.exports = {
  upload,

  // Get all menu items with filtering and sorting
  getMenu: async (req, res) => {
    try {
      const { category, search, sort, foodType } = req.query;
      const query = { isAvailable: true };

      let selectedCategory = null;
      if (category) {
        selectedCategory = await Category.findOne({ slug: category });
        if (selectedCategory) {
          query.category = selectedCategory._id;
          if (req.user) {
            await recordCategoryInteraction(req.user._id, selectedCategory._id);
          }
        }
      }

      if (foodType && foodType !== "all") {
        query.foodType = foodType;
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { tags: { $in: [new RegExp(search, "i")] } },
        ];
      }

      let sortOption = {};
      switch (sort) {
        case "price-low":
          sortOption.price = 1;
          break;
        case "price-high":
          sortOption.price = -1;
          break;
        case "popular":
          sortOption.orderCount = -1;
          break;
        default:
          sortOption.createdAt = -1;
      }

      let menuItems = await MenuItem.find(query).populate("category").sort(sortOption);
      const categories = await Category.find();

      if (req.user && !category) {
        const preference = await getTopCategoryPreference(req.user._id);
        if (preference && preference.count >= 5) {
          menuItems = prioritizeByCategory(menuItems, preference.categoryId.toString());
        }
      }

      res.render("menu/index", {
        menuItems,
        categories,
        currentCategory: category,
        search,
        sort,
        foodType,
        messages: req.flash(),
      });
    } catch (err) {
      console.error(err);
      req.flash("error", "Error loading menu");
      res.redirect("/");
    }
  },

  // Show individual menu item
  getShowMenuItem: async (req, res) => {
    try {
      const { id } = req.params;
      const menuItem = await MenuItem.findById(id).populate("category");

      if (!menuItem || !menuItem.isAvailable) {
        req.flash("error", "Menu item not found");
        return res.redirect("/menu");
      }

      if (req.user && menuItem.category?._id) {
        await recordCategoryInteraction(req.user._id, menuItem.category._id);
      }

      const reviews = await Review.find({ menuItem: id }).populate("user", "name").sort({ createdAt: -1 });
      const userReview = req.user ? await Review.findOne({ menuItem: id, user: req.user._id }) : null;

      const relatedQuery = { _id: { $ne: id }, isAvailable: true };
      if (menuItem.category) relatedQuery.category = menuItem.category._id;
      const relatedItems = await MenuItem.find(relatedQuery).limit(4).sort({ orderCount: -1 });

      const canReview = req.user
        ? Boolean(
            await Order.exists({
              user: req.user._id,
              "items.menuItem": menuItem._id,
            })
          )
        : false;

      const averageRating =
        reviews.length > 0
          ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
          : 0;

      let cartItemQuantity = 0;
      if (req.user) {
        const userCart = await Cart.findOne({ user: req.user._id }).select("items.menuItem items.quantity");
        if (userCart && userCart.items && userCart.items.length) {
          const cartItem = userCart.items.find(
            (item) => item.menuItem && item.menuItem.toString() === menuItem._id.toString()
          );
          cartItemQuantity = cartItem ? cartItem.quantity : 0;
        }
      }

      res.render("menu/show", {
        menuItem,
        reviews,
        averageRating,
        relatedItems,
        canReview,
        userReview,
        cartItemQuantity,
        messages: req.flash(),
      });
    } catch (err) {
      console.error(err);
      req.flash("error", "Error loading menu item");
      res.redirect("/menu");
    }
  },

  // Admin: List all menu items
  getAdminMenu: async (req, res) => {
    try {
      const menuItems = await MenuItem.find().populate("category");
      res.render("admin/menu/index", { menuItems, messages: req.flash() });
    } catch (err) {
      console.error(err);
      req.flash("error", "Error loading menu items");
      res.redirect("/admin");
    }
  },

  // Admin: Show create form
  getCreateMenuItem: async (req, res) => {
    try {
      const categories = await Category.find();
      res.render("admin/menu/create", { categories, messages: req.flash() });
    } catch (err) {
      console.error(err);
      req.flash("error", "Error loading form");
      res.redirect("/menu/admin");
    }
  },

  // Admin: Create menu item
  postCreateMenuItem: async (req, res) => {
    try {
      const { title, category, foodType, description, price, originalPrice, calories, tags, customizable } = req.body;
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
      let restaurantId = req.body.restaurant;

      if (!restaurantId) {
        const restaurant = await Restaurant.findOne().select("_id");
        restaurantId = restaurant ? restaurant._id : null;
      }

      if (!restaurantId) {
        req.flash("error", "Please create a restaurant before adding menu items");
        return res.redirect("/admin/restaurants/create");
      }

      const menuItem = new MenuItem({
        title,
        category,
        restaurant: restaurantId,
        foodType,
        description,
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        calories: calories ? parseInt(calories, 10) : null,
        imageUrl,
        tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
        customizable: customizable === "on",
      });

      await menuItem.save();
      req.flash("success", "Menu item created successfully");
      res.redirect("/menu/admin");
    } catch (err) {
      console.error(err);
      req.flash("error", "Error creating menu item");
      res.redirect("/menu/admin/create");
    }
  },

  // Admin: Show edit form
  getEditMenuItem: async (req, res) => {
    try {
      const { id } = req.params;
      const menuItem = await MenuItem.findById(id).populate("category");
      const categories = await Category.find();

      if (!menuItem) {
        req.flash("error", "Menu item not found");
        return res.redirect("/menu/admin");
      }

      res.render("admin/menu/edit", { menuItem, categories, messages: req.flash() });
    } catch (err) {
      console.error(err);
      req.flash("error", "Error loading menu item");
      res.redirect("/menu/admin");
    }
  },

  // Admin: Update menu item
  postUpdateMenuItem: async (req, res) => {
    try {
      const { id } = req.params;
      const { title, category, foodType, description, price, originalPrice, calories, tags, customizable, isAvailable } =
        req.body;

      const updateData = {
        title,
        category,
        foodType,
        description,
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        calories: calories ? parseInt(calories, 10) : null,
        tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
        customizable: customizable === "on",
        isAvailable: isAvailable === "on",
      };

      if (req.file) updateData.imageUrl = `/uploads/${req.file.filename}`;

      await MenuItem.findByIdAndUpdate(id, updateData);
      req.flash("success", "Menu item updated successfully");
      res.redirect("/menu/admin");
    } catch (err) {
      console.error(err);
      req.flash("error", "Error updating menu item");
      res.redirect(`/menu/admin/edit/${req.params.id}`);
    }
  },

  // Admin: Delete menu item
  deleteMenuItem: async (req, res) => {
    try {
      const { id } = req.params;
      await MenuItem.findByIdAndDelete(id);
      req.flash("success", "Menu item deleted successfully");
      res.redirect("/menu/admin");
    } catch (err) {
      console.error(err);
      req.flash("error", "Error deleting menu item");
      res.redirect("/menu/admin");
    }
  },

  // User: add or update review on a menu item
  postReview: async (req, res) => {
    try {
      const { id } = req.params;
      const { rating, comment } = req.body;

      const menuItem = await MenuItem.findById(id);
      if (!menuItem || !menuItem.isAvailable) {
        req.flash("error", "Menu item not found");
        return res.redirect("/menu");
      }

      const hasOrdered = await Order.exists({ user: req.user._id, "items.menuItem": menuItem._id });
      if (!hasOrdered) {
        req.flash("error", "You can review only items you have ordered");
        return res.redirect(`/menu/${id}`);
      }

      const safeRating = Math.max(1, Math.min(5, Number(rating) || 0));
      if (!safeRating) {
        req.flash("error", "Please provide a valid rating");
        return res.redirect(`/menu/${id}`);
      }

      await Review.findOneAndUpdate(
        { user: req.user._id, menuItem: menuItem._id },
        {
          user: req.user._id,
          menuItem: menuItem._id,
          restaurant: menuItem.restaurant,
          rating: safeRating,
          comment: (comment || "").trim(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      req.flash("success", "Thanks! Your review has been saved.");
      res.redirect(`/menu/${id}`);
    } catch (err) {
      console.error(err);
      req.flash("error", "Error saving your review");
      res.redirect(`/menu/${req.params.id}`);
    }
  },
};

function prioritizeByCategory(items, preferredCategoryId) {
  return [...items].sort((a, b) => {
    const aMatch = a.category && a.category._id.toString() === preferredCategoryId ? 1 : 0;
    const bMatch = b.category && b.category._id.toString() === preferredCategoryId ? 1 : 0;
    return bMatch - aMatch;
  });
}

async function recordCategoryInteraction(userId, categoryId) {
  if (!userId || !categoryId) return;
  const key = `preferredCategoryClicks.${categoryId.toString()}`;
  await User.updateOne({ _id: userId }, { $inc: { [key]: 1 } });
}

async function getTopCategoryPreference(userId) {
  const user = await User.findById(userId).select("preferredCategoryClicks");
  if (!user || !user.preferredCategoryClicks) return null;

  const entries = Array.from(user.preferredCategoryClicks.entries ? user.preferredCategoryClicks.entries() : []);
  if (!entries.length) return null;

  entries.sort((a, b) => b[1] - a[1]);
  return { categoryId: entries[0][0], count: entries[0][1] };
}

