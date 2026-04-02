const mongoose = require("mongoose");

const RegistrationSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ["formation", "devis"],
    required: true,
  },
  ville: { type: String, default: "" },
  profil: { type: String, default: "" },
  superficie: { type: String, default: "" },
  sujets: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["en_attente", "confirmée", "annulée"],
    default: "en_attente",
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Registration", RegistrationSchema);