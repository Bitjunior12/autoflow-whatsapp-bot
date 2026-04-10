const mongoose = require('mongoose');

const MaterielSchema = new mongoose.Schema({
  nom:         { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  prix:        { type: Number, required: true, min: 1 },
  stock:       { type: Number, required: true, min: 0 },
  image:       { type: String, default: null },
  actif:       { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Materiel', MaterielSchema);