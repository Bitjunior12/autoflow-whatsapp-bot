const Profil = require('../models/Profil');
const Offre  = require('../models/Offre');

const sessions = new Map();

const EMPLOI_URL = (process.env.APP_URL || 'https://autoflow-whatsapp-bot.onrender.com') + '/emploi';

// ─────────────────────────────────────────────────────────────────
// MENU PRINCIPAL EMPLOI
// ─────────────────────────────────────────────────────────────────

async function envoyerMenuEmploi(sendMessage, from) {
  sessions.set(from, { etape: 'emploi_menu', data: {} });
  const nbProfils = await Profil.countDocuments();
  const nbOffres  = await Offre.countDocuments();
  await sendMessage(from,
    `💼 *Bourse de l'Emploi Avicole — Le Partenaire des Éleveurs*\n\n` +
    `👷 *${nbProfils} technicien(s)* disponible(s)\n` +
    `📋 *${nbOffres} offre(s)* d'emploi active(s)\n\n` +
    `Que souhaitez-vous faire ?\n\n` +
    `*1* — 👷 Voir les techniciens disponibles\n` +
    `*2* — 📋 Voir les offres d'emploi\n` +
    `*3* — ✍️ Publier mon profil technicien _(gratuit)_\n` +
    `*4* — 🏗️ Publier une offre d'emploi _(gratuit)_\n` +
    `*5* — 💼 Plan Recruteur _(30 000 FCFA/mois)_\n\n` +
    `_Répondez avec le chiffre de votre choix._\n` +
    `↩️ Tapez *menu* pour annuler`
  );
}

async function envoyerLienEmploi(sendMessage, from) {
  sessions.delete(from);
  await sendMessage(from,
    `💼 *Bourse de l'Emploi Avicole*\n\n` +
    `Consultez tous les profils et offres d'emploi :\n\n` +
    `👉 ${EMPLOI_URL}\n\n` +
    `📌 _Espace public et gratuit._\n\n` +
    `👉 Tapez *profil* pour voir votre profil en ligne\n\n`
    `↩️ Tapez *menu* pour revenir au menu principal`
  );
}

async function envoyerInfoPlanRecruteur(sendMessage, from) {
  sessions.delete(from);
  await sendMessage(from,
    `💼 *Plan Recruteur — 30 000 FCFA/mois*\n\n` +
    `✅ Contact WhatsApp direct des techniciens\n` +
    `✅ Profils certifiés LPE vérifiés\n` +
    `✅ Alertes nouveaux profils disponibles\n` +
    `✅ Offres d'emploi illimitées\n` +
    `✅ Support dédié Le Partenaire\n` +
    `✅ Sans engagement\n\n` +
    `Pour souscrire, contactez-nous :\n` +
    `📞 *+225 01 02 64 20 80*\n\n` +
    `↩️ Tapez *menu* pour revenir au menu principal`
  );
}

// ─────────────────────────────────────────────────────────────────
// PUBLICATION PROFIL TECHNICIEN — ÉTAPE PAR ÉTAPE
// ─────────────────────────────────────────────────────────────────

async function demarrerPublicationProfil(sendMessage, from) {
  sessions.set(from, {
    etape: 'profil_specialite',
    data:  { whatsappId: from }
  });
  await sendMessage(from,
    `✍️ *Publier votre profil technicien — Gratuit*\n\n` +
    `_Étape 1/8_\n\n` +
    `🔧 Quelle est votre *spécialité* ?\n\n` +
    `*1* — Aviculture\n` +
    `*2* — Vétérinaire / Para-vétérinaire\n` +
    `*3* — Manager de ferme\n` +
    `*4* — Logistique\n\n` +
    `_Tapez *menu* pour annuler à tout moment._`
  );
}

async function traiterEtapeProfil(sendMessage, from, texte) {
  const session = sessions.get(from);
  if (!session) return false;

  const msg   = texte.trim().toLowerCase();
  const etape = session.etape;

  // ── MENU EMPLOI ───────────────────────────────────────────────
  if (etape === 'emploi_menu') {
    if (msg === '1') {
      sessions.delete(from);
      await envoyerLienEmploi(sendMessage, from);
      return true;
    }
    if (msg === '2') {
      sessions.delete(from);
      await envoyerLienEmploi(sendMessage, from);
      return true;
    }
    if (msg === '3') {
      await demarrerPublicationProfil(sendMessage, from);
      return true;
    }
    if (msg === '4') {
      await demarrerPublicationOffre(sendMessage, from);
      return true;
    }
    if (msg === '5') {
      await envoyerInfoPlanRecruteur(sendMessage, from);
      return true;
    }
    await sendMessage(from,
      '❌ Tapez *1*, *2*, *3*, *4* ou *5* pour choisir.\n↩️ Tapez *menu* pour annuler.'
    );
    return true;
  }

  // ── Étape 1 : Spécialité ──────────────────────────────────────
  if (etape === 'profil_specialite') {
    const specs = {
      '1': 'Aviculture',
      '2': 'Vétérinaire / Para-vétérinaire',
      '3': 'Manager de ferme',
      '4': 'Logistique'
    };
    if (!specs[msg]) {
      await sendMessage(from, '❌ Répondez avec *1*, *2*, *3* ou *4*.');
      return true;
    }
    session.data.specialite = specs[msg];
    session.etape           = 'profil_region';
    await sendMessage(from,
      `✅ Spécialité : *${session.data.specialite}*\n\n` +
      `_Étape 2/8_\n\n` +
      `📍 Dans quelle *région* cherchez-vous un emploi ?\n` +
      `_(Ex: Abidjan, Bouaké, Yamoussoukro…)_`
    );
    return true;
  }

  // ── Étape 2 : Région ──────────────────────────────────────────
  if (etape === 'profil_region') {
    session.data.region = texte.trim();
    session.etape       = 'profil_experience';
    await sendMessage(from,
      `✅ Région : *${session.data.region}*\n\n` +
      `_Étape 3/8_\n\n` +
      `📅 Combien d'*années d'expérience* avez-vous ?\n\n` +
      `*1* — Moins d'1 an\n` +
      `*2* — 1 à 2 ans\n` +
      `*3* — 3 à 5 ans\n` +
      `*4* — Plus de 5 ans`
    );
    return true;
  }

  // ── Étape 3 : Expérience ──────────────────────────────────────
  if (etape === 'profil_experience') {
    const exps = {
      '1': 'Moins d\'1 an',
      '2': '1 à 2 ans',
      '3': '3 à 5 ans',
      '4': 'Plus de 5 ans'
    };
    if (!exps[msg]) {
      await sendMessage(from, '❌ Répondez avec *1*, *2*, *3* ou *4*.');
      return true;
    }
    session.data.experience = exps[msg];
    session.etape           = 'profil_contrat';
    await sendMessage(from,
      `✅ Expérience : *${session.data.experience}*\n\n` +
      `_Étape 4/8_\n\n` +
      `📄 Quel type de *contrat* recherchez-vous ?\n\n` +
      `*1* — CDI\n` +
      `*2* — CDD\n` +
      `*3* — Saisonnier\n` +
      `*4* — Journalier`
    );
    return true;
  }

  // ── Étape 4 : Contrat ─────────────────────────────────────────
  if (etape === 'profil_contrat') {
    const contrats = {
      '1': 'CDI',
      '2': 'CDD',
      '3': 'Saisonnier',
      '4': 'Journalier'
    };
    if (!contrats[msg]) {
      await sendMessage(from, '❌ Répondez avec *1*, *2*, *3* ou *4*.');
      return true;
    }
    session.data.contrat = contrats[msg];
    session.etape        = 'profil_salaire';
    await sendMessage(from,
      `✅ Contrat : *${session.data.contrat}*\n\n` +
      `_Étape 5/8_\n\n` +
      `💰 Quelle est votre *prétention salariale* ? (FCFA/mois)\n` +
      `_(Ex: 150000 — ou tapez *passer*)_`
    );
    return true;
  }

  // ── Étape 5 : Salaire ─────────────────────────────────────────
  if (etape === 'profil_salaire') {
    session.data.salaire = msg === 'passer' ? 'À négocier' : texte.trim();
    session.etape        = 'profil_disponibilite';
    await sendMessage(from,
      `✅ Salaire : *${session.data.salaire}*\n\n` +
      `_Étape 6/8_\n\n` +
      `📅 Quelle est votre *disponibilité* ?\n\n` +
      `*1* — Immédiatement\n` +
      `*2* — Dans 1 mois\n` +
      `*3* — À négocier`
    );
    return true;
  }

  // ── Étape 6 : Disponibilité ───────────────────────────────────
  if (etape === 'profil_disponibilite') {
    const dispos = {
      '1': 'Immédiatement',
      '2': 'Dans 1 mois',
      '3': 'À négocier'
    };
    if (!dispos[msg]) {
      await sendMessage(from, '❌ Répondez avec *1*, *2* ou *3*.');
      return true;
    }
    session.data.disponibilite = dispos[msg];
    session.etape              = 'profil_description';
    await sendMessage(from,
      `✅ Disponibilité : *${session.data.disponibilite}*\n\n` +
      `_Étape 7/8_\n\n` +
      `📝 Décrivez brièvement votre *parcours et expériences* :\n` +
      `_(Ex: 3 ans en élevage pondeuse, gestion de 5000 sujets...)_\n\n` +
      `_Tapez *passer* pour ignorer._`
    );
    return true;
  }

  // ── Étape 7 : Description ─────────────────────────────────────
 if (etape === 'profil_description') {
    session.data.description = msg === 'passer' ? '' : texte.trim();
    session.etape            = 'profil_photo';
    await sendMessage(from,
      `✅ Description enregistrée.\n\n` +
      `_Étape 8/9_\n\n` +
      `📸 Envoyez votre *photo de profil*.\n\n` +
      `_⚠️ La photo est obligatoire pour publier votre profil._`
    );
    return true;
  }

  // ── Étape 8 : Photo profil ────────────────────────────────────
 if (etape === 'profil_photo') {
    await sendMessage(from,
      `_Étape 8/9_\n\n` +
      `⚠️ La photo est *obligatoire*.\n\n` +
      `📸 Envoyez votre *photo de profil* pour continuer.`
    );
    return true;
  }
  // ── Étape 8 : Nom ─────────────────────────────────────────────
  if (etape === 'profil_nom') {
    if (texte.trim().length < 2) {
      await sendMessage(from, '❌ Entrez un nom valide. Ex: *Kouassi Emmanuel*');
      return true;
    }
    session.data.nom  = texte.trim();
    session.etape     = 'profil_telephone';
    await sendMessage(from,
      `✅ Nom : *${session.data.nom}*\n\n` +
      `_Étape 9/9_\n\n` +
      `📱 Quel est votre *numéro de téléphone* ?\n` +
      `_(Ex: +225 07 00 00 00)_`
    );
    return true;
  }

  // ── Étape 9 : Téléphone ───────────────────────────────────────
  if (etape === 'profil_telephone') {
    if (texte.trim().length < 8) {
      await sendMessage(from, '❌ Entrez un numéro valide. Ex: *+225 07 00 00 00*');
      return true;
    }
    session.data.telephone = texte.trim();
    session.etape          = 'profil_confirmation';
    await _afficherConfirmationProfil(sendMessage, from, session.data);
    return true;
  }

  // ── Confirmation Profil ───────────────────────────────────────
  if (etape === 'profil_confirmation') {
    if (msg === '1') {
      try {
        await Profil.create(session.data);
        sessions.delete(from);
        await sendMessage(from,
          `🎉 *Profil publié avec succès !*\n\n` +
          `Votre profil est visible sur la bourse de l'emploi :\n` +
          `👉 ${EMPLOI_URL}\n\n` +
          `🏅 Vous avez été formé par Le Partenaire des Éleveurs ?\n` +
          `Contactez-nous pour obtenir le badge *Certifié LPE* !\n` +
          `📞 *+225 01 02 64 20 80*\n\n` +
          `↩️ Tapez *menu* pour revenir au menu principal`
        );
      } catch (err) {
        console.error('❌ Erreur création profil :', err.message);
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

  // ── TUNNEL OFFRE D'EMPLOI ─────────────────────────────────────
  if (etape === 'offre_poste') {
    const postes = {
      '1': 'Technicien avicole',
      '2': 'Vétérinaire',
      '3': 'Responsable de ferme',
      '4': 'Agent logistique',
      '5': 'Autre'
    };
    if (!postes[msg]) {
      await sendMessage(from, '❌ Répondez avec *1*, *2*, *3*, *4* ou *5*.');
      return true;
    }
    session.data.poste = postes[msg];
    session.etape      = 'offre_region';
    await sendMessage(from,
      `✅ Poste : *${session.data.poste}*\n\n` +
      `_Étape 2/7_\n\n` +
      `📍 Dans quelle *région* se trouve votre ferme ?\n` +
      `_(Ex: Abidjan, Bouaké, Yamoussoukro…)_`
    );
    return true;
  }

  if (etape === 'offre_region') {
    session.data.region = texte.trim();
    session.etape       = 'offre_contrat';
    await sendMessage(from,
      `✅ Région : *${session.data.region}*\n\n` +
      `_Étape 3/7_\n\n` +
      `📄 Quel type de *contrat* proposez-vous ?\n\n` +
      `*1* — CDI\n` +
      `*2* — CDD\n` +
      `*3* — Saisonnier\n` +
      `*4* — Journalier`
    );
    return true;
  }

  if (etape === 'offre_contrat') {
    const contrats = {
      '1': 'CDI',
      '2': 'CDD',
      '3': 'Saisonnier',
      '4': 'Journalier'
    };
    if (!contrats[msg]) {
      await sendMessage(from, '❌ Répondez avec *1*, *2*, *3* ou *4*.');
      return true;
    }
    session.data.contrat = contrats[msg];
    session.etape        = 'offre_salaire';
    await sendMessage(from,
      `✅ Contrat : *${session.data.contrat}*\n\n` +
      `_Étape 4/7_\n\n` +
      `💰 Quel *salaire* proposez-vous ? (FCFA/mois)\n` +
      `_(Ex: 120000 — ou tapez *passer*)_`
    );
    return true;
  }

  if (etape === 'offre_salaire') {
    session.data.salaire = msg === 'passer' ? 'À négocier' : texte.trim();
    session.etape        = 'offre_effectif';
    await sendMessage(from,
      `✅ Salaire : *${session.data.salaire}*\n\n` +
      `_Étape 5/7_\n\n` +
      `🐔 Quel est l'*effectif* de votre élevage ?\n` +
      `_(Ex: 5000 poulets de chair — ou tapez *passer*)_`
    );
    return true;
  }

  if (etape === 'offre_effectif') {
    session.data.effectif = msg === 'passer' ? '' : texte.trim();
    session.etape         = 'offre_description';
    await sendMessage(from,
      `✅ Effectif enregistré.\n\n` +
      `_Étape 6/7_\n\n` +
      `📝 Décrivez le *poste et vos attentes* :\n` +
      `_(Ex: Gestion de 5000 pondeuses, expérience 2 ans minimum...)_\n\n` +
      `_Tapez *passer* pour ignorer._`
    );
    return true;
  }

 if (etape === 'offre_description') {
    session.data.description = msg === 'passer' ? '' : texte.trim();
    session.etape = 'offre_photo';
    await sendMessage(from,
      `✅ Description enregistrée.\n\n` +
      `_Étape 6/8_\n\n` +
      `📸 Envoyez une *photo de votre ferme*.\n\n` +
      `_⚠️ La photo est obligatoire pour publier votre offre._`
    );
    return true;
  }

  // ── Étape 6 : Photo ferme ─────────────────────────────────────
  if (etape === 'offre_photo') {
    await sendMessage(from,
      `_Étape 6/8_\n\n` +
      `⚠️ La photo est *obligatoire*.\n\n` +
      `📸 Envoyez une *photo de votre ferme* pour continuer.`
    );
    return true;
  }

  if (etape === 'offre_ferme') {
    if (texte.trim().length < 2) {
      await sendMessage(from, '❌ Entrez un nom valide.');
      return true;
    }
    session.data.ferme    = texte.trim();
    session.etape         = 'offre_telephone';
    await sendMessage(from,
      `✅ Ferme : *${session.data.ferme}*\n\n` +
      `📱 Quel est votre *numéro de téléphone* ?\n` +
      `_(Ex: +225 07 00 00 00)_`
    );
    return true;
  }

  if (etape === 'offre_telephone') {
    if (texte.trim().length < 8) {
      await sendMessage(from, '❌ Entrez un numéro valide. Ex: *+225 07 00 00 00*');
      return true;
    }
    session.data.telephone = texte.trim();
    session.etape          = 'offre_confirmation';
    await _afficherConfirmationOffre(sendMessage, from, session.data);
    return true;
  }

  if (etape === 'offre_confirmation') {
    if (msg === '1') {
      try {
        await Offre.create(session.data);
        sessions.delete(from);
        await sendMessage(from,
          `🎉 *Offre publiée avec succès !*\n\n` +
          `Votre offre est visible sur la bourse de l'emploi :\n` +
          `👉 ${EMPLOI_URL}\n\n` +
          `↩️ Tapez *menu* pour revenir au menu principal`
        );
      } catch (err) {
        console.error('❌ Erreur création offre :', err.message);
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
// RÉCEPTION PHOTO PENDANT LA PUBLICATION
// ─────────────────────────────────────────────────────────────────

async function traiterMediaEmploi(sendMessage, from, mediaUrl) {
  const session = sessions.get(from);
  if (!session) return false;

  const etape = session.etape;

  // Photo profil technicien
  if (etape === 'profil_photo') {
    session.data.photoUrl = mediaUrl;
    session.etape         = 'profil_nom';
    await sendMessage(from,
      `✅ Photo enregistrée !\n\n` +
      `_Étape 9/9_\n\n` +
      `👤 Quel est votre *nom complet* ?\n` +
      `_(Ex: Kouassi Emmanuel)_`
    );
    return true;
  }

  // Photo ferme offre d'emploi
  if (etape === 'offre_photo') {
    session.data.photoUrl = mediaUrl;
    session.etape         = 'offre_ferme';
    await sendMessage(from,
      `✅ Photo de la ferme enregistrée !\n\n` +
      `_Étape 7/8_\n\n` +
      `🏗️ Quel est le *nom de votre ferme ou structure* ?\n` +
      `_(Ex: Ferme Kouassi & Fils)_`
    );
    return true;
  }

  return false;
}
// ─────────────────────────────────────────────────────────────────
// PUBLICATION OFFRE D'EMPLOI
// ─────────────────────────────────────────────────────────────────

async function demarrerPublicationOffre(sendMessage, from) {
  sessions.set(from, {
    etape: 'offre_poste',
    data:  { whatsappId: from }
  });
  await sendMessage(from,
    `🏗️ *Publier une offre d'emploi — Gratuit*\n\n` +
    `_Étape 1/7_\n\n` +
    `💼 Quel *poste* recherchez-vous ?\n\n` +
    `*1* — Technicien avicole\n` +
    `*2* — Vétérinaire\n` +
    `*3* — Responsable de ferme\n` +
    `*4* — Agent logistique\n` +
    `*5* — Autre\n\n` +
    `_Tapez *menu* pour annuler à tout moment._`
  );
}

// ─────────────────────────────────────────────────────────────────
// CONFIRMATIONS
// ─────────────────────────────────────────────────────────────────

async function _afficherConfirmationProfil(sendMessage, from, data) {
  await sendMessage(from,
    `📋 *Récapitulatif de votre profil :*\n\n` +
    `🔧 Spécialité : ${data.specialite}\n` +
    `📍 Région : ${data.region}\n` +
    `📅 Expérience : ${data.experience}\n` +
    `📄 Contrat recherché : ${data.contrat}\n` +
    `💰 Prétention salariale : ${data.salaire}\n` +
    `📅 Disponibilité : ${data.disponibilite}\n` +
    `📝 Description : ${data.description || 'Aucune'}\n` +
    `👤 Nom : ${data.nom}\n` +
    `📱 Téléphone : ${data.telephone}\n\n` +
    `Confirmez-vous la publication ?\n\n` +
    `*1* — ✅ Oui, publier gratuitement\n` +
    `*2* — ❌ Non, annuler`
  );
}

async function _afficherConfirmationOffre(sendMessage, from, data) {
  await sendMessage(from,
    `📋 *Récapitulatif de votre offre :*\n\n` +
    `🏗️ Ferme : ${data.ferme}\n` +
    `💼 Poste : ${data.poste}\n` +
    `📍 Région : ${data.region}\n` +
    `📄 Contrat : ${data.contrat}\n` +
    `💰 Salaire : ${data.salaire}\n` +
    `🐔 Effectif : ${data.effectif || 'Non précisé'}\n` +
    `📝 Description : ${data.description || 'Aucune'}\n` +
    `📱 Téléphone : ${data.telephone}\n\n` +
    `Confirmez-vous la publication ?\n\n` +
    `*1* — ✅ Oui, publier gratuitement\n` +
    `*2* — ❌ Non, annuler`
  );
}

// ─────────────────────────────────────────────────────────────────
// LISTE DES ÉTAPES
// ─────────────────────────────────────────────────────────────────

const EMPLOI_STEPS = [
  'emploi_menu',
  'profil_specialite',
  'profil_region',
  'profil_experience',
  'profil_contrat',
  'profil_salaire',
  'profil_disponibilite',
  'profil_description',
  'profil_nom',
  'profil_telephone',
  'profil_confirmation',
  'offre_poste',
  'offre_region',
  'offre_contrat',
  'offre_salaire',
  'offre_effectif',
  'offre_description',
  'offre_ferme',
  'offre_telephone',
  'offre_confirmation'
];
// ─────────────────────────────────────────────────────────────────
// BOOST EMPLOI
// ─────────────────────────────────────────────────────────────────

async function envoyerMenuBoostEmploi(sendMessage, from) {
  sessions.set(from + '_boost_emploi', { etape: 'boost_emploi_choix' });
  await sendMessage(from,
    `⚡ *Booster votre annonce emploi*\n\n` +
    `Passez en tête de liste et soyez vu en priorité !\n\n` +
    `*1* — 🚀 Boost Standard 7 jours — *1 500 FCFA*\n` +
    `*2* — ⭐ Boost Premium 14 jours — *3 000 FCFA*\n` +
    `*3* — 🔔 Boost Express 48h — *2 000 FCFA*\n\n` +
    `_Choisissez votre formule (1, 2 ou 3)_\n` +
    `↩️ Tapez *menu* pour annuler`
  );
}

async function traiterChoixBoostEmploi(sendMessage, from, texte) {
  const session = sessions.get(from + '_boost_emploi');
  if (!session || session.etape !== 'boost_emploi_choix') return false;

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

  sessions.delete(from + '_boost_emploi');
  await sendMessage(from,
    `✅ Formule choisie : *${choix.label}*\n\n` +
    `💳 *Envoyez ${choix.prix.toLocaleString('fr-FR')} FCFA à :*\n\n` +
    `🟠 *Orange Money* : *${process.env.ORANGE_MONEY_NUM || '+225 07 XX XX XX'}*\n` +
    `🟡 *Wave* : *${process.env.WAVE_NUM || '+225 07 XX XX XX'}*\n\n` +
    `📸 Envoyez ensuite la *capture d'écran* de votre paiement.\n` +
    `Notre équipe activera votre boost sous *30 minutes*.\n\n` +
    `👉 Tapez *profil* pour voir votre profil en ligne\n\n`+
    `↩️ Tapez *menu* pour revenir au menu principal`
  );
  return true;
}
// ─────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────
module.exports = {
  sessions,
  EMPLOI_STEPS,
  envoyerMenuEmploi,
  envoyerLienEmploi,
  envoyerInfoPlanRecruteur,
  demarrerPublicationProfil,
  demarrerPublicationOffre,
  traiterEtapeProfil,
  traiterMediaEmploi,
  envoyerMenuBoostEmploi,
  traiterChoixBoostEmploi,
};