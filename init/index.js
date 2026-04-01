require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const MenuItem = require("../models/MenuItem");
const Category = require("../models/Category");
const User = require("../models/Users");
const Restaurant = require("../models/Restaurant");

const { categoriesData, restaurantData, menuData } = require("./data");

const dbURL = process.env.MONGODB_URL;

async function ensureUser({ name, email, password, role }) {
  let user = await User.findOne({ email });
  if (!user) {
    user = new User({ name, email, password, role });
    await user.save();
    console.log(`? Seed user created: ${email} / ${password}`);
  }
  return user;
}

async function main() {
  try {
    await mongoose.connect(dbURL);
    console.log("? MongoDB Connected");

    // Clear old data
    await Category.deleteMany({});
    await MenuItem.deleteMany({});
    await Restaurant.deleteMany({});
    console.log("?? Old data cleared");

    // Ensure admin + owner users for portals
    await ensureUser({
      name: "Admin User",
      email: "admin@foodtruck.com",
      password: "admin123",
      role: "admin",
    });

    const ownerUser = await ensureUser({
      name: "Restaurant Owner",
      email: "owner@foodtruck.com",
      password: "owner123",
      role: "owner",
    });

    // Insert categories
    const insertedCategories = await Category.insertMany(categoriesData);
    console.log("? Categories inserted");

    // Insert restaurant owned by owner user
    const restaurantWithOwner = restaurantData.map((restaurant) => ({
      ...restaurant,
      owner: ownerUser._id,
    }));
    const insertedRestaurant = await Restaurant.insertMany(restaurantWithOwner);
    console.log("? Restaurant inserted for owner@foodtruck.com");

    // Create category map (name -> ObjectId)
    const categoryMap = {};
    insertedCategories.forEach((cat) => {
      categoryMap[cat.name] = cat._id;
    });

    // Attach ObjectId to menu items
    const finalMenuData = menuData.map((item) => ({
      ...item,
      category: categoryMap[item.categoryName],
      restaurant: insertedRestaurant[0]._id,
    }));

    // Remove helper field
    finalMenuData.forEach((item) => delete item.categoryName);

    // Insert menu items
    await MenuItem.insertMany(finalMenuData);
    console.log("? Menu items inserted");
  } catch (err) {
    console.error("? Error:", err);
  } finally {
    await mongoose.connection.close();
    console.log("?? DB connection closed");
  }
}

main();
