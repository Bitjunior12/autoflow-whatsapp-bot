require("dotenv").config();
const express = require("express");
const path = require("path");
const connectDB = require("./config/database");
const { sendWhatsAppMessage, sendWhatsAppImage } = require("./services/whatsapp");
const Contact = require("./models/Contact");
const Order = require("./models/Order");
const Registration = require("./models/Registration");
const { setSession, getSession, clearSession } = require("./services/session");
const { askClaude } = require("./services/claude");

const relanceTimers = {};
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

connectDB();

// ==============================
// MESSAGES DU MENU
// ==============================

const MENU_PRINCIPAL = `👋 Bienvenue chez *Le Partenaire des Éleveurs* 🐔

Nous accompagnons les éleveurs en Côte d'Ivoire 🇨🇮

Tapez le numéro de votre choix :

1️⃣ Formation en aviculture
2️⃣ Achat de poussins
3️⃣ Matériels d'élevage
4️⃣ Demande de devis

↩️ Tapez *menu* à tout moment pour revenir ici`;

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

const MESSAGE_INCONNU = `❓ Je n'ai pas compris votre message.

Tapez un numéro pour choisir :

1️⃣ Formation en aviculture
2️⃣ Achat de poussins
3️⃣ Matériels d'élevage
4️⃣ Demande de devis

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
const ADMIN_PHONE = "22502642080"; // TON numéro

if (from !== ADMIN_PHONE) {
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
    "formation_nom", "formation_ville", "formation_inscription"
  ].includes(session?.step);

  if (isSmartQuestion(text) && !isInCriticalFlow) {
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
    return MENU_PRINCIPAL;
  }

  if (msg === "1") {
    await setSession(from, { step: "formation_inscription" });
    return FORMATION;
  }

  if (msg === "2") {
    await setSession(from, { step: "choix_race" });
    return MENU_RACES;
  }

  if (msg === "3") return MATERIELS;

  if (msg === "4") {
    await setSession(from, { step: "devis_choix" });
    return MENU_DEVIS;
  }

  if (msg === "contact" || msg === "conseiller") return CONTACT;

  // ── SYSTÈME DE RELANCES ──  ✅ MAINTENANT BIEN À L'INTÉRIEUR DE handleMessage
  if (!isSmartQuestion(text) && !isHotLead(text)) {
    const timers = [];

    const t1 = setTimeout(async () => {
      console.log("⏰ Relance 10 min");
      await sendWhatsAppMessage(from,
        `👋 Juste pour savoir si vous avez pu avancer sur votre projet d'élevage 🙂\n\nNous pouvons vous guider étape par étape pour bien démarrer.\n\n👉 Tapez *menu* pour voir nos solutions`
      );
    }, 600000);

    const t2 = setTimeout(async () => {
      console.log("⏰ Relance 1h");
      await sendWhatsAppMessage(from,
        `👍 Beaucoup de nos clients étaient comme vous au début.\n\nAujourd'hui ils réussissent leur élevage grâce à un bon accompagnement.\n\n👉 Souhaitez-vous :\n1️⃣ Acheter des poussins\n2️⃣ Suivre la formation\n3️⃣ Avoir un devis`
      );
    }, 3600000);

    const t3 = setTimeout(async () => {
      console.log("⏰ Relance 24h");
      await sendWhatsAppMessage(from,
        `🚀 Vous pouvez commencer avec seulement 500 poussins.\n\nC'est la meilleure façon de tester et devenir rentable rapidement.\n\n👉 Voulez-vous un devis personnalisé ?`
      );
    }, 86400000);

    timers.push(t1, t2, t3);
    relanceTimers[from] = timers;
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

// ==============================
// LANCEMENT SERVEUR
// ==============================
app.listen(PORT, async () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
  await subscribeToWABA();
});