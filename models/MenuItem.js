const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true
  },

  foodType: {
    type: String,
    enum: ["veg", "non-veg"],
    required: true
  },

  description: String,

  price: {
    type: Number,
    required: true
  },

  originalPrice: Number,

  calories: Number,

  imageUrl: String,

  tags: [String],

  customizable: {
    type: Boolean,
    default: false
  },

  isAvailable: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

module.exports = mongoose.model("MenuItem", menuItemSchema);
