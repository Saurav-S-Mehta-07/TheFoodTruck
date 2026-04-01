const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MenuItem",
    required: true
  },

  restaurant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Restaurant",
    required: true
  },

  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },

  comment: {
    type: String,
    trim: true,
    maxlength: 500
  }

}, { timestamps: true });

// Index for better query performance
reviewSchema.index({ menuItem: 1, user: 1 }, { unique: true }); // One review per user per item
reviewSchema.index({ restaurant: 1, rating: -1 });

module.exports = mongoose.model("Review", reviewSchema);