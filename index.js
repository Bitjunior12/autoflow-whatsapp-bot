require("dotenv").config();
const express = require("express");
const path = require("path");
const connectDB = require("./config/database");
const { sendWhatsAppMessage, sendWhatsAppPDF } = require("./services/whatsapp");
const { generateDevisPDF } = require("./services/pdf");
const Contact = require("./models/Contact");
const Order = require("./models/Order");
const Registration = require("./models/Registration");
const { setSession, getSession, clearSession } = require("./services/session");
const { askClaude } = require("./services/claude");
const mongoose = require('mongoose');
const magasinRoute  = require('./routes/magasin');
const { uploadImageFromBase64 } = require('./services/cloudinary');
const { buildHealthReport } = require("./services/health");
const { requireAdmin: verifierAdmin } = require("./services/adminAuth");
const { MENU_PRINCIPAL, MENU_DEBUTANT, MENU_CONSEILLER } = require("./services/botMenus");
const User = require('./models/User');
const relanceTimers = {};
const APP_STARTED_AT = new Date();
const app = express();
app.use(express.json());
app.set('trust proxy', 1);
app.use('/magasin', magasinRoute);
app.use(express.static('public'));
app.get("/api/health", (req, res) => {
  const report = buildHealthReport({ startedAt: APP_STARTED_AT, relanceTimers });
  const statusCode = report.status === "ok" ? 200 : 503;
  res.status(statusCode).json(report);
});

app.get("/api/health/details", (req, res) => {
  const report = buildHealthReport({
    startedAt: APP_STARTED_AT,
    relanceTimers,
    includeDetails: true
  });
  const statusCode = report.status === "ok" ? 200 : 503;
  res.status(statusCode).json(report);
});
    // ============================================
    // RATE LIMITING — ANTI SPAM
    // ============================================
    const rateLimit = require('express-rate-limit');

    const limiterGlobal = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: { error: 'Trop de requêtes, réessaie dans 15 minutes.' }
    });

    const limiterWebhook = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      message: { error: 'Trop de requêtes webhook.' }
    });

    app.use('/webhook', limiterWebhook);
    app.use('/api', limiterGlobal);
    const PORT = process.env.PORT || 3000;
connectDB();

// ==============================
// MESSAGES DU MENU
// ==============================

const FORMATION = `🎓 *FORMATION EN AVICULTURE*

📅 *Quand ?* Chaque mois du 1er à la fin du mois
💰 *Coût :* 85 000 FCFA

✅ *Ce que vous obtenez :*
✓ Supports vidéos
✓ Support numérique _(La Boussole de l'Éleveur)_
✓ Certificat de participation
✓ Accompagnement pour votre mise en place
✓ Accès à notre WhatsApp Assistance 24H/24
✓ _(Optionnel)_ Nous pouvons être votre fournisseur en matériels et poussins

💬 *Souhaitez-vous vous inscrire ?*
👉 Tapez *oui* pour vous inscrire
👉 Tapez *non* pour revenir au menu`;

const MATERIELS = `🏪 *MATÉRIELS D'ÉLEVAGE DISPONIBLES*
📍 Nos magasins à *Yopougon*

💧 *ABREUVOIRS*
- Automatique Jumbo → 11 000 FCFA
- Avec pied 11L → 4 500 FCFA
- Avec pied 6L → 3 000 FCFA
- Sans pied 11L → 4 300 FCFA
- Sans pied 6L → 2 500 FCFA
- Conique 5L → 1 800 FCFA

🍽️ *MANGEOIRES*
- Mangeoire démarrage → 1 500 FCFA
- Anti-gaspillage (tête jaune) → 2 500 FCFA
- Métallique → 1 700 FCFA

🔥 *CHAUFFAGE*
- Fourneau de chauffage → 8 000 FCFA

📲 Pour commander :
👉 Tapez *contact* pour parler à un conseiller

↩️ Tapez *menu* pour revenir au menu principal`;

const MENU_DEVIS = `📋 *DEMANDE DE DEVIS*
_Le Partenaire des Éleveurs_

Choisissez le type de devis :

1️⃣ Devis Bâtiment avicole
2️⃣ Devis Complet _(Bâtiment + Matériels + Poussins)_

↩️ Tapez *menu* pour annuler`;

const DEVIS_BATIMENT_INFO = `🏗️ *DEVIS BÂTIMENT AVICOLE*
_Le Partenaire des Éleveurs_

Vous souhaitez construire un bâtiment avicole professionnel et adapté à votre projet ?

✅ *Nous prenons en compte :*
✓ La capacité d'accueil (nombre de sujets)
✓ Le type de production (chair / ponte / mixte)
✓ Les normes de ventilation et biosécurité
✓ Les matériaux adaptés au climat ivoirien
✓ L'orientation optimale du bâtiment

📋 *Notre devis inclut :*
✓ Plan d'implantation
✓ Estimation des coûts de construction
✓ Recommandations techniques

💬 Répondez simplement aux questions suivantes et un technicien vous contactera sous *24h* avec votre devis personnalisé.

📝 *Modèle de réponses :*
- Nom complet
- Superficie du terrain (en m²)
- Race de poussins souhaitée
- Nombre de poussins

👤 *Commençons ! Quel est votre nom complet ?*`;

const DEVIS_COMPLET_INFO = `📦 *DEVIS COMPLET DÉMARRAGE ÉLEVAGE*
_Le Partenaire des Éleveurs_

Vous voulez démarrer votre élevage de A à Z ?
Nous vous proposons une solution clé en main :

✅ *Le devis complet comprend :*

🏗️ *Bâtiment*
✓ Construction ou réhabilitation
✓ Adapté à votre capacité et budget

🍽️ *Matériels d'élevage*
✓ Abreuvoirs, mangeoires, chauffage
✓ Matériels de biosécurité

🐥 *Poussins*
✓ Race adaptée à votre objectif
✓ Provenance certifiée

📋 *En plus :*
✓ Programme d'alimentation
✓ Calendrier de prophylaxie
✓ Accompagnement au démarrage

💬 Répondez simplement aux questions suivantes et un technicien vous contactera sous *24h* avec votre devis personnalisé.

📝 *Modèle de réponses :*
- Nom complet
- Superficie du terrain (en m²)
- Race de poussins souhaitée
- Nombre de poussins

👤 *Commençons ! Quel est votre nom complet ?*`;

const CONTACT = `📞 *CONTACTEZ-NOUS*

👤 *Le Partenaire des Éleveurs*
📍 Yopougon, Abidjan — Côte d'Ivoire 🇨🇮

📱 WhatsApp / Appel :
👉 *+225 01 02 64 20 80*

🕐 Disponible *24H/24* sur WhatsApp

↩️ Tapez *menu* pour revenir au menu principal`;
const MENU_MATERIELS_CHOIX = `🏪 *QUE RECHERCHEZ-VOUS ?*
_Le Partenaire des Éleveurs_

1️⃣ Abreuvoirs
2️⃣ Mangeoires
3️⃣ Chauffage
4️⃣ Pack complet (tout)

Tapez le *numéro* de votre choix
↩️ Tapez *menu* pour annuler`;
const MENU_ESTIMATION = `📊 *ESTIMER MES COÛTS & BÉNÉFICES*
_Le Partenaire des Éleveurs_

Quel type de production souhaitez-vous estimer ?

1️⃣ Poulets de chair
2️⃣ Poules pondeuses

Tapez le *numéro* de votre choix
↩️ Tapez *menu* pour annuler`;
const PRESENTATION_FORMATION = `🎓 *FORMATION EN AVICULTURE PROFESSIONNELLE*
_Le Partenaire des Éleveurs_

✅ *Ce que vous apprendrez :*
✓ Bases de l'aviculture moderne
✓ Choix des races et des poussins
✓ Alimentation et prophylaxie
✓ Gestion sanitaire et maladies
✓ Rentabilité et gestion financière
✓ Construction et aménagement du bâtiment

📦 *Ce que vous recevez :*
✓ Supports vidéos complets
✓ La Boussole de l'Éleveur _(guide numérique)_
✓ Certificat de participation
✓ Accompagnement mise en place
✓ Accès WhatsApp Assistance 24H/24

📅 *Quand ?* Chaque mois
💰 *Coût :* 85 000 FCFA

👉 *Quel est votre niveau actuel ?*

1️⃣ Débutant complet
2️⃣ J'ai déjà un élevage
3️⃣ Je veux me perfectionner

↩️ Tapez *menu* pour annuler`;
const MESSAGE_INCONNU = `❓ Je n'ai pas compris votre message.

Tapez un numéro pour choisir une option ou posez-moi une question directement.

↩️ Tapez *menu* pour voir le menu principal
⬅️ Tapez *retour* pour revenir à l'étape précédente`;

// ==============================
// TUNNEL COMMANDE POUSSINS
// ==============================

const PRIX_POUSSINS = {
  "1": { race: "Chairs Blanc", prix: 650 },
  "2": { race: "Chairs Roux", prix: 600 },
  "3": { race: "Hybrides", prix: 450 },
  "4": { race: "Pintadeaux Galor", prix: 1100 },
  "5": { race: "Pontes ISA Brown", prix: 1150 },
  "6": { race: "Bleu Hollande", prix: 400 },
  "7": { race: "Coquelet Blanc", prix: 150 },
  "8": { race: "Pintadeaux Hybrides", prix: 900 },
};

const MENU_RACES = `🐥 *CHOISISSEZ LA RACE*

1️⃣ Chairs Blanc → 650 FCFA/unité
2️⃣ Chairs Roux → 600 FCFA/unité
3️⃣ Hybrides → 450 FCFA/unité
4️⃣ Pintadeaux Galor → 1 100 FCFA/unité
5️⃣ Pontes ISA Brown → 1 150 FCFA/unité
6️⃣ Bleu Hollande → 400 FCFA/unité
7️⃣ Coquelet Blanc → 150 FCFA/unité
8️⃣ Pintadeaux Hybrides → 900 FCFA/unité

Tapez le *numéro* de votre choix
↩️ Tapez *menu* pour annuler`;

// ==============================
// FONCTIONS UTILITAIRES
// ==============================

function isSmartQuestion(message) {
  const msg = message.toLowerCase();
  const commandesSpeciales = [];
  if (commandesSpeciales.includes(msg.trim())) return false;
  const keywords = [
    "quoi", "comment", "pourquoi", "différence",
    "combien", "conseil", "expliquer",
    "c'est quoi", "avantage", "inconvénient"
  ];
  return keywords.some(word => msg.includes(word));
}

function isHotLead(message) {
  const msg = message.toLowerCase();
  const keywords = [
    "je veux", "je suis intéressé", "je veux commencer",
    "je veux acheter", "comment acheter", "je commande",
    "je veux des poussins", "je veux un devis"
  ];
  return keywords.some(word => msg.includes(word));
}

function getChoiceLabel(text) {
  const msg = text.trim().toLowerCase();
  if (["1", "formation"].includes(msg)) return "Formation en aviculture";
  if (["2", "poussin", "poussins"].includes(msg)) return "Achat de poussins";
  if (["3", "materiel", "matériels"].includes(msg)) return "Matériels d'élevage";
  if (["4", "devis"].includes(msg)) return "Demande de devis";
  if (["contact"].includes(msg)) return "Demande de contact";
  return "Autre";
}
// ==============================
// LOGIQUE DE RÉPONSE
// ==============================
async function parseNumberOrAsk(text, session, contextLabel, exemple) {
  const val = parseFloat(text.trim().replace(/\s/g, "").replace(",", "."));
  if (!isNaN(val) && val >= 0) return { valeur: val, question: false };
  if (isSmartQuestion(text) || text.length > 8) {
    const reponse = await askClaude(
      `Contexte: l'éleveur est en train de ${contextLabel}. Il pose cette question: "${text}". Réponds brièvement en expert avicole et rappelle-lui de saisir ${exemple}.`
    );
    return { valeur: null, question: true, reponse };
  }
  return { valeur: null, question: false };
}
const handleMessage = async (from, text) =>{
  const msg = text.trim().toLowerCase();
  const session = await getSession(from);
   // 🔑 MOTS-CLÉS ULTRA-PRIORITAIRES
  console.log("🔍 SESSION STEP :", session?.step);
// ══════════════════════════════════════════════════════════════
  // Annule relance si le client répond
  if (relanceTimers[from]) {
    if (Array.isArray(relanceTimers[from])) {
      relanceTimers[from].forEach(t => clearTimeout(t));
    } else {
      clearTimeout(relanceTimers[from]);
    }
    delete relanceTimers[from];
  }

  // Annulation
  if (msg === "menu" || msg === "annuler") {
  await clearSession(from);  return MENU_PRINCIPAL;
}

// ── RETOUR AU MENU PRÉCÉDENT ──
if (msg === "retour" || msg === "back" || msg === "precedent") {
  const menusParStep = {
    // Tunnel débutant
    "debutant_superficie": { step: "debutant_objectif", message: MENU_DEBUTANT },
    "debutant_budget":     { step: "debutant_superficie", message: `📐 *Quelle est la superficie de votre terrain ?* (en m²)\n\nExemple : 200` },
    "debutant_nom":        { step: "debutant_budget", message: `💰 *Quel est votre budget de démarrage ?* (en FCFA)\n\nExemple : 500000` },
    "debutant_ville":      { step: "debutant_nom", message: `👤 *Quel est votre nom complet ?*` },

    // Tunnel poussins
    "commande_quantite":   { step: "choix_race", message: MENU_RACES },
    "commande_nom":        { step: "commande_quantite", message: `📦 *Combien de poussins souhaitez-vous commander ?*\n\nExemple : 500` },
    "commande_ville":      { step: "commande_nom", message: `👤 *Quel est votre nom complet ?*` },

    // Tunnel matériels
    "materiel_sujets":     { step: "materiel_choix", message: MENU_MATERIELS_CHOIX },
    "materiel_action":     { step: "materiel_sujets", message: `🐔 *Combien de sujets avez-vous dans votre élevage ?*\n\nExemple : 500` },
    "materiel_nom":        { step: "materiel_action", message: `1️⃣ Commander maintenant\n2️⃣ Recevoir un devis` },
    "materiel_ville":      { step: "materiel_nom", message: `👤 *Quel est votre nom complet ?*` },

    // Tunnel formation
    "formation_objectif":  { step: "formation_niveau", message: PRESENTATION_FORMATION },
    "formation_motivation":{ step: "formation_objectif", message: `🎯 *Quel est votre objectif principal ?*\n\n1️⃣ Élevage familial\n2️⃣ Projet commercial\n3️⃣ Devenir formateur` },
    "formation_nom":       { step: "formation_motivation", message: `1️⃣ Oui je m'inscris\n2️⃣ Je veux plus d'infos` },
    "formation_ville":     { step: "formation_nom", message: `👤 *Quel est votre nom complet ?*` },

    // Tunnel estimation
    "estimation_sujets":   { step: "estimation_type", message: MENU_ESTIMATION },
    "estimation_budget":   { step: "estimation_sujets", message: `🐔 *Combien de sujets voulez-vous élever ?*\n\nExemple : 500` },

    // Tunnel conseiller
    "conseiller_nom":      { step: "conseiller_motif", message: MENU_CONSEILLER },
    "conseiller_message":  { step: "conseiller_nom", message: `👤 *Quel est votre nom complet ?*` },
  };

  const retourInfo = menusParStep[session?.step];
  if (retourInfo) {
    if (retourInfo.step) {
      await setSession(from, { ...session, step: retourInfo.step });
    } else {
      await clearSession(from);
    }
    return `↩️ *Retour en arrière*\n\n${retourInfo.message}`;
  }

  await clearSession(from);
  return MENU_PRINCIPAL;
}
  // ============================
  // ✅ CLAUDE PRIORITAIRE
  // ============================

  const isInCriticalFlow = [
    "quantite", "nom", "devis_nom",
    "devis_ville", "devis_superficie", "devis_sujets",
    "formation_nom", "formation_ville", "formation_inscription", "choix_formation",
    "debutant_objectif", "debutant_superficie", "debutant_budget",
    "debutant_nom", "debutant_ville",
    "choix_race", "commande_quantite", "commande_nom", "commande_ville",
    "estimation_race",
    "materiel_choix", "materiel_sujets", "materiel_action", "materiel_nom", "materiel_ville",
    "estimation_type", "estimation_sujets", "estimation_budget",
    "formation_niveau", "formation_objectif", "formation_motivation",
    "question_libre",
    "conseiller_motif", "conseiller_nom", "conseiller_message"
  ].includes(session?.step);

  if (isSmartQuestion(text) && !isInCriticalFlow && !session?.step) {
    console.log(`🤖 Question détectée → Claude : "${text}"`);
    const reponseIA = await askClaude(text);
    if (reponseIA) return reponseIA;
  }

// ══════════════════════════════════════════════════════════════
  // 💼 BOURSE DE L'EMPLOI AVICOLE
  // ══════════════════════════════════════════════════════════════

  if (isHotLead(text)) {
    console.log("🔥 CLIENT CHAUD DÉTECTÉ");
    await clearSession(from);
    return MENU_PRINCIPAL;
  }
// ── FORMATIONS ──
if ((msg === "formation" || msg === "formations") && !session?.step) {
  await setSession(from, { step: "choix_formation" });
  return `🎓 *NOS FORMATIONS EN AVICULTURE*
_Le Partenaire des Éleveurs_

Choisissez votre type de formation :

1️⃣ *Formation LIVE — Zoom*
📅 Chaque mois (vendredis & dimanches)
💰 85 000 FCFA
👥 En direct avec nos experts

2️⃣ *Formation PRÉ-ENREGISTRÉE*
⏱️ À votre rythme, 24h/24
💰 27 500 FCFA
📱 Accès immédiat

Tapez *1* ou *2* pour choisir
↩️ Tapez *menu* pour annuler`;
}

if (session?.step === "choix_formation") {
  if (msg === "1") {
    await clearSession(from);
    return `🎓 *FORMATION LIVE — ZOOM*
_Le Partenaire des Éleveurs_

📅 *Quand ?* Chaque mois — vendredis & dimanches
💰 *Coût :* 85 000 FCFA

✅ *Ce que vous obtenez :*
✓ Sessions en direct avec nos experts
✓ Questions-réponses en temps réel
✓ Supports vidéos + documents
✓ La Boussole de l'Éleveur (guide numérique)
✓ Certificat de participation
✓ Accompagnement mise en place
✓ Accès WhatsApp Assistance 24H/24

👉 *S'inscrire maintenant :*
🔗 ${process.env.LIEN_FORMATION_LIVE || "Lien disponible sur demande"}

📞 Plus d'infos : *+225 01 02 64 20 80*
↩️ Tapez *menu* pour revenir au menu principal`;
  }

  if (msg === "2") {
    await clearSession(from);
    return `🎬 *FORMATION PRÉ-ENREGISTRÉE*
_Le Partenaire des Éleveurs_

⏱️ *À votre rythme* — disponible 24h/24
💰 *Coût :* 27 500 FCFA
📱 *Accès immédiat* après paiement

✅ *Ce que vous obtenez :*
✓ Vidéos complètes accessibles à vie
✓ Bases de l'aviculture moderne
✓ Alimentation & prophylaxie
✓ Gestion sanitaire & maladies
✓ Rentabilité & gestion financière
✓ La Boussole de l'Éleveur (guide numérique)

🎯 *Idéal pour :*
✓ Personnes occupées sans disponibilité fixe
✓ Ceux qui veulent apprendre à leur rythme
✓ Révision et approfondissement

👉 *Accéder à la formation :*
🔗 ${process.env.LIEN_FORMATION_ENREGISTREE || "Lien disponible sur demande"}

📞 Plus d'infos : *+225 01 02 64 20 80*
↩️ Tapez *menu* pour revenir au menu principal`;
  }

  return `❓ Tapez *1* pour la formation Live ou *2* pour la formation pré-enregistrée.\n↩️ Tapez *menu* pour annuler`;
}
  // ── TUNNEL FORMATION ──
  if (session?.step === "formation_inscription") {
    if (msg === "oui") {
      await setSession(from, { step: "formation_nom" });
      return `✅ Super ! Vous allez vous inscrire à la formation.\n\n👤 *Quel est votre nom complet ?*`;
    } else if (msg === "non") {
      await clearSession(from);
      return MENU_PRINCIPAL;
    } else {
      return `❓ Tapez *oui* pour vous inscrire ou *non* pour revenir au menu.`;
    }
  }

  if (session?.step === "formation_nom") {
    const nom = text.trim();
    if (nom.length < 2) return `❌ Nom invalide. Entrez votre nom complet.`;
    await setSession(from, { step: "formation_ville", nom });
    return `👤 Nom enregistré : *${nom}*\n\n📍 *Quelle est votre ville ?*`;
  }

  if (session?.step === "formation_ville") {
    const ville = text.trim();
    if (ville.length < 2) return `❌ Ville invalide.`;
    try {
      await Registration.create({
        phone: from,
        name: session.nom,
        type: "formation",
        ville: ville,
      });
      await Contact.findOneAndUpdate(
        { phone: from },
        { name: session.nom, lastSeen: new Date() }
      );
      const CONSEILLER_PHONE = process.env.CONSEILLER_PHONE;
      if (CONSEILLER_PHONE) {
        await sendWhatsAppMessage(CONSEILLER_PHONE,
          `🔔 *NOUVELLE INSCRIPTION FORMATION !*\n\n👤 Nom : ${session.nom}\n📱 Téléphone : +${from}\n📍 Ville : ${ville}\n\n👉 À contacter sous 24h`
        );
      }
    } catch (err) {
      console.error("❌ Erreur inscription formation :", err.message);
    }
    await clearSession(from);
    return `🎉 *Inscription formation enregistrée !*

📋 *Récapitulatif :*
👤 Nom : ${session.nom}
📍 Ville : ${ville}
📅 Formation : Chaque mois du 1er à la fin du mois
💰 Coût : 85 000 FCFA

✅ Un conseiller vous contactera sous *24h* pour confirmer votre inscription.

📞 Pour toute urgence : *+225 01 02 64 20 80*

↩️ Tapez *menu* pour revenir au menu principal`;
  }

  // ── MENU PRINCIPAL ──
// ── MESSAGES DE POLITESSE ──
if (["merci", "merci beaucoup", "ok merci", "thanks", "thank you", "parfait", "super", "d'accord", "ok"].includes(msg)) {
  return `😊 Avec plaisir ! C'est notre mission de vous accompagner vers la réussite de votre élevage 🐔

💡 *Conseil du jour :*
Un bon éleveur observe ses sujets chaque matin. Les premiers signes de maladie se détectent souvent dans le comportement avant les symptômes visibles.

👉 Besoin d'autre chose ?
↩️ Tapez *menu* pour voir nos services
📞 Urgence : *+225 01 02 64 20 80*`;
}// ── GESTION DES OBJECTIONS ──
const objectionsPrix = [
  "trop cher", "c'est cher", "pas les moyens", "pas d'argent",
  "cher", "coûteux", "hors budget", "je n'ai pas", "trop coûteux"
];
const objectionsFrustration = [
  "nul", "mauvais", "pas bien", "déçu", "décevant",
  "ça marche pas", "ça ne marche pas", "pas satisfait"
];
const objectionsHesitation = [
  "je réfléchis", "je verrai", "plus tard", "pas maintenant",
  "pas encore", "peut être", "peut-être", "on verra"
];

if (objectionsPrix.some(o => msg.includes(o))) {
  return `💡 *Nous vous comprenons !*

Le prix est important dans tout projet. Voici pourquoi nos clients trouvent que ça vaut le coup :

✅ *Nos poussins certifiés* ont un taux de survie de 95%
✅ *Formation incluse* dans certains packages
✅ *Suivi gratuit* après votre achat
✅ *Possibilité de commencer petit* — dès 100 poussins

🐔 Avec 200 poulets chairs, vous pouvez gagner entre *150 000 et 250 000 FCFA* de bénéfice net en 45 jours.

👉 Tapez *5* pour estimer votre rentabilité
👉 Tapez *3* pour voir nos prix poussins
📞 Parlons-en : *+225 01 02 64 20 80*
↩️ Tapez *menu* pour voir nos services`;
}

if (objectionsFrustration.some(o => msg.includes(o))) {
  const CONSEILLER_PHONE = process.env.CONSEILLER_PHONE;
  if (CONSEILLER_PHONE) {
    await sendWhatsAppMessage(CONSEILLER_PHONE,
      `⚠️ *CLIENT INSATISFAIT !*\n\n📱 Téléphone : +${from}\n💬 Message : "${text}"\n\n👉 À contacter rapidement pour résoudre le problème !`
    );
  }
  return `😔 Nous sommes désolés que vous ayez vécu cette expérience.

Votre satisfaction est notre priorité absolue 🙏

Un responsable va vous contacter dans les *2 heures* pour résoudre votre problème.

📞 Vous pouvez aussi nous appeler directement :
*+225 01 02 64 20 80*

↩️ Tapez *menu* pour voir nos services`;
}

if (objectionsHesitation.some(o => msg.includes(o))) {
  return `😊 Pas de problème, prenez le temps qu'il vous faut !

💡 *En attendant, sachez que :*
✓ Nos prix poussins sont stables
✓ La demande en volaille augmente chaque mois en CI
✓ Chaque semaine de retard = une bande de moins par an

🎯 *Pour vous aider à décider :*
👉 Tapez *5* pour estimer vos bénéfices potentiels
👉 Tapez *races* pour choisir la race adaptée
👉 Tapez *8* pour poser vos questions à notre expert

↩️ Tapez *menu* pour voir nos services`;
}
if (msg === "2" && !session?.step) {
    await setSession(from, { step: "choix_race" });
    return MENU_RACES;
}

if (msg === "3" && !session?.step) {
    await setSession(from, { step: "materiel_choix" });
    return MATERIELS + `

???? *Qu'est-ce qui vous int??resse ?*

` + MENU_MATERIELS_CHOIX;
}

if (msg === "4" && !session?.step) {
    await setSession(from, { step: "estimation_type" });
    return MENU_ESTIMATION;
}

if (msg === "5" && !session?.step) {
  await setSession(from, { step: "choix_formation" });
  return `???? *FORMATIONS EN AVICULTURE*
_Le Partenaire des ??leveurs_

Nous proposons 2 types de formation :

1?????? *Formation LIVE Zoom* ??? 85 000 FCFA
???? Chaque mois, vendredis & dimanches
???? En direct avec nos experts

2?????? *Formation PR??-ENREGISTR??E* ??? 27 500 FCFA
?????? ?? votre rythme, acc??s imm??diat
???? Disponible 24h/24

Tapez *1* ou *2* pour choisir
?????? Tapez *menu* pour annuler`;
}

if (msg === "6" && !session?.step) {
    await setSession(from, { step: "question_libre" });
    return `???? *VOTRE EXPERT AVICOLE*
_Le Partenaire des ??leveurs_

Posez votre question sur les poussins, le b??timent, les ??quipements, l'alimentation, la sant?? ou la rentabilit??.

???? *??crivez votre question maintenant...*

?????? Tapez *menu* pour revenir au menu principal`;
}

if ((msg === "7" || msg === "contact" || msg === "conseiller") && !session?.step) {
    await setSession(from, { step: "conseiller_motif" });
    return MENU_CONSEILLER;
}

  const isMenuChoice = [
  "1","2","3","4","5","6","7",
  "menu","annuler","contact","conseiller",
  "bonjour","bonsoir","salut","hi","hello","start","0",
  "oui","non"
].includes(msg);

if (!isSmartQuestion(text) && !isHotLead(text) && !session?.step && !isMenuChoice) {
    const timers = [];

    const t1 = setTimeout(async () => {
      console.log("⏰ Relance 1h");
      await sendWhatsAppMessage(from,
        `👋 Juste pour savoir si vous avez pu avancer sur votre projet d'élevage 🙂\n\nNous pouvons vous guider étape par étape pour bien démarrer.\n\n👉 Tapez *menu* pour voir nos solutions`
      );
    }, 3600000);

    const t2 = setTimeout(async () => {
      console.log("⏰ Relance 24h");
      await sendWhatsAppMessage(from,
        `👍 Beaucoup de nos clients étaient comme vous au début.\n\nAujourd'hui ils réussissent leur élevage grâce à un bon accompagnement.\n\n👉 Souhaitez-vous :\n1️⃣ Acheter des poussins\n2️⃣ Suivre la formation\n3️⃣ Avoir un devis`
      );
    }, 86400000);

    const t3 = setTimeout(async () => {
      console.log("⏰ Relance 72h");
      await sendWhatsAppMessage(from,
        `Vous pouvez commencer avec seulement 500 poussins.\n\nC'est la meilleure façon de tester et devenir rentable rapidement.\n\n👉 Voulez-vous un devis personnalisé ?`
      );
    }, 259200000);

    timers.push(t1, t2, t3);
    relanceTimers[from] = timers;
  }
  // ── TUNNEL DÉBUTANT ──
  if (msg === "1" && !session?.step) {
    await setSession(from, { step: "debutant_objectif" });
    return MENU_DEBUTANT;
  }

  if (session?.step === "debutant_objectif") {
    const objectifs = { "1": "Vendre de la viande (chair)", "2": "Vendre des œufs (ponte)", "3": "Les deux" };
    if (!objectifs[msg]) return `❓ Tapez *1*, *2* ou *3* pour choisir votre objectif.`;
    await setSession(from, { ...session, step: "debutant_superficie", objectif: objectifs[msg] });
    return `✅ Objectif : *${objectifs[msg]}*\n\n📐 *Quelle est la superficie de votre terrain ?* (en m²)\n\nExemple : 200`;
  }

  if (session?.step === "debutant_superficie") {
  const { valeur, question, reponse } = await parseNumberOrAsk(text, session, "indiquer la superficie du terrain", "un nombre en m². Exemple : *200*");
  if (question) return reponse;
  const superficie = valeur;
  if (!superficie || superficie < 1) return `❌ Entrez une superficie valide en m². Exemple : *200*`;
    await setSession(from, { ...session, step: "debutant_budget", superficie });
    return `✅ Superficie : *${superficie} m²*\n\n💰 *Quel est votre budget de démarrage ?* (en FCFA)\n\nExemple : 500000`;
  }

  if (session?.step === "debutant_budget") {
  const { valeur, question, reponse } = await parseNumberOrAsk(text, session, "indiquer le budget de démarrage", "un montant en FCFA. Exemple : *500000*");
  if (question) return reponse;
  const budget = valeur;
  if (!budget || budget < 1) return `❌ Entrez un budget valide en FCFA. Exemple : *500000*`;
    await setSession(from, { ...session, step: "debutant_nom", budget });
    return `✅ Budget : *${Number(budget).toLocaleString("fr-FR")} FCFA*\n\n👤 *Quel est votre nom complet ?*`;
  }

  if (session?.step === "debutant_nom") {
    const nom = text.trim();
    if (nom.length < 2) return `❌ Nom invalide. Entrez votre nom complet.`;
    await setSession(from, { ...session, step: "debutant_ville", nom });
    return `✅ Nom : *${nom}*\n\n📍 *Quelle est votre ville ?*`;
  }

  if (session?.step === "debutant_ville") {
    const ville = text.trim();
    if (ville.length < 2) return `❌ Ville invalide.`;

    const { objectif, superficie, budget, nom } = session;

    // Claude génère un plan personnalisé
    const prompt = `Tu es expert en aviculture en Côte d'Ivoire.
Un débutant veut démarrer son élevage avec ces informations :
- Objectif : ${objectif}
- Superficie du terrain : ${superficie} m²
- Budget : ${Number(budget).toLocaleString("fr-FR")} FCFA
- Nom : ${nom}
- Ville : ${ville}

Génère un plan de démarrage personnalisé en 4-5 lignes maximum :
1. Nombre de poussins recommandé selon la superficie
2. Race recommandée selon l'objectif
3. Estimation du coût des poussins
4. Un conseil clé pour bien démarrer
5. Recommande la formation à 85 000 FCFA du Partenaire des Éleveurs

Termine par : "Souhaitez-vous commander vos poussins ou vous inscrire à la formation ?"
Puis : "↩️ Tapez *menu* pour voir nos services"`;

    let planPersonnalise = "";
    try {
      planPersonnalise = await askClaude(prompt);
    } catch (err) {
      planPersonnalise = `Basé sur votre profil, nous vous recommandons de démarrer avec des poulets de chair sur votre terrain de ${superficie} m².\n\n✅ Souhaitez-vous commander vos poussins ou vous inscrire à la formation ?`;
    }

    // Sauvegarde en base
    try {
      await Registration.create({
        phone: from,
        name: nom,
        type: "devis",
        ville,
        profil: `Débutant | ${objectif} | ${superficie}m² | Budget: ${Number(budget).toLocaleString("fr-FR")} FCFA`
      });

      const CONSEILLER_PHONE = process.env.CONSEILLER_PHONE;
      if (CONSEILLER_PHONE) {
        await sendWhatsAppMessage(CONSEILLER_PHONE,
          `*NOUVEAU DÉBUTANT !*\n\n👤 Nom : ${nom}\n📱 Téléphone : +${from}\n📍 Ville : ${ville}\n🎯 Objectif : ${objectif}\n📐 Superficie : ${superficie} m²\n💰 Budget : ${Number(budget).toLocaleString("fr-FR")} FCFA\n\n👉 À contacter sous 24h`
        );
      }
    } catch (err) {
      console.error("❌ Erreur sauvegarde débutant :", err.message);
    }

    await clearSession(from);
    return planPersonnalise;
  }
  // ── TUNNEL PREMIUM ──
  // TUNNEL ACHAT POUSSINS
  if (session?.step === "choix_race") {
    const choix = PRIX_POUSSINS[msg];
    if (!choix) return `❓ Tapez un numéro entre *1* et *8* pour choisir votre race.`;
    await setSession(from, { ...session, step: "commande_quantite", race: choix.race, prix: choix.prix });
    return `✅ Race choisie : *${choix.race}*\nPrix unitaire : *${choix.prix} FCFA*\n\n📦 *Combien de poussins souhaitez-vous commander ?*\n\nExemple : 500`;
  }

  if (session?.step === "commande_quantite") {
  const { valeur, question, reponse } = await parseNumberOrAsk(text, session, "commander des poussins", "un nombre. Exemple : *500*");
  if (question) return reponse;
  const quantite = valeur;
  if (!quantite || quantite < 1) return `❌ Entrez un nombre valide. Exemple : *500*`;
    const total = quantite * session.prix;
    await setSession(from, { ...session, step: "commande_nom", quantite, total });
    return `✅ Quantité : *${quantite} poussins*\n💰 Total estimé : *${total.toLocaleString("fr-FR")} FCFA*\n\n👤 *Quel est votre nom complet ?*`;
  }

  if (session?.step === "commande_nom") {
    const nom = text.trim();
    if (nom.length < 2) return `❌ Nom invalide. Entrez votre nom complet.`;
    await setSession(from, { ...session, step: "commande_ville", nom });
    return `✅ Nom : *${nom}*\n\n📍 *Quelle est votre ville ?*`;
  }

  if (session?.step === "commande_ville") {
    const ville = text.trim();
    if (ville.length < 2) return `❌ Ville invalide.`;
    const { race, prix, quantite, total, nom } = session;

    try {
      await Order.create({
        phone: from,
        name: nom,
        race,
        quantity: quantite,
        unitPrice: prix,
        totalPrice: total,
        ville,
        status: "en_attente"
      });

      const CONSEILLER_PHONE = process.env.CONSEILLER_PHONE;
      if (CONSEILLER_PHONE) {
        await sendWhatsAppMessage(CONSEILLER_PHONE,
          `🐥 *NOUVELLE COMMANDE POUSSINS !*\n\n👤 Nom : ${nom}\n📱 Téléphone : +${from}\n📍 Ville : ${ville}\n🐔 Race : ${race}\n📦 Quantité : ${quantite} poussins\n💰 Total : ${total.toLocaleString("fr-FR")} FCFA\n\n👉 À confirmer sous 24h`
        );
      }
    } catch (err) {
      console.error("❌ Erreur commande poussins :", err.message);
    }

    // Génération et envoi du PDF
    try {
      const pdfBuffer = await generateDevisPDF({
        nom,
        phone: from,
        ville,
        items: [{
          designation: `Poussins ${race}`,
          quantite,
          prixUnitaire: prix
        }]
      });

      await sendWhatsAppMessage(from, `🎉 *Commande enregistrée avec succès !*

📋 *Récapitulatif :*
👤 Nom : ${nom}
📍 Ville : ${ville}
🐔 Race : ${race}
📦 Quantité : ${quantite} poussins
💰 Total : ${total.toLocaleString("fr-FR")} FCFA

✅ Votre facture proforma est en cours d'envoi...`);

      await sendWhatsAppPDF(
        from,
        pdfBuffer,
        `Facture_Proforma_${nom.replace(/\s/g, "_")}.pdf`,
        `📄 Votre facture proforma - Le Partenaire des Éleveurs`
      );

    } catch (pdfErr) {
      console.error("❌ Erreur PDF :", pdfErr.message);
      await sendWhatsAppMessage(from, `🎉 *Commande enregistrée !*

📋 Récapitulatif :
👤 Nom : ${nom}
📍 Ville : ${ville}
🐔 Race : ${race}
📦 Quantité : ${quantite} poussins
💰 Total : ${total.toLocaleString("fr-FR")} FCFA

✅ Un conseiller vous contactera sous *24h*.
📞 Urgence : *+225 01 02 64 20 80*`);
    }

    await clearSession(from);
    return `📞 Un conseiller vous contactera sous *24h* pour les modalités de paiement et livraison.\n\n↩️ Tapez *menu* pour revenir au menu principal`;
  }
  // ── TUNNEL MATÉRIELS ──
  if (session?.step === "materiel_choix") {
    const materiels = {
      "1": "Abreuvoirs",
      "2": "Mangeoires",
      "3": "Chauffage",
      "4": "Pack complet"
    };
    if (!materiels[msg]) return `❓ Tapez *1*, *2*, *3* ou *4* pour choisir.`;
    await setSession(from, { ...session, step: "materiel_sujets", materiel: materiels[msg] });
    return `✅ Choix : *${materiels[msg]}*\n\n🐔 *Combien de sujets avez-vous dans votre élevage ?*\n\nExemple : 500`;
  }

  if (session?.step === "materiel_sujets") {
  const { valeur, question, reponse } = await parseNumberOrAsk(text, session, "indiquer le nombre de sujets pour les matériels", "un nombre. Exemple : *500*");
  if (question) return reponse;
  const sujets = valeur;
  if (!sujets || sujets < 1) return `❌ Entrez un nombre valide. Exemple : *500*`;

    const prompt = `Tu es expert en équipement avicole en Côte d'Ivoire.
Un éleveur a ${sujets} sujets et s'intéresse à : ${session.materiel}.
Recommande en 3-4 lignes :
1. La quantité exacte nécessaire
2. Les références recommandées avec prix depuis cette liste :
   - Abreuvoir Automatique Jumbo : 11 000 FCFA
   - Abreuvoir avec pied 11L : 4 500 FCFA
   - Abreuvoir avec pied 6L : 3 000 FCFA
   - Abreuvoir sans pied 11L : 4 300 FCFA
   - Abreuvoir sans pied 6L : 2 500 FCFA
   - Abreuvoir Conique 5L : 1 800 FCFA
   - Mangeoire démarrage : 1 500 FCFA
   - Mangeoire anti-gaspillage : 2 500 FCFA
   - Mangeoire métallique : 1 700 FCFA
   - Fourneau de chauffage : 8 000 FCFA
3. Le coût total estimé
Termine par : "Souhaitez-vous commander ou recevoir un devis ?"`;

    let conseil = "";
    try {
      conseil = await askClaude(prompt);
    } catch (err) {
      conseil = `Pour ${sujets} sujets, nous vous recommandons les équipements adaptés.\n\nSouhaitez-vous commander ou recevoir un devis ?`;
    }

    await setSession(from, { ...session, step: "materiel_action", sujets });
    return conseil + `\n\n1️⃣ Commander maintenant\n2️⃣ Recevoir un devis\n\n↩️ Tapez *menu* pour annuler`;
  }

  if (session?.step === "materiel_action") {
    if (msg !== "1" && msg !== "2") return `❓ Tapez *1* pour commander ou *2* pour un devis.`;
    const action = msg === "1" ? "commande" : "devis";
    await setSession(from, { ...session, step: "materiel_nom", action });
    return `✅ *${action === "commande" ? "Commande" : "Devis"} sélectionné*\n\n👤 *Quel est votre nom complet ?*`;
  }

  if (session?.step === "materiel_nom") {
    const nom = text.trim();
    if (nom.length < 2) return `❌ Nom invalide.`;
    await setSession(from, { ...session, step: "materiel_ville", nom });
    return `✅ Nom : *${nom}*\n\n📍 *Quelle est votre ville ?*`;
  }

  if (session?.step === "materiel_ville") {
    const ville = text.trim();
    if (ville.length < 2) return `❌ Ville invalide.`;
    const { materiel, sujets, action, nom } = session;

    try {
      await Registration.create({
        phone: from,
        name: nom,
        type: action === "commande" ? "commande_materiel" : "devis_materiel",
        ville,
        profil: `${materiel} | ${sujets} sujets`
      });

      const CONSEILLER_PHONE = process.env.CONSEILLER_PHONE;
      if (CONSEILLER_PHONE) {
        await sendWhatsAppMessage(CONSEILLER_PHONE,
          `🏪 *${action === "commande" ? "COMMANDE" : "DEVIS"} MATÉRIELS !*\n\n👤 Nom : ${nom}\n📱 Téléphone : +${from}\n📍 Ville : ${ville}\n🛒 Matériel : ${materiel}\n🐔 Sujets : ${sujets}\n\n👉 À traiter sous 24h`
        );
      }
    } catch (err) {
      console.error("❌ Erreur matériel :", err.message);
    }

    await clearSession(from);
    return `🎉 *${action === "commande" ? "Commande" : "Devis"} enregistré !*

📋 *Récapitulatif :*
👤 Nom : ${nom}
📍 Ville : ${ville}
🛒 Matériel : ${materiel}
🐔 Pour : ${sujets} sujets

✅ Un conseiller vous contactera sous *24h*.

📞 Urgence : *+225 01 02 64 20 80*

↩️ Tapez *menu* pour revenir au menu principal`;
  }
  // ── TUNNEL ESTIMATION COÛTS & BÉNÉFICES ──
  if (session?.step === "estimation_type") {
    const types = { "1": "Poulets de chair", "2": "Poules pondeuses" };
    if (!types[msg]) return `❓ Tapez *1* ou *2* pour choisir.`;
    await setSession(from, { ...session, step: "estimation_sujets", type: types[msg] });
    return `✅ Type : *${types[msg]}*\n\n🐔 *Combien de sujets voulez-vous élever ?*\n\nExemple : 500`;
  }

  if (session?.step === "estimation_sujets") {
  const { valeur, question, reponse } = await parseNumberOrAsk(text, session, "estimer les coûts d'élevage", "un nombre. Exemple : *500*");
  if (question) return reponse;
  const sujets = valeur;
  if (!sujets || sujets < 1) return `❌ Entrez un nombre valide. Exemple : *500*`;
    await setSession(from, { ...session, step: "estimation_budget", sujets });
    return `✅ Nombre de sujets : *${sujets}*\n\n💰 *Quel est votre budget disponible ?* (en FCFA)\n\nExemple : 500000`;
  }

  if (session?.step === "estimation_budget") {
  const { valeur, question, reponse } = await parseNumberOrAsk(text, session, "indiquer le budget d'estimation", "un montant en FCFA. Exemple : *500000*");
  if (question) return reponse;
  const budget = valeur;
  if (!budget || budget < 1) return `❌ Entrez un budget valide. Exemple : *500000*`;

    const { type, sujets } = session;

    const prompt = `Tu es expert en gestion financière avicole en Côte d'Ivoire.
Un éleveur veut estimer la rentabilité de son projet :
- Type : ${type}
- Nombre de sujets : ${sujets}
- Budget disponible : ${budget.toLocaleString("fr-FR")} FCFA

Génère une estimation financière complète et réaliste :
1. 💰 Coût des poussins (utilise ces prix : Chair Blanc 650 FCFA, Chair Roux 600 FCFA, Ponte ISA Brown 1150 FCFA)
2. 🍽️ Coût alimentation estimé (durée du cycle)
3. 🏗️ Coût matériels estimé
4. 📈 Revenu potentiel à la vente
5. 💵 Bénéfice net estimé
6. ⏱️ Délai de rentabilité
7. ✅ Conclusion : ce projet est-il réalisable avec ce budget ?

Termine par : "Souhaitez-vous commander vos poussins ou vous inscrire à la formation ?"
Puis : "↩️ Tapez *menu* pour voir nos services"`;

    let estimation = "";
    try {
      estimation = await askClaude(prompt);
    } catch (err) {
      estimation = `📊 Estimation pour ${sujets} ${type} :\n\nVeuillez contacter notre conseiller pour une estimation personnalisée.\n\n👉 Tapez *contact*\n\n↩️ Tapez *menu* pour voir nos services`;
    }

    await clearSession(from);
    return estimation;
  }
  // ── TUNNEL PROGRAMME PREMIUM ──
  // TUNNEL QUESTION LIBRE EXPERT
  if (session?.step === "question_libre") {
    const prompt = `Tu es un expert v??t??rinaire et consultant en aviculture en C??te d'Ivoire avec 20 ans d'exp??rience.
Tu travailles pour "Le Partenaire des ??leveurs".

Un ??leveur te pose cette question : "${text}"

R??ponds en expert avec :
1. Une r??ponse pr??cise, pratique et adapt??e au contexte ivoirien
2. Un conseil concret applicable imm??diatement
3. Une mise en garde si n??cessaire
4. Une recommandation de produit ou service si pertinent

STYLE :
- Maximum 5 lignes
- Ton chaleureux et professionnel

FIN OBLIGATOIRE :
- "??? Avez-vous d'autres questions ?"
- "?????? Tapez *menu* pour voir nos services"
- "???? Besoin d'un conseiller ? Tapez *contact*"`;

    try {
      return await askClaude(prompt);
    } catch (err) {
      return `Je n'ai pas pu traiter votre question.

???? Contactez directement notre expert :
*+225 01 02 64 20 80*

?????? Tapez *menu* pour revenir au menu principal`;
    }
  }

  if (session?.step === "conseiller_motif") {
    const motifs = {
      "1": "Commande de poussins",
      "2": "Informations sur la formation",
      "3": "Problème urgent sur élevage",
      "4": "Autre demande"
    };
    if (!motifs[msg]) return `❓ Tapez *1*, *2*, *3* ou *4* pour choisir le motif.`;
    await setSession(from, { ...session, step: "conseiller_nom", motif: motifs[msg] });
    return `✅ Motif : *${motifs[msg]}*\n\n👤 *Quel est votre nom complet ?*`;
  }

  if (session?.step === "conseiller_nom") {
    const nom = text.trim();
    if (nom.length < 2) return `❌ Nom invalide. Entrez votre nom complet.`;
    await setSession(from, { ...session, step: "conseiller_message", nom });
    return `✅ Nom : *${nom}*\n\n💬 *Décrivez brièvement votre demande :*\n\nExemple : "Je veux commander 500 poussins chairs"`;
  }

  if (session?.step === "conseiller_message") {
    const messagClient = text.trim();
    if (messagClient.length < 5) return `❌ Message trop court. Décrivez votre demande.`;
    const { motif, nom } = session;

    try {
      const CONSEILLER_PHONE = process.env.CONSEILLER_PHONE;
      if (CONSEILLER_PHONE) {
        await sendWhatsAppMessage(CONSEILLER_PHONE,
          `📞 *DEMANDE DE CONTACT !*\n\n👤 Nom : ${nom}\n📱 Téléphone : +${from}\n🎯 Motif : ${motif}\n💬 Message : ${messagClient}\n\n👉 À rappeler rapidement !`
        );
      }
    } catch (err) {
      console.error("❌ Erreur notification conseiller :", err.message);
    }

    await clearSession(from);
    return `✅ *Demande transmise à notre équipe !*

👤 Nom : ${nom}
🎯 Motif : ${motif}
💬 Message : ${messagClient}

📞 Un conseiller vous contactera sous *2h* sur ce numéro.

⚡ *Pour une urgence appelez directement :*
*+225 01 02 64 20 80*

↩️ Tapez *menu* pour revenir au menu principal`;
  }
  // ── PRIX DU MARCHÉ ──
console.log(`🤖 Fallback Claude : "${text}" | step: ${session?.step}`);

if (session?.step) {
  const contextPrompt = `Tu es l'assistant du Partenaire des Éleveurs en Côte d'Ivoire. Un client est en train de naviguer dans le bot et a tapé un message inattendu. Contexte de navigation : ${session.step} Message du client : "${text}"  Analyse sa demande et : 1. Réponds à sa question si c'est une question avicole 2. Ou oriente-le vers la bonne option du menu 3. Rappelle-lui les choix disponibles dans son contexte actuel  Termine toujours par les choix disponibles dans son contexte ou par : "↩️ Tapez *menu* pour voir toutes nos options"`;
  const reponseIA = await askClaude(contextPrompt);
  if (reponseIA) return reponseIA;
} else {
  const reponseIA = await askClaude(text);
  if (reponseIA) return reponseIA;
}
return MESSAGE_INCONNU;
} // ✅ FIN de handleMessage

// ==============================
// ABONNEMENT WABA
// ==============================

async function subscribeToWABA() {
  try {
    const wabaId = process.env.WABA_ID;
    const token = process.env.WHATSAPP_TOKEN;
    if (!wabaId || !token) {
      console.warn("⚠️ WABA_ID ou WHATSAPP_TOKEN manquant");
      return;
    }
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    if (data.success) {
      console.log("✅ App abonnée au WABA avec succès :", data);
    } else {
      console.error("❌ Échec abonnement WABA :", JSON.stringify(data));
    }
  } catch (err) {
    console.error("❌ Erreur abonnement WABA :", err.message);
  }
}

// ==============================
// ROUTES
// ==============================

app.get("/", (req, res) => res.send("Bot WhatsApp opérationnel 🚀"));

// ── Upload image vers Cloudinary depuis le web ─────────────────
app.post("/api/upload-image", async (req, res) => {
  try {
    const { base64, mimeType, folder } = req.body;
    if (!base64 || !mimeType) {
      return res.status(400).json({ success: false, error: 'Données manquantes' });
    }
    const url = await uploadImageFromBase64(base64, mimeType, folder || 'lpe-web');
    if (!url) return res.status(500).json({ success: false, error: 'Erreur upload' });
    res.json({ success: true, url });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// ── INSCRIPTION ───────────────────────────────────────────────────
app.post("/api/inscription", async (req, res) => {
  try {
    const { nom, telephone, type, region } = req.body;
    if (!nom || !telephone || !type || !region) {
      return res.status(400).json({ success: false, error: 'Tous les champs sont obligatoires' });
    }

    // Nettoyer le numéro
    const tel = telephone.replace(/[\s+\-()]/g, '');

    // Vérifier si déjà inscrit
    const existing = await User.findOne({ telephone: tel });
    if (existing && existing.actif) {
      return res.json({ success: false, error: 'Ce numéro est déjà inscrit. Connectez-vous.' });
    }

    // Générer code à 4 chiffres
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const codeExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (existing) {
      existing.nom = nom;
      existing.type = type;
      existing.region = region;
      existing.code = code;
      existing.codeExpire = codeExpire;
      existing.codeTentatives = 0;
      await existing.save();
    } else {
      await User.create({ nom, telephone: tel, type, region, code, codeExpire });
    }

    // Envoyer code WhatsApp
    await sendWhatsAppMessage(tel,
      `👋 Bonjour *${nom}* !\n\n` +
      `🔐 Votre code de confirmation :\n\n` +
      `*${code}*\n\n` +
      `_Ce code expire dans 10 minutes._\n\n` +
      `↩️ Retournez sur le site pour finaliser votre inscription.`
    );

    res.json({ success: true, message: 'Code envoyé sur WhatsApp' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── VÉRIFICATION CODE ─────────────────────────────────────────────
app.post("/api/verifier-code", async (req, res) => {
  try {
    const { telephone, code } = req.body;
    const tel = telephone.replace(/[\s+\-()]/g, '');
    const user = await User.findOne({ telephone: tel });

    if (!user) return res.json({ success: false, error: 'Numéro introuvable' });
    if (user.codeTentatives >= 3) return res.json({ success: false, error: 'Trop de tentatives. Recommencez.' });
    if (new Date() > user.codeExpire) return res.json({ success: false, error: 'Code expiré. Recommencez.' });
    if (user.code !== code) {
      user.codeTentatives += 1;
      await user.save();
      return res.json({ success: false, error: 'Code incorrect' });
    }

    // Activer le compte
    user.actif = true;
    user.code = null;
    user.codeExpire = null;
    user.codeTentatives = 0;
    user.dernierAcces = new Date();
    await user.save();

    // Message de bienvenue
    await sendWhatsAppMessage(tel,
      `? *Compte activ? avec succ?s !*

Bienvenue sur *Le Partenaire des ?leveurs* ??

Tapez *menu* sur WhatsApp pour acc?der ? nos services.`
    );

    res.json({ success: true, telephone: tel, nom: user.nom, type: user.type });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── CONNEXION ─────────────────────────────────────────────────────
app.post("/api/connexion", async (req, res) => {
  try {
    const { telephone } = req.body;
    const tel = telephone.replace(/[\s+\-()]/g, '');
    const user = await User.findOne({ telephone: tel, actif: true });

    if (!user) return res.json({ success: false, error: 'Numéro non trouvé. Inscrivez-vous.' });

    // Générer code connexion
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    user.code = code;
    user.codeExpire = new Date(Date.now() + 10 * 60 * 1000);
    user.codeTentatives = 0;
    await user.save();

    // Envoyer code
    await sendWhatsAppMessage(tel,
      `🔐 *Code de connexion :*\n\n` +
      `*${code}*\n\n` +
      `_Ce code expire dans 10 minutes._`
    );

    res.json({ success: true, message: 'Code envoyé sur WhatsApp' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── STATS UTILISATEURS (admin) ────────────────────────────────────
app.get("/admin/users", verifierAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).lean();
    const total = users.length;
    const actifs = users.filter(u => u.actif).length;
    const parType = users.reduce((acc, u) => {
      acc[u.type] = (acc[u.type] || 0) + 1;
      return acc;
    }, {});
    res.json({ success: true, total, actifs, parType, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// ── ESPACE ÉLEVEUR ────────────────────────────────────────────────

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    console.log("✅ Webhook vérifié");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  res.sendStatus(200);
  try {
    // ✅ Validation entrée
    const body = req.body;
    if (!body || !body.object || body.object !== 'whatsapp_business_account') return;
    if (!body.entry || !Array.isArray(body.entry) || body.entry.length === 0) return;

    const value = body?.entry?.[0]?.changes?.[0]?.value;
    if (!value?.messages) return;

    const message = value.messages[0];
    const from = message.from;
    const type = message.type;
    if (type !== "text" && type !== "image" && type !== "video") return;

// Traitement image / vidéo
if (type === "image" || type === "video") {
  await sendWhatsAppMessage(from,
    `???? M??dia re??u.

Cette fonctionnalit?? est maintenant g??r??e dans Akogoua.

?????? Tapez *menu* pour voir les services disponibles ici.`
  );
  return;
}

    const text = message.text.body;
    console.log(`📨 Message de ${from} : "${text}"`);

    try {
      const existing = await Contact.findOne({ phone: from });
      if (existing) {
        existing.lastMessage = text;
        existing.lastChoice = getChoiceLabel(text);
        existing.lastSeen = new Date();
        existing.messageCount += 1;
        await existing.save();
      } else {
        await Contact.create({
          phone: from,
          lastMessage: text,
          lastChoice: getChoiceLabel(text),
        });
        console.log(`✅ Nouveau contact : ${from}`);
      }
    } catch (dbErr) {
      console.error("❌ Erreur MongoDB :", dbErr.message);
    }
    const response = await handleMessage(from, text);
    if (response) {
    await sendWhatsAppMessage(from, response);
}
    console.log(`✅ Réponse envoyée à ${from}`);
  } catch (error) {
    console.error("❌ Erreur webhook :", error);
  }
});
// ── Notification de contact depuis la page web ─────────────────
app.post("/api/notifier-contact", async (req, res) => {
  try {
    const { type, nom, telephone, details } = req.body;
    if (type !== "commande_magasin") {
      return res.status(410).json({ success: false, error: "Fonctionnalite deplacee vers Akogoua" });
    }

    const CONSEILLER_PHONE = process.env.CONSEILLER_PHONE;
    if (CONSEILLER_PHONE) {
      await sendWhatsAppMessage(CONSEILLER_PHONE,
        `?? *NOUVELLE COMMANDE MAGASIN !*

` +
        `?? Nom : ${nom || "Non renseigne"}
` +
        `?? Telephone : ${telephone || "Non renseigne"}
` +
        `?? Produit : ${details?.produit || "Non renseigne"}
` +
        `?? Quantite : ${details?.quantite || "Non renseignee"}
` +
        `?? Total estime : ${Number(details?.total || 0).toLocaleString("fr-FR")} FCFA
` +
        `?? Localisation : ${details?.localisation || "Non renseignee"}
` +
        `${details?.message ? `?? Message : ${details.message}
` : ""}`
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/orders/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["en_attente", "confirmée", "annulée"].includes(status)) {
      return res.status(400).json({ error: "Statut invalide" });
    }
    const order = await Order.findByIdAndUpdate(id, { status }, { new: true });
    if (!order) return res.status(404).json({ error: "Commande introuvable" });

    const messages = {
      "confirmée": `✅ *Votre commande est confirmée !*

🐥 Race : ${order.race}
📦 Quantité : ${order.quantity} poussins
💰 Total : ${order.totalPrice.toLocaleString("fr-FR")} FCFA

📞 Notre équipe vous contactera pour les modalités de paiement et livraison.

Merci de faire confiance au *Partenaire des Éleveurs* 🙏`,
      "annulée": `❌ *Votre commande a été annulée.*

↩️ Tapez *menu* pour revenir au menu principal
📞 Besoin d'aide : *+225 01 02 64 20 80*`
    };

    if (messages[status]) {
      try {
        await sendWhatsAppMessage(order.phone, messages[status]);
      } catch (err) {
        console.error("❌ Erreur notification client :", err.message);
      }
    }
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/registrations/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["en_attente", "confirmée", "annulée"].includes(status)) {
      return res.status(400).json({ error: "Statut invalide" });
    }
    const reg = await Registration.findByIdAndUpdate(id, { status }, { new: true });
    if (!reg) return res.status(404).json({ error: "Inscription introuvable" });

    const messages = {
      "confirmée": `✅ *Votre demande est confirmée !*

📋 Type : ${reg.profil || reg.type}
👤 Nom : ${reg.name}
📍 Ville : ${reg.ville}

📞 Notre équipe vous contactera très prochainement.

Merci de faire confiance au *Partenaire des Éleveurs* 🙏`,
      "annulée": `❌ *Votre demande a été annulée.*

↩️ Tapez *menu* pour revenir au menu principal
📞 Besoin d'aide : *+225 01 02 64 20 80*`
    };

    if (messages[status]) {
      try {
        await sendWhatsAppMessage(reg.phone, messages[status]);
      } catch (err) {
        console.error("❌ Erreur notification :", err.message);
      }
    }
    res.json({ success: true, reg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ── Supprimer un contact ──────────────────────────────────────────
app.delete("/contacts/:id", verifierAdmin, async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Supprimer une commande ────────────────────────────────────────
app.delete("/orders/:id", verifierAdmin, async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Supprimer une inscription ─────────────────────────────────────
app.delete("/registrations/:id", verifierAdmin, async (req, res) => {
  try {
    await Registration.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Supprimer un abonnement ───────────────────────────────────────
app.get("/contacts", async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ lastSeen: -1 });
    res.json({ total: contacts.length, contacts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/orders", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ total: orders.length, orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/registrations", async (req, res) => {
  try {
    const registrations = await Registration.find({ type: "formation" }).sort({ createdAt: -1 });
    res.json({ total: registrations.length, registrations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/devis", async (req, res) => {
  try {
    const devis = await Registration.find({ type: "devis" }).sort({ createdAt: -1 });
    res.json({ total: devis.length, devis });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================
// KEEP ALIVE
// ==============================
setInterval(async () => {
  try {
    await fetch("https://autoflow-whatsapp-bot.onrender.com/");
    console.log("💓 Keep alive ping");
  } catch (err) {
    console.error("Keep alive error:", err.message);
  }
}, 14 * 60 * 1000);

// ==============================
// LANCEMENT SERVEUR
// ==============================

function startServer(port = process.env.PORT || PORT) {
  return app.listen(port, async () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
  await subscribeToWABA();
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
