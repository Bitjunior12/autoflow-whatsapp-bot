const mongoose = require("mongoose");

const prixMarcheSchema = new mongoose.Schema({
  produit:    { type: String, required: true },
  prix:       { type: Number, required: true },
  unite:      { type: String, default: "FCFA/kg" },
  ville:      { type: String, default: "Abidjan" },
  updatedBy:  { type: String, default: "Admin" },
}, { timestamps: true });

module.exports = mongoose.model("PrixMarche", prixMarcheSchema);