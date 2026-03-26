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

// ✅ FIX FETCH (important)
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const relanceTimers = {};
const app = express();
app.use(express.json());

connectDB();


// ==============================
// MENU
// ==============================

const MENU_PRINCIPAL = `👋 Bienvenue chez *Le Partenaire des Éleveurs* 🐔

Tapez le numéro :

1️⃣ Formation
2️⃣ Poussins
3️⃣ Matériels
4️⃣ Devis

↩️ Tapez *menu* à tout moment`;

const MESSAGE_INCONNU = `❓ Je n'ai pas compris.

Tapez :
1️⃣ Formation
2️⃣ Poussins
3️⃣ Matériels
4️⃣ Devis

↩️ menu`;


// ==============================
// UTIL
// ==============================

function isSmartQuestion(message) {
  return ["quoi", "comment", "pourquoi", "prix", "combien"].some(w => message.toLowerCase().includes(w));
}

function isHotLead(message) {
  return ["je veux", "acheter", "commander", "devis"].some(w => message.toLowerCase().includes(w));
}


// ==============================
// LOGIQUE BOT
// ==============================

async function handleMessage(from, text) {
  const msg = text.trim().toLowerCase();
  const session = await getSession(from);

  // 🔥 FIX RELANCE
  if (relanceTimers[from]) {
    relanceTimers[from].forEach(t => clearTimeout(t));
    delete relanceTimers[from];
  }

  // 🔥 IA + LEAD
  if (isHotLead(text) && !isSmartQuestion(text)) {
    return `🔥 Super !

1️⃣ Poussins
2️⃣ Formation
3️⃣ Devis

Répondez 1, 2 ou 3`;
  }

  if (isSmartQuestion(text)) {
    try {
      const rep = await askClaude(text);
      if (rep) return rep;
    } catch (err) {
      console.error("Claude error:", err.message);
    }
  }

  if (msg === "menu") {
    await clearSession(from);
    return MENU_PRINCIPAL;
  }

  // ==============================
  // MENU
  // ==============================

  if (["bonjour", "salut", "menu"].includes(msg)) return MENU_PRINCIPAL;

  if (msg === "1") {
    await setSession(from, { step: "formation" });

    if (process.env.IMAGE_FORMATION) {
      await sendWhatsAppImage(from, process.env.IMAGE_FORMATION, "Formation aviculture");
    }

    return "🎓 Formation disponible.\nTapez *oui* pour vous inscrire";
  }

  if (msg === "2") {
    await setSession(from, { step: "race" });

    if (process.env.IMAGE_POUSSINS) {
      await sendWhatsAppImage(from, process.env.IMAGE_POUSSINS, "Nos poussins");
    }

    return "🐥 Choisissez race:\n1 Blanc\n2 Roux";
  }

  if (msg === "3") return "Matériels disponibles";

  if (msg === "4") {
    await setSession(from, { step: "devis" });
    return "📋 Devis\n1 Bâtiment\n2 Complet";
  }

  // ==============================
  // POUSSINS
  // ==============================

  if (session?.step === "race") {
    if (!["1", "2"].includes(msg)) return "Choix invalide";

    await setSession(from, { step: "quantite", race: msg === "1" ? "Blanc" : "Roux", prix: 650 });

    return "Combien de poussins ?";
  }

  if (session?.step === "quantite") {

    if (!/^\d+$/.test(msg)) {
      return "❌ Entrez un nombre valide";
    }

    const qty = parseInt(msg);
    const total = qty * session.prix;

    await setSession(from, { step: "nom", quantity: qty, totalPrice: total });

    return `Total: ${total} FCFA\nNom ?`;
  }

  if (session?.step === "nom") {

    if (text.length < 2) return "Nom invalide";

    await Order.create({
      phone: from,
      name: text,
      race: session.race,
      quantity: session.quantity,
      totalPrice: session.totalPrice,
    });

    await Contact.findOneAndUpdate(
      { phone: from },
      {
        name: text,
        messageCount: 1,
        lastSeen: new Date()
      },
      { upsert: true }
    );

    await clearSession(from);

    return "✅ Commande enregistrée";
  }

  // ==============================
  // RELANCE AUTO
  // ==============================

  if (!isSmartQuestion(text) && !isHotLead(text)) {

    relanceTimers[from] = [];

    const t1 = setTimeout(async () => {
      await sendWhatsAppMessage(from, "👋 Besoin d'aide ?");
    }, 600000);

    const t2 = setTimeout(async () => {
      await sendWhatsAppMessage(from, "🔥 Nos clients réussissent avec nous");
    }, 3600000);

    relanceTimers[from].push(t1, t2);
  }

  return MESSAGE_INCONNU;
}


// ==============================
// WEBHOOK
// ==============================

app.post("/webhook", async (req, res) => {
  res.sendStatus(200);

  try {
    const message = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) return;

    const from = message.from;
    const text = message.text?.body;

    const reponse = await handleMessage(from, text);
    await sendWhatsAppMessage(from, reponse);

  } catch (err) {
    console.error(err);
  }
});


// ==============================
// KEEP ALIVE
// ==============================

setInterval(async () => {
  try {
    await fetch(process.env.BASE_URL);
  } catch {}
}, 14 * 60 * 1000);


// ==============================
// SERVER
// ==============================

const PORT = process.env.PORT;

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`🚀 Serveur lancé sur ${PORT}`);
    });

  } catch (err) {
    console.error("❌ Erreur démarrage:", err);
    process.exit(1);
  }
}

startServer();