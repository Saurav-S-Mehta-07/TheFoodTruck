const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },

    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },

    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },

    minimumOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    maximumDiscount: {
      type: Number,
      default: null,
    },

    usageLimit: {
      type: Number,
      default: null,
    },

    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    validFrom: {
      type: Date,
      required: true,
    },

    validUntil: {
      type: Date,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    applicableMealTypes: [
      {
        type: String,
        enum: ["Breakfast", "Lunch", "Dinner", "Supper", "Brunch"],
      },
    ],
  },
  { timestamps: true }
);

// Keep non-duplicate indexes only
couponSchema.index({ restaurant: 1, validUntil: 1 });
couponSchema.index({ isActive: 1 });

couponSchema.virtual("isValid").get(function () {
  const now = new Date();
  return (
    this.isActive &&
    now >= this.validFrom &&
    now <= this.validUntil &&
    (this.usageLimit === null || this.usedCount < this.usageLimit)
  );
});

couponSchema.methods.canApply = function (orderAmount, mealType) {
  if (!this.isValid) return false;

  if (this.minimumOrderAmount > 0 && orderAmount < this.minimumOrderAmount) {
    return false;
  }

  if (this.applicableMealTypes.length > 0 && !this.applicableMealTypes.includes(mealType)) {
    return false;
  }

  return true;
};

couponSchema.methods.calculateDiscount = function (orderAmount) {
  let discount = 0;

  if (this.discountType === "percentage") {
    discount = (orderAmount * this.discountValue) / 100;
  } else {
    discount = this.discountValue;
  }

  if (this.maximumDiscount !== null && discount > this.maximumDiscount) {
    discount = this.maximumDiscount;
  }

  return Math.min(discount, orderAmount);
};

module.exports = mongoose.model("Coupon", couponSchema);
