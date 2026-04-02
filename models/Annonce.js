const mongoose = require('mongoose');

const AnnonceSchema = new mongoose.Schema({
  nom:         { type: String, required: true },
  telephone:   { type: String, required: true },
  type:        { type: String, required: true },
  region:      { type: String, required: true },
  quantite:    { type: Number, required: true },
  prix:        { type: Number, required: true },
  poids:       { type: String, default: 'N/D' },
  description: { type: String, default: '' },
  mediaUrl:    { type: String, default: null },
  mediaType:   { type: String, default: null },
  verified:    { type: Boolean, default: false },
  locked:      { type: Boolean, default: false },
  boosted:     { type: Boolean, default: false },
  boostLabel:  { type: String, default: null },
  boostDays:   { type: Number, default: 0 },
  boostExpire: { type: Date,   default: null },
  whatsappId:  { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Annonce', AnnonceSchema);