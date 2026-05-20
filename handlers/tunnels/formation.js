const { setSession, clearSession } = require('../../services/session');
const { MENU_FORMATION } = require('../../menus');

async function handleFormation(from, msg, text, session) {
  if (msg === '5' && !session?.step) {
    await setSession(from, { step: 'choix_formation' });
    return MENU_FORMATION;
  }

  if (session?.step === 'choix_formation') {
    if (msg === '1') {
      await clearSession(from);
      const lien = process.env.LIEN_FORMATION_LIVE || 'Disponible sur demande — appelez le +225 01 02 64 20 80';
      return `🎓 *FORMATION LIVE — ZOOM*
_Le Partenaire des Éleveurs_

📅 *Quand ?* Chaque mois — vendredis & dimanches
💰 *Coût :* 85 000 FCFA

✅ *Ce que vous obtenez :*
✓ Sessions en direct avec nos experts
✓ Questions-réponses en temps réel
✓ Supports vidéos + documents
✓ La Boussole de l'Éleveur (guide numérique)
✓ Certificat de participation
✓ Accompagnement mise en place
✓ Accès WhatsApp Assistance 24H/24

👉 *S'inscrire maintenant :*
🔗 ${lien}

📞 Plus d'infos : *+225 01 02 64 20 80*
↩️ Tapez *menu* pour revenir au menu principal`;
    }

    if (msg === '2') {
      await clearSession(from);
      const lien = process.env.LIEN_FORMATION_ENREGISTREE || 'Disponible sur demande — appelez le +225 01 02 64 20 80';
      return `🎬 *FORMATION PRÉ-ENREGISTRÉE*
_Le Partenaire des Éleveurs_

⏱️ *À votre rythme* — disponible 24h/24
💰 *Coût :* 27 500 FCFA
📱 *Accès immédiat* après paiement

✅ *Ce que vous obtenez :*
✓ Vidéos complètes accessibles à vie
✓ Bases de l'aviculture moderne
✓ Alimentation & prophylaxie
✓ Gestion sanitaire & maladies
✓ Rentabilité & gestion financière
✓ La Boussole de l'Éleveur (guide numérique)

🎯 *Idéal pour :*
✓ Personnes occupées sans disponibilité fixe
✓ Ceux qui veulent apprendre à leur rythme

👉 *Accéder à la formation :*
🔗 ${lien}

📞 Plus d'infos : *+225 01 02 64 20 80*
↩️ Tapez *menu* pour revenir au menu principal`;
    }

    return `❓ Tapez *1* pour la formation Live ou *2* pour la formation pré-enregistrée.\n↩️ Tapez *menu* pour annuler`;
  }

  return null;
}

module.exports = { handleFormation };
