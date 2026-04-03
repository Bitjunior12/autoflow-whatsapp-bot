require("dotenv").config();
const express = require("express");
const path = require("path");
const connectDB = require("./config/database");
const { sendWhatsAppMessage, sendWhatsAppImage, sendWhatsAppPDF, downloadWhatsAppImage } = require("./services/whatsapp");
const { generateDevisPDF } = require("./services/pdf");
const Contact = require("./models/Contact");
const Order = require("./models/Order");
const Registration = require("./models/Registration");
const { setSession, getSession, clearSession } = require("./services/session");
const { askClaude, askClaudeWithImage } = require("./services/claude");
const { peutPoserQuestion, peutFaireDiagnostic, messageUpgrade, activerAbonnement, getOrCreateSubscription, isPremium, verifierRenouvellements } = require("./services/premium");
const { enregistrerBande, getBandesActives, verifierEtEnvoyerAlertes, enregistrerSuivi, getResumeSuivi, envoyerResumesHebdo } = require("./services/prophylaxie");
const Bande = require('./models/Bande');
const PrixMarche = require("./models/PrixMarche");
const { demarrerOnboarding, verifierOnboardings, reprendreOnboardingsEnCours } = require('./services/onboarding');
const marcheRoute   = require('./routes/marche');
const marcheHandler = require('./handlers/marcheHandler');
const emploiRoute   = require('./routes/emploi');
const emploiHandler = require('./handlers/emploiHandler');
const { uploadImageFromBase64 } = require('./services/cloudinary');
const User = require('./models/User');
const relanceTimers = {};
const app = express();
app.use(express.json());
app.set('trust proxy', 1);
app.use('/marche', marcheRoute);
app.use('/emploi', emploiRoute);
app.use(express.static('public'));
// ============================================
// MIDDLEWARE SÉCURITÉ ADMIN
// ============================================
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'changez-moi-2025';

const verifierAdmin = (req, res, next) => {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (!token || token !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Accès non autorisé ❌' });
  }
  next();
};

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

setInterval(async () => {
  try {
    await verifierEtEnvoyerAlertes();
    console.log("✅ Vérification alertes prophylaxie terminée");
  } catch (err) {
    console.error("❌ Erreur cron prophylaxie :", err.message);
  }
}, 60 * 60 * 1000); // toutes les heures
// Vérification renouvellements — toutes les heures
setInterval(async () => {
  try {
    await verifierRenouvellements();
    console.log("✅ Vérification renouvellements terminée");
  } catch (err) {
    console.error("❌ Erreur cron renouvellements :", err.message);
  }
}, 60 * 60 * 1000);
// Résumé hebdomadaire — chaque lundi à 8h
setInterval(async () => {
  const now = new Date();
  if (now.getDay() === 1 && now.getHours() === 8) {
    try {
      await envoyerResumesHebdo();
      console.log("✅ Résumés hebdomadaires envoyés");
    } catch (err) {
      console.error("❌ Erreur résumés hebdo :", err.message);
    }
  }
}, 60 * 60 * 1000);
// Vérification renouvellements — toutes les heures
setInterval(async () => {
  try {
    await verifierRenouvellements();
    console.log("✅ Vérification renouvellements terminée");
  } catch (err) {
    console.error("❌ Erreur cron renouvellements :", err.message);
  }
}, 60 * 60 * 1000);
// Vérification onboarding — toutes les heures
// ==============================
// MESSAGES DU MENU
// ==============================

const MENU_PRINCIPAL = `👋 Bienvenue chez *Le Partenaire des Éleveurs* 🐔
Votre assistant pour réussir et rentabiliser votre élevage en Côte d'Ivoire 🇨🇮

💡 *Que voulez-vous faire aujourd’hui ?*

1️⃣ Démarrer mon élevage (débutant)
2️⃣ Suivre & améliorer mon élevage
3️⃣ Acheter des poussins
4️⃣ Voir les matériels disponibles
5️⃣ Estimer mes coûts & bénéfices
6️⃣ Accéder aux formations
7️⃣ Rejoindre le programme premium (suivi + coaching)
8️⃣ Poser une question
9️⃣ 📞 Parler à un conseiller
🌱 Tapez *prophet* pour enregistrer une bande et recevoir vos alertes vaccins
📊 Tapez *suivi* pour saisir vos données du jour
📸 Tapez *photo* pour envoyer une photo de diagnostic
🐣 Tapez *races* pour choisir la race adaptée à votre projet
📈 Tapez *prix* pour voir les prix du marché aujourd'hui
🛒 Tapez *marché* pour vendre ou acheter de la volaille
💼 Tapez *emploi* pour la bourse de l'emploi avicole _(publier offre/profil)_
🔁 Tapez *menu* à tout moment`;

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
const PRESENTATION_PREMIUM = `⭐ *PROGRAMME PREMIUM*
_Le Partenaire des Éleveurs_

🏆 *Le programme d'accompagnement le plus complet de Côte d'Ivoire*

✅ *Ce qui est inclus :*
✓ Suivi personnalisé de votre élevage
✓ Coaching hebdomadaire avec un expert
✓ Alertes maladies & conseils nutrition
✓ Accès prioritaire à nos poussins
✓ Rapport mensuel de performance
✓ Support WhatsApp 24H/24
✓ Visites terrain sur demande

🎯 *Pour qui ?*
✓ Éleveurs débutants qui veulent bien démarrer
✓ Éleveurs existants qui veulent optimiser
✓ Investisseurs qui veulent maximiser leurs profits

👉 *Quelle est la taille de votre élevage actuel ?*

1️⃣ Pas encore démarré
2️⃣ Moins de 500 sujets
3️⃣ 500 à 2000 sujets
4️⃣ Plus de 2000 sujets

↩️ Tapez *menu* pour annuler`;
const MENU_CONSEILLER = `📞 *PARLER À UN CONSEILLER*
_Le Partenaire des Éleveurs_

Notre équipe est disponible *24H/24* pour vous aider 🙂

Quel est le motif de votre demande ?

1️⃣ Commande de poussins
2️⃣ Informations sur la formation
3️⃣ Problème urgent sur mon élevage
4️⃣ Autre demande

Tapez le *numéro* de votre choix
↩️ Tapez *menu* pour annuler`;
const MENU_SUIVI = `📊 *SUIVRE & AMÉLIORER MON ÉLEVAGE*
_Le Partenaire des Éleveurs_

Quel type d'élevage avez-vous ?

1️⃣ Poulets de chair
2️⃣ Poules pondeuses
3️⃣ Mixte (chair + ponte)

Tapez le *numéro* de votre choix
↩️ Tapez *menu* pour annuler`;

const MENU_PROBLEME = `⚠️ *QUEL EST VOTRE PROBLÈME PRINCIPAL ?*

1️⃣ Mortalité élevée
2️⃣ Croissance lente
3️⃣ Faible production d'œufs
4️⃣ Alimentation & coûts élevés
5️⃣ Maladies & prévention
6️⃣ Rentabilité insuffisante

Tapez le *numéro* de votre choix
↩️ Tapez *menu* pour annuler`;
const MENU_DEBUTANT = `*DÉMARRER MON ÉLEVAGE*
_Le Partenaire des Éleveurs_

Bienvenue ! On va construire votre projet d'élevage ensemble 🐔

Quel est votre objectif principal ?

1️⃣ Vendre de la viande (poulets de chair)
2️⃣ Vendre des œufs (poules pondeuses)
3️⃣ Les deux à la fois

Tapez le numéro de votre choix
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
  const commandesSpeciales = ["prix", "suivi", "prophet", "photo", "races", "upgrade"];
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
  const ADMIN_PHONES = ["2250102642080", "22502642080", "2250153217442"];
const MAINTENANCE = false; // ← true pour activer, false pour ouvrir
// ══════════════════════════════════════════════════════════════

  if (msg === 'marché' || msg === 'marche') {
    await marcheHandler.envoyerMenuMarche(sendWhatsAppMessage, from);
    return null;
  }

  if (msg === 'emploi') {
    await emploiHandler.envoyerMenuEmploi(sendWhatsAppMessage, from);
    return null;
  }

  if (msg === 'prix') {
    // laisser continuer vers le bloc prix existant
  }
  // ══════════════════════════════════════════════════════════════
if (MAINTENANCE && !ADMIN_PHONES.includes(from)) {
  return `🚧 *Bot en maintenance*

Nous améliorons actuellement nos services pour mieux vous servir 🙏

⏳ Merci de réessayer dans quelques heures.`;
}
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
  await clearSession(from);
  emploiHandler.sessions.delete(from);
  emploiHandler.sessions.delete(from + '_boost_emploi');
  marcheHandler.sessions.delete(from);
  marcheHandler.sessions.delete(from + '_boost');
  marcheHandler.sessions.delete(from + '_menu');
  return MENU_PRINCIPAL;
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

    // Tunnel suivi
    "suivi_sujets":        { step: "suivi_type", message: MENU_SUIVI },
    "suivi_probleme":      { step: "suivi_sujets", message: `🐔 *Combien de sujets avez-vous actuellement ?*\n\nExemple : 500` },

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

    // Tunnel premium
    "premium_besoin":      { step: "premium_taille", message: PRESENTATION_PREMIUM },
    "premium_nom":         { step: "premium_besoin", message: `🎯 *Quel est votre besoin principal ?*\n\n1️⃣ Suivi sanitaire\n2️⃣ Optimisation rentabilité\n3️⃣ Coaching personnalisé\n4️⃣ Tout à la fois` },
    "premium_ville":       { step: "premium_nom", message: `👤 *Quel est votre nom complet ?*` },

    // Tunnel estimation
    "estimation_sujets":   { step: "estimation_type", message: MENU_ESTIMATION },
    "estimation_budget":   { step: "estimation_sujets", message: `🐔 *Combien de sujets voulez-vous élever ?*\n\nExemple : 500` },

    // Tunnel conseiller
    "conseiller_nom":      { step: "conseiller_motif", message: MENU_CONSEILLER },
    "conseiller_message":  { step: "conseiller_nom", message: `👤 *Quel est votre nom complet ?*` },

    // Tunnel upgrade
    "upgrade_plan":        { step: null, message: MENU_PRINCIPAL },
    "upgrade_confirmation":{ step: "upgrade_plan", message: `1️⃣ Pro — 15 000 FCFA/mois\n2️⃣ Premium — 25 000 FCFA/mois\n\nTapez *1* ou *2* pour choisir` },

    // Tunnel prophylaxie
    "prophet_sujets":      { step: "prophet_type", message: `1️⃣ Poulets de chair\n2️⃣ Poules pondeuses` },
    "prophet_race":        { step: "prophet_sujets", message: `🐔 *Combien de sujets dans cette bande ?*\n\nExemple : 500` },
    "prophet_date":        { step: "prophet_race", message: `🐣 *Quelle race ?*\n\nExemple : Chairs Blanc` },
    "prophet_nom":         { step: "prophet_date", message: `📅 *Date de mise en place ?*\n\nFormat : JJ/MM/AAAA` },

    // Tunnel suivi bande
    "suivi_bande_mortalite": { step: null, message: MENU_PRINCIPAL },
    "suivi_bande_aliment":   { step: "suivi_bande_mortalite", message: `💀 *Combien de sujets morts aujourd'hui ?*\n\nExemple : 2` },
    "suivi_bande_poids":     { step: "suivi_bande_aliment", message: `🍽️ *Combien de kg d'aliment consommés ?*\n\nExemple : 25` },
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
  "formation_nom", "formation_ville", "formation_inscription",
  "debutant_objectif", "debutant_superficie", "debutant_budget",
  "debutant_nom", "debutant_ville", "photo_symptome", "races_objectif", "races_budget", "races_experience",
  "suivi_type", "suivi_sujets", "suivi_probleme",
  "choix_race", "commande_quantite", "commande_nom", "commande_ville",
  "estimation_race", "premium_nom", "premium_ville",
  "materiel_choix", "materiel_sujets", "materiel_action", "materiel_nom", "materiel_ville",
  "estimation_type", "estimation_sujets", "estimation_budget",
  "formation_niveau", "formation_objectif", "formation_motivation",
  "premium_taille", "premium_besoin", "premium_pitch", "question_libre",
  "conseiller_motif", "conseiller_nom", "conseiller_message",
  "upgrade_plan", "upgrade_confirmation", "prophet_type", "prophet_sujets", "prophet_race", "prophet_date", "prophet_nom",
  "suivi_bande_choix", "suivi_bande_mortalite", "suivi_bande_aliment", "suivi_bande_poids",

  ...(Array.isArray(marcheHandler.MARCHE_STEPS) ? marcheHandler.MARCHE_STEPS : []),
].includes(session?.step);

  if (isSmartQuestion(text) && !isInCriticalFlow && !session?.step
    && !marcheHandler.sessions.has(from)
    && !marcheHandler.sessions.has(from + '_boost')
    && !marcheHandler.sessions.has(from + '_menu')) {
    console.log(`🤖 Question détectée → Claude : "${text}"`);
    const reponseIA = await askClaude(text);
    if (reponseIA) return reponseIA;
  }

// ══════════════════════════════════════════════════════════════
  // 💼 BOURSE DE L'EMPLOI AVICOLE
  // ══════════════════════════════════════════════════════════════

  // Session emploi en cours ?
  if (emploiHandler.sessions.has(from)) {
    const traite = await emploiHandler.traiterEtapeProfil(
      sendWhatsAppMessage, from, text
    );
    if (traite) return null;
  }

  // Mots-clés déclencheurs emploi
  const MOTS_EMPLOI = ['emploi','technicien','recruter','bourse emploi','cherche travail','offre emploi'];

  if (MOTS_EMPLOI.some(m => msg.includes(m))) {
    await emploiHandler.envoyerMenuEmploi(sendWhatsAppMessage, from);
    return null;
  }
  if (msg === 'boulot') {
    await sendWhatsAppMessage(from,
      `💼 *Bourse de l'Emploi Avicole*\n\n` +
      `Consultez profils et offres d'emploi :\n\n` +
      `👉 ${process.env.APP_URL}/emploi\n\n` +
      `↩️ Tapez *menu* pour revenir au menu principal`
    );
    return null;
  }
// Mot-clé profil → lien direct bourse emploi
  if (msg === 'boulot' || msg === 'voir ') {
    await sendWhatsAppMessage(from,
      `👤 *Votre profil sur la Bourse de l'Emploi*\n\n` +
      `Consultez et gérez votre profil ici :\n\n` +
      `👉 ${process.env.APP_URL}/emploi\n\n` +
      `↩️ Tapez *menu* pour revenir au menu principal`
    );
    return null;
  }
  // ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
  // 🛒 MARCHÉ DES VOLAILLES
  // ══════════════════════════════════════════════════════════════
// 🛒 FLOW MARCHÉ
if (marcheHandler.sessions.has(from)) {
  console.log("👉 On est dans le marché");

  const traite = await marcheHandler.traiterEtapePublication(
    sendWhatsAppMessage,
    from,
    text
  );
  if (traite) return null;
}

// 🚀 FLOW BOOST
if (marcheHandler.sessions.has(from + '_boost')) {
  console.log("👉 Test boost");

  const traite = await marcheHandler.traiterChoixBoost(
    sendWhatsAppMessage,
    from,
    text
  );

  if (traite) return null;
}
// 📌 MOTS CLÉS
const MOTS_MARCHE = ['marché', 'marche', 'vendre mes', 'vendre volaille', 'annonce vente'];
const MOTS_PUBLIER = ['publier annonce', 'poster annonce', 'mettre en vente'];
const MOTS_BOOST = ['boost', 'booster'];

// 📢 MENU MARCHÉ
if (MOTS_MARCHE.some(m => msg.includes(m))) {
  await marcheHandler.envoyerMenuMarche(sendWhatsAppMessage, from);
  return null;
}
// ✍️ PUBLIER
if (MOTS_PUBLIER.some(m => msg.includes(m))) {
  await marcheHandler.demarrerPublication(sendWhatsAppMessage, from);
  return null;
}
// 🚀 BOOST
if (MOTS_BOOST.some(m => msg.includes(m)) && !session?.step) {
  await marcheHandler.envoyerMenuBoost(sendWhatsAppMessage, from);
  return null;
}
// Session boost emploi en cours ?
  if (emploiHandler.sessions.has(from + '_boost_emploi')) {
    const traite = await emploiHandler.traiterChoixBoostEmploi(
      sendWhatsAppMessage, from, text
    );
    if (traite) return null;
  }
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
if (msg === "2" && !session?.step && !marcheHandler.sessions.has(from + '_menu') && !emploiHandler.sessions.has(from)) {
    await setSession(from, { step: "suivi_type" });
    return MENU_SUIVI;
}

if (msg === "3" && !session?.step && !marcheHandler.sessions.has(from + '_menu') && !emploiHandler.sessions.has(from)) {
    await setSession(from, { step: "choix_race" });
    return MENU_RACES;
}

if (msg === "4" && !session?.step && !marcheHandler.sessions.has(from + '_menu') && !emploiHandler.sessions.has(from)) {
    await setSession(from, { step: "materiel_choix" });
    return MATERIELS + `\n\n👉 *Qu'est-ce qui vous intéresse ?*\n\n` + MENU_MATERIELS_CHOIX;
}

if (msg === "5" && !session?.step && !marcheHandler.sessions.has(from + '_menu') && !emploiHandler.sessions.has(from)) {
    await setSession(from, { step: "estimation_type" });
    return MENU_ESTIMATION;
}

if (msg === "6" && !session?.step && !marcheHandler.sessions.has(from + '_menu') && !emploiHandler.sessions.has(from)) {
  await setSession(from, { step: "choix_formation" });
  return `🎓 *FORMATIONS EN AVICULTURE*
_Le Partenaire des Éleveurs_

Nous proposons 2 types de formation :

1️⃣ *Formation LIVE Zoom* — 85 000 FCFA
📅 Chaque mois, vendredis & dimanches
👥 En direct avec nos experts

2️⃣ *Formation PRÉ-ENREGISTRÉE* — 27 500 FCFA
⏱️ À votre rythme, accès immédiat
📱 Disponible 24h/24

Tapez *1* ou *2* pour choisir
↩️ Tapez *menu* pour annuler`;
}

if (msg === "7" && !session?.step && !marcheHandler.sessions.has(from + '_menu') && !emploiHandler.sessions.has(from)) {
    await setSession(from, { step: "premium_taille" });
    return PRESENTATION_PREMIUM;
}

if (msg === "8" && !session?.step && !marcheHandler.sessions.has(from + '_menu') && !emploiHandler.sessions.has(from)) {
    await setSession(from, { step: "question_libre" });
    return `🤖 *VOTRE EXPERT AVICOLE PERSONNEL*
_Le Partenaire des Éleveurs_

Je suis votre assistant expert disponible *24H/24* 🐔

Je peux répondre à toutes vos questions sur :

🐣 Races & poussins
🍽️ Alimentation & nutrition
💊 Maladies & traitements
🏗️ Bâtiments & équipements
📈 Rentabilité & gestion
🌡️ Température & conditions d'élevage
📅 Planning & prophylaxie

👉 *Posez votre question maintenant...*

↩️ Tapez *menu* pour revenir au menu principal`;
}

if ((msg === "9" || msg === "contact" || msg === "conseiller") && !session?.step) {
    await setSession(from, { step: "conseiller_motif" });
    return MENU_CONSEILLER;
}

  // ── SYSTÈME DE RELANCES ──  ✅ MAINTENANT BIEN À L'INTÉRIEUR DE handleMessage
  const isMenuChoice = [
  "1","2","3","4","5","6","7","8","9",
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
  if (msg === "1" && !session?.step && !marcheHandler.sessions.has(from + '_menu')) {
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
  if (session?.step === "premium_nom") {
    const nom = text.trim();
    if (nom.length < 2) return `❌ Nom invalide. Entrez votre nom complet.`;
    await setSession(from, { step: "premium_ville", nom });
    return `👤 Nom : *${nom}*\n\n📍 *Quelle est votre ville ?*`;
  }

  if (session?.step === "premium_ville") {
    const ville = text.trim();
    if (ville.length < 2) return `❌ Ville invalide.`;
    try {
      await Registration.create({
        phone: from,
        name: session.nom,
        type: "premium",
        ville,
        profil: "Programme Premium"
      });
      const CONSEILLER_PHONE = process.env.CONSEILLER_PHONE;
      if (CONSEILLER_PHONE) {
        await sendWhatsAppMessage(CONSEILLER_PHONE,
          `⭐ *NOUVELLE DEMANDE PREMIUM !*\n\n👤 Nom : ${session.nom}\n📱 Téléphone : +${from}\n📍 Ville : ${ville}\n\n👉 À contacter sous 24h`
        );
      }
    } catch (err) {
      console.error("❌ Erreur premium :", err.message);
    }
    await clearSession(from);
    return `*Demande Premium enregistrée !*

👤 Nom : ${session.nom}
📍 Ville : ${ville}

✅ Un conseiller vous contactera sous *24h* pour vous présenter le programme et ses tarifs.

📞 Urgence : *+225 01 02 64 20 80*

↩️ Tapez *menu* pour revenir au menu principal`;
  }
  // ── TUNNEL SUIVI & AMÉLIORATION ──
  if (session?.step === "suivi_type") {
    const types = {
      "1": "Poulets de chair",
      "2": "Poules pondeuses",
      "3": "Mixte (chair + ponte)"
    };
    if (!types[msg]) return `❓ Tapez *1*, *2* ou *3* pour choisir votre type d'élevage.`;
    await setSession(from, { ...session, step: "suivi_sujets", type: types[msg] });
    return `✅ Type : *${types[msg]}*\n\n🐔 *Combien de sujets avez-vous actuellement ?*\n\nExemple : 500`;
  }

  if (session?.step === "suivi_sujets") {
  const { valeur, question, reponse } = await parseNumberOrAsk(text, session, "indiquer le nombre de sujets", "un nombre. Exemple : *500*");
  if (question) return reponse;
  const sujets = valeur;
  if (!sujets || sujets < 1) return `❌ Entrez un nombre valide. Exemple : *500*`;
    await setSession(from, { ...session, step: "suivi_probleme", sujets });
    return MENU_PROBLEME;
  }

  if (session?.step === "suivi_probleme") {
  const problemes = {
    "1": "Mortalité élevée",
    "2": "Croissance lente",
    "3": "Faible production d'œufs",
    "4": "Alimentation & coûts élevés",
    "5": "Maladies & prévention",
    "6": "Rentabilité insuffisante"
  };
  if (!problemes[msg]) return `❓ Tapez un numéro entre *1* et *6*.`;

  // Vérification limite diagnostic
  const { peut, restantes } = await peutFaireDiagnostic(from);
  if (!peut) {
    const CONSEILLER_PHONE = process.env.CONSEILLER_PHONE;
    if (CONSEILLER_PHONE) {
      await sendWhatsAppMessage(CONSEILLER_PHONE,
        `⭐ *PROSPECT UPGRADE !*\n\n📱 Téléphone : +${from}\n💡 A atteint sa limite de diagnostics gratuits\n\n🔥 À contacter pour abonnement Pro !`
      );
    }
    await clearSession(from);
    return messageUpgrade("diagnostic");
  }

  const probleme = problemes[msg];
  const { type, sujets } = session;

    // Claude génère un diagnostic personnalisé
    const prompt = `Tu es un expert vétérinaire et consultant en aviculture en Côte d'Ivoire.
Un éleveur a ce profil :
- Type d'élevage : ${type}
- Nombre de sujets : ${sujets}
- Problème principal : ${probleme}

Génère un diagnostic personnalisé en 5 lignes maximum :
1. Cause probable du problème
2. Solution immédiate à appliquer aujourd'hui
3. Conseil de prévention pour éviter la récidive
4. Indicateur à surveiller cette semaine
5. Recommande le programme premium de suivi du Partenaire des Éleveurs

Termine par : "Souhaitez-vous rejoindre notre programme premium de suivi ?"
Puis : "↩️ Tapez *menu* pour voir nos services"`;

    let diagnostic = "";
    try {
      diagnostic = await askClaude(prompt);
    } catch (err) {
      diagnostic = `⚠️ Problème détecté : *${probleme}* sur votre élevage de ${sujets} ${type}.\n\nNous vous recommandons de contacter immédiatement un conseiller.\n\n👉 Tapez *contact* pour parler à un expert.\n\n↩️ Tapez *menu* pour voir nos services`;
    }

    // Notifie le conseiller
    try {
      const CONSEILLER_PHONE = process.env.CONSEILLER_PHONE;
      if (CONSEILLER_PHONE) {
        await sendWhatsAppMessage(CONSEILLER_PHONE,
          `⚠️ *ÉLEVEUR EN DIFFICULTÉ !*\n\n📱 Téléphone : +${from}\n🐔 Type : ${type}\n📦 Sujets : ${sujets}\n❗ Problème : ${probleme}\n\n👉 À contacter rapidement !`
        );
      }
    } catch (err) {
      console.error("❌ Erreur notification suivi :", err.message);
    }

    await clearSession(from);
    return diagnostic;
  }
  // ── TUNNEL ACHAT POUSSINS ──
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
  if (session?.step === "premium_taille") {
    const tailles = {
      "1": "Pas encore démarré",
      "2": "Moins de 500 sujets",
      "3": "500 à 2000 sujets",
      "4": "Plus de 2000 sujets"
    };
    if (!tailles[msg]) return `❓ Tapez *1*, *2*, *3* ou *4* pour choisir.`;
    await setSession(from, { ...session, step: "premium_besoin", taille: tailles[msg] });
    return `✅ Élevage : *${tailles[msg]}*\n\n🎯 *Quel est votre besoin principal ?*\n\n1️⃣ Suivi sanitaire\n2️⃣ Optimisation rentabilité\n3️⃣ Coaching personnalisé\n4️⃣ Tout à la fois\n\n↩️ Tapez *menu* pour annuler`;
  }

  if (session?.step === "premium_besoin") {
    const besoins = {
      "1": "Suivi sanitaire",
      "2": "Optimisation rentabilité",
      "3": "Coaching personnalisé",
      "4": "Accompagnement complet"
    };
    if (!besoins[msg]) return `❓ Tapez *1*, *2*, *3* ou *4* pour choisir votre besoin.`;

    const besoin = besoins[msg];
    const { taille } = session;

    const prompt = `Tu es commercial senior en élevage avicole en Côte d'Ivoire.
Un prospect veut rejoindre le programme premium :
- Taille élevage : ${taille}
- Besoin principal : ${besoin}

Génère une proposition commerciale personnalisée en 4-5 lignes :
1. Montre que tu comprends son profil et ses défis
2. Explique comment le programme premium résout exactement son problème
3. Donne 2 bénéfices concrets et chiffrés
4. Crée l'urgence : places limitées chaque mois

Termine par : "Puis-je avoir votre nom pour réserver votre place ?"`;

    let pitch = "";
    try {
      pitch = await askClaude(prompt);
    } catch (err) {
      pitch = `⭐ Le programme premium est exactement fait pour votre profil !\n\nNos experts vous accompagneront personnellement pour maximiser votre rentabilité.\n\nPuis-je avoir votre nom pour réserver votre place ?`;
    }

    await setSession(from, { ...session, step: "premium_nom", besoin });
    return pitch;
  }

  if (session?.step === "premium_nom") {
    const nom = text.trim();
    if (nom.length < 2) return `❌ Nom invalide. Entrez votre nom complet.`;
    await setSession(from, { ...session, step: "premium_ville", nom });
    return `✅ Parfait *${nom}* ! 🎉\n\n📍 *Quelle est votre ville ?*`;
  }

  if (session?.step === "premium_ville") {
    const ville = text.trim();
    if (ville.length < 2) return `❌ Ville invalide.`;
    const { taille, besoin, nom } = session;

    try {
      await Registration.create({
        phone: from,
        name: nom,
        type: "premium",
        ville,
        profil: `Premium | ${taille} | ${besoin}`
      });

      const CONSEILLER_PHONE = process.env.CONSEILLER_PHONE;
      if (CONSEILLER_PHONE) {
        await sendWhatsAppMessage(CONSEILLER_PHONE,
          `⭐ *NOUVEAU PROSPECT PREMIUM !*\n\n👤 Nom : ${nom}\n📱 Téléphone : +${from}\n📍 Ville : ${ville}\n🐔 Élevage : ${taille}\n🎯 Besoin : ${besoin}\n\n🔥 PROSPECT CHAUD — Contacter immédiatement !`
        );
      }
    } catch (err) {
      console.error("❌ Erreur premium :", err.message);
    }

    await clearSession(from);
    return `🎉 *Votre place est réservée !*

👤 Nom : ${nom}
📍 Ville : ${ville}
🐔 Élevage : ${taille}
🎯 Besoin : ${besoin}

✅ Un conseiller expert vous contactera sous *24h* pour vous présenter le programme et ses tarifs.

📞 Urgence : *+225 01 02 64 20 80*

↩️ Tapez *menu* pour revenir au menu principal`;
  }
  // ── TUNNEL QUESTION LIBRE EXPERT ──
  if (session?.step === "question_libre") {
  // Vérification limite
  const { peut, restantes } = await peutPoserQuestion(from);
  if (!peut) {
    // Notifier le conseiller — lead chaud
    const CONSEILLER_PHONE = process.env.CONSEILLER_PHONE;
    if (CONSEILLER_PHONE) {
      await sendWhatsAppMessage(CONSEILLER_PHONE,
        `⭐ *PROSPECT UPGRADE !*\n\n📱 Téléphone : +${from}\n💡 A atteint sa limite de questions gratuites\n\n🔥 À contacter pour abonnement Pro !`
      );
    }
    await clearSession(from);
    return messageUpgrade("question");
  }

  const prompt = `Tu es un expert vétérinaire et consultant en aviculture en Côte d'Ivoire avec 20 ans d'expérience.
Tu travailles pour "Le Partenaire des Éleveurs".

Un éleveur te pose cette question : "${text}"

Réponds en expert avec :
1. Une réponse précise, pratique et adaptée au contexte ivoirien
2. Un conseil concret applicable immédiatement
3. Une mise en garde si nécessaire
4. Une recommandation de produit ou service si pertinent

STYLE :
- Maximum 5 lignes
- Utilise des emojis pertinents
- Ton chaleureux et professionnel
- Données chiffrées si possible

FIN OBLIGATOIRE :
- "❓ Avez-vous d'autres questions ?"${restantes > 0 ? `\n- "💡 Il vous reste *${restantes} question(s)* gratuite(s) ce mois-ci"` : ""}
- "↩️ Tapez *menu* pour voir nos services"
- "📞 Besoin d'un suivi personnalisé ? Tapez *contact*"`;

  let reponse = "";
  try {
    reponse = await askClaude(prompt);
  } catch (err) {
    reponse = `Je n'ai pas pu traiter votre question.\n\n📞 Contactez directement notre expert :\n*+225 01 02 64 20 80*\n\n↩️ Tapez *menu* pour revenir au menu principal`;
  }
  return reponse;
}
  // ── TUNNEL CONSEILLER ──
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
if (msg === "prix" && !session?.step) {
  try {
    const prixMarche = await PrixMarche.find().sort({ updatedAt: -1 });
    
    const lastUpdate = new Date().toLocaleDateString("fr-FR");

    const lignesPrixMarche = prixMarche.length > 0
      ? prixMarche.map(p => `• ${p.produit} — *${p.prix.toLocaleString("fr-FR")} ${p.unite}* (${p.ville})`).join("\n")
      : "_Prix marché non encore disponibles_";

    return `📊 *PRIX & TARIFS — ${lastUpdate}*
_Le Partenaire des Éleveurs_

🐣 *NOS PRIX POUSSINS*
- Chairs Blanc → *650 FCFA/unité*
- Chairs Roux → *600 FCFA/unité*
- Hybrides → *450 FCFA/unité*
- Pintadeaux Galor → *1 100 FCFA/unité*
- Pontes ISA Brown → *1 150 FCFA/unité*
- Bleu Hollande → *400 FCFA/unité*
- Coquelet Blanc → *150 FCFA/unité*
- Pintadeaux Hybrides → *900 FCFA/unité*

📈 *PRIX DU MARCHÉ (vente)*
${lignesPrixMarche}

⚠️ _Prix indicatifs, peuvent varier selon les marchés_

💡 Tapez *3* pour commander vos poussins
💡 Tapez *5* pour estimer votre rentabilité
↩️ Tapez *menu* pour revenir au menu principal`;

  } catch (err) {
    console.error("❌ Erreur prix :", err.message);
    return `❌ Impossible de charger les prix.\n\n📞 *+225 01 02 64 20 80*\n↩️ Tapez *menu*`;
  }
}
  // ── COMPARATEUR DE RACES ──
if (msg === "races" && !session?.step) {
  await setSession(from, { step: "races_objectif" });
  return `🐣 *COMPARATEUR DE RACES*
_Le Partenaire des Éleveurs_

Je vais vous recommander la race idéale pour votre projet 🎯

*Quel est votre objectif principal ?*

1️⃣ Vendre de la viande (chair)
2️⃣ Vendre des œufs (ponte)
3️⃣ Les deux à la fois
4️⃣ Élevage familial (consommation)

↩️ Tapez *menu* pour annuler`;
}

if (session?.step === "races_objectif") {
  const objectifs = {
    "1": "Vente de viande (chair)",
    "2": "Vente d'œufs (ponte)",
    "3": "Chair et ponte mixte",
    "4": "Élevage familial"
  };
  if (!objectifs[msg]) return `❓ Tapez *1*, *2*, *3* ou *4* pour choisir.`;
  await setSession(from, { ...session, step: "races_budget", objectif: objectifs[msg] });
  return `✅ Objectif : *${objectifs[msg]}*

💰 *Quel est votre budget pour les poussins ?*

1️⃣ Moins de 200 000 FCFA
2️⃣ 200 000 à 500 000 FCFA
3️⃣ Plus de 500 000 FCFA

↩️ Tapez *menu* pour annuler`;
}

if (session?.step === "races_budget") {
  const budgets = {
    "1": "Moins de 200 000 FCFA",
    "2": "200 000 à 500 000 FCFA",
    "3": "Plus de 500 000 FCFA"
  };
  if (!budgets[msg]) return `❓ Tapez *1*, *2* ou *3* pour choisir.`;
  await setSession(from, { ...session, step: "races_experience", budget: budgets[msg] });
  return `✅ Budget : *${budgets[msg]}*

🧑‍🌾 *Quelle est votre expérience en élevage ?*

1️⃣ Débutant complet
2️⃣ Quelques expériences
3️⃣ Éleveur expérimenté

↩️ Tapez *menu* pour annuler`;
}

if (session?.step === "races_experience") {
  const experiences = {
    "1": "Débutant complet",
    "2": "Quelques expériences",
    "3": "Éleveur expérimenté"
  };
  if (!experiences[msg]) return `❓ Tapez *1*, *2* ou *3* pour choisir.`;

  const { objectif, budget } = session;
  const experience = experiences[msg];

  const prompt = `Tu es expert en sélection de races avicoles en Côte d'Ivoire pour "Le Partenaire des Éleveurs".

Un éleveur cherche la race idéale avec ce profil :
- Objectif : ${objectif}
- Budget poussins : ${budget}
- Expérience : ${experience}

Nos races disponibles et prix :
- Chairs Blanc : 650 FCFA/unité — croissance rapide, 45 jours, idéal débutant
- Chairs Roux : 600 FCFA/unité — rustique, résistant, bon pour chaleur ivoirienne
- Hybrides : 450 FCFA/unité — économique, polyvalent
- Pintadeaux Galor : 1100 FCFA/unité — viande premium, marché haut de gamme
- Pontes ISA Brown : 1150 FCFA/unité — 300 œufs/an, meilleure pondeuse
- Bleu Hollande : 400 FCFA/unité — très rustique, peu exigeant
- Coquelet Blanc : 150 FCFA/unité — très économique, marché local
- Pintadeaux Hybrides : 900 FCFA/unité — viande savoureuse, résistant

Génère une recommandation personnalisée en 5-6 lignes :
1. 🥇 Race recommandée N°1 avec justification précise
2. 🥈 Race alternative N°2
3. 💰 Estimation du nombre de sujets possibles avec ce budget
4. ⚠️ Un conseil clé pour ce profil d'éleveur
5. Invite à commander

Termine par :
"👉 Tapez *3* pour commander vos poussins"
"↩️ Tapez *menu* pour voir nos services"`;

  let recommandation = "";
  try {
    recommandation = await askClaude(prompt);
  } catch (err) {
    recommandation = `Pour votre profil, nous recommandons les Chairs Blanc à 650 FCFA/unité.\n\n👉 Tapez *3* pour commander\n↩️ Tapez *menu* pour voir nos services`;
  }

  await clearSession(from);
  return `🐣 *Recommandation personnalisée*\n\n${recommandation}`;
}
  // ── TUNNEL DIAGNOSTIC PHOTO ──
if (msg === "photo" && !session?.step) {
  const premium = await isPremium(from);
  if (!premium) {
    return `⭐ *Fonctionnalité Premium*

Le diagnostic photo est réservé aux abonnés Pro et Premium.

✅ *Avec ce service :*
✓ Envoyez une photo de votre poulet malade
✓ Recevez un diagnostic vétérinaire en 30 secondes
✓ Traitement recommandé immédiatement

💰 *Pro — 15 000 FCFA/mois seulement*

👉 Tapez *upgrade* pour vous abonner
↩️ Tapez *menu* pour revenir au menu principal`;
  }
  await setSession(from, { step: "photo_symptome" });
  return `📸 *DIAGNOSTIC PHOTO*
_Dr. Avicole — Le Partenaire des Éleveurs_

Envoyez une photo claire de votre poulet ou de votre élevage.

✅ *Conseils pour une bonne photo :*
✓ Photo nette et bien éclairée
✓ Montrez bien les symptômes visibles
✓ Incluez plusieurs angles si possible

💬 *Décrivez aussi brièvement le problème* dans votre message photo.

Exemple : _"Mon poulet boite depuis 2 jours"_

📷 *Envoyez votre photo maintenant...*

↩️ Tapez *menu* pour annuler`;
}
  // ── TUNNEL SUIVI BANDE ACTIF ──
if (msg === "suivi" && !session?.step) {
  const premium = await isPremium(from);
  if (!premium) {
    return `⭐ *Fonctionnalité Premium*

Le suivi de bande actif est réservé aux abonnés Pro et Premium.

✅ *Avec ce service vous pouvez :*
✓ Saisir mortalité, aliment et poids chaque jour
✓ Recevoir un résumé hebdomadaire automatique
✓ Suivre l'évolution de votre bande en temps réel

💰 *Pro — 15 000 FCFA/mois seulement*

👉 Tapez *upgrade* pour vous abonner
↩️ Tapez *menu* pour revenir au menu principal`;
  }

  const bandes = await getBandesActives(from);
  if (bandes.length === 0) {
    return `❌ *Aucune bande enregistrée*

Vous devez d'abord enregistrer une bande pour utiliser le suivi.

🌱 Tapez *prophet* pour enregistrer votre bande
↩️ Tapez *menu* pour revenir au menu principal`;
  }

  if (bandes.length === 1) {
    await setSession(from, { step: "suivi_bande_mortalite", bandeNom: bandes[0].nom, dateMiseEnPlace: bandes[0].dateMiseEnPlace });
    return `📊 *SAISIE JOURNALIÈRE — ${bandes[0].nom}*
_Le Partenaire des Éleveurs_

🗓️ Date : *${new Date().toLocaleDateString("fr-FR")}*

💀 *Combien de sujets morts aujourd'hui ?*

Exemple : 2 (tapez 0 si aucune mortalité)`;
  }

  // Plusieurs bandes — faire choisir
  const liste = bandes.map((b, i) => `${i + 1}️⃣ ${b.nom}`).join("\n");
  await setSession(from, { step: "suivi_bande_choix", bandes: bandes.map(b => ({ nom: b.nom, dateMiseEnPlace: b.dateMiseEnPlace })) });
  return `📊 *SUIVI DE BANDE*

Quelle bande voulez-vous mettre à jour ?

${liste}

Tapez le numéro de votre choix
↩️ Tapez *menu* pour annuler`;
}

if (session?.step === "suivi_bande_choix") {
  const index = parseInt(msg) - 1;
  if (isNaN(index) || !session.bandes[index]) return `❓ Tapez un numéro valide.`;
  const bande = session.bandes[index];
  await setSession(from, { step: "suivi_bande_mortalite", bandeNom: bande.nom, dateMiseEnPlace: bande.dateMiseEnPlace });
  return `📊 *SAISIE JOURNALIÈRE — ${bande.nom}*

🗓️ Date : *${new Date().toLocaleDateString("fr-FR")}*

💀 *Combien de sujets morts aujourd'hui ?*

Exemple : 2 (tapez 0 si aucune mortalité)`;
}

if (session?.step === "suivi_bande_mortalite") {
  const { valeur, question, reponse } = await parseNumberOrAsk(text, session, "saisir la mortalité du jour", "un nombre. Exemple : *2* (tapez 0 si aucune mortalité)");
  if (question) return reponse;
  const mortalite = valeur;
  if (mortalite === null) return `❌ Entrez un nombre valide. Exemple : *2*`;
  await setSession(from, { ...session, step: "suivi_bande_aliment", mortalite });
  return `✅ Mortalité : *${mortalite} sujet(s)*

🍽️ *Combien de kg d'aliment consommés aujourd'hui ?*

Exemple : 25`;
}

if (session?.step === "suivi_bande_aliment") {
  const aliment = parseFloat(text.trim().replace(",", "."));
  if (isNaN(aliment) || aliment < 0) return `❌ Entrez un nombre valide. Exemple : *25*`;
  await setSession(from, { ...session, step: "suivi_bande_poids", aliment });
  return `✅ Aliment : *${aliment} kg*

⚖️ *Quel est le poids moyen de vos sujets aujourd'hui ?* (en grammes)

Exemple : 850
Tapez *0* si vous n'avez pas pesé aujourd'hui`;
}

if (session?.step === "suivi_bande_poids") {
  const poidsMoyen = parseInt(text.trim());
  if (isNaN(poidsMoyen) || poidsMoyen < 0) return `❌ Entrez un nombre valide. Exemple : *850*`;
  const { bandeNom, mortalite, aliment, dateMiseEnPlace } = session;

  try {
    await enregistrerSuivi(from, bandeNom, { mortalite, aliment, poidsMoyen, dateMiseEnPlace });
  } catch (err) {
    console.error("❌ Erreur enregistrement suivi :", err.message);
  }

  // Analyse IA rapide
  const jourBande = dateMiseEnPlace
    ? Math.floor((new Date() - new Date(dateMiseEnPlace)) / (1000 * 60 * 60 * 24))
    : "?";

  const prompt = `Tu es expert en aviculture en Côte d'Ivoire.
Un éleveur saisit ses données du jour pour sa bande "${bandeNom}" :
- Jour de la bande : J${jourBande}
- Mortalité aujourd'hui : ${mortalite} sujets
- Aliment consommé : ${aliment} kg
- Poids moyen : ${poidsMoyen}g

En 2-3 lignes maximum :
1. Évalue si ces chiffres sont normaux pour ce stade
2. Donne 1 conseil pratique immédiat si nécessaire
3. Un mot d'encouragement si tout va bien

Sois concis et pratique.`;

  let analyse = "";
  try {
    analyse = await askClaude(prompt);
  } catch (err) {
    analyse = "✅ Données enregistrées avec succès.";
  }

  await clearSession(from);
  return `✅ *Saisie enregistrée — ${new Date().toLocaleDateString("fr-FR")}*

📋 *Bande : ${bandeNom}*
💀 Mortalité : ${mortalite} sujet(s)
🍽️ Aliment : ${aliment} kg
⚖️ Poids moyen : ${poidsMoyen > 0 ? poidsMoyen + "g" : "Non pesé"}

🤖 *Analyse IA :*
${analyse}

↩️ Tapez *menu* pour revenir au menu principal`;
}
  // ── TUNNEL PROPHYLAXIE ──
if (msg === "prophet" && !session?.step) {
  const premium = await isPremium(from);
  if (!premium) {
    return `⭐ *Fonctionnalité Premium*

Le calendrier de prophylaxie automatique est réservé aux abonnés Pro et Premium.

✅ *Avec ce service vous recevez :*
✓ Alertes vaccins automatiques sur WhatsApp
✓ Rappels médicaments jour par jour
✓ Suivi complet de votre bande

💰 *Pro — 15 000 FCFA/mois seulement*

👉 Tapez *upgrade* pour vous abonner
↩️ Tapez *menu* pour revenir au menu principal`;
  }
  await setSession(from, { step: "prophet_type" });
  return `🌱 *ENREGISTRER UNE BANDE*
_Le Partenaire des Éleveurs_

Nous allons configurer vos alertes prophylaxie automatiques 🔔

Quel type d'élevage ?

1️⃣ Poulets de chair
2️⃣ Poules pondeuses

↩️ Tapez *menu* pour annuler`;
}

if (session?.step === "prophet_type") {
  const types = { "1": "chair", "2": "ponte" };
  if (!types[msg]) return `❓ Tapez *1* pour chair ou *2* pour ponte.`;
  await setSession(from, { ...session, step: "prophet_sujets", typeBande: types[msg] });
  return `✅ Type : *${msg === "1" ? "Poulets de chair" : "Poules pondeuses"}*

🐔 *Combien de sujets dans cette bande ?*

Exemple : 500`;
}

if (session?.step === "prophet_sujets") {
  const sujets = parseInt(text.trim());
  if (isNaN(sujets) || sujets < 1) return `❌ Entrez un nombre valide. Exemple : *500*`;
  await setSession(from, { ...session, step: "prophet_race", nombreSujets: sujets });
  return `✅ Nombre de sujets : *${sujets}*

🐣 *Quelle race ?*

Exemple : Chairs Blanc, ISA Brown, Pintadeaux...`;
}

if (session?.step === "prophet_race") {
  const race = text.trim();
  if (race.length < 2) return `❌ Entrez une race valide.`;
  await setSession(from, { ...session, step: "prophet_date", race });
  return `✅ Race : *${race}*

📅 *Quelle est la date de mise en place de votre bande ?*

Format : JJ/MM/AAAA
Exemple : 28/03/2026`;
}

if (session?.step === "prophet_date") {
  const dateTxt = text.trim();
  const parts = dateTxt.split("/");
  if (parts.length !== 3) return `❌ Format invalide. Utilisez JJ/MM/AAAA\nExemple : *28/03/2026*`;
  const dateMiseEnPlace = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  if (isNaN(dateMiseEnPlace.getTime())) return `❌ Date invalide. Exemple : *28/03/2026*`;
  await setSession(from, { ...session, step: "prophet_nom", dateMiseEnPlace: dateMiseEnPlace.toISOString() });
  return `✅ Date de mise en place : *${dateTxt}*

📝 *Donnez un nom à cette bande* (pour identifier vos alertes)

Exemple : Bande Mars 2026, Lot A...`;
}

if (session?.step === "prophet_nom") {
  const nom = text.trim();
  if (nom.length < 2) return `❌ Nom trop court.`;
  const { typeBande, nombreSujets, race, dateMiseEnPlace } = session;

  try {
    await enregistrerBande(from, {
      nom,
      typeBande,
      nombreSujets,
      dateMiseEnPlace,
      race
    });

    const CONSEILLER_PHONE = process.env.CONSEILLER_PHONE;
    if (CONSEILLER_PHONE) {
      await sendWhatsAppMessage(CONSEILLER_PHONE,
        `🌱 *NOUVELLE BANDE ENREGISTRÉE !*\n\n📱 Téléphone : +${from}\n📝 Nom : ${nom}\n🐔 Type : ${typeBande}\n📦 Sujets : ${nombreSujets}\n🐣 Race : ${race}\n📅 Mise en place : ${dateMiseEnPlace}`
      );
    }
  } catch (err) {
    console.error("❌ Erreur enregistrement bande :", err.message);
  }

  await clearSession(from);
  return `🎉 *Bande enregistrée avec succès !*

📋 *Récapitulatif :*
📝 Nom : ${nom}
🐔 Type : ${typeBande === "chair" ? "Poulets de chair" : "Poules pondeuses"}
📦 Sujets : ${nombreSujets}
🐣 Race : ${race}
📅 Mise en place : ${session.dateMiseEnPlace?.split("T")[0]}

✅ *Vos alertes prophylaxie sont activées !*

Vous recevrez automatiquement sur WhatsApp :
🔔 Rappels de vaccination
💊 Alertes médicaments
📊 Contrôles de croissance

↩️ Tapez *menu* pour revenir au menu principal`;
}
  // ── TUNNEL UPGRADE ──
  if (msg === "upgrade") {
  await setSession(from, { step: "upgrade_plan" });
  return `⭐ *PASSER À L'ABONNEMENT*
_Le Partenaire des Éleveurs_

Choisissez votre formule :

1️⃣ *Pro — 15 000 FCFA/mois*
✓ Questions expert illimitées
✓ Diagnostics illimités
✓ Calendrier de prophylaxie
✓ Suivi de bande actif

2️⃣ *Premium — 25 000 FCFA/mois*
✓ Tout Pro inclus
✓ Coaching hebdomadaire expert
✓ Visite terrain sur demande
✓ Rapport mensuel de performance

Tapez *1* ou *2* pour choisir
↩️ Tapez *menu* pour annuler`;
}

if (session?.step === "upgrade_plan") {
  const plans = { "1": { nom: "Pro", prix: "15 000" }, "2": { nom: "Premium", prix: "25 000" } };
  if (!plans[msg]) return `❓ Tapez *1* pour Pro ou *2* pour Premium.`;
  
  const plan = plans[msg];
  await setSession(from, { step: "upgrade_confirmation", plan: plan.nom.toLowerCase(), prix: plan.prix });
  
  return `✅ *Plan ${plan.nom} sélectionné — ${plan.prix} FCFA/mois*

📲 *Instructions de paiement :*

Effectuez votre paiement via :

🌊 *Wave*
👉 Envoyez *${plan.prix} FCFA* au *+225 01 02 64 20 80*
📝 Motif : *Abonnement ${plan.nom} - ${from}*

🟠 *Orange Money*
👉 Envoyez *${plan.prix} FCFA* au *+225 07 09 31 01 01*
📝 Motif : *Abonnement ${plan.nom} - ${from}*

✅ *Après le paiement :*
Envoyez la capture d'écran de votre reçu à ce numéro :
📱 *+225 01 02 64 20 80*

⏳ Activation sous *2h* après réception du reçu.

↩️ Tapez *menu* pour annuler`;
}

if (session?.step === "upgrade_confirmation") {
  const { plan, prix } = session;
  
  // Notifier le conseiller
  const CONSEILLER_PHONE = process.env.CONSEILLER_PHONE;
  if (CONSEILLER_PHONE) {
    await sendWhatsAppMessage(CONSEILLER_PHONE,
      `💰 *PAIEMENT EN ATTENTE !*\n\n📱 Téléphone : +${from}\n⭐ Plan : ${plan.toUpperCase()}\n💵 Montant : ${prix} FCFA\n\n👉 Attendre reçu de paiement puis activer :\ncurl -X POST https://autoflow-whatsapp-bot.onrender.com/admin/activer-premium -H "Content-Type: application/json" -d '{"phone":"${from}","plan":"${plan}","dureeJours":30}'`
    );
  }
  
  await clearSession(from);
  return `🎉 *Parfait !*

Notre équipe a été notifiée de votre demande.

📋 *Récapitulatif :*
⭐ Plan : ${plan.toUpperCase()}
💰 Montant : ${prix} FCFA/mois
📱 Votre numéro : +${from}

✅ Dès réception de votre reçu, votre accès sera activé sous *2h*.

📞 Une question ? Contactez-nous :
*+225 01 02 64 20 80*

↩️ Tapez *menu* pour revenir au menu principal`;
}
  // ── CLAUDE AI — fallback intelligent selon le contexte ──
console.log(`🤖 Fallback Claude : "${text}" | step: ${session?.step}`);

if (session?.step && !marcheHandler.sessions.has(from)) {
  const contextPrompt = `Tu es l'assistant du Partenaire des Éleveurs en Côte d'Ivoire. Un client est en train de naviguer dans le bot et a tapé un message inattendu. Contexte de navigation : ${session.step} Message du client : "${text}"  Analyse sa demande et : 1. Réponds à sa question si c'est une question avicole 2. Ou oriente-le vers la bonne option du menu 3. Rappelle-lui les choix disponibles dans son contexte actuel  Termine toujours par les choix disponibles dans son contexte ou par : "↩️ Tapez *menu* pour voir toutes nos options"`;
  const reponseIA = await askClaude(contextPrompt);
  if (reponseIA) return reponseIA;
} else if (!marcheHandler.sessions.has(from)
        && !marcheHandler.sessions.has(from + '_boost')
        && !marcheHandler.sessions.has(from + '_menu')) {
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

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public/dashboard.html"));
});
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
      `✅ *Compte activé avec succès !*\n\n` +
      `Bienvenue sur *Le Partenaire des Éleveurs* 🐔\n\n` +
      `👉 Accédez à votre espace :\n` +
      `${process.env.APP_URL}/eleveur/${tel}\n\n` +
      `↩️ Tapez *menu* pour accéder à tous nos services`
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

// Bandes de l'éleveur
// Bandes de l'éleveur
app.get("/api/eleveur/:phone/bandes", async (req, res) => {
  try {
    const bandes = await Bande.find({ phone: req.params.phone })
      .sort({ createdAt: -1 })
      .lean();
    res.json(bandes);
  } catch (err) {
    res.json([]);
  }
});

// Suivi de l'éleveur
app.get("/api/eleveur/:phone/suivi", async (req, res) => {
  try {
    const SuiviBande = require('./models/SuiviBande');
    const suivi = await SuiviBande.find({ phone: req.params.phone })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    res.json(suivi);
  } catch (err) {
    res.json([]);
  }
});

// Enregistrer saisie suivi
app.post("/api/eleveur/:phone/suivi", async (req, res) => {
  try {
    const { bandeNom, mortalite, aliment, poidsMoyen } = req.body;
    await mongoose.connection.collection('suivivandes').insertOne({
      phone:      req.params.phone,
      bandeNom,
      mortalite:  mortalite || 0,
      aliment:    aliment || 0,
      poidsMoyen: poidsMoyen || 0,
      createdAt:  new Date()
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Commandes de l'éleveur
app.get("/api/eleveur/:phone/commandes", async (req, res) => {
  try {
    const commandes = await Order.find({ phone: req.params.phone })
      .sort({ createdAt: -1 })
      .lean();
    res.json(commandes);
  } catch (err) {
    res.json([]);
  }
});

// Provende de l'éleveur
app.get("/api/eleveur/:phone/provende", async (req, res) => {
  try {
    const provende = await mongoose.connection.collection('provendes')
      .find({ phone: req.params.phone })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();
    res.json(provende);
  } catch (err) {
    res.json([]);
  }
});

// Enregistrer achat provende
app.post("/api/eleveur/:phone/provende", async (req, res) => {
  try {
    const { bandeNom, quantite, prixUnitaire, fournisseur, type } = req.body;
    await mongoose.connection.collection('provendes').insertOne({
      phone:        req.params.phone,
      bandeNom,
      quantite,
      prixUnitaire: prixUnitaire || 0,
      fournisseur:  fournisseur || '',
      type:         type || 'achat',
      createdAt:    new Date()
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/admin-marche", (req, res) => {
  res.sendFile(path.join(__dirname, "public/admin-marche.html"));
});

app.get("/debug-subscription", async (req, res) => {
  try {
    const wabaId = process.env.WABA_ID;
    const token = process.env.WHATSAPP_TOKEN;
    const [subRes, phoneRes] = await Promise.all([
      fetch(`https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`https://graph.facebook.com/v21.0/${wabaId}/phone_numbers`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);
    res.json({
      subscriptions: await subRes.json(),
      phones: await phoneRes.json(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/register-phone", async (req, res) => {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/register`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          pin: "000000",
        }),
      }
    );
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
  const session = await getSession(from);
  // ── Télécharger et uploader l'image sur Cloudinary ───────────
  let cloudinaryUrl = null;
  try {
    const mediaId = message?.image?.id || message?.video?.id || null;
    if (mediaId) {
      const { base64, mimeType } = await downloadWhatsAppImage(mediaId);
      const folder = 'lpe-bot';
      cloudinaryUrl = await uploadImageFromBase64(base64, mimeType, folder);
      console.log('✅ Image uploadée sur Cloudinary :', cloudinaryUrl);
    }
  } catch (err) {
    console.error('❌ Erreur téléchargement image :', err.message);
  }

  const mediaType = type;

  // ── Marché en priorité ──────────────────────────────────────
  if (!marcheHandler.sessions.has(from)) {
    const sessionDB = await getSession(from);
    if (sessionDB?.marcheEtape) {
      marcheHandler.sessions.set(from, {
        etape: sessionDB.marcheEtape,
        data:  sessionDB.marcheData || {}
      });
    }
  }

  const traitePub = await marcheHandler.traiterMediaMarche(
    sendWhatsAppMessage, from, cloudinaryUrl, mediaType
  );
  if (traitePub) return;

  // ── Photo emploi ─────────────────────────────────────────────
  const traiteEmploi2 = await emploiHandler.traiterMediaEmploi(
    sendWhatsAppMessage, from, cloudinaryUrl
  );
  if (traiteEmploi2) return;
  // Doublon de webhook ou session déjà avancée : ne pas afficher le fallback
  if (marcheHandler.sessions.has(from)) return;

  if (type !== "image") return; // hors marché, seules les images ont un diagnostic
  if (session?.step === "photo_symptome") {
    const mediaId = message.image.id;
    const caption = message.image.caption || "";

    await sendWhatsAppMessage(from,
      `🔍 *Analyse de votre photo en cours...*\n\n⏳ Dr. Avicole examine votre image. Résultat dans quelques secondes...`
    );

    try {
      const { base64, mimeType } = await downloadWhatsAppImage(mediaId);
      const diagnostic = await askClaudeWithImage(
        caption || "Analyse cette image de poulet et donne un diagnostic vétérinaire complet.",
        base64,
        mimeType
      );

      // Vérifier compteur diagnostic
      const { peut } = await peutFaireDiagnostic(from);
      if (!peut) {
        await clearSession(from);
        await sendWhatsAppMessage(from, messageUpgrade("diagnostic"));
        return;
      }

      await clearSession(from);
      await sendWhatsAppMessage(from,
        `🩺 *Diagnostic Dr. Avicole*\n\n${diagnostic}`
      );

      // Notifier le conseiller
      const CONSEILLER_PHONE = process.env.CONSEILLER_PHONE;
      if (CONSEILLER_PHONE) {
        await sendWhatsAppMessage(CONSEILLER_PHONE,
          `📸 *DIAGNOSTIC PHOTO EFFECTUÉ*\n\n📱 Client : +${from}\n💬 Description : ${caption || "Aucune"}\n\n👉 Surveiller si le client a besoin d'un suivi`
        );
      }
    } catch (err) {
      console.error("❌ Erreur diagnostic photo :", err.message);
      await sendWhatsAppMessage(from,
        `❌ Impossible d'analyser la photo.\n\n📞 Contactez directement notre vétérinaire :\n*+225 01 53 21 74 42*\n\n↩️ Tapez *menu* pour revenir au menu principal`
      );
    }
    return;
  }
  // Image reçue hors contexte
  await sendWhatsAppMessage(from,
    `📸 Photo reçue !\n\nPour un diagnostic vétérinaire, tapez d'abord *photo* puis envoyez votre image.\n\n↩️ Tapez *menu* pour voir nos services`
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
    const { telephone, acheteurTel, acheteurMsg, type, details } = req.body;
    console.log('📱 Notification contact reçue :', { telephone, acheteurTel, type });

    if (!telephone || !acheteurTel) {
      return res.status(400).json({ success: false, error: 'Données manquantes' });
    }

    // Nettoyer le numéro (enlever +, espaces)
    const numPropre = telephone.replace(/[\s+\-()]/g, '');
    console.log('📱 Numéro reçu :', telephone, '→ nettoyé :', numPropre);
if (!numPropre || numPropre.length < 8) {
  return res.status(400).json({ success: false, error: 'Numéro invalide' });
}

    // Message selon le type
    let messageVendeur = '';

    if (type === 'annonce') {
      messageVendeur =
        `🔔 *Nouvelle demande de contact !*\n\n` +
        `Un acheteur est intéressé par votre annonce :\n` +
        `🐔 *${details.type}* — ${details.region}\n` +
        `📦 Quantité : ${details.quantite} sujets\n` +
        `💰 Prix : ${details.prix} FCFA/sujet\n\n` +
        `📱 *Son contact :* ${acheteurTel}\n` +
        `${acheteurMsg ? `💬 *Message :* ${acheteurMsg}\n` : ''}` +
        `\n↩️ Tapez *menu* pour voir vos annonces`;
    }

    if (type === 'technicien') {
      messageVendeur =
        `🔔 *Un recruteur consulte votre profil !*\n\n` +
        `Un éleveur est intéressé par votre profil :\n` +
        `🔧 *${details.specialite}* — ${details.region}\n\n` +
        `📱 *Son contact :* ${acheteurTel}\n` +
        `${acheteurMsg ? `💬 *Message :* ${acheteurMsg}\n` : ''}` +
        `\n👉 Tapez *boulot* pour voir votre profil sur la bourse de l\'emploi`
    }

    if (type === 'offre') {
      messageVendeur =
        `🔔 *Un candidat postule à votre offre !*\n\n` +
        `Un technicien est intéressé par votre offre :\n` +
        `💼 *${details.poste}* — ${details.region}\n\n` +
        `📱 *Son contact :* ${acheteurTel}\n` +
        `${acheteurMsg ? `💬 *Message :* ${acheteurMsg}\n` : ''}` +
        `\n👉 Tapez *boulot* pour voir votre offre sur la bourse de l\'emploi`
    }

    // Envoyer le message WhatsApp au vendeur
    await sendWhatsAppMessage(numPropre, messageVendeur);

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Erreur notification contact :', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.post("/send-message", async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ error: "Paramètres 'to' et 'message' requis" });
  }
  try {
    const result = await sendWhatsAppMessage(to, message);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
app.delete("/admin/subscriptions/:id", verifierAdmin, async (req, res) => {
  try {
    const Subscription = require("./models/Subscription");
    await Subscription.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
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

app.get("/test-claude", async (req, res) => {
  try {
    const reponse = await askClaude("Quelle est la différence entre poulet chair et pondeuse ?");
    res.json({ success: true, reponse });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Nouvelle route admin pour activer un abonnement
app.post("/admin/activer-premium", verifierAdmin, async (req, res) => {
  try {
    const { phone, plan, dureeJours, name } = req.body;
    if (!phone || !plan) return res.status(400).json({ error: "phone et plan requis" });
    await activerAbonnement(phone, plan, dureeJours || 30, name || "");
    await demarrerOnboarding(phone); 
    // Notifier le client
    await sendWhatsAppMessage(phone,
      `🎉 *Votre abonnement ${plan.toUpperCase()} est activé !*

✅ Accès illimité aux questions expert
✅ Diagnostics illimités
✅ Alertes prophylaxie automatiques
📅 Valable *${dureeJours || 30} jours*

Tapez *menu* pour profiter de tous vos avantages 🚀`
    );
    // Envoyer lien espace client
    await sendWhatsAppMessage(phone,
      `🌐 *Votre espace éleveur personnel :*\nhttps://autoflow-whatsapp-bot.onrender.com/eleveur/${phone}\n\n📌 Mettez ce lien en favori pour suivre votre élevage en temps réel !`
    );
    res.json({ success: true, message: `Abonnement ${plan} activé pour ${phone}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Liste tous les abonnements
app.get("/admin/subscriptions", verifierAdmin, async (req, res) => {
  try {
    const Subscription = require("./models/Subscription");
    const subscriptions = await Subscription.find().sort({ createdAt: -1 });
    res.json({ total: subscriptions.length, subscriptions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Révoquer un abonnement
app.post("/admin/revoquer-premium", verifierAdmin, async (req, res) => {
  try {
    const Subscription = require("./models/Subscription");
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "phone requis" });
    await Subscription.findOneAndUpdate(
      { phone },
      { plan: "starter", statut: "actif" }
    );
    await sendWhatsAppMessage(phone,
      `ℹ️ Votre abonnement premium a été résilié.\n\nVous repassez sur le plan gratuit.\n\n👉 Tapez *upgrade* pour vous réabonner.\n↩️ Tapez *menu* pour voir nos services`
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Obtenir les prix du marché
app.get("/admin/prix-marche", verifierAdmin, async (req, res) => {
  try {
    const prix = await PrixMarche.find().sort({ updatedAt: -1 });
    res.json({ total: prix.length, prix });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mettre à jour / ajouter un prix
app.post("/admin/prix-marche", verifierAdmin, async (req, res) => {
  try {
    const { produit, prix, unite, ville } = req.body;
    if (!produit || !prix) return res.status(400).json({ error: "produit et prix requis" });
    const existing = await PrixMarche.findOne({ produit, ville: ville || "Abidjan" });
    if (existing) {
      existing.prix = prix;
      existing.unite = unite || existing.unite;
      existing.updatedAt = new Date();
      await existing.save();
    } else {
      await PrixMarche.create({ produit, prix, unite: unite || "FCFA/kg", ville: ville || "Abidjan" });
    }
    res.json({ success: true, message: `Prix ${produit} mis à jour` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un prix
app.delete("/admin/prix-marche/:id", verifierAdmin, async (req, res) => {
  try {
    await PrixMarche.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ── ROUTES ESPACE ÉLEVEUR ──
app.get("/eleveur/:phone", (req, res) => {
  res.sendFile(path.join(__dirname, "public/eleveur.html"));
});

app.get("/api/eleveur/:phone/bandes", async (req, res) => {
  try {
    const { Bande } = require("./services/prophylaxie");
    const bandes = await Bande.find({ phone: req.params.phone, alertesActives: true });
    res.json(bandes);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/eleveur/:phone/suivi", async (req, res) => {
  try {
    const SuiviBande = require("./models/SuiviBande");
    const suivi = await SuiviBande.find({ phone: req.params.phone })
      .sort({ createdAt: -1 }).limit(30);
    res.json(suivi);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/eleveur/:phone/suivi", async (req, res) => {
  try {
    const SuiviBande = require("./models/SuiviBande");
    const { bandeNom, mortalite, aliment, poidsMoyen } = req.body;
    const suivi = await SuiviBande.create({
      phone: req.params.phone, bandeNom, mortalite, aliment, poidsMoyen
    });
    res.json({ success: true, suivi });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/eleveur/:phone/provende", async (req, res) => {
  try {
    const StockProvende = require("./models/StockProvende");
    const stock = await StockProvende.find({ phone: req.params.phone })
      .sort({ createdAt: -1 }).limit(20);
    res.json(stock);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/eleveur/:phone/provende", async (req, res) => {
  try {
    const StockProvende = require("./models/StockProvende");
    const { bandeNom, quantite, prixUnitaire, fournisseur, type } = req.body;
    const stock = await StockProvende.create({
      phone: req.params.phone, bandeNom, quantite, prixUnitaire, fournisseur, type
    });
    res.json({ success: true, stock });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/eleveur/:phone/commandes", async (req, res) => {
  try {
    const commandes = await Order.find({ phone: req.params.phone })
      .sort({ createdAt: -1 });
    res.json(commandes);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// ==============================
// LANCEMENT SERVEUR
// ==============================

app.listen(PORT, async () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
  await subscribeToWABA();
});