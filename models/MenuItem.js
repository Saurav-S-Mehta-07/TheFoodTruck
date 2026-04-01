const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },

  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true
  },

  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    required: true
  },

  foodType: {
    type: String,
    enum: ["veg", "non-veg"],
    required: true
  },

  description: {
    type: String,
    trim: true,
    maxlength: 500
  },

  price: {
    type: Number,
    required: true,
    min: 0
  },

  originalPrice: {
    type: Number,
    min: 0
  },

  calories: {
    type: Number,
    min: 0
  },

  imageUrl: String,

  tags: [String],

  customizable: {
    type: Boolean,
    default: false
  },

  isAvailable: {
    type: Boolean,
    default: true
  },

  orderCount: {
    type: Number,
    default: 0,
    min: 0
  }

}, { timestamps: true });

// Index for better query performance
menuItemSchema.index({ restaurant: 1, category: 1, isAvailable: 1 });
menuItemSchema.index({ title: 'text', description: 'text' });
menuItemSchema.index({ orderCount: -1 });

module.exports = mongoose.model("MenuItem", menuItemSchema);
