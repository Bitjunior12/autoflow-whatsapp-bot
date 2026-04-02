const mongoose = require('mongoose');

const ProfilSchema = new mongoose.Schema({
  nom:          { type: String, required: true },
  telephone:    { type: String, required: true },
  specialite:   { type: String, required: true },
  region:       { type: String, required: true },
  experience:   { type: String, required: true },
  contrat:      { type: String, required: true },
  salaire:      { type: String, default: 'À négocier' },
  disponibilite:{ type: String, required: true },
  description:  { type: String, default: '' },
  certifieLPE:  { type: Boolean, default: false },
  verified:      { type: Boolean, default: false },
  featured:     { type: Boolean, default: false },
  locked:       { type: Boolean, default: false },
  photoUrl:     { type: String, default: null },
  boosted:      { type: Boolean, default: false },
  boostLabel:   { type: String,  default: null },
  boostDays:    { type: Number,  default: 0 },
  boostExpire:  { type: Date,    default: null },
  boosted:      { type: Boolean, default: false },
  boostLabel:   { type: String,  default: null },
  boostDays:    { type: Number,  default: 0 },
  boostExpire:  { type: Date,    default: null },
  whatsappId:   { type: String, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Profil', ProfilSchema);