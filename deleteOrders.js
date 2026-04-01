require("dotenv").config();
const mongoose = require("mongoose");
const Order = require("./models/Orders");

async function deleteAllOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Connected to MongoDB");

    const result = await Order.deleteMany({});
    console.log(`Deleted ${result.deletedCount} orders`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error deleting orders:", error);
  }
}

deleteAllOrders();