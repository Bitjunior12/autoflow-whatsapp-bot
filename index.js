require("dotenv").config();
const express = require("express");
const path = require("path");
const connectDB = require("./config/database");
const { sendWhatsAppMessage, sendWhatsAppImage } = require("./services/whatsapp");
const Contact = require("./models/Contact");
const Order = require("./models/Order");
const { setSession, getSession, clearSession } = require("./services/session");

const app = express();
app.use(express.json());

connectDB();

const PORT = process.env.PORT || 10000;

// ==============================
// MESSAGES DU MENU
// ==============================

const MENU_PRINCIPAL = `👋 Bienvenue chez *Le Partenaire des Éleveurs* 🐔

Nous accompagnons les éleveurs en Côte d'Ivoire 🇨🇮

Tapez le numéro de votre choix :

1️⃣ Formation en aviculture
2️⃣ Achat de poussins
3️⃣ Matériels d'élevage
4️⃣ Programme diaspora DECEM

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

📲 Pour vous inscrire ou avoir plus d'infos :
👉 Tapez *contact* pour parler à un conseiller

↩️ Tapez *menu* pour revenir au menu principal`;

const POUSSINS = `🐥 *NOS POUSSINS DISPONIBLES*

┌─────────────────────────────────────┐
│ Race                  │ Unité  │ Carton(50) │
├─────────────────────────────────────┤
│ Chairs Blanc          │ 650    │ 32 500 FCFA│
│ Chairs Roux           │ 600    │ 30 000 FCFA│
│ Hybrides              │ 450    │ 22 500 FCFA│
│ Pintadeaux Galor      │ 1 100  │ 55 000 FCFA│
│ Pontes ISA Brown 🔪   │ 1 150  │ 57 500 FCFA│
│ Bleu Hollande         │ 400    │ 20 000 FCFA│
│ Coquelet Blanc        │ 150    │  7 500 FCFA│
│ Pintadeaux Hybrides   │ 900    │ 45 000 FCFA│
└─────────────────────────────────────┘
🔪 _débecqués au laser_`;

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

const DECEM = `🌍 *PROGRAMME DECEM*
_Diaspora Élevage Clé En Main_

🔷 *C'est quoi le DECEM ?*
Un programme d'accompagnement complet qui vous permet de :

✅ Créer une ferme avicole rentable
✅ Sans faire d'erreurs de débutant
✅ Avec un système déjà structuré

👉 _On vous accompagne de l'idée jusqu'à une ferme qui génère de l'argent._

💰 *Coût du programme :* 85 000 FCFA

🎯 *Pour qui ?*
- Diaspora
- Fonctionnaires
- Entrepreneurs

📲 Pour en savoir plus ou vous inscrire :
👉 Tapez *contact* pour parler à un conseiller

↩️ Tapez *menu* pour revenir au menu principal`;

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
4️⃣ Programme diaspora DECEM

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
// LOGIQUE DE RÉPONSE
// ==============================

async function handleMessage(from, text) {
  const msg = text.trim().toLowerCase();
  const session = getSession(from);

  // Annulation
  if (msg === "menu" || msg === "annuler") {
    clearSession(from);
    return MENU_PRINCIPAL;
  }

  // Étape 1 : Choix de la race
  if (session?.step === "choix_race") {
    const choix = PRIX_POUSSINS[msg];
    if (!choix) {
      return `❌ Choix invalide. Tapez un numéro entre 1 et 8\n\n${MENU_RACES}`;
    }
    setSession(from, { step: "quantite", race: choix.race, prix: choix.prix });
    return `✅ *${choix.race}* sélectionné (${choix.prix} FCFA/unité)

📦 *Combien de poussins souhaitez-vous ?*
_(minimum 1, carton = 50 poussins)_

Tapez la quantité :`;
  }

  // Étape 2 : Quantité
  if (session?.step === "quantite") {
    const qty = parseInt(msg);
    if (isNaN(qty) || qty < 1) {
      return `❌ Quantité invalide. Entrez un nombre entier.\nEx: *50* ou *100*`;
    }
    const total = qty * session.prix;
    const totalFormate = total.toLocaleString("fr-FR");
    setSession(from, { step: "nom", quantity: qty, totalPrice: total });
    return `✅ *${qty} poussins* (${session.race})
💰 Total estimé : *${totalFormate} FCFA*

👤 *Quel est votre nom complet ?*`;
  }

  // Étape 3 : Nom + sauvegarde commande
  if (session?.step === "nom") {
    const nom = text.trim();
    if (nom.length < 2) {
      return `❌ Nom invalide. Entrez votre nom complet.`;
    }
    try {
      await Order.create({
        phone: from,
        name: nom,
        race: session.race,
        quantity: session.quantity,
        totalPrice: session.totalPrice,
      });
      await Contact.findOneAndUpdate(
        { phone: from },
        { name: nom, lastSeen: new Date() }
      );
    // Notification au conseiller
const CONSEILLER_PHONE = process.env.CONSEILLER_PHONE;
if (CONSEILLER_PHONE) {
  const totalFormate = session.totalPrice.toLocaleString("fr-FR");
  const notif = `🔔 *NOUVELLE COMMANDE REÇUE !*

👤 Client : ${nom}
📱 Téléphone : +${from}
🐥 Race : ${session.race}
📦 Quantité : ${session.quantity} poussins
💰 Total : ${totalFormate} FCFA

👉 À contacter sous 24h`;
  
  try {
    await sendWhatsAppMessage(CONSEILLER_PHONE, notif);
    console.log(`🔔 Conseiller notifié : ${CONSEILLER_PHONE}`);
  } catch (err) {
    console.error("❌ Erreur notification conseiller :", err.message);
  }
}  
    } catch (err) {
      console.error("❌ Erreur sauvegarde commande :", err.message);
    }
    const totalFormate = session.totalPrice.toLocaleString("fr-FR");
    clearSession(from);
    return `🎉 *Commande enregistrée avec succès !*

📋 *Récapitulatif :*
👤 Nom : ${nom}
🐥 Race : ${session.race}
📦 Quantité : ${session.quantity} poussins
💰 Total estimé : ${totalFormate} FCFA

✅ Un conseiller vous contactera sous *24h* pour confirmer votre commande.

📞 Pour toute urgence : *+225 01 02 64 20 80*

↩️ Tapez *menu* pour revenir au menu principal`;
  }

  // Menu principal
  if (["bonjour", "bonsoir", "salut", "hi", "hello", "start", "0", "menu"].includes(msg)) {
    return MENU_PRINCIPAL;
  }
  if (msg === "1") return FORMATION;
  if (msg === "2") {
  setSession(from, { step: "choix_race" });
  // Envoie d'abord l'image
  try {
    await sendWhatsAppImage(
      from,
      process.env.IMAGE_POUSSINS,
      "🐥 Nos poussins disponibles — Le Partenaire des Éleveurs"
    );
  } catch (err) {
    console.error("❌ Erreur envoi image :", err.message);
  }
  return MENU_RACES;
}
  }
  if (msg === "3") return MATERIELS;
  if (msg === "4") return DECEM;
  if (msg === "contact" || msg === "conseiller") return CONTACT;

  return MESSAGE_INCONNU;
}

function getChoiceLabel(text) {
  const msg = text.trim().toLowerCase();
  if (["1", "formation"].includes(msg)) return "Formation en aviculture";
  if (["2", "poussin", "poussins"].includes(msg)) return "Achat de poussins";
  if (["3", "materiel", "matériels"].includes(msg)) return "Matériels d'élevage";
  if (["4", "decem", "diaspora"].includes(msg)) return "Programme DECEM";
  if (["contact"].includes(msg)) return "Demande de contact";
  return "Autre";
}

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

// ← ICI
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
    console.log("📱 Enregistrement :", JSON.stringify(data, null, 2));
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

    // Sauvegarde contact
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
// ==============================
// CHANGER STATUT COMMANDE
// ==============================
app.post("/orders/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["en_attente", "confirmée", "annulée"].includes(status)) {
      return res.status(400).json({ error: "Statut invalide" });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: "Commande introuvable" });
    }

    // Notifier le client
    const messages = {
      "confirmée": `✅ *Votre commande est confirmée !*

🐥 Race : ${order.race}
📦 Quantité : ${order.quantity} poussins
💰 Total : ${order.totalPrice.toLocaleString("fr-FR")} FCFA

📞 Notre équipe vous contactera pour les modalités de paiement et livraison.

Merci de faire confiance au *Partenaire des Éleveurs* 🙏`,

      "annulée": `❌ *Votre commande a été annulée.*

Si c'est une erreur ou si vous souhaitez recommander :
↩️ Tapez *menu* pour revenir au menu principal

📞 Besoin d'aide : *+225 01 02 64 20 80*`
    };

    if (messages[status]) {
      try {
        await sendWhatsAppMessage(order.phone, messages[status]);
        console.log(`📱 Client ${order.phone} notifié : ${status}`);
      } catch (err) {
        console.error("❌ Erreur notification client :", err.message);
      }
    }

    res.json({ success: true, order });
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
app.listen(PORT, async () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
  await subscribeToWABA();
});