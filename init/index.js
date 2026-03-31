require("dotenv").config({ path: "../.env" });

const mongoose = require("mongoose");
const MenuItem = require("../models/MenuItem");
const Category = require("../models/Category");

const { categoriesData, menuData } = require("./data");

const dbURL = process.env.MONGODB_URL;

async function main() {
  try {
    await mongoose.connect(dbURL);
    console.log("✅ MongoDB Connected");

    // Clear old data
    await Category.deleteMany({});
    await MenuItem.deleteMany({});
    console.log("🗑 Old data cleared");

    // Insert categories
    const insertedCategories = await Category.insertMany(categoriesData);
    console.log("✅ Categories inserted");

    // Create category map (name → ObjectId)
    const categoryMap = {};
    insertedCategories.forEach(cat => {
      categoryMap[cat.name] = cat._id;
    });

    // Attach ObjectId to menu items
    const finalMenuData = menuData.map(item => ({
      ...item,
      category: categoryMap[item.categoryName]
    }));

    // Remove helper field
    finalMenuData.forEach(item => delete item.categoryName);

    // Insert menu items
    await MenuItem.insertMany(finalMenuData);
    console.log("✅ Menu items inserted");

  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 DB connection closed");
  }
}

main();
