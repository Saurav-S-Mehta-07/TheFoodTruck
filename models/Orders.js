const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  items: [
    {
      title: String,
      price: Number,
      quantity: Number,
      menuItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MenuItem"
      }
    }
  ],

  totalAmount: Number,

  status: {
    type: String,
    enum: ["pending", "preparing", "delivered", "cancelled"],
    default: "pending"
  },

  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },

  paymentMethod: {
    type: String,
    enum: ["cod", "online"]
  }

}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
