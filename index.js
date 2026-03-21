require("dotenv").config();
const express = require("express");
const connectDB = require("./config/database");
const { sendWhatsAppMessage } = require("./services/whatsapp");

const app = express();
app.use(express.json());

// Connexion DB
connectDB();

const PORT = process.env.PORT || 10000;

/*
==============================
ROUTE TEST (IMPORTANT)
==============================
*/
app.get("/", (req, res) => {
  res.send("Bot WhatsApp opérationnel 🚀");
});

/*
==============================
WEBHOOK VERIFICATION (META)
==============================
*/
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified successfully ✅");
    return res.status(200).send(challenge);
  } else {
    return res.sendStatus(403);
  }
});

/*
==============================
WEBHOOK RECEIVING MESSAGES
==============================
*/
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    console.log("Message reçu :", JSON.stringify(body, null, 2));

    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0].value.messages
    ) {
      const message = body.entry[0].changes[0].value.messages[0];

      const from = message.from; // ✅ FIX IMPORTANT

      const menuMessage = `👋 Bienvenue chez Le Partenaire des Éleveurs

Nous accompagnons les éleveurs en Côte d’Ivoire 🇨🇮

Tapez :

1️⃣ Formation en élevage de volaille
2️⃣ Achat de poussins
3️⃣ Matériels d’élevage
4️⃣ Programme diaspora (DECEM)`;

      await sendWhatsAppMessage(from, menuMessage);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Erreur webhook :", error);
    res.sendStatus(500);
  }
});

/*
==============================
ENVOI MANUEL MESSAGE
==============================
*/
app.post("/send-message", async (req, res) => {
  const { to, message } = req.body;

  try {
    const result = await sendWhatsAppMessage(to, message);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

/*
==============================
LANCEMENT SERVEUR
==============================
*/
app.listen(PORT, () => {
  console.log(`Serveur lancé sur le port ${PORT}`);
});