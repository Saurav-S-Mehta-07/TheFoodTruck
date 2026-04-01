require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const methodOverride = require("method-override");
const path = require("path");

const { notFoundHandler, globalErrorHandler } = require("./middleware/errorHandler");
const User = require("./models/Users");
const Cart = require("./models/Cart");

const authRoutes = require("./routes/authRoutes");
const menuRoutes = require("./routes/menuRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const couponRoutes = require("./routes/couponRoutes");
const restaurantRoutes = require("./routes/restaurantRoutes");
const userRoutes = require("./routes/userRoutes");
const Orders = require("./models/Orders");

const app = express();
const PORT = process.env.PORT || 8080;

mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("DB Error:", err));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URL,
      collectionName: "sessions",
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email });
        if (!user) return done(null, false, { message: "Invalid email or password" });

        const isValid = await user.comparePassword(password);
        if (!isValid) return done(null, false, { message: "Invalid email or password" });

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

app.use(flash());

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

app.use(async (req, res, next) => {
  try {
    if (!req.user) {
      res.locals.cartItemCount = 0;
      return next();
    }

    const cart = await Cart.findOne({ user: req.user._id }).select("items.quantity");
    res.locals.cartItemCount = cart ? cart.items.reduce((sum, item) => sum + (item.quantity || 0), 0) : 0;
    return next();
  } catch (err) {
    console.error("Cart count error:", err);
    res.locals.cartItemCount = 0;
    return next();
  }
});


app.get("/", (req, res) => res.redirect("/home"));
app.get("/home", (req, res) => res.render("index"));
app.get("/blogs", (req, res) => res.render("blogs"));
app.get("/about", (req, res) => res.render("about"));
app.get("/corporate", (req, res) => res.render("corporate"));

app.use("/auth", authRoutes);
app.use("/menu", menuRoutes);
app.use("/cart", cartRoutes);
app.use("/coupons", couponRoutes);
app.use("/orders", orderRoutes);
app.use("/restaurants", restaurantRoutes);
app.use("/user", userRoutes);

app.use(notFoundHandler);
app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log(`Listening on PORT: ${PORT}`);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
