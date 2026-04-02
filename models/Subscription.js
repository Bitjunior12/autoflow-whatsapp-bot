// models/Subscription.js
const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  name:  { type: String },
  plan:  { 
    type: String, 
    enum: ["starter", "pro", "premium"], 
    default: "starter" 
  },
  statut: { 
    type: String, 
    enum: ["actif", "expiré", "suspendu"], 
    default: "actif" 
  },
  dateDebut:  { type: Date, default: Date.now },
  dateFin:    { type: Date },
  questionCount: { type: Number, default: 0 },
  questionResetDate: { type: Date, default: () => {
    const d = new Date();
    d.setDate(1); // reset le 1er du mois
    d.setMonth(d.getMonth() + 1);
    return d;
  }},
  diagnosticCount: { type: Number, default: 0 },
  diagnosticResetDate: { type: Date, default: () => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    return d;
  }},
  alerteJ7Envoyee: { type: Boolean, default: false },
  alerteJ3Envoyee: { type: Boolean, default: false },
  alerteJ0Envoyee: { type: Boolean, default: false },
  onboardingStartedAt: { type: Date },
  onboardingJoursDone: { type: [Number], default: [] }
}, { timestamps: true });

module.exports = mongoose.model("Subscription", subscriptionSchema);