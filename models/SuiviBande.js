const mongoose = require("mongoose");

const suiviBandeSchema = new mongoose.Schema({
  phone:        { type: String, required: true },
  bandeNom:     { type: String, required: true },
  date:         { type: Date, default: Date.now },
  jourBande:    { type: Number },
  mortalite:    { type: Number, default: 0 },
  aliment:      { type: Number, default: 0 },
  poidsMoyen:   { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model("SuiviBande", suiviBandeSchema);