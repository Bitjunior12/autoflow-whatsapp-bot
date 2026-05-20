const { setSession, clearSession } = require('../../services/session');
const { askClaude } = require('../../services/claude');
const Registration = require('../../models/Registration');
const { sendWhatsAppMessage } = require('../../services/whatsapp');
const { AKOGOUA_CTA, MENU_ESTIMATION, MENU_MATERIELS_CHOIX, MENU_RACES, MENU_FORMATION, MENU_CONSEILLER } = require('../../menus');

const OBJECTIFS = {
  '1': 'Poulets de chair', '2': 'Poules pondeuses',
  '3': 'Pintades', '4': 'Élevage mixte', '5': 'Pas encore défini',
};
const NIVEAUX = {
  '1': 'Déjà pratiqué', '2': 'Débutant complet', '3': "Aidé quelqu'un, jamais seul",
};
const BUDGETS = {
  '1': 'Moins de 100 000 FCFA', '2': '100 000 à 300 000 FCFA',
  '3': '300 000 à 700 000 FCFA', '4': 'Plus de 700 000 FCFA', '5': 'Budget non défini',
};
const ESPACES = {
  '1': 'Petit espace (moins de 50 m²)', '2': 'Espace moyen (50 à 200 m²)',
  '3': 'Grand espace (plus de 200 m²)', "4": "Pas encore d'espace",
};
const TIMINGS = {
  '1': 'Cette semaine', '2': 'Ce mois-ci',
  '3': 'Dans 1 à 3 mois', '4': 'Je me renseigne seulement',
};

async function handleDebutant(from, msg, text, session) {
  if (msg === '1' && !session?.step) {
    await setSession(from, { step: 'debutant_objectif' });
    return `🐣 *DÉMARRER MON ÉLEVAGE*
_Le Partenaire des Éleveurs_

Bienvenue ! Je vais vous aider à cadrer votre projet avicole étape par étape.

En quelques questions, nous allons définir :
✅ Votre objectif de production
✅ Votre niveau d'expérience
✅ Votre budget disponible
✅ Votre espace disponible
✅ Quand vous souhaitez démarrer

🎯 *Quel est votre objectif principal ?*

1️⃣ Produire et vendre des poulets de chair
2️⃣ Produire et vendre des œufs
3️⃣ Élever des pintades
4️⃣ Élevage mixte (plusieurs types)
5️⃣ Je ne sais pas encore, j'ai besoin d'être orienté

Tapez le numéro de votre choix.
↩️ Tapez *menu* pour revenir au menu principal`;
  }

  if (session?.step === 'debutant_objectif') {
    if (!OBJECTIFS[msg]) return null;
    await setSession(from, { ...session, step: 'debutant_experience', objectif: OBJECTIFS[msg] });
    return `✅ Objectif : *${OBJECTIFS[msg]}*

👤 *Avez-vous déjà fait de l'élevage ?*

1️⃣ Oui, j'ai déjà élevé des volailles
2️⃣ Non, je débute totalement
3️⃣ J'ai déjà aidé quelqu'un, mais jamais seul

Tapez le numéro de votre choix.
↩️ Tapez *retour* pour modifier l'objectif`;
  }

  if (session?.step === 'debutant_experience') {
    if (!NIVEAUX[msg]) return null;
    await setSession(from, { ...session, step: 'debutant_budget', experience: NIVEAUX[msg] });
    return `✅ Expérience : *${NIVEAUX[msg]}*

💰 *Quel budget souhaitez-vous investir pour démarrer ?*

1️⃣ Moins de 100 000 FCFA
2️⃣ 100 000 à 300 000 FCFA
3️⃣ 300 000 à 700 000 FCFA
4️⃣ Plus de 700 000 FCFA
5️⃣ Je ne connais pas encore mon budget

Tapez le numéro de votre choix.
↩️ Tapez *retour* pour l'étape précédente`;
  }

  if (session?.step === 'debutant_budget') {
    if (!BUDGETS[msg]) return null;
    await setSession(from, { ...session, step: 'debutant_espace', budget: BUDGETS[msg] });
    return `✅ Budget : *${BUDGETS[msg]}*

📐 *Disposez-vous déjà d'un espace pour l'élevage ?*

1️⃣ Oui, petit espace (moins de 50 m²)
2️⃣ Oui, espace moyen (50 à 200 m²)
3️⃣ Oui, grand espace (plus de 200 m²)
4️⃣ Non, je cherche encore un espace

Tapez le numéro de votre choix.
↩️ Tapez *retour* pour l'étape précédente`;
  }

  if (session?.step === 'debutant_espace') {
    if (!ESPACES[msg]) return null;
    await setSession(from, { ...session, step: 'debutant_ville', espace: ESPACES[msg] });
    return `✅ Espace : *${ESPACES[msg]}*

📍 *Dans quelle ville ou commune se trouve votre projet ?*

Exemple : Yopougon, Bouaké, Daloa, Korhogo, San Pedro...
↩️ Tapez *retour* pour l'étape précédente`;
  }

  if (session?.step === 'debutant_ville') {
    const ville = text.trim();
    if (ville.length < 2) return `❌ Veuillez entrer une ville valide.\nExemple : Yopougon`;
    await setSession(from, { ...session, step: 'debutant_timing', ville });
    return `✅ Ville : *${ville}*

📅 *Quand souhaitez-vous démarrer votre élevage ?*

1️⃣ Cette semaine
2️⃣ Ce mois-ci
3️⃣ Dans 1 à 3 mois
4️⃣ Je me renseigne seulement pour l'instant

Tapez le numéro de votre choix.
↩️ Tapez *retour* pour l'étape précédente`;
  }

  if (session?.step === 'debutant_timing') {
    if (!TIMINGS[msg]) return null;
    const timing = TIMINGS[msg];
    const { objectif, experience, budget, espace, ville } = session;

    const prompt = `Tu es expert en aviculture pour "Le Partenaire des Éleveurs" en Côte d'Ivoire.
Un éleveur présente ce profil de projet :
- Objectif : ${objectif}
- Expérience : ${experience}
- Budget : ${budget}
- Espace : ${espace}
- Ville : ${ville}
- Démarrage souhaité : ${timing}

Génère une recommandation personnalisée au format WhatsApp :
1. Titre "✅ *Résumé de votre projet*" suivi du profil résumé (6 lignes max)
2. Recommandation précise du nombre de sujets (adapté au budget et à l'espace)
3. Race la plus adaptée parmi : Chair Blanc (650F), Chair Roux (600F), Hybride (450F), Ponte ISA Brown (1150F), Pintadeau Galor (1100F)
4. 4-5 éléments essentiels à prévoir avant de démarrer
5. Un conseil clé pour éviter les erreurs de débutant
6. Termine OBLIGATOIREMENT par ce texte exact :
"👉 *Que voulez-vous faire maintenant ?*
1️⃣ Estimer mon budget de démarrage
2️⃣ Voir les matériels nécessaires
3️⃣ Commander des poussins
4️⃣ Me former en aviculture
5️⃣ Parler à un conseiller

🌐 Pour acheter, vendre ou trouver un technicien avicole : *akogoua.com*"

Format WhatsApp : *gras*, emojis, max 25 lignes.`;

    let plan = '';
    try { plan = await askClaude(prompt); }
    catch {
      plan = `✅ *Résumé de votre projet*

🎯 Objectif : ${objectif}
👤 Expérience : ${experience}
💰 Budget : ${budget}
📐 Espace : ${espace}
📍 Ville : ${ville}
📅 Démarrage : ${timing}

🐔 *Recommandation*
Pour votre profil, commencez avec une petite bande adaptée à votre budget.

⚠️ *Conseil clé*
Préparez bien le logement avant l'arrivée des poussins. Beaucoup de pertes surviennent les 7 premiers jours.

👉 *Que voulez-vous faire maintenant ?*
1️⃣ Estimer mon budget de démarrage
2️⃣ Voir les matériels nécessaires
3️⃣ Commander des poussins
4️⃣ Me former en aviculture
5️⃣ Parler à un conseiller

🌐 Pour acheter, vendre ou trouver un technicien avicole : *akogoua.com*`;
    }

    try {
      await Registration.create({ phone: from, name: 'Prospect', type: 'devis', ville, profil: `${objectif} | ${experience} | ${budget} | ${espace} | ${timing}` });
      const c = process.env.CONSEILLER_PHONE;
      if (c) await sendWhatsAppMessage(c,
        `🐣 *NOUVEAU PROJET ÉLEVEUR !*\n\n📱 +${from}\n🎯 ${objectif}\n👤 ${experience}\n💰 ${budget}\n📐 ${espace}\n📍 ${ville}\n📅 ${timing}\n\n👉 À contacter !`
      );
    } catch (err) { console.error('❌ Sauvegarde débutant :', err.message); }

    await setSession(from, { step: 'debutant_suite', objectif, experience, budget, espace, ville, timing });
    return plan;
  }

  if (session?.step === 'debutant_suite') {
    if (msg === '1') { await setSession(from, { step: 'estimation_type' }); return MENU_ESTIMATION; }
    if (msg === '2') { await setSession(from, { step: 'materiel_choix' }); return MENU_MATERIELS_CHOIX; }
    if (msg === '3') { await setSession(from, { step: 'choix_race' });    return MENU_RACES; }
    if (msg === '4') { await setSession(from, { step: 'choix_formation' }); return MENU_FORMATION; }
    if (msg === '5') { await clearSession(from); return MENU_CONSEILLER; }
    return null;
  }

  return null;
}

module.exports = { handleDebutant };
