const express = require("express");
const dotenv = require("dotenv");

dotenv.config();
const { sendWhatsAppMessage } = require("./services/whatsapp");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Route test
app.post("/webhook", async (req, res) => {
  try {
    const body = req.body;

    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0].value.messages
    ) {
      const message =
        body.entry[0].changes[0].value.messages[0];

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
    console.error(error);
    res.sendStatus(500);
  }
});
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
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

/*
==============================
WEBHOOK RECEIVING MESSAGES
==============================
*/
app.post("/webhook", (req, res) => {
  console.log("Message received:", JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
module.exports = { sendWhatsAppMessage };