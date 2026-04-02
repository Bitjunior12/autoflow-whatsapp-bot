const mongoose = require('mongoose');

const OffreSchema = new mongoose.Schema({
  ferme:        { type: String, required: true },
  telephone:    { type: String, required: true },
  poste:        { type: String, required: true },
  region:       { type: String, required: true },
  contrat:      { type: String, required: true },
  salaire:      { type: String, default: 'À négocier' },
  effectif:     { type: String, default: '' },
  description:  { type: String, default: '' },
  verified:     { type: Boolean, default: false },
  photoUrl:     { type: String, default: null },
  whatsappId:   { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Offre', OffreSchema);