require("dotenv").config();
const express = require("express");
const path = require("path");
const connectDB = require("./config/database");
const { sendWhatsAppMessage, sendWhatsAppImage, sendWhatsAppPDF } = require("./services/whatsapp");
const { generateDevisPDF } = require("./services/pdf");
const Contact = require("./models/Contact");
const Order = require("./models/Order");
const Registration = require("./models/Registration");
const { setSession, getSession, clearSession } = require("./services/session");
const { askClaude } = require("./services/claude");
const { peutPoserQuestion, peutFaireDiagnostic, messageUpgrade, activerAbonnement, getOrCreateSubscription } = require("./services/premium");
const { enregistrerBande, getBandesActives, verifierEtEnvoyerAlertes } = require("./services/prophylaxie");
const relanceTimers = {};
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

connectDB();
// Après connectDB() en haut du fichier — cron toutes les heures
setInterval(async () => {
  try {
    await verifierEtEnvoyerAlertes();
    console.log("✅ Vérification alertes prophylaxie terminée");
  } catch (err) {
    console.error("❌ Erreur cron prophylaxie :", err.message);
  }
}, 60 * 60 * 1000); // toutes les heures
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

Tapez un numéro pour choisir :

1️⃣ Démarrer mon élevage (débutant)
2️⃣ Suivre & améliorer mon élevage
3️⃣ Acheter des poussins
4️⃣ Voir les matériels disponibles
5️⃣ Estimer mes coûts & bénéfices
6️⃣ Accéder aux formations
7️⃣ Rejoindre le programme premium (suivi + coaching)
8️⃣ Poser une question
9️⃣ 📞 Parler à un conseiller

↩️ Ou tapez *menu* pour revoir le menu`;

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
  const keywords = [
    "quoi", "comment", "pourquoi", "différence",
    "prix", "combien", "conseil", "expliquer",
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

async function handleMessage(from, text) {
  const msg = text.trim().toLowerCase();
  const session = await getSession(from);
  console.log("🔍 SESSION STEP :", session?.step);
  const ADMIN_PHONES = [
  "2250102642080",
  "22502642080",
  "2250153217442",
  "22553217442"
];
if (!ADMIN_PHONES.includes(from)) {
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
    "debutant_nom", "debutant_ville",
    "suivi_type", "suivi_sujets", "suivi_probleme",
    "choix_race", "commande_quantite", "commande_nom", "commande_ville",
    "estimation_race", "premium_nom", "premium_ville",
    "materiel_choix", "materiel_sujets", "materiel_action", "materiel_nom", "materiel_ville",
    "estimation_type", "estimation_sujets", "estimation_budget",
    "formation_niveau", "formation_objectif", "formation_motivation",
    "premium_taille", "premium_besoin", "premium_pitch","question_libre",
    "conseiller_motif", "conseiller_nom", "conseiller_message"
  ].includes(session?.step);

  if (isSmartQuestion(text) && !isInCriticalFlow && !session?.step) {
    console.log(`🤖 Question détectée → Claude : "${text}"`);
    const reponseIA = await askClaude(text);
    if (reponseIA) return reponseIA;
  }

  // ============================
  // 🔥 CLIENT CHAUD
  // ============================

  if (isHotLead(text)) {
    console.log("🔥 CLIENT CHAUD DÉTECTÉ");
    await clearSession(from);
    return MENU_PRINCIPAL;
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
if (["bonjour", "bonsoir", "salut", "hi", "hello", "start", "0", "menu"].includes(msg)) {
    const dejaAccueilli = session?.accueilli;
    if (!dejaAccueilli) {
        await setSession(from, { accueilli: true });
        return MENU_PRINCIPAL; // avec message de bienvenue complet
    } else {
        return `💡 *Que voulez-vous faire ?*

1️⃣ Démarrer mon élevage (débutant)
2️⃣ Suivre & améliorer mon élevage
3️⃣ Acheter des poussins
4️⃣ Voir les matériels disponibles
5️⃣ Estimer mes coûts & bénéfices
6️⃣ Accéder aux formations
7️⃣ Rejoindre le programme premium
8️⃣ Poser une question
9️⃣ Parler à un conseiller

↩️ Tapez le numéro de votre choix`;
    }
}

if (msg === "2" && !session?.step) {
    await setSession(from, { step: "suivi_type" });
    return MENU_SUIVI;
}

if (msg === "3" && !session?.step) {
    await setSession(from, { step: "choix_race" });
    return MENU_RACES;
}

if (msg === "4" && !session?.step) {
    await setSession(from, { step: "materiel_choix" });
    return MATERIELS + `\n\n👉 *Qu'est-ce qui vous intéresse ?*\n\n` + MENU_MATERIELS_CHOIX;
}

if (msg === "5" && !session?.step) {
    await setSession(from, { step: "estimation_type" });
    return MENU_ESTIMATION;
}

if (msg === "6" && !session?.step) {
    await setSession(from, { step: "formation_niveau" });
    return PRESENTATION_FORMATION;
}

if (msg === "7" && !session?.step) {
    await setSession(from, { step: "premium_taille" });
    return PRESENTATION_PREMIUM;
}

if (msg === "8" && !session?.step) {
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
    const superficie = text.trim();
    if (isNaN(superficie) || superficie < 1) return `❌ Entrez une superficie valide en m². Exemple : *200*`;
    await setSession(from, { ...session, step: "debutant_budget", superficie });
    return `✅ Superficie : *${superficie} m²*\n\n💰 *Quel est votre budget de démarrage ?* (en FCFA)\n\nExemple : 500000`;
  }

  if (session?.step === "debutant_budget") {
    const budget = text.trim().replace(/\s/g, "");
    if (isNaN(budget) || budget < 1) return `❌ Entrez un budget valide en FCFA. Exemple : *500000*`;
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
    const sujets = text.trim();
    if (isNaN(sujets) || sujets < 1) return `❌ Entrez un nombre valide. Exemple : *500*`;
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
    const quantite = parseInt(text.trim());
    if (isNaN(quantite) || quantite < 1) return `❌ Entrez un nombre valide. Exemple : *500*`;
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
    const sujets = parseInt(text.trim());
    if (isNaN(sujets) || sujets < 1) return `❌ Entrez un nombre valide. Exemple : *500*`;

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
    const sujets = parseInt(text.trim());
    if (isNaN(sujets) || sujets < 1) return `❌ Entrez un nombre valide. Exemple : *500*`;
    await setSession(from, { ...session, step: "estimation_budget", sujets });
    return `✅ Nombre de sujets : *${sujets}*\n\n💰 *Quel est votre budget disponible ?* (en FCFA)\n\nExemple : 500000`;
  }

  if (session?.step === "estimation_budget") {
    const budget = parseInt(text.trim().replace(/\s/g, ""));
    if (isNaN(budget) || budget < 1) return `❌ Entrez un budget valide. Exemple : *500000*`;

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
  // ── TUNNEL FORMATION COMPLET ──
  if (session?.step === "formation_niveau") {
    const niveaux = {
      "1": "Débutant complet",
      "2": "Éleveur existant",
      "3": "Perfectionnement"
    };
    if (!niveaux[msg]) return `❓ Tapez *1*, *2* ou *3* pour choisir votre niveau.`;
    await setSession(from, { ...session, step: "formation_objectif", niveau: niveaux[msg] });
    return `✅ Niveau : *${niveaux[msg]}*\n\n🎯 *Quel est votre objectif principal ?*\n\n1️⃣ Élevage pour la famille\n2️⃣ Projet commercial\n3️⃣ Devenir formateur\n\n↩️ Tapez *menu* pour annuler`;
  }

  if (session?.step === "formation_objectif") {
    const objectifs = {
      "1": "Élevage familial",
      "2": "Projet commercial",
      "3": "Devenir formateur"
    };
    if (!objectifs[msg]) return `❓ Tapez *1*, *2* ou *3* pour choisir votre objectif.`;

    const objectif = objectifs[msg];
    const { niveau } = session;

    const prompt = `Tu es conseiller en formation avicole en Côte d'Ivoire.
Un candidat veut s'inscrire à la formation :
- Niveau : ${niveau}
- Objectif : ${objectif}

Génère un message de motivation personnalisé en 3-4 lignes qui :
1. Valorise son profil et son objectif
2. Explique pourquoi cette formation est faite pour lui
3. L'encourage à s'inscrire maintenant

Termine par : "Souhaitez-vous vous inscrire à la prochaine session ?"
Puis : "1️⃣ Oui je m'inscris  2️⃣ Je veux plus d'infos"`;

    let motivation = "";
    try {
      motivation = await askClaude(prompt);
    } catch (err) {
      motivation = `🎓 Cette formation est parfaite pour votre profil !\n\nElle vous donnera toutes les clés pour réussir votre élevage.\n\nSouhaitez-vous vous inscrire à la prochaine session ?\n\n1️⃣ Oui je m'inscris  2️⃣ Je veux plus d'infos`;
    }

    await setSession(from, { ...session, step: "formation_motivation", objectif });
    return motivation;
  }

  if (session?.step === "formation_motivation") {
    if (msg === "2") {
      await clearSession(from);
      return `📞 *PLUS D'INFORMATIONS*\n\nN'hésitez pas à contacter notre équipe :\n\n📱 *+225 01 02 64 20 80*\n🕐 Disponible 24H/24 sur WhatsApp\n\n↩️ Tapez *menu* pour revenir au menu principal`;
    }
    if (msg !== "1") return `❓ Tapez *1* pour vous inscrire ou *2* pour plus d'infos.`;
    await setSession(from, { ...session, step: "formation_nom" });
    return `✅ Excellent choix ! 🎉\n\n👤 *Quel est votre nom complet ?*`;
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
  // ── TUNNEL UPGRADE ──
  if (msg === "upgrade") {
    const CONSEILLER_PHONE = process.env.CONSEILLER_PHONE;
    if (CONSEILLER_PHONE) {
      await sendWhatsAppMessage(CONSEILLER_PHONE,
        `⭐ *DEMANDE UPGRADE PREMIUM !*\n\n📱 Téléphone : +${from}\n\n🔥 CLIENT CHAUD — Contacter immédiatement !`
      );
    }
    return `✅ *Demande reçue !*

Un conseiller vous contactera dans les *2 heures* pour vous présenter nos offres :

⭐ *Pro — 15 000 FCFA/mois*
✓ Questions expert illimitées
✓ Diagnostics illimités
✓ Calendrier prophylaxie

👑 *Premium — 25 000 FCFA/mois*
✓ Tout Pro inclus
✓ Coaching hebdomadaire
✓ Visite terrain sur demande

📞 Urgence : *+225 01 02 64 20 80*
↩️ Tapez *menu* pour revenir au menu principal`;
  }
  // ── CLAUDE AI pour toutes les autres questions ──
  console.log(`🤖 Question libre → Claude : "${text}"`);
  const reponseIA = await askClaude(text);
  if (reponseIA) return reponseIA;
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
    const body = req.body;
    const value = body?.entry?.[0]?.changes?.[0]?.value;
    if (!value?.messages) return;

    const message = value.messages[0];
    const from = message.from;
    const type = message.type;
    if (type !== "text") return;

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

    const reponse = await handleMessage(from, text);
    await sendWhatsAppMessage(from, reponse);
    console.log(`✅ Réponse envoyée à ${from}`);
  } catch (error) {
    console.error("❌ Erreur webhook :", error);
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
app.post("/admin/activer-premium", async (req, res) => {
  try {
    const { phone, plan, dureeJours, name } = req.body;
    if (!phone || !plan) return res.status(400).json({ error: "phone et plan requis" });
    await activerAbonnement(phone, plan, dureeJours || 30, name || "");
    // Notifier le client
    await sendWhatsAppMessage(phone,
      `🎉 *Votre abonnement ${plan.toUpperCase()} est activé !*

✅ Accès illimité aux questions expert
✅ Diagnostics illimités
✅ Alertes prophylaxie automatiques
📅 Valable *${dureeJours || 30} jours*

Tapez *menu* pour profiter de tous vos avantages 🚀`
    );
    res.json({ success: true, message: `Abonnement ${plan} activé pour ${phone}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ==============================
// LANCEMENT SERVEUR
// ==============================
app.listen(PORT, async () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
  await subscribeToWABA();
});