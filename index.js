const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Route test
app.get("/", (req, res) => {
  res.send("AutoFlow WhatsApp Server is running 🚀");
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
