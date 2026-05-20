const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const { handleMessage } = require('../handlers/messageRouter');
const { sendWhatsAppMessage } = require('../services/whatsapp');

function getChoiceLabel(text) {
  const msg = text.trim().toLowerCase();
  if (msg === '1') return 'Démarrer un projet';
  if (msg === '2' || msg.includes('poussin')) return 'Achat de poussins';
  if (msg === '3' || msg.includes('matériel')) return "Matériels d'élevage";
  if (msg === '4') return 'Estimation coûts';
  if (msg === '5' || msg === 'formation') return 'Formation';
  if (msg === '6') return 'Conseil sanitaire';
  if (msg === '7') return 'Suivi élevage';
  if (msg === '8') return 'Akogoua';
  if (msg === '9' || msg === 'contact' || msg === 'conseiller') return 'Contact conseiller';
  return 'Autre';
}

// GET — vérification webhook Meta
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    console.log('✅ Webhook vérifié');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// POST — réception des messages WhatsApp
router.post('/', async (req, res) => {
  res.sendStatus(200);
  try {
    const body = req.body;
    if (!body?.object || body.object !== 'whatsapp_business_account') return;
    if (!body.entry?.length) return;

    const value = body?.entry?.[0]?.changes?.[0]?.value;
    if (!value?.messages) return;

    const message = value.messages[0];
    const from = message.from;
    const type = message.type;

    if (type !== 'text' && type !== 'image' && type !== 'video') return;

    if (type === 'image' || type === 'video') {
      await sendWhatsAppMessage(from,
        `📷 Média reçu.\n\nPour l'instant, je traite uniquement les messages texte.\n\n↩️ Tapez *menu* pour voir les services disponibles.`
      );
      return;
    }

    const text = message.text.body;
    console.log(`📨 Message de ${from} : "${text}"`);

    // Tracking contact
    try {
      const existing = await Contact.findOne({ phone: from });
      if (existing) {
        existing.lastMessage = text;
        existing.lastChoice = getChoiceLabel(text);
        existing.lastSeen = new Date();
        existing.messageCount += 1;
        await existing.save();
      } else {
        await Contact.create({ phone: from, lastMessage: text, lastChoice: getChoiceLabel(text) });
        console.log(`✅ Nouveau contact : ${from}`);
      }
    } catch (dbErr) {
      console.error('❌ Erreur MongoDB contact :', dbErr.message);
    }

    const response = await handleMessage(from, text);
    if (response) {
      await sendWhatsAppMessage(from, response);
      console.log(`✅ Réponse envoyée à ${from}`);
    }
  } catch (error) {
    console.error('❌ Erreur webhook :', error);
  }
});

module.exports = router;
