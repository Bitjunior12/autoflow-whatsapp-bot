const Annonce = require('../models/Annonce');

const sessions = new Map();

const MARCHE_URL = (process.env.APP_URL || 'https://autoflow-whatsapp-bot.onrender.com') + '/marche';

// ─────────────────────────────────────────────────────────────────
// MENUS
// ─────────────────────────────────────────────────────────────────

async function envoyerMenuMarche(sendMessage, from) {
  sessions.set(from, { etape: 'marche_menu', data: {} });
  const nb = await Annonce.countDocuments();
  await sendMessage(from,
    `🛒 *Marché des Volailles — Le Partenaire des Éleveurs*\n\n` +
    `📊 *${nb} annonce(s)* active(s) en ce moment.\n\n` +
    `Que souhaitez-vous faire ?\n\n` +
    `*1* — 👀 Voir toutes les annonces\n` +
    `*2* — 📢 Publier une annonce _(gratuit)_\n` +
    `*3* — ⚡ Booster mon annonce _(dès 1 500 FCFA)_\n` +
    `*4* — ⭐ Plan Mise en Relation _(25 000 FCFA/mois)_\n\n` +
    `_Répondez avec le chiffre de votre choix._\n` +
    `↩️ Tapez *menu* pour annuler`
  );
}

async function envoyerLienMarche(sendMessage, from) {
  sessions.delete(from);
  const nb = await Annonce.countDocuments();
  await sendMessage(from,
    `🛒 *Marché des Volailles — ${nb} annonces actives*\n\n` +
    `Consultez les annonces avec photos et vidéos :\n\n` +
    `👉 ${MARCHE_URL}\n\n` +
    `📌 _Espace public et gratuit. Mis à jour en temps réel._\n\n` +
    `↩️ Tapez *menu* pour revenir au menu principal`
  );
}

async function envoyerInfoPlanMER(sendMessage, from) {
  sessions.delete(from);
  await sendMessage(from,
    `⭐ *Plan Mise en Relation — 25 000 FCFA/mois*\n\n` +
    `✅ Contact WhatsApp direct des éleveurs\n` +
    `✅ Profils éleveurs vérifiés par notre équipe\n` +
    `✅ Alertes nouvelles disponibilités\n` +
    `✅ Support dédié Le Partenaire\n` +
    `✅ Sans engagement\n\n` +
    `Pour souscrire, contactez-nous :\n` +
    `📞 *+225 01 02 64 20 80*\n\n` +
    `↩️ Tapez *menu* pour revenir au menu principal`
  );
}

// ─────────────────────────────────────────────────────────────────
// PUBLICATION ÉTAPE PAR ÉTAPE
// ─────────────────────────────────────────────────────────────────

async function demarrerPublication(sendMessage, from) {
  sessions.set(from, {
    etape: 'marche_type',
    data:  { whatsappId: from }
  });
  await sendMessage(from,
    `📢 *Publier votre annonce — Gratuit*\n\n` +
    `_Étape 1/10_\n\n` +
    `🐔 Quel type de volaille vendez-vous ?\n\n` +
    `*1* — Poulet de chair\n` +
    `*2* — Pondeuse réformée\n` +
    `*3* — Pintade\n` +
    `*4* — Dinde\n` +
    `*5* — Canard\n\n` +
    `_Tapez *menu* pour annuler à tout moment._`
  );
}

async function traiterEtapePublication(sendMessage, from, texte) {
  const session = sessions.get(from);
  if (!session) return false;
  // Sauvegarder étape marché dans MongoDB
  const { setSession: saveSession } = require('../services/session');
  await saveSession(from, {
    ...session,
    marcheEtape: session.etape,
    marcheData:  session.data
  });

  const msg   = texte.trim().toLowerCase();
  const etape = session.etape;

  // ── MENU MARCHÉ ───────────────────────────────────────────────
  if (etape === 'marche_menu') {
    if (msg === '1') {
      sessions.delete(from);
      await envoyerLienMarche(sendMessage, from);
      return true;
    }
    if (msg === '2') {
      await demarrerPublication(sendMessage, from);
      return true;
    }
    if (msg === '3') {
      sessions.delete(from);
      await envoyerMenuBoost(sendMessage, from);
      return true;
    }
    if (msg === '4') {
      sessions.delete(from);
      await envoyerInfoPlanMER(sendMessage, from);
      return true;
    }
    await sendMessage(from,
      '❌ Tapez *1*, *2*, *3* ou *4* pour choisir.\n↩️ Tapez *menu* pour annuler.'
    );
    return true;
  }

  // ── Étape 1 : Type ────────────────────────────────────────────
  if (etape === 'marche_type') {
    const types = {
      '1': 'Poulet de chair',
      '2': 'Pondeuse réformée',
      '3': 'Pintade',
      '4': 'Dinde',
      '5': 'Canard'
    };
    if (!types[msg]) {
      await sendMessage(from, '❌ Répondez avec *1*, *2*, *3*, *4* ou *5*.');
      return true;
    }
    session.data.type = types[msg];
    session.etape     = 'marche_region';
    await sendMessage(from,
      `✅ Type : *${session.data.type}*\n\n` +
      `_Étape 2/10_\n\n` +
      `📍 Dans quelle *région* se trouve votre élevage ?\n` +
      `_(Ex: Abidjan, Bouaké, Yamoussoukro, Korhogo…)_`
    );
    return true;
  }

  // ── Étape 2 : Région ──────────────────────────────────────────
  if (etape === 'marche_region') {
    session.data.region = texte.trim();
    session.etape       = 'marche_quantite';
    await sendMessage(from,
      `✅ Région : *${session.data.region}*\n\n` +
      `_Étape 3/10_\n\n` +
      `🔢 Quelle est la *quantité disponible* ?\n` +
      `_(Ex: 500)_`
    );
    return true;
  }

  // ── Étape 3 : Quantité ────────────────────────────────────────
  if (etape === 'marche_quantite') {
    const qte = parseInt(texte.replace(/\s/g, ''));
    if (isNaN(qte) || qte <= 0) {
      await sendMessage(from, '❌ Entrez un nombre valide. Ex: *300*');
      return true;
    }
    session.data.quantite = qte;
    session.etape         = 'marche_prix';
    await sendMessage(from,
      `✅ Quantité : *${qte} sujets*\n\n` +
      `_Étape 4/10_\n\n` +
      `💰 Quel est votre *prix par sujet* en FCFA ?\n` +
      `_(Ex: 2500)_`
    );
    return true;
  }

  // ── Étape 4 : Prix ────────────────────────────────────────────
  if (etape === 'marche_prix') {
    const prix = parseInt(texte.replace(/\s/g, ''));
    if (isNaN(prix) || prix <= 0) {
      await sendMessage(from, '❌ Entrez un prix valide. Ex: *2500*');
      return true;
    }
    session.data.prix = prix;
    session.etape     = 'marche_poids';
    await sendMessage(from,
      `✅ Prix : *${prix.toLocaleString('fr-FR')} FCFA/sujet*\n\n` +
      `_Étape 5/10_\n\n` +
      `⚖️ Quel est le *poids moyen* par sujet ?\n` +
      `_(Ex: 1.8kg — ou tapez *passer*)_`
    );
    return true;
  }

  // ── Étape 5 : Poids ───────────────────────────────────────────
  if (etape === 'marche_poids') {
    session.data.poids = msg === 'passer' ? 'N/D' : texte.trim();
    session.etape      = 'marche_photo';
    await sendMessage(from,
      `✅ Poids : *${session.data.poids}*\n\n` +
      `_Étape 6/10_\n\n` +
      `📸 Envoyez une *photo ou vidéo* de vos volailles.\n\n` +
      `_Une image attire 3× plus d'acheteurs !_\n` +
      `_Tapez *passer* pour continuer sans photo._`
    );
    return true;
  }

  // ── Étape 6 : Photo ───────────────────────────────────────────
  if (etape === 'marche_photo') {
    if (msg === 'passer') {
      session.etape = 'marche_description';
      await sendMessage(from,
        `_Étape 7/10_\n\n` +
        `📝 Avez-vous des *informations supplémentaires* à ajouter sur vos volailles ?\n\n` +
        `_(Ex: race, alimentation, état de santé, date de disponibilité...)_\n\n` +
        `_Tapez *passer* pour ignorer._`
      );
    } else {
      await sendMessage(from,
        '📸 Envoyez une photo/vidéo ou tapez *passer* pour continuer sans.'
      );
    }
    return true;
  }

  // ── Étape 7 : Description ─────────────────────────────────────
  if (etape === 'marche_description') {
    session.data.description = msg === 'passer' ? '' : texte.trim();
    session.etape            = 'marche_nom';
    await sendMessage(from,
      `✅ Informations enregistrées.\n\n` +
      `_Étape 8/10_\n\n` +
      `👤 Quel est votre *nom complet* ?\n` +
      `_(Ex: Kouassi Ange)_`
    );
    return true;
  }

  // ── Étape 8 : Nom ─────────────────────────────────────────────
  if (etape === 'marche_nom') {
    if (texte.trim().length < 2) {
      await sendMessage(from, '❌ Entrez un nom valide. Ex: *Kouassi Ange*');
      return true;
    }
    session.data.nom = texte.trim();
    session.etape    = 'marche_telephone';
    await sendMessage(from,
      `✅ Nom : *${session.data.nom}*\n\n` +
      `_Étape 9/10_\n\n` +
      `📱 Quel est votre *numéro de téléphone* ?\n` +
      `_(Ex: +225 07 00 00 00)_`
    );
    return true;
  }

  // ── Étape 9 : Téléphone ───────────────────────────────────────
  if (etape === 'marche_telephone') {
    if (texte.trim().length < 8) {
      await sendMessage(from, '❌ Entrez un numéro valide. Ex: *+225 07 00 00 00*');
      return true;
    }
    session.data.telephone = texte.trim();
    session.etape          = 'marche_confirmation';
    await sendMessage(from,
      `✅ Téléphone : *${session.data.telephone}*\n\n` +
      `_Étape 10/10_\n\n`
    );
    await _afficherConfirmation(sendMessage, from, session.data);
    return true;
  }

  // ── Étape 10 : Confirmation ───────────────────────────────────
  if (etape === 'marche_confirmation') {
    if (msg === '1') {
      try {
        console.log('On est dans le marché');
        const annonce = await Annonce.create(session.data);
        sessions.delete(from);
        await sendMessage(from,
          `🎉 *Annonce publiée avec succès !*\n\n` +
          `Votre annonce est maintenant visible sur le marché :\n` +
          `👉 ${MARCHE_URL}\n\n` +
          `💡 Tapez *boost* pour booster votre annonce.\n\n` +
          `↩️ Tapez *menu* pour revenir au menu principal`
        );
      } catch (err) {
        console.error('❌ Erreur création annonce :', err.message);
        await sendMessage(from,
          '❌ Erreur technique. Réessayez ou contactez le support.\n\n' +
          '📞 *+225 01 02 64 20 80*'
        );
      }
    } else if (msg === '2') {
      sessions.delete(from);
      await sendMessage(from,
        '❌ Publication annulée.\n\n' +
        '↩️ Tapez *menu* pour revenir au menu principal'
      );
    } else {
      await sendMessage(from, 'Tapez *1* pour confirmer ou *2* pour annuler.');
    }
    return true;
  }

  return false;
}

// ─────────────────────────────────────────────────────────────────
// RÉCEPTION PHOTO/VIDÉO PENDANT LA PUBLICATION
// ─────────────────────────────────────────────────────────────────

async function traiterMediaMarche(sendMessage, from, mediaUrl, mediaType) {
  const session = sessions.get(from);
  if (!session || session.etape !== 'marche_photo') return false;

  session.data.mediaUrl  = mediaUrl;
  session.data.mediaType = mediaType;
  session.etape          = 'marche_description';

  await sendMessage(from,
    `✅ Photo ajoutée !\n\n` +
    `_Étape 7/10_\n\n` +
    `📝 Avez-vous des *informations supplémentaires* à ajouter sur vos volailles ?\n\n` +
    `_(Ex: race, alimentation, état de santé, date de disponibilité...)_\n\n` +
    `_Tapez *passer* pour ignorer._`
  );
  return true;
}

// ─────────────────────────────────────────────────────────────────
// CONFIRMATION — affichage du récapitulatif
// ─────────────────────────────────────────────────────────────────

async function _afficherConfirmation(sendMessage, from, data) {
  await sendMessage(from,
    `📋 *Récapitulatif de votre annonce :*\n\n` +
    `🐔 Type : ${data.type}\n` +
    `📍 Région : ${data.region}\n` +
    `🔢 Quantité : ${data.quantite} sujets\n` +
    `💰 Prix : ${Number(data.prix).toLocaleString('fr-FR')} FCFA/sujet\n` +
    `⚖️ Poids : ${data.poids}\n` +
    `📝 Description : ${data.description || 'Aucune'}\n` +
    `👤 Nom : ${data.nom}\n` +
    `📱 Téléphone : ${data.telephone}\n` +
    `📸 Média : ${data.mediaUrl ? '✅ Photo ajoutée' : '❌ Sans photo'}\n\n` +
    `Confirmez-vous la publication ?\n\n` +
    `*1* — ✅ Oui, publier gratuitement\n` +
    `*2* — ❌ Non, annuler`
  );
}

// ─────────────────────────────────────────────────────────────────
// BOOST
// ─────────────────────────────────────────────────────────────────

async function envoyerMenuBoost(sendMessage, from) {
  sessions.set(from + '_boost', { etape: 'boost_choix' });
  await sendMessage(from,
    `⚡ *Booster votre annonce*\n\n` +
    `Passez en tête de liste et vendez *3× plus vite !*\n\n` +
    `*1* — 🚀 Boost Standard 7 jours — *1 500 FCFA*\n` +
    `*2* — ⭐ Boost Premium 14 jours — *3 000 FCFA*\n` +
    `*3* — 🔔 Boost Express 48h — *2 000 FCFA*\n\n` +
    `_Choisissez votre formule (1, 2 ou 3)_\n` +
    `↩️ Tapez *menu* pour annuler`
  );
}

async function traiterChoixBoost(sendMessage, from, texte) {
  const session = sessions.get(from + '_boost');
  if (!session || session.etape !== 'boost_choix') return false;

  const formules = {
    '1': { label: 'Boost Standard 7j',  prix: 1500, jours: 7  },
    '2': { label: 'Boost Premium 14j',  prix: 3000, jours: 14 },
    '3': { label: 'Boost Express 48h',  prix: 2000, jours: 2  },
  };

  const choix = formules[texte.trim()];
  if (!choix) {
    await sendMessage(from, '❌ Répondez avec *1*, *2* ou *3*.');
    return true;
  }

  sessions.delete(from + '_boost');
  await sendMessage(from,
    `✅ Formule choisie : *${choix.label}*\n\n` +
    `💳 *Envoyez ${choix.prix.toLocaleString('fr-FR')} FCFA à :*\n\n` +
    `🟠 *Orange Money* : *${process.env.ORANGE_MONEY_NUM || '+225 07 XX XX XX'}*\n` +
    `🟡 *Wave* : *${process.env.WAVE_NUM || '+225 07 XX XX XX'}*\n\n` +
    `📸 Envoyez ensuite la *capture d'écran* de votre paiement.\n` +
    `Notre équipe activera votre boost sous *30 minutes*.\n\n` +
    `↩️ Tapez *menu* pour revenir au menu principal`
  );
  return true;
}

// ─────────────────────────────────────────────────────────────────
// NETTOYAGE COMPLET DES SESSIONS (appelé quand l'utilisateur tape "menu")
// ─────────────────────────────────────────────────────────────────

function clearSessions(from) {
  sessions.delete(from);
  sessions.delete(from + '_boost');
}

// ─────────────────────────────────────────────────────────────────
// LISTE DES ÉTAPES
// ─────────────────────────────────────────────────────────────────

const MARCHE_STEPS = [
  'marche_menu',
  'marche_type',
  'marche_region',
  'marche_quantite',
  'marche_prix',
  'marche_poids',
  'marche_photo',
  'marche_description',
  'marche_nom',
  'marche_telephone',
  'marche_confirmation'
];

// ─────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────

module.exports = {
  sessions,
  MARCHE_STEPS,
  clearSessions,
  envoyerMenuMarche,
  envoyerLienMarche,
  envoyerInfoPlanMER,
  demarrerPublication,
  traiterEtapePublication,
  traiterMediaMarche,
  envoyerMenuBoost,
  traiterChoixBoost,
};