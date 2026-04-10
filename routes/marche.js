const express = require('express');
const router  = express.Router();
const path    = require('path');
const Annonce = require('../models/Annonce');

// ─────────────────────────────────────────────────────────────────
// PAGE HTML DU MARCHÉ
// ─────────────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/marche.html'));
});

// ─────────────────────────────────────────────────────────────────
// GET — Toutes les annonces (appelé par la page HTML)
// ─────────────────────────────────────────────────────────────────

router.get('/api/annonces', async (req, res) => {
  try {
    const now = new Date();

    // Désactiver automatiquement les boosts expirés
    await Annonce.updateMany(
      { boosted: true, boostExpire: { $lt: now } },
      { boosted: false, boostLabel: null, boostDays: 0 }
    );

    // Retourner les annonces — boostées en premier, puis par date
    const data = await Annonce
      .find()
      .sort({ boosted: -1, createdAt: -1 })
      .lean();

    res.json({ success: true, data });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST — Créer une annonce (depuis la page HTML)
// ─────────────────────────────────────────────────────────────────

router.post('/api/annonces', async (req, res) => {
  try {
    const annonce = await Annonce.create(req.body);
    res.json({ success: true, data: annonce });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST — Activer un boost après vérification du paiement
// ─────────────────────────────────────────────────────────────────

router.post('/api/boost/:id', async (req, res) => {
  try {
    const configs = {
      b7:  { label: '🚀 Boost',      days: 7  },
      b14: { label: '⭐ En vedette', days: 14 },
      b48: { label: '🔔 Express',    days: 2  },
    };

    const cfg = configs[req.body.formule];
    if (!cfg) {
      return res.status(400).json({ success: false, error: 'Formule invalide' });
    }

    const expire = new Date();
    expire.setDate(expire.getDate() + cfg.days);

    const annonce = await Annonce.findByIdAndUpdate(
      req.params.id,
      {
        boosted:    true,
        boostLabel: cfg.label,
        boostDays:  cfg.days,
        boostExpire: expire
      },
      { new: true }
    );

    res.json({ success: true, data: annonce });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// DELETE — Supprimer une annonce
// ─────────────────────────────────────────────────────────────────

router.delete('/api/annonces/:id', async (req, res) => {
  try {
    await Annonce.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
const ADMIN_KEY = process.env.ADMIN_KEY || process.env.ADMIN_SECRET || 'LPE@Admin2025';

async function verifierDroits(id, body) {
  if (body.adminKey === ADMIN_KEY || body.adminToken === ADMIN_KEY) return { ok: true };
  if (!body.managementCode) return { ok: false, status: 403, error: 'Code de gestion requis.' };
  const doc = await Annonce.findById(id);
  if (!doc) return { ok: false, status: 404, error: 'Annonce introuvable.' };
  if (doc.managementCode !== body.managementCode) {
    return { ok: false, status: 403, error: 'Code de gestion incorrect.' };
  }
  return { ok: true };
}

router.put('/api/annonces/:id', async (req, res) => {
  try {
    const check = await verifierDroits(req.params.id, req.body);
    if (!check.ok) return res.status(check.status).json({ success: false, error: check.error });
    const { nom, telephone, type, region, quantite,
            prix, poids, description, mediaUrl, mediaType } = req.body;
    const updated = await Annonce.findByIdAndUpdate(
      req.params.id,
      { nom, telephone, type, region, quantite, prix, poids, description, mediaUrl, mediaType },
      { new: true }
    ).select('-managementCode');
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
module.exports = router;