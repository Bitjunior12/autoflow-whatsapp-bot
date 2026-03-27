const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  name: { type: String, default: "Inconnu" },
  type: { type: String, default: "poussins" },
  race: { type: String, required: true },
  quantity: { type: Number, required: true },
  totalPrice: { type: Number },
  status: {
    type: String,
    enum: ["en_attente", "confirmée", "annulée"],
    default: "en_attente",
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", OrderSchema);