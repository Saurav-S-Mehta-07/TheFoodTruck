const Order = require("../models/Orders");
const Cart = require("../models/Cart");
const MenuItem = require("../models/MenuItem");
const Coupon = require("../models/Coupon");

const DEFAULT_CUSTOMIZATION = "Default";
const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Supper", "Brunch"];
const MEAL_HOUR_MAP = {
  Breakfast: 9,
  Lunch: 13,
  Dinner: 20,
  Supper: 22,
  Brunch: 11,
};

function getRestaurantRef(menuItem) {
  if (!menuItem || !menuItem.restaurant) return null;
  if (typeof menuItem.restaurant === "object" && menuItem.restaurant._id) {
    return { id: menuItem.restaurant._id.toString(), name: menuItem.restaurant.name || "Restaurant" };
  }
  return { id: menuItem.restaurant.toString(), name: "Restaurant" };
}

function groupCartItemsByRestaurant(cartItems, customizations = {}) {
  const groups = new Map();

  for (const item of cartItems) {
    if (!item.menuItem) continue;

    const restaurantRef = getRestaurantRef(item.menuItem);
    if (!restaurantRef) continue;

    if (!groups.has(restaurantRef.id)) {
      groups.set(restaurantRef.id, {
        restaurantId: restaurantRef.id,
        restaurantName: restaurantRef.name,
        items: [],
        subtotal: 0,
      });
    }

    const group = groups.get(restaurantRef.id);
    const price = Number(item.menuItem.price || 0);
    const quantity = Number(item.quantity || 0);
    group.items.push({
      ...item.toObject(),
      transientCustomization: customizations[item.menuItem._id.toString()] || DEFAULT_CUSTOMIZATION,
    });
    group.subtotal += price * quantity;
  }

  return Array.from(groups.values());
}

function buildOrderItems(items) {
  return items.map((item) => ({
    menuItem: item.menuItem._id,
    title: item.menuItem.title,
    price: item.menuItem.price,
    quantity: item.quantity,
    specialInstructions: item.specialInstructions || "",
  }));
}

module.exports = {
  getCheckout: async (req, res) => {
    try {
      const cart = await Cart.findOne({ user: req.user._id }).populate({
        path: "items.menuItem",
        populate: { path: "restaurant", select: "name" },
      }).populate("coupon");

      if (!cart || cart.items.length === 0) {
        req.flash("error", "Your cart is empty");
        return res.redirect("/cart");
      }

      const customizations = req.session.itemCustomizations || {};
      const restaurantGroups = groupCartItemsByRestaurant(cart.items, customizations);

      if (!restaurantGroups.length) {
        req.flash("error", "No valid items available in cart");
        return res.redirect("/cart");
      }

      const subtotal = restaurantGroups.reduce((sum, g) => sum + g.subtotal, 0);
      const discountAmount = cart.discountAmount || 0;
      const taxableAmount = Math.max(0, subtotal - discountAmount);
      const taxAmount = Math.round(taxableAmount * 0.18 * 100) / 100;
      const totalAmount = taxableAmount + taxAmount;

      return res.render("orders/checkout", {
        cart,
        restaurantGroups,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        messages: req.flash(),
      });
    } catch (err) {
      console.error(err);
      req.flash("error", "Error loading checkout");
      return res.redirect("/cart");
    }
  },

  getBulkOrderPage: async (req, res) => {
    try {
      // Get all available menu items grouped by restaurant
      const menuItems = await MenuItem.find({ isAvailable: true }).populate("restaurant", "name").sort({ "restaurant.name": 1, title: 1 });

      // Group items by restaurant
      const restaurantGroups = new Map();
      for (const item of menuItems) {
        if (!item.restaurant) continue;

        const restaurantId = item.restaurant._id.toString();
        if (!restaurantGroups.has(restaurantId)) {
          restaurantGroups.set(restaurantId, {
            restaurantId,
            restaurantName: item.restaurant.name,
            items: [],
          });
        }
        restaurantGroups.get(restaurantId).items.push(item);
      }

      const today = new Date().toISOString().slice(0, 10);

      return res.render("orders/bulk", {
        restaurantGroups: Array.from(restaurantGroups.values()),
        mealTypes: MEAL_TYPES,
        defaultStartDate: today,
        messages: req.flash(),
      });
    } catch (err) {
      console.error(err);
      req.flash("error", "Error loading bulk order page");
      return res.redirect("/");
    }
  },

  getOrders: async (req, res) => {
    try {
      const orders = await Order.find({ user: req.user._id }).populate("restaurant", "name").sort({ createdAt: -1 });
      return res.render("orders/index", { orders, messages: req.flash() });
    } catch (err) {
      console.error(err);
      req.flash("error", "Error loading orders");
      return res.redirect("/");
    }
  },

  getOrderDetails: async (req, res) => {
    try {
      const { id } = req.params;
      const query = req.user.role === "admin" ? { _id: id } : { _id: id, user: req.user._id };
      const order = await Order.findOne(query).populate("restaurant", "name");

      if (!order) {
        req.flash("error", "Order not found");
        return res.redirect("/orders");
      }

      return res.render("orders/details", { order, messages: req.flash() });
    } catch (err) {
      console.error(err);
      req.flash("error", "Error loading order details");
      return res.redirect("/orders");
    }
  },

  createOrder: async (req, res) => {
    try {
      const { paymentMethod, street, city, state, pincode, specialInstructions } = req.body;
      const userId = req.user._id;

      const cart = await Cart.findOne({ user: userId }).populate({
        path: "items.menuItem",
        populate: { path: "restaurant", select: "name" },
      }).populate("coupon");

      if (!cart || cart.items.length === 0) {
        req.flash("error", "Your cart is empty");
        return res.redirect("/cart");
      }

      for (const item of cart.items) {
        if (!item.menuItem || !item.menuItem.isAvailable) {
          req.flash("error", `Item ${item.menuItem?.title || "Unknown"} is no longer available`);
          return res.redirect("/cart");
        }
      }

      const restaurantGroups = groupCartItemsByRestaurant(cart.items, req.session.itemCustomizations || {});
      if (!restaurantGroups.length) {
        req.flash("error", "No valid items available for order");
        return res.redirect("/cart");
      }

      const couponRestaurantId = cart.coupon && cart.coupon.restaurant ? cart.coupon.restaurant.toString() : null;
      const createdOrders = [];

      for (const group of restaurantGroups) {
        const subtotal = group.subtotal;
        const discountAmount = couponRestaurantId && couponRestaurantId === group.restaurantId
          ? Math.min(cart.discountAmount || 0, subtotal)
          : 0;
        const taxableAmount = Math.max(0, subtotal - discountAmount);
        const taxAmount = Math.round(taxableAmount * 0.18 * 100) / 100;
        const totalAmount = taxableAmount + taxAmount;

        const order = new Order({
          user: userId,
          restaurant: group.restaurantId,
          items: buildOrderItems(group.items),
          coupon: discountAmount > 0 ? cart.coupon?._id : null,
          subtotal,
          discountAmount,
          taxAmount,
          totalAmount,
          deliveryAddress: { street, city, state, pincode },
          paymentMethod,
          specialInstructions: specialInstructions || "",
          estimatedDeliveryTime: new Date(Date.now() + 45 * 60 * 1000),
        });

        await order.save();
        createdOrders.push(order);

        for (const item of group.items) {
          await MenuItem.findByIdAndUpdate(item.menuItem._id, { $inc: { orderCount: item.quantity } });
        }
      }

      if (cart.coupon) {
        await Coupon.findByIdAndUpdate(cart.coupon._id, { $inc: { usedCount: 1 } });
      }

      // Keep cart items after ordering - don't delete cart
      // await Cart.findOneAndDelete({ user: userId });
      req.session.itemCustomizations = {};

      if (paymentMethod === "online") {
        if (createdOrders.length === 1) {
          req.flash("success", "Order created. Please complete payment to confirm.");
          return res.redirect(`/orders/${createdOrders[0]._id}/payment`);
        }

        req.flash("success", `${createdOrders.length} restaurant-wise orders created. Complete payment in each order details.`);
        return res.redirect("/orders");
      }

      if (createdOrders.length === 1) {
        req.flash("success", "Order placed successfully!");
        return res.redirect(`/orders/${createdOrders[0]._id}`);
      }

      req.flash("success", `${createdOrders.length} orders placed successfully (restaurant-wise).`);
      return res.redirect("/orders");
    } catch (err) {
      console.error(err);
      req.flash("error", "Error placing order");
      return res.redirect("/cart");
    }
  },

  createDirectOrder: async (req, res) => {
    try {
      const { menuItemId, quantity = 1, specialInstructions = "", customizationOption } = req.body;
      const { paymentMethod, street, city, state, pincode, specialInstructions: orderInstructions } = req.body;
      const userId = req.user._id;

      const menuItem = await MenuItem.findById(menuItemId).populate("restaurant", "name");
      if (!menuItem || !menuItem.isAvailable) {
        req.flash("error", "Menu item not available");
        return res.redirect(`/menu/${menuItemId}`);
      }

      const qty = Math.max(1, parseInt(quantity, 10) || 1);

      // Build order item
      const orderItem = {
        menuItem: menuItem._id,
        title: menuItem.title,
        price: menuItem.price,
        quantity: qty,
        specialInstructions: specialInstructions || "",
      };

      const subtotal = menuItem.price * qty;
      const taxAmount = Math.round(subtotal * 0.18 * 100) / 100;
      const totalAmount = subtotal + taxAmount;

      const order = new Order({
        user: userId,
        restaurant: menuItem.restaurant._id,
        items: [orderItem],
        subtotal,
        discountAmount: 0,
        taxAmount,
        totalAmount,
        deliveryAddress: { street, city, state, pincode },
        paymentMethod,
        specialInstructions: orderInstructions || "",
        estimatedDeliveryTime: new Date(Date.now() + 45 * 60 * 1000),
      });

      await order.save();

      // Update menu item order count
      await MenuItem.findByIdAndUpdate(menuItem._id, { $inc: { orderCount: qty } });

      if (paymentMethod === "online") {
        req.flash("success", "Order created. Please complete payment to confirm.");
        return res.redirect(`/orders/${order._id}/payment`);
      }

      req.flash("success", "Order placed successfully!");
      return res.redirect(`/orders/${order._id}`);
    } catch (err) {
      console.error(err);
      req.flash("error", "Error placing order");
      return res.redirect(`/menu/${req.body.menuItemId}`);
    }
  },

  createBulkOrder: async (req, res) => {
    try {
      const { restaurantId, items, mealType, days, startDate, paymentMethod, street, city, state, pincode, specialInstructions } = req.body;

      if (!MEAL_TYPES.includes(mealType)) {
        req.flash("error", "Invalid meal type");
        return res.redirect("/orders/bulk");
      }

      const totalDays = Math.max(1, Math.min(30, parseInt(days, 10) || 1));
      const start = startDate ? new Date(startDate) : new Date();
      if (Number.isNaN(start.getTime())) {
        req.flash("error", "Invalid start date");
        return res.redirect("/orders/bulk");
      }
      start.setHours(0, 0, 0, 0);

      // Parse selected items
      let selectedItems = [];
      if (typeof items === 'string') {
        selectedItems = JSON.parse(items);
      } else if (Array.isArray(items)) {
        selectedItems = items;
      }

      if (!selectedItems || selectedItems.length === 0) {
        req.flash("error", "No items selected for bulk order");
        return res.redirect("/orders/bulk");
      }

      // Validate and fetch menu items
      const menuItemIds = selectedItems.map(item => item.menuItemId);
      const menuItems = await MenuItem.find({ _id: { $in: menuItemIds }, isAvailable: true }).populate("restaurant", "name");

      if (menuItems.length !== selectedItems.length) {
        req.flash("error", "Some selected items are no longer available");
        return res.redirect("/orders/bulk");
      }

      // Verify all items belong to the selected restaurant
      const invalidItems = menuItems.filter(item => item.restaurant._id.toString() !== restaurantId);
      if (invalidItems.length > 0) {
        req.flash("error", "All selected items must belong to the same restaurant");
        return res.redirect("/orders/bulk");
      }

      const createdOrders = [];

      for (let dayIndex = 0; dayIndex < totalDays; dayIndex += 1) {
        const scheduledFor = new Date(start);
        scheduledFor.setDate(start.getDate() + dayIndex);
        scheduledFor.setHours(MEAL_HOUR_MAP[mealType] || 13, 0, 0, 0);

        // Build order items
        const orderItems = selectedItems.map(selectedItem => {
          const menuItem = menuItems.find(m => m._id.toString() === selectedItem.menuItemId);
          return {
            menuItem: menuItem._id,
            title: menuItem.title,
            price: menuItem.price,
            quantity: parseInt(selectedItem.quantity) || 1,
            specialInstructions: selectedItem.specialInstructions || "",
          };
        });

        const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const taxAmount = Math.round(subtotal * 0.18 * 100) / 100;
        const totalAmount = subtotal + taxAmount;

        const order = new Order({
          user: req.user._id,
          restaurant: restaurantId,
          items: orderItems,
          mealType,
          scheduledFor,
          subtotal,
          discountAmount: 0,
          taxAmount,
          totalAmount,
          paymentMethod,
          paymentStatus: paymentMethod === "cod" ? "pending" : "pending",
          deliveryAddress: { street, city, state, pincode },
          specialInstructions: specialInstructions || "",
          estimatedDeliveryTime: new Date(scheduledFor.getTime() + 45 * 60 * 1000),
        });

        await order.save();
        createdOrders.push(order);
      }

      // Update order counts
      for (const selectedItem of selectedItems) {
        const quantity = parseInt(selectedItem.quantity) || 1;
        await MenuItem.findByIdAndUpdate(selectedItem.menuItemId, { $inc: { orderCount: quantity * totalDays } });
      }

      req.flash("success", `Bulk order created: ${createdOrders.length} daily ${mealType} orders for one restaurant.`);
      return res.redirect("/orders");
    } catch (err) {
      console.error(err);
      req.flash("error", "Error creating bulk order");
      return res.redirect("/orders/bulk");
    }
  },

  getPaymentPage: async (req, res) => {
    try {
      const { id } = req.params;
      const order = await Order.findOne({ _id: id, user: req.user._id, paymentMethod: "online" });

      if (!order) {
        req.flash("error", "Payment page not available for this order");
        return res.redirect("/orders");
      }

      if (order.paymentStatus === "paid") {
        req.flash("success", "Payment already completed");
        return res.redirect(`/orders/${order._id}`);
      }

      return res.render("orders/payment", { order, messages: req.flash() });
    } catch (err) {
      console.error(err);
      req.flash("error", "Error loading payment page");
      return res.redirect("/orders");
    }
  },

  processPayment: async (req, res) => {
    try {
      const { id } = req.params;
      const order = await Order.findOne({ _id: id, user: req.user._id, paymentMethod: "online" });

      if (!order) {
        req.flash("error", "Payment could not be processed");
        return res.redirect("/orders");
      }

      order.paymentStatus = "paid";
      order.orderStatus = order.orderStatus === "Placed" ? "Confirmed" : order.orderStatus;
      await order.save();

      req.flash("success", "Payment successful! Your order is confirmed.");
      return res.redirect(`/orders/${order._id}`);
    } catch (err) {
      console.error(err);
      req.flash("error", "Error processing payment");
      return res.redirect(`/orders/${req.params.id}/payment`);
    }
  },

  getAdminOrders: async (req, res) => {
    try {
      const filter = {};
      if (req.query.mealType) filter.mealType = req.query.mealType;
      if (req.query.status) filter.orderStatus = req.query.status;

      const orders = await Order.find(filter).populate("user", "name email").sort({ createdAt: -1 });
      return res.render("admin/orders/index", { orders, query: req.query, messages: req.flash() });
    } catch (err) {
      console.error(err);
      req.flash("error", "Error loading orders");
      return res.redirect("/admin");
    }
  },

  updateOrderStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { orderStatus } = req.body;

      await Order.findByIdAndUpdate(id, { orderStatus });
      req.flash("success", "Order status updated");
      return res.redirect("/admin/orders");
    } catch (err) {
      console.error(err);
      req.flash("error", "Error updating order status");
      return res.redirect("/admin/orders");
    }
  },

  clearAllOrders: async (req, res) => {
    try {
      if (req.user.role !== "admin") {
        req.flash("error", "Unauthorized access");
        return res.redirect("/");
      }

      const result = await Order.deleteMany({});
      req.flash("success", `Cleared ${result.deletedCount} orders from the system`);
      return res.redirect("/admin/orders");
    } catch (err) {
      console.error(err);
      req.flash("error", "Error clearing orders");
      return res.redirect("/admin/orders");
    }
  },
};
