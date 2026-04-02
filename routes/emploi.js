const express = require('express');
const router  = express.Router();
const path    = require('path');
const Profil  = require('../models/Profil');
const Offre   = require('../models/Offre');

// ─────────────────────────────────────────────────────────────────
// PAGE HTML DE LA BOURSE DE L'EMPLOI
// ─────────────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/emploi.html'));
});

// ─────────────────────────────────────────────────────────────────
// GET — Tous les profils techniciens
// ─────────────────────────────────────────────────────────────────

router.get('/api/profils', async (req, res) => {
  try {
    const now = new Date();
    await Profil.updateMany(
      { boosted: true, boostExpire: { $lt: now } },
      { boosted: false, boostLabel: null, boostDays: 0 }
    );
    const data = await Profil
      .find()
      .sort({ boosted: -1, createdAt: -1 })
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET — Toutes les offres d'emploi
// ─────────────────────────────────────────────────────────────────

router.get('/api/offres', async (req, res) => {
  try {
    const now = new Date();
    await Offre.updateMany(
      { boosted: true, boostExpire: { $lt: now } },
      { boosted: false, boostLabel: null, boostDays: 0 }
    );
    const data = await Offre
      .find()
      .sort({ boosted: -1, createdAt: -1 })
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST — Créer un profil (depuis la page HTML)
// ─────────────────────────────────────────────────────────────────

router.post('/api/profils', async (req, res) => {
  try {
    const profil = await Profil.create(req.body);
    res.json({ success: true, data: profil });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST — Créer une offre (depuis la page HTML)
// ─────────────────────────────────────────────────────────────────

router.post('/api/offres', async (req, res) => {
  try {
    const offre = await Offre.create(req.body);
    res.json({ success: true, data: offre });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});
// ─────────────────────────────────────────────────────────────────
// POST — Activer un boost profil
// ─────────────────────────────────────────────────────────────────

router.post('/api/boost/profil/:id', async (req, res) => {
  try {
    const configs = {
      b7:  { label: '🚀 Boost',      days: 7  },
      b14: { label: '⭐ En vedette', days: 14 },
      b48: { label: '🔔 Express',    days: 2  },
    };
    const cfg = configs[req.body.formule];
    if (!cfg) return res.status(400).json({ success: false, error: 'Formule invalide' });

    const expire = new Date();
    expire.setDate(expire.getDate() + cfg.days);

    const profil = await Profil.findByIdAndUpdate(
      req.params.id,
      { boosted: true, boostLabel: cfg.label, boostDays: cfg.days, boostExpire: expire },
      { new: true }
    );
    res.json({ success: true, data: profil });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST — Activer un boost offre
// ─────────────────────────────────────────────────────────────────

router.post('/api/boost/offre/:id', async (req, res) => {
  try {
    const configs = {
      b7:  { label: '🚀 Boost',      days: 7  },
      b14: { label: '⭐ En vedette', days: 14 },
      b48: { label: '🔔 Express',    days: 2  },
    };
    const cfg = configs[req.body.formule];
    if (!cfg) return res.status(400).json({ success: false, error: 'Formule invalide' });

    const expire = new Date();
    expire.setDate(expire.getDate() + cfg.days);

    const offre = await Offre.findByIdAndUpdate(
      req.params.id,
      { boosted: true, boostLabel: cfg.label, boostDays: cfg.days, boostExpire: expire },
      { new: true }
    );
    res.json({ success: true, data: offre });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// ─────────────────────────────────────────────────────────────────
// POST — Certifier un technicien LPE
// ─────────────────────────────────────────────────────────────────

router.post('/api/profils/certifier/:id', async (req, res) => {
  try {
    const profil = await Profil.findByIdAndUpdate(
      req.params.id,
      { certifieLPE: true, featured: true },
      { new: true }
    );
    if (!profil) return res.status(404).json({ success: false, error: 'Profil introuvable' });
    res.json({ success: true, data: profil });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// ─────────────────────────────────────────────────────────────────
// DELETE — Supprimer un profil
// ─────────────────────────────────────────────────────────────────

router.delete('/api/profils/:id', async (req, res) => {
  try {
    await Profil.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// DELETE — Supprimer une offre
// ─────────────────────────────────────────────────────────────────

router.delete('/api/offres/:id', async (req, res) => {
  try {
    await Offre.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;