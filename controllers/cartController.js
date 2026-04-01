const Cart = require("../models/Cart");
const MenuItem = require("../models/MenuItem");
const Coupon = require("../models/Coupon");

const CUSTOMIZATION_OPTIONS = [
  "Default",
  "Less Spicy",
  "Extra Spicy",
  "No Onion",
  "No Garlic",
  "Extra Cheese",
];

const DEFAULT_CUSTOMIZATION = "Default";

function normalizeCustomization(option) {
  if (!option || typeof option !== "string") return DEFAULT_CUSTOMIZATION;
  return CUSTOMIZATION_OPTIONS.includes(option) ? option : DEFAULT_CUSTOMIZATION;
}

function getCustomizationStore(req) {
  if (!req.session.itemCustomizations) {
    req.session.itemCustomizations = {};
  }
  return req.session.itemCustomizations;
}

function getMenuItemRestaurantId(menuItem) {
  if (!menuItem || !menuItem.restaurant) return null;
  if (typeof menuItem.restaurant === "object" && menuItem.restaurant._id) return menuItem.restaurant._id.toString();
  return menuItem.restaurant.toString();
}

async function syncCouponForCart(cart) {
  if (!cart || !cart.coupon) return;

  const couponDoc = await Coupon.findById(cart.coupon);
  if (!couponDoc || !couponDoc.isActive) {
    cart.coupon = null;
    cart.discountAmount = 0;
    return;
  }

  const couponRestaurantId = couponDoc.restaurant.toString();
  let eligibleSubtotal = 0;

  for (const item of cart.items) {
    if (!item.menuItem) continue;
    const itemRestaurantId = getMenuItemRestaurantId(item.menuItem);
    if (itemRestaurantId === couponRestaurantId) {
      eligibleSubtotal += item.menuItem.price * item.quantity;
    }
  }

  if (eligibleSubtotal <= 0 || (couponDoc.minimumOrderAmount > 0 && eligibleSubtotal < couponDoc.minimumOrderAmount)) {
    cart.coupon = null;
    cart.discountAmount = 0;
    return;
  }

  cart.discountAmount = couponDoc.calculateDiscount(eligibleSubtotal);
}

module.exports = {
  getCart: async (req, res) => {
    try {
      const cart = await Cart.findOne({ user: req.user._id }).populate("items.menuItem").populate("coupon");

      if (!cart) {
        return res.render("cart/index", {
          cart: { items: [], totalPrice: 0, discountAmount: 0, finalPrice: 0 },
          customizationOptions: CUSTOMIZATION_OPTIONS,
          messages: req.flash(),
        });
      }

      const customizations = getCustomizationStore(req);

      let subtotal = 0;
      cart.items.forEach((item) => {
        if (item.menuItem) {
          subtotal += item.menuItem.price * item.quantity;
          item.transientCustomization = normalizeCustomization(customizations[item.menuItem._id.toString()]);
        }
      });

      cart.subtotal = subtotal;
      cart.finalPrice = Math.max(0, subtotal - (cart.discountAmount || 0));

      return res.render("cart/index", {
        cart,
        customizationOptions: CUSTOMIZATION_OPTIONS,
        messages: req.flash(),
      });
    } catch (err) {
      console.error(err);
      req.flash("error", "Error loading cart");
      return res.redirect("/");
    }
  },

  addToCart: async (req, res) => {
    try {
      const { menuItemId, quantity = 1, specialInstructions = "", customizationOption } = req.body;
      const userId = req.user._id;

      const menuItem = await MenuItem.findById(menuItemId);
      if (!menuItem || !menuItem.isAvailable) {
        req.flash("error", "Menu item not available");
        return res.redirect("/menu");
      }

      const qty = Math.max(1, parseInt(quantity, 10) || 1);

      let cart = await Cart.findOne({ user: userId });
      if (!cart) {
        cart = new Cart({ user: userId, items: [] });
      }

      const existingItem = cart.items.find((item) => item.menuItem.toString() === menuItemId);
      if (existingItem) {
        existingItem.quantity += qty;
        if (specialInstructions) existingItem.specialInstructions = specialInstructions;
      } else {
        cart.items.push({ menuItem: menuItemId, quantity: qty, specialInstructions });
      }

      const customizations = getCustomizationStore(req);
      customizations[menuItemId] = normalizeCustomization(customizationOption);

      await cart.save();

      req.flash("success", "Item added to cart");
      const referer = req.get("referer") || "";
      if (referer.includes("/menu")) return res.redirect(referer);
      return res.redirect("/cart");
    } catch (err) {
      console.error(err);
      req.flash("error", "Error adding item to cart");
      return res.redirect("/menu");
    }
  },

  updateCartItem: async (req, res) => {
    try {
      const { menuItemId, quantity, specialInstructions, customizationOption } = req.body;
      const userId = req.user._id;

      const cart = await Cart.findOne({ user: userId });
      if (!cart) {
        req.flash("error", "Cart not found");
        return res.redirect("/cart");
      }

      const item = cart.items.find((i) => i.menuItem.toString() === menuItemId);
      if (!item) {
        req.flash("error", "Item not in cart");
        return res.redirect("/cart");
      }

      const qty = parseInt(quantity, 10) || 0;
      if (qty <= 0) {
        cart.items = cart.items.filter((i) => i.menuItem.toString() !== menuItemId);
        const customizations = getCustomizationStore(req);
        delete customizations[menuItemId];
      } else {
        item.quantity = qty;
        if (specialInstructions !== undefined) item.specialInstructions = specialInstructions;
        const customizations = getCustomizationStore(req);
        customizations[menuItemId] = normalizeCustomization(customizationOption);
      }

      if (cart.items.length === 0) {
        cart.coupon = null;
        cart.discountAmount = 0;
      } else {
        await cart.populate("items.menuItem");
        await syncCouponForCart(cart);
      }

      await cart.save();
      req.flash("success", "Cart updated");
      return res.redirect("/cart");
    } catch (err) {
      console.error(err);
      req.flash("error", "Error updating cart");
      return res.redirect("/cart");
    }
  },

  removeFromCart: async (req, res) => {
    try {
      const { menuItemId } = req.params;
      const userId = req.user._id;

      const cart = await Cart.findOne({ user: userId });
      if (!cart) {
        req.flash("error", "Cart not found");
        return res.redirect("/cart");
      }

      cart.items = cart.items.filter((item) => item.menuItem.toString() !== menuItemId);
      const customizations = getCustomizationStore(req);
      delete customizations[menuItemId];

      if (cart.items.length === 0) {
        cart.coupon = null;
        cart.discountAmount = 0;
      } else {
        await cart.populate("items.menuItem");
        await syncCouponForCart(cart);
      }

      await cart.save();

      req.flash("success", "Item removed from cart");
      return res.redirect("/cart");
    } catch (err) {
      console.error(err);
      req.flash("error", "Error removing item from cart");
      return res.redirect("/cart");
    }
  },

  clearCart: async (req, res) => {
    try {
      const userId = req.user._id;
      await Cart.findOneAndDelete({ user: userId });
      req.session.itemCustomizations = {};
      req.flash("success", "Cart cleared");
      return res.redirect("/cart");
    } catch (err) {
      console.error(err);
      req.flash("error", "Error clearing cart");
      return res.redirect("/cart");
    }
  },

  applyCoupon: async (req, res) => {
    try {
      const { couponCode } = req.body;
      const userId = req.user._id;

      const cart = await Cart.findOne({ user: userId }).populate("items.menuItem");
      if (!cart || cart.items.length === 0) {
        req.flash("error", "Cart is empty");
        return res.redirect("/cart");
      }

      if (!couponCode) {
        cart.coupon = null;
        cart.discountAmount = 0;
        await cart.save();
        req.flash("success", "Coupon removed");
        return res.redirect("/cart");
      }

      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (!coupon) {
        req.flash("error", "Invalid coupon code");
        return res.redirect("/cart");
      }

      const couponRestaurantId = coupon.restaurant.toString();
      let eligibleSubtotal = 0;
      cart.items.forEach((item) => {
        if (!item.menuItem) return;
        const itemRestaurantId = getMenuItemRestaurantId(item.menuItem);
        if (itemRestaurantId === couponRestaurantId) {
          eligibleSubtotal += item.menuItem.price * item.quantity;
        }
      });

      if (eligibleSubtotal <= 0) {
        req.flash("error", "This coupon is not valid for items in your cart");
        return res.redirect("/cart");
      }

      if (coupon.minimumOrderAmount > 0 && eligibleSubtotal < coupon.minimumOrderAmount) {
        req.flash("error", `Minimum order amount of Rs.${coupon.minimumOrderAmount} required for this restaurant`);
        return res.redirect("/cart");
      }

      const discountAmount = coupon.calculateDiscount(eligibleSubtotal);
      cart.coupon = coupon._id;
      cart.discountAmount = discountAmount;
      await cart.save();

      req.flash("success", `Coupon applied! You saved Rs.${discountAmount}`);
      return res.redirect("/cart");
    } catch (err) {
      console.error(err);
      req.flash("error", "Error applying coupon");
      return res.redirect("/cart");
    }
  },
};
