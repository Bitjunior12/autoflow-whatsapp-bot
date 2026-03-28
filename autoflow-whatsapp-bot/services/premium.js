// services/premium.js
const Subscription = require("../models/Subscription");
const { sendWhatsAppMessage } = require("./whatsapp");

const LIMITES = {
  starter: { questions: 10, diagnostics: 3 },
  pro:     { questions: Infinity, diagnostics: Infinity },
  premium: { questions: Infinity, diagnostics: Infinity },
};

const TARIFS = {
  pro:     "15 000 FCFA/mois",
  premium: "35 000 FCFA/mois",
};

// Récupère ou crée l'abonnement d'un utilisateur
async function getOrCreateSubscription(phone) {
  let sub = await Subscription.findOne({ phone });
  if (!sub) {
    sub = await Subscription.create({ phone, plan: "starter" });
  }
  return sub;
}

// Vérifie si l'abonnement est encore valide
async function isPremium(phone) {
  const sub = await getOrCreateSubscription(phone);
  if (sub.plan === "starter") return false;
  if (sub.statut !== "actif") return false;
  if (sub.dateFin && sub.dateFin < new Date()) {
    await Subscription.updateOne({ phone }, { statut: "expiré" });
    return false;
  }
  return true;
}

// Vérifie le compteur questions et reset si nouveau mois
async function peutPoserQuestion(phone) {
  const sub = await getOrCreateSubscription(phone);
  const limite = LIMITES[sub.plan].questions;
  
  // Reset mensuel
  if (new Date() >= sub.questionResetDate) {
    const nextReset = new Date();
    nextReset.setDate(1);
    nextReset.setMonth(nextReset.getMonth() + 1);
    await Subscription.updateOne({ phone }, { 
      questionCount: 0, 
      questionResetDate: nextReset 
    });
    return { peut: true, restantes: limite - 1, limite };
  }

  if (sub.questionCount >= limite) {
    return { peut: false, restantes: 0, limite, plan: sub.plan };
  }

  await Subscription.updateOne({ phone }, { $inc: { questionCount: 1 } });
  const restantes = limite - (sub.questionCount + 1);
  return { peut: true, restantes, limite };
}

// Vérifie le compteur diagnostics
async function peutFaireDiagnostic(phone) {
  const sub = await getOrCreateSubscription(phone);
  const limite = LIMITES[sub.plan].diagnostics;

  if (new Date() >= sub.diagnosticResetDate) {
    const nextReset = new Date();
    nextReset.setDate(1);
    nextReset.setMonth(nextReset.getMonth() + 1);
    await Subscription.updateOne({ phone }, { 
      diagnosticCount: 0, 
      diagnosticResetDate: nextReset 
    });
    return { peut: true, restantes: limite - 1, limite };
  }

  if (sub.diagnosticCount >= limite) {
    return { peut: false, restantes: 0, limite, plan: sub.plan };
  }

  await Subscription.updateOne({ phone }, { $inc: { diagnosticCount: 1 } });
  const restantes = limite - (sub.diagnosticCount + 1);
  return { peut: true, restantes, limite };
}

// Message affiché quand la limite est atteinte
function messageUpgrade(type) {
  const typeLabel = type === "question" ? "questions expert" : "diagnostics";
  return `⭐ *Limite ${typeLabel} atteinte*

Vous avez utilisé toutes vos utilisations gratuites ce mois-ci.

🚀 *Passez au plan Pro pour continuer :*
✓ Questions expert illimitées
✓ Diagnostics illimités
✓ Calendrier de prophylaxie
✓ Suivi de bande actif
💰 *${TARIFS.pro}* seulement

👉 Tapez *upgrade* pour être contacté par un conseiller
↩️ Tapez *menu* pour revenir au menu principal`;
}

// Active un abonnement manuellement (appelé par dashboard ou admin)
async function activerAbonnement(phone, plan, dureeJours = 30, name = "") {
  const dateFin = new Date();
  dateFin.setDate(dateFin.getDate() + dureeJours);
  
  await Subscription.findOneAndUpdate(
    { phone },
    { plan, statut: "actif", dateDebut: new Date(), dateFin, name },
    { upsert: true, new: true }
  );
}

module.exports = {
  getOrCreateSubscription,
  isPremium,
  peutPoserQuestion,
  peutFaireDiagnostic,
  messageUpgrade,
  activerAbonnement
};