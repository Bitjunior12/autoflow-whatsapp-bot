const { sendWhatsAppMessage } = require('./whatsapp');
const { askClaude } = require('./claude');
const Subscription = require('../models/Subscription');
const Contact = require('../models/Contact');

// ============================================
// MESSAGES ONBOARDING J1 → J7
// ============================================

const messagesOnboarding = {

  J1: (prenom) => `🎉 Bienvenue dans la famille *Le Partenaire des Éleveurs* !

Bonjour ${prenom || 'cher éleveur'} ! Je suis vraiment content de t'avoir avec nous. 😊

Ton abonnement est maintenant actif. Voici comment bien démarrer :

📌 *Les commandes essentielles :*
- Tape *prophet* → enregistrer ta nouvelle bande
- Tape *suivi* → saisir mortalité/aliment/poids chaque jour
- Tape *photo* → diagnostic vétérinaire par image
- Tape *prix* → prix poussins et marché du jour
- Tape *menu* → voir toutes les options

Je suis là 24h/24 pour t'accompagner. N'hésite pas ! 💪`,

  J2: async (prenom) => {
    const conseil = await askClaude(
      `Donne un conseil pratique et concret pour un éleveur de poulets de chair débutant en Côte d'Ivoire. 
      Maximum 5 lignes. Ton chaleureux et encourageant. Commence par "💡 Conseil du jour :"`
    );
    return `Bonjour ${prenom || ''} ! 👋

${conseil}

N'oublie pas d'enregistrer ta bande avec la commande *prophet* si ce n'est pas encore fait. 🐥`;
  },

  J3: async (prenom) => {
    const conseil = await askClaude(
      `Donne un conseil sur la prophylaxie et les vaccins pour poulets de chair en Côte d'Ivoire.
      Maximum 5 lignes. Ton chaleureux. Commence par "💉 Santé de ta bande :"`
    );
    return `Bonjour ${prenom || ''} ! 🌅

${conseil}

Tu as des questions ? Tape simplement *menu* et choisis l'option qui te convient. 😊`;
  },

  J5: (prenom) => `Bonjour ${prenom || ''} ! 🤝

Je voulais juste prendre de tes nouvelles...

✅ Est-ce que tu as bien enregistré ta bande ? (*prophet*)
✅ Tu fais ton suivi journalier ? (*suivi*)
✅ Tu as testé le diagnostic par photo ? (*photo*)

Si tu as la moindre difficulté ou question, je suis là ! Tape *menu* ou écris-moi directement. 💬

Ton succès est notre mission. 🏆`,

  J7: (prenom) => `🎊 Ca fait déjà 1 semaine qu'on travaille ensemble ${prenom || ''} !

J'espère que le bot t'aide vraiment dans ton élevage. 🐔

🎁 *Programme Parrainage :*
Partage ton expérience avec un autre éleveur et s'il s'abonne en mentionnant ton nom, tu reçois *1 mois offert* sur ton prochain renouvellement !

Il suffit de lui dire de taper *menu* et de mentionner ton nom lors de l'abonnement.

Merci de faire partie de la communauté ! 🙏`

};

// ============================================
// DÉMARRER ONBOARDING D'UN NOUVEAU CLIENT
// ============================================

async function demarrerOnboarding(phone) {
  try {
    const sub = await Subscription.findOne({ phone, statut: 'actif' });
    if (!sub) return;

    sub.onboardingStartedAt = new Date();
    sub.onboardingJoursDone = [];
    await sub.save();

    console.log(`✅ Onboarding démarré pour ${phone}`);

    // Envoyer J1 immédiatement
    await envoyerMessageJour(phone, 1);

  } catch (err) {
    console.error('❌ Erreur démarrage onboarding :', err.message);
  }
}

// ============================================
// ENVOYER LE MESSAGE D'UN JOUR PRÉCIS
// ============================================

async function envoyerMessageJour(phone, jour) {
  try {
    const sub = await Subscription.findOne({ phone, statut: 'actif' });
    if (!sub) return;

    const contact = await Contact.findOne({ phone });
    const prenom = contact?.name?.split(' ')[0] || '';

    let message;
    if (jour === 1)      message = messagesOnboarding.J1(prenom);
    else if (jour === 2) message = await messagesOnboarding.J2(prenom);
    else if (jour === 3) message = await messagesOnboarding.J3(prenom);
    else if (jour === 5) message = messagesOnboarding.J5(prenom);
    else if (jour === 7) message = messagesOnboarding.J7(prenom);
    else return;

    await sendWhatsAppMessage(phone, message);

    if (!sub.onboardingJoursDone) sub.onboardingJoursDone = [];
    sub.onboardingJoursDone.push(jour);
    await sub.save();

    console.log(`✅ Onboarding J${jour} envoyé à ${phone}`);

  } catch (err) {
    console.error(`❌ Erreur onboarding J${jour} :`, err.message);
  }
}

// ============================================
// CRON — VÉRIFIER ET ENVOYER LES JOURS EN ATTENTE
// ============================================

async function verifierOnboardings() {
  try {
    const subs = await Subscription.find({
      statut: 'actif',
      onboardingStartedAt: { $exists: true }
    });

    const maintenant = new Date();
    const joursOnboarding = [1, 2, 3, 5, 7];

    for (const sub of subs) {
      const debut = new Date(sub.onboardingStartedAt);
      const joursDone = sub.onboardingJoursDone || [];

      for (const jour of joursOnboarding) {
        const dateEnvoi = new Date(debut);
        dateEnvoi.setDate(dateEnvoi.getDate() + (jour - 1));

        const dejaEnvoye = joursDone.includes(jour);
        const estTemps = maintenant >= dateEnvoi;

        if (!dejaEnvoye && estTemps) {
          await envoyerMessageJour(sub.phone, jour);
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }

  } catch (err) {
    console.error('❌ Erreur cron onboarding :', err.message);
  }
}

// ============================================
// REPRENDRE ONBOARDINGS APRÈS RESTART RENDER
// ============================================

async function reprendreOnboardingsEnCours() {
  console.log('🔄 Reprise des onboardings en cours...');
  await verifierOnboardings();
}

module.exports = {
  demarrerOnboarding,
  verifierOnboardings,
  reprendreOnboardingsEnCours
};