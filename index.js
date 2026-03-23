require("dotenv").config();
const express = require("express");
const connectDB = require("./config/database");
const { sendWhatsAppMessage } = require("./services/whatsapp");

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
🔪 _débecqués au laser_

📦 Prix à l'unité ou au carton (50 poussins)

📲 Pour passer une commande :
👉 Tapez *contact* pour parler à un conseiller

↩️ Tapez *menu* pour revenir au menu principal`;

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

📲 Pour commander ou en savoir plus :
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
// LOGIQUE DE RÉPONSE
// ==============================

function getResponse(text) {
  const msg = text.trim().toLowerCase();

  if (["menu", "bonjour", "bonsoir", "salut", "hi", "hello", "start", "0"].includes(msg)) {
    return MENU_PRINCIPAL;
  }
  if (["1", "formation", "former", "apprendre"].includes(msg)) {
    return FORMATION;
  }
  if (["2", "poussin", "poussins", "achat", "acheter", "commander"].includes(msg)) {
    return POUSSINS;
  }
  if (["3", "materiel", "matériels", "matériel", "équipement", "equipement", "magasin"].includes(msg)) {
    return MATERIELS;
  }
  if (["4", "decem", "diaspora", "programme"].includes(msg)) {
    return DECEM;
  }
  if (["contact", "conseiller", "appel", "appeler", "humain"].includes(msg)) {
    return CONTACT;
  }

  return MESSAGE_INCONNU;
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

    const reponse = getResponse(text);
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
// ENREGISTREMENT DU NUMÉRO
// ==============================
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

https://autoflow-whatsapp-bot.onrender.com/register-phone
// ==============================
// DÉMARRAGE
// ==============================

app.listen(PORT, async () => {
  console.log(`🚀 Serveur lancé sur le port ${PORT}`);
  await subscribeToWABA();
});