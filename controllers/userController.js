const User = require("../models/Users");
const Order = require("../models/Orders");

module.exports = {
  getProfile: async (req, res) => {
    try {
      const user = await User.findById(req.user._id).select("name email phone address role createdAt").lean();
      const recentOrders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(5).lean();
      res.json({ user, recentOrders });
    } catch (err) {
      console.error(err);
      req.flash("error", "Error loading profile");
      res.redirect("/");
    }
  },

  updateProfile: async (req, res) => {
    try {
      const { name, phone, street, city, state, pincode } = req.body;

      await User.findByIdAndUpdate(req.user._id, {
        name,
        phone,
        address: { street, city, state, pincode }
      });

      req.flash("success", "Profile updated successfully");
      res.redirect("/user/profile");
    } catch (err) {
      console.error(err);
      req.flash("error", "Error updating profile");
      res.redirect("/user/profile");
    }
  },

  getUserOrders: (req, res) => {
    res.redirect("/orders");
  },

  getUserOrderDetails: (req, res) => {
    res.redirect(`/orders/${req.params.id}`);
  },

  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        req.flash("error", "New password must be at least 6 characters");
        return res.redirect("/user/profile");
      }

      if (newPassword !== confirmPassword) {
        req.flash("error", "New password and confirm password do not match");
        return res.redirect("/user/profile");
      }

      const user = await User.findById(req.user._id);
      const isValid = await user.comparePassword(currentPassword || "");
      if (!isValid) {
        req.flash("error", "Current password is incorrect");
        return res.redirect("/user/profile");
      }

      user.password = newPassword;
      await user.save();

      req.flash("success", "Password changed successfully");
      res.redirect("/user/profile");
    } catch (err) {
      console.error(err);
      req.flash("error", "Error changing password");
      res.redirect("/user/profile");
    }
  }
};
