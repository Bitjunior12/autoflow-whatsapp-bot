const mongoose = require('mongoose');

const CommandeSchema = new mongoose.Schema({
  produitType:  { type: String, enum: ['poussin','materiel','livraison'], required: true },
  produitId:    { type: mongoose.Schema.Types.ObjectId, required: true },
  produitNom:   { type: String, required: true },
  nom:          { type: String, required: true },
  telephone:    { type: String, required: true },
  quantite:     { type: Number, required: true },
  prixUnit:     { type: Number, required: true },
  total:        { type: Number, required: true },
  localisation: { type: String, required: true },
  message:      { type: String, default: '' },
  statut: {
    type: String,
    enum: ['en_attente','confirmee','livree','annulee'],
    default: 'en_attente'
  },
}, { timestamps: true });

module.exports = mongoose.model('Commande', CommandeSchema);