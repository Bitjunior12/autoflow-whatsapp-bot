const mongoose = require('mongoose');

const PoussinSchema = new mongoose.Schema({
  type:         { type: String, required: true },
  race:         { type: String, required: true, trim: true },
  age:          { type: String, required: true },
  localisation: { type: String, required: true },
  prix:         { type: Number, required: true, min: 1 },
  stock:        { type: Number, required: true, min: 0 },
  description:  { type: String, default: '' },
  image:        { type: String, default: null },
  actif:        { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Poussin', PoussinSchema);