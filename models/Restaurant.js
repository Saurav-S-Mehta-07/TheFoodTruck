const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },

  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  description: {
    type: String,
    trim: true,
    maxlength: 500
  },

  address: {
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    pincode: {
      type: String,
      required: true
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },

  phone: {
    type: String,
    required: true,
    trim: true,
    match: [/^[0-9+\-\s()]+$/, 'Please enter a valid phone number']
  },

  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },

  operatingHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String }
  },

  cuisine: [String],

  imageUrl: String,

  isActive: {
    type: Boolean,
    default: true
  },

  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },

  deliveryRadius: {
    type: Number,
    default: 10, // in km
    min: 0
  },

  deliveryFee: {
    type: Number,
    default: 0,
    min: 0
  },

  minimumOrder: {
    type: Number,
    default: 0,
    min: 0
  }

}, { timestamps: true });

// Index for better query performance
restaurantSchema.index({ owner: 1 });
restaurantSchema.index({ "address.coordinates": "2dsphere" }); // For location-based queries

module.exports = mongoose.model("Restaurant", restaurantSchema);