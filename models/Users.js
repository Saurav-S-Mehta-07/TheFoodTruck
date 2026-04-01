const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"]
  },

  password: {
    type: String,
    required: true,
    minlength: 6
  },

  phone: {
    type: String,
    trim: true,
    match: [/^[0-9+\-\s()]+$/, "Please enter a valid phone number"]
  },

  address: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },

  role: {
    type: String,
    enum: ["user", "admin", "owner"],
    default: "user"
  },

  // Lightweight personalization store: categoryId -> click count
  preferredCategoryClicks: {
    type: Map,
    of: Number,
    default: {}
  }

}, { timestamps: true });

// Hash password before saving
userSchema.pre("save", async function() {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
