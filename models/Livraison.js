const mongoose = require('mongoose');

const LivraisonSchema = new mongoose.Schema({
  type:              { type: String, required: true },
  race:              { type: String, required: true, trim: true },
  quantite:          { type: Number, required: true, min: 1 },
  prix:              { type: Number, required: true, min: 1 },
  dateDisponibilite: { type: String, required: true },
  lieu:              { type: String, required: true },
  image:             { type: String, default: null },
  actif:             { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Livraison', LivraisonSchema);