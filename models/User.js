const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  nom:          { type: String, required: true },
  telephone:    { type: String, required: true, unique: true },
  type:         { type: String, enum: ['Éleveur', 'Vendeur', 'Recruteur', 'Technicien'], required: true },
  region:       { type: String, required: true },
  actif:        { type: Boolean, default: false },
  code:         { type: String, default: null },
  codeExpire:   { type: Date,   default: null },
  codeTentatives: { type: Number, default: 0 },
  dateInscription: { type: Date, default: Date.now },
  dernierAcces: { type: Date,   default: null },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);