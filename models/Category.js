const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },

  slug: {
    type: String,
    unique: true,
    lowercase: true
  },

  imageUrl: String,

  isActive: {
    type: Boolean,
    default: true
  }

}, { timestamps: true });

// Generate slug from name before saving
categorySchema.pre("save", function(next) {
  if (this.isModified("name") || this.isNew) {
    this.slug = this.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  }
  next();
});

module.exports = mongoose.model("Category", categorySchema);
