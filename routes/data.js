// Routes données (contacts, commandes, inscriptions) — mêmes URLs que V1
const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const Order = require('../models/Order');
const Registration = require('../models/Registration');
const { sendWhatsAppMessage } = require('../services/whatsapp');
const { requireAdmin } = require('../services/adminAuth');

// ── Contacts ──────────────────────────────────────────────────────────
router.get('/contacts', async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ lastSeen: -1 });
    res.json({ total: contacts.length, contacts });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/contacts/:id', requireAdmin, async (req, res) => {
  try { await Contact.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Commandes poussins (bot WhatsApp) ────────────────────────────────
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json({ total: orders.length, orders });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['en_attente', 'confirmée', 'annulée'].includes(status))
      return res.status(400).json({ error: 'Statut invalide' });
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    const msgs = {
      'confirmée': `✅ *Votre commande est confirmée !*\n\n🐥 Race : ${order.race}\n📦 Quantité : ${order.quantity} poussins\n💰 Total : ${Number(order.totalPrice).toLocaleString('fr-FR')} FCFA\n\nNotre équipe vous contactera pour les modalités.\n\nMerci de faire confiance au *Partenaire des Éleveurs* 🙏`,
      'annulée': `❌ *Votre commande a été annulée.*\n\n↩️ Tapez *menu* pour revenir au menu principal\n📞 Besoin d'aide : *+225 01 02 64 20 80*`,
    };
    if (msgs[status]) await sendWhatsAppMessage(order.phone, msgs[status]).catch(() => {});
    res.json({ success: true, order });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/orders/:id', requireAdmin, async (req, res) => {
  try { await Order.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Inscriptions & Devis ──────────────────────────────────────────────
router.get('/registrations', async (req, res) => {
  try {
    const registrations = await Registration.find({ type: 'formation' }).sort({ createdAt: -1 });
    res.json({ total: registrations.length, registrations });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/devis', async (req, res) => {
  try {
    const devis = await Registration.find({ type: 'devis' }).sort({ createdAt: -1 });
    res.json({ total: devis.length, devis });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/registrations/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['en_attente', 'confirmée', 'annulée'].includes(status))
      return res.status(400).json({ error: 'Statut invalide' });
    const reg = await Registration.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!reg) return res.status(404).json({ error: 'Inscription introuvable' });
    const msgs = {
      'confirmée': `✅ *Votre demande est confirmée !*\n\n📋 ${reg.profil || reg.type}\n👤 ${reg.name}\n📍 ${reg.ville}\n\nMerci de faire confiance au *Partenaire des Éleveurs* 🙏`,
      'annulée': `❌ *Votre demande a été annulée.*\n\n↩️ Tapez *menu* pour revenir\n📞 *+225 01 02 64 20 80*`,
    };
    if (msgs[status]) await sendWhatsAppMessage(reg.phone, msgs[status]).catch(() => {});
    res.json({ success: true, reg });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/registrations/:id', requireAdmin, async (req, res) => {
  try { await Registration.findByIdAndDelete(req.params.id); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
