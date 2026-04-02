// services/premium.js
const ADMIN_PHONES = ["2250102642080", "22502642080", "2250153217442", "22553217442"];
const Subscription = require("../models/Subscription");
const { sendWhatsAppMessage } = require("./whatsapp");

const LIMITES = {
  starter: { questions: 20, diagnostics: 5 },
  pro:     { questions: Infinity, diagnostics: Infinity },
  premium: { questions: Infinity, diagnostics: Infinity },
};

const TARIFS = {
  pro:     "15 000 FCFA/mois",
  premium: "25 000 FCFA/mois",
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
    if (ADMIN_PHONES.includes(phone)) return true;
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
      if (ADMIN_PHONES.includes(phone)) {
    return { peut: true, restantes: Infinity, limite: Infinity };
  }
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
    if (ADMIN_PHONES.includes(phone)) {
    return { peut: true, restantes: Infinity, limite: Infinity };
  }
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
// Vérification et alertes renouvellement
async function verifierRenouvellements() {
  try {
    const maintenant = new Date();

    // J-7
    const j7 = new Date(maintenant);
    j7.setDate(j7.getDate() + 7);

    // J-3
    const j3 = new Date(maintenant);
    j3.setDate(j3.getDate() + 3);

    // J+1 (expirés hier)
    const j1 = new Date(maintenant);
    j1.setDate(j1.getDate() - 1);

    const abonnements = await Subscription.find({
      plan: { $in: ["pro", "premium"] },
      statut: "actif"
    });

    for (const sub of abonnements) {
      if (!sub.dateFin) continue;

      const fin = new Date(sub.dateFin);
      const diffJours = Math.ceil((fin - maintenant) / (1000 * 60 * 60 * 24));

      // Alerte J-7
      if (diffJours === 7 && !sub.alerteJ7Envoyee) {
        await sendWhatsAppMessage(sub.phone,
          `⏰ *Votre abonnement ${sub.plan.toUpperCase()} expire dans 7 jours*\n\n` +
          `📅 Date d'expiration : *${fin.toLocaleDateString("fr-FR")}*\n\n` +
          `Pour continuer à profiter de :\n` +
          `✓ Questions expert illimitées\n` +
          `✓ Diagnostics illimités\n` +
          `✓ Calendrier prophylaxie\n\n` +
          `👉 Contactez-nous pour renouveler :\n` +
          `📞 *+225 01 02 64 20 80*\n` +
          `↩️ Tapez *upgrade* pour voir les offres`
        );
        await Subscription.updateOne({ _id: sub._id }, { alerteJ7Envoyee: true });
        console.log(`✅ Alerte J-7 envoyée à ${sub.phone}`);
      }

      // Alerte J-3
      if (diffJours === 3 && !sub.alerteJ3Envoyee) {
        await sendWhatsAppMessage(sub.phone,
          `🚨 *Plus que 3 jours !*\n\n` +
          `Votre abonnement ${sub.plan.toUpperCase()} expire le *${fin.toLocaleDateString("fr-FR")}*\n\n` +
          `⚠️ Après cette date vous perdrez accès à :\n` +
          `✗ Questions expert illimitées\n` +
          `✗ Diagnostics illimités\n` +
          `✗ Alertes prophylaxie automatiques\n\n` +
          `🔄 *Renouvelez maintenant pour ne rien perdre :*\n` +
          `📞 *+225 01 02 64 20 80*\n` +
          `👉 Tapez *upgrade* pour les offres`
        );
        await Subscription.updateOne({ _id: sub._id }, { alerteJ3Envoyee: true });
        console.log(`✅ Alerte J-3 envoyée à ${sub.phone}`);
      }

      // Alerte J0 — jour d'expiration
      if (diffJours === 0 && !sub.alerteJ0Envoyee) {
        await sendWhatsAppMessage(sub.phone,
          `❗ *Votre abonnement expire aujourd'hui*\n\n` +
          `C'est votre dernière chance de renouveler sans interruption de service.\n\n` +
          `📞 Appelez-nous maintenant : *+225 01 02 64 20 80*\n` +
          `👉 Tapez *upgrade* pour voir les offres\n\n` +
          `_Renouvelez avant minuit pour éviter toute interruption_`
        );
        await Subscription.updateOne({ _id: sub._id }, { alerteJ0Envoyee: true });
        console.log(`✅ Alerte J0 envoyée à ${sub.phone}`);
      }

      // Rétrogradation automatique — abonnement expiré
      if (diffJours < 0 && sub.statut === "actif") {
        await Subscription.updateOne(
          { _id: sub._id },
          { plan: "starter", statut: "expiré" }
        );
        await sendWhatsAppMessage(sub.phone,
          `😔 *Votre abonnement ${sub.plan.toUpperCase()} a expiré*\n\n` +
          `Vous êtes maintenant sur le plan Starter (gratuit).\n\n` +
          `🔄 *Pour vous réabonner :*\n` +
          `👉 Tapez *upgrade*\n` +
          `📞 *+225 01 02 64 20 80*\n\n` +
          `Nous espérons vous retrouver bientôt ! 🙏`
        );

        // Notifier le conseiller
        const CONSEILLER_PHONE = process.env.CONSEILLER_PHONE;
        if (CONSEILLER_PHONE) {
          await sendWhatsAppMessage(CONSEILLER_PHONE,
            `⚠️ *ABONNEMENT EXPIRÉ !*\n\n` +
            `📱 Client : +${sub.phone}\n` +
            `⭐ Plan : ${sub.plan.toUpperCase()}\n` +
            `📅 Expiré le : ${fin.toLocaleDateString("fr-FR")}\n\n` +
            `🔥 À relancer immédiatement pour récupérer ce client !`
          );
        }
        console.log(`✅ Rétrogradation automatique : ${sub.phone}`);
      }
    }
  } catch (err) {
    console.error("❌ Erreur vérification renouvellements :", err.message);
  }
}
module.exports = {
  getOrCreateSubscription,
  isPremium,
  peutPoserQuestion,
  peutFaireDiagnostic,
  messageUpgrade,
  activerAbonnement,
  verifierRenouvellements
};