require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const app = express();
const PORT = 8080;
const path = require("path");

const MenuItem = require("./models/MenuItem");

// MongoDB connection
mongoose.connect(process.env.MONGODB_URL)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ DB Error:", err));

// EJS setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.get("/", (req, res) => {
  res.redirect("/home");
});

app.get("/home", (req, res) => {
  res.render("index");
});

app.get("/blogs", (req, res) => {
  res.render("blogs");
});

app.get("/about", (req, res) => {
  res.render("about");
});

app.get("/corporate", (req, res) => {
  res.render("corporate");
});

// 🔥 Dynamic Menu Route (important)
app.get("/menu", async (req, res) => {
  try {
    const menuItems = await MenuItem.find();
    console.log(menuItems);
    res.render("menu", { menuItems });
  } catch (err) {
    console.log(err);
    res.send("Error loading menu");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Listening on PORT: ${PORT}`);
});
