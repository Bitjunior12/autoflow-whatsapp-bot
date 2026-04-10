// ─────────────────────────────────────────────────────────────────
// routes/magasin.js  —  Le Magasin du Partenaire des Éleveurs
// NOUVEAU FICHIER — à placer dans routes/magasin.js
// ─────────────────────────────────────────────────────────────────

const express = require('express');
const router  = express.Router();
const path    = require('path');
const mongoose = require('mongoose');

// ── Modèles (créer ces 4 fichiers dans models/ si absents) ───────
const Poussin   = require('../models/Poussin');
const Materiel  = require('../models/Materiel');
const Livraison = require('../models/Livraison');
const Commande  = require('../models/Commande');

// ── Vérification admin ────────────────────────────────────────────
const ADMIN_KEY = process.env.ADMIN_KEY || process.env.ADMIN_SECRET || 'LPE@Admin2025';

function isAdmin(req) {
  return (
    req.body?.adminKey === ADMIN_KEY ||
    req.headers?.['x-admin-token'] === ADMIN_KEY
  );
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req)) {
    return res.status(403).json({ success: false, error: 'Accès réservé à l\'administrateur LPE.' });
  }
  next();
}

// ─────────────────────────────────────────────────────────────────
// PAGE HTML DU MAGASIN
// ─────────────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/magasin.html'));
});

// ═══════════════════════════════════════════════════════════════════
// POUSSINS
// ═══════════════════════════════════════════════════════════════════

// GET — Liste des poussins (public)
router.get('/api/poussins', async (req, res) => {
  try {
    const data = await Poussin.find({ actif: true }).sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST — Ajouter un poussin (admin)
router.post('/api/poussins', requireAdmin, async (req, res) => {
  try {
    const poussin = await Poussin.create(req.body);
    res.status(201).json({ success: true, data: poussin });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT — Modifier un poussin (admin)
router.put('/api/poussins/:id', requireAdmin, async (req, res) => {
  try {
    const { type, race, age, localisation, prix, stock, description, image } = req.body;
    const updated = await Poussin.findByIdAndUpdate(
      req.params.id,
      { type, race, age, localisation, prix, stock, description, image },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ success: false, error: 'Poussin introuvable.' });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE — Supprimer un poussin (admin, soft delete)
router.delete('/api/poussins/:id', requireAdmin, async (req, res) => {
  try {
    await Poussin.findByIdAndUpdate(req.params.id, { actif: false });
    res.json({ success: true, message: 'Poussin supprimé.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// MATÉRIELS
// ═══════════════════════════════════════════════════════════════════

// GET — Liste des matériels (public)
router.get('/api/materiels', async (req, res) => {
  try {
    const data = await Materiel.find({ actif: true }).sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST — Ajouter un matériel (admin)
router.post('/api/materiels', requireAdmin, async (req, res) => {
  try {
    const materiel = await Materiel.create(req.body);
    res.status(201).json({ success: true, data: materiel });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT — Modifier un matériel (admin)
router.put('/api/materiels/:id', requireAdmin, async (req, res) => {
  try {
    const { nom, description, prix, stock, image } = req.body;
    const updated = await Materiel.findByIdAndUpdate(
      req.params.id,
      { nom, description, prix, stock, image },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ success: false, error: 'Matériel introuvable.' });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE — Supprimer un matériel (admin)
router.delete('/api/materiels/:id', requireAdmin, async (req, res) => {
  try {
    await Materiel.findByIdAndUpdate(req.params.id, { actif: false });
    res.json({ success: true, message: 'Matériel supprimé.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// LIVRAISONS DE LA SEMAINE
// ═══════════════════════════════════════════════════════════════════

// GET — Liste des livraisons (public)
router.get('/api/livraisons', async (req, res) => {
  try {
    const data = await Livraison.find({ actif: true }).sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST — Ajouter une livraison (admin)
router.post('/api/livraisons', requireAdmin, async (req, res) => {
  try {
    const livraison = await Livraison.create(req.body);
    res.status(201).json({ success: true, data: livraison });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT — Modifier une livraison (admin)
router.put('/api/livraisons/:id', requireAdmin, async (req, res) => {
  try {
    const { type, race, quantite, prix, dateDisponibilite, lieu, image } = req.body;
    const updated = await Livraison.findByIdAndUpdate(
      req.params.id,
      { type, race, quantite, prix, dateDisponibilite, lieu, image },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, error: 'Livraison introuvable.' });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE — Supprimer une livraison (admin)
router.delete('/api/livraisons/:id', requireAdmin, async (req, res) => {
  try {
    await Livraison.findByIdAndUpdate(req.params.id, { actif: false });
    res.json({ success: true, message: 'Livraison supprimée.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// COMMANDES
// ═══════════════════════════════════════════════════════════════════

// POST — Passer une commande (public)
router.post('/api/commandes', async (req, res) => {
  try {
    const { produitType, produitId, nom, telephone, quantite, localisation, message } = req.body;

    if (!produitType || !produitId || !nom || !telephone || !quantite || !localisation) {
      return res.status(400).json({ success: false, error: 'Champs obligatoires manquants.' });
    }

    // Récupérer le produit et vérifier le stock
    let produit, produitNom;

    if (produitType === 'poussin') {
      produit = await Poussin.findById(produitId);
      if (!produit) return res.status(404).json({ success: false, error: 'Poussin introuvable.' });
      produitNom = `${produit.race} (${produit.type})`;
      if (produit.stock < quantite) {
        return res.status(400).json({ success: false, error: `Stock insuffisant. Disponible : ${produit.stock}` });
      }
      await Poussin.findByIdAndUpdate(produitId, { $inc: { stock: -quantite } });

    } else if (produitType === 'materiel') {
      produit = await Materiel.findById(produitId);
      if (!produit) return res.status(404).json({ success: false, error: 'Matériel introuvable.' });
      produitNom = produit.nom;
      if (produit.stock < quantite) {
        return res.status(400).json({ success: false, error: `Stock insuffisant. Disponible : ${produit.stock}` });
      }
      await Materiel.findByIdAndUpdate(produitId, { $inc: { stock: -quantite } });

    } else if (produitType === 'livraison') {
      produit = await Livraison.findById(produitId);
      if (!produit) return res.status(404).json({ success: false, error: 'Livraison introuvable.' });
      produitNom = `${produit.type} ${produit.race} — Livraison`;
      if (produit.quantite < quantite) {
        return res.status(400).json({ success: false, error: `Quantité insuffisante. Disponible : ${produit.quantite}` });
      }
      await Livraison.findByIdAndUpdate(produitId, { $inc: { quantite: -quantite } });

    } else {
      return res.status(400).json({ success: false, error: 'Type de produit invalide.' });
    }

    // Enregistrer la commande
    const commande = await Commande.create({
      produitType,
      produitId,
      produitNom,
      nom,
      telephone,
      quantite,
      prixUnit: produit.prix,
      total:    produit.prix * quantite,
      localisation,
      message:  message || ''
    });

    // Notifier l'équipe LPE via WhatsApp
    try {
      const { sendWhatsAppMessage } = require('../services/whatsapp');
      const lpePhone = process.env.CONSEILLER_PHONE || process.env.LPE_WHATSAPP;
      if (lpePhone) {
        await sendWhatsAppMessage(lpePhone,
          `🛒 *NOUVELLE COMMANDE MAGASIN !*\n\n` +
          `📦 Produit : *${produitNom}*\n` +
          `🔢 Quantité : ${quantite}\n` +
          `💰 Total : ${Number(produit.prix * quantite).toLocaleString('fr-FR')} FCFA\n` +
          `📍 Livraison : ${localisation}\n\n` +
          `👤 *Client :*\n` +
          `Nom : ${nom}\n` +
          `Tél : ${telephone}\n` +
          `${message ? `Note : "${message}"` : ''}\n\n` +
          `⚡ _Confirmez la commande rapidement !_`
        );
      }
    } catch (notifErr) {
      console.error('❌ Erreur notification commande:', notifErr.message);
      // On continue même si la notif échoue
    }

    res.status(201).json({ success: true, data: commande });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET — Liste des commandes (admin uniquement)
router.get('/api/commandes', requireAdmin, async (req, res) => {
  try {
    const commandes = await Commande.find().sort({ createdAt: -1 });
    res.json({ success: true, data: commandes, total: commandes.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT — Changer statut d'une commande (admin)
router.put('/api/commandes/:id/statut', requireAdmin, async (req, res) => {
  try {
    const { statut } = req.body;
    const valides = ['en_attente', 'confirmee', 'livree', 'annulee'];
    if (!valides.includes(statut)) {
      return res.status(400).json({ success: false, error: 'Statut invalide.' });
    }
    const updated = await Commande.findByIdAndUpdate(req.params.id, { statut }, { new: true });

    // Notifier le client si confirmée ou annulée
    if (updated && (statut === 'confirmee' || statut === 'annulee')) {
      try {
        const { sendWhatsAppMessage } = require('../services/whatsapp');
        const msg = statut === 'confirmee'
          ? `✅ *Votre commande est confirmée !*\n\n📦 ${updated.produitNom}\n🔢 Quantité : ${updated.quantite}\n💰 Total : ${Number(updated.total).toLocaleString('fr-FR')} FCFA\n\nNotre équipe vous contactera pour la livraison.\n📞 *+225 01 02 64 20 80*`
          : `❌ *Votre commande a été annulée.*\n\n📞 Pour plus d'infos : *+225 01 02 64 20 80*\n↩️ Tapez *menu* pour revenir au menu principal`;
        await sendWhatsAppMessage(updated.telephone.replace(/\D/g, ''), msg);
      } catch (e) {
        console.error('❌ Erreur notif statut commande:', e.message);
      }
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;