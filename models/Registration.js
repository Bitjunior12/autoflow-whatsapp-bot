const mongoose = require("mongoose");

const RegistrationSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ["formation", "decem"],
    required: true,
  },
  ville: { type: String, default: "" },
  profil: { type: String, default: "" }, // diaspora ou CI
  status: {
    type: String,
    enum: ["en_attente", "confirmée", "annulée"],
    default: "en_attente",
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Registration", RegistrationSchema);