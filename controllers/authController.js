const User = require("../models/Users");
const passport = require("passport");

const ALLOWED_SIGNUP_ROLES = ["user", "owner"];

module.exports = {
  // Render signup form
  getSignup: (req, res) => {
    const requestedRole = req.query.role;
    const defaultRole = ALLOWED_SIGNUP_ROLES.includes(requestedRole) ? requestedRole : "user";
    res.render("auth/signup", { messages: req.flash(), defaultRole });
  },

  // Handle signup
  postSignup: async (req, res) => {
    try {
      const { name, email, password, confirmPassword, role } = req.body;

      // Validation
      if (password !== confirmPassword) {
        req.flash("error", "Passwords do not match");
        return res.redirect("/auth/signup");
      }

      if (password.length < 6) {
        req.flash("error", "Password must be at least 6 characters long");
        return res.redirect("/auth/signup");
      }

      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        req.flash("error", "Email already registered");
        return res.redirect("/auth/signup");
      }

      const safeRole = ALLOWED_SIGNUP_ROLES.includes(role) ? role : "user";

      // Create user
      const user = new User({ name, email, password, role: safeRole });
      await user.save();

      req.flash("success", "Account created successfully! Please log in.");
      res.redirect("/auth/login");
    } catch (err) {
      console.error(err);
      req.flash("error", "Something went wrong. Please try again.");
      res.redirect("/auth/signup");
    }
  },

  // Render login form
  getLogin: (req, res) => {
    res.render("auth/login", { messages: req.flash() });
  },

  // Handle login
  postLogin: (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);

      if (!user) {
        req.flash("error", (info && info.message) || "Invalid email or password");
        return res.redirect("/auth/login");
      }

      req.logIn(user, (loginErr) => {
        if (loginErr) return next(loginErr);

        if (user.role === "admin") return res.redirect("/admin");
        if (user.role === "owner") return res.redirect("/restaurants/dashboard");
        return res.redirect("/home");
      });
    })(req, res, next);
  },

  // Handle logout
  logout: (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error(err);
        req.flash("error", "Error logging out");
      } else {
        req.flash("success", "Logged out successfully");
      }
      res.redirect("/home");
    });
  }
};
