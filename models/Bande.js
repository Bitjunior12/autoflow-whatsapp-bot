const mongoose = require('mongoose');

const BandeSchema = new mongoose.Schema({
  phone:        { type: String, required: true, index: true },
  race:         { type: String, required: true },
  nombreSujets: { type: Number, required: true },
  dateEntree:   { type: Date, required: true },
  actif:        { type: Boolean, default: true },
  notes:        { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Bande', BandeSchema);
