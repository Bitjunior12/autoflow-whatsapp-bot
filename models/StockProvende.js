const mongoose = require("mongoose");

const stockProvendeSchema = new mongoose.Schema({
  phone:        { type: String, required: true },
  bandeNom:     { type: String, required: true },
  date:         { type: Date, default: Date.now },
  type:         { type: String, enum: ["achat", "consommation"], required: true },
  quantite:     { type: Number, required: true }, // en kg
  prixUnitaire: { type: Number, default: 0 },     // FCFA/kg
  fournisseur:  { type: String, default: "" },
  notes:        { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("StockProvende", stockProvendeSchema);