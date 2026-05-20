const { setSession, clearSession } = require('../../services/session');
const { askClaude } = require('../../services/claude');
const { MENU_ESTIMATION, AKOGOUA_CTA } = require('../../menus');

const TYPES = { '1': 'Poulets de chair', '2': 'Poules pondeuses', '3': 'Pintades' };

async function handleEstimation(from, msg, text, session) {
  if (msg === '4' && !session?.step) {
    await setSession(from, { step: 'estimation_type' });
    return MENU_ESTIMATION;
  }

  if (session?.step === 'estimation_type') {
    if (!TYPES[msg]) return null;
    await setSession(from, { ...session, step: 'estimation_sujets', type: TYPES[msg] });
    return `✅ Type : *${TYPES[msg]}*

🐔 *Combien de sujets voulez-vous élever ?*

Exemple : 500
↩️ Tapez *retour* pour modifier`;
  }

  if (session?.step === 'estimation_sujets') {
    const sujets = parseInt(text.trim().replace(/\s/g, ''));
    if (isNaN(sujets) || sujets < 1) return `❌ Entrez un nombre valide. Exemple : *500*`;
    await setSession(from, { ...session, step: 'estimation_budget', sujets });
    return `✅ Nombre de sujets : *${sujets}*

💰 *Quel est votre budget disponible ?* (en FCFA)

Exemple : 500000
↩️ Tapez *retour* pour modifier`;
  }

  if (session?.step === 'estimation_budget') {
    const budget = parseFloat(text.trim().replace(/\s/g, '').replace(',', '.'));
    if (isNaN(budget) || budget < 1) return `❌ Entrez un budget valide en FCFA. Exemple : *500000*`;
    const { type, sujets } = session;

    const prompt = `Tu es expert en gestion financière avicole en Côte d'Ivoire pour "Le Partenaire des Éleveurs".
Un éleveur veut estimer la rentabilité de son projet :
- Type : ${type}
- Nombre de sujets : ${sujets}
- Budget disponible : ${budget.toLocaleString('fr-FR')} FCFA

Génère une estimation financière réaliste et complète :
1. 💰 Coût des poussins (prix : Chair Blanc 650F, Chair Roux 600F, Ponte ISA Brown 1150F, Pintadeau 1100F)
2. 🍽️ Coût alimentation estimé (durée du cycle)
3. 🏗️ Coût matériels estimé
4. 💊 Dépenses sanitaires estimées
5. 📈 Revenu potentiel à la vente
6. 💵 Bénéfice net estimé
7. ⏱️ Délai de rentabilité
8. ✅ Ce projet est-il réalisable avec ce budget ?

Termine OBLIGATOIREMENT par ce texte exact :
"👉 *Que voulez-vous faire maintenant ?*
1️⃣ Commander des poussins
2️⃣ Voir le matériel nécessaire
3️⃣ Me former en aviculture
4️⃣ Parler à un conseiller

🌐 Pour acheter, vendre ou trouver un technicien : *akogoua.com*"

Format WhatsApp avec emojis et *gras*. Max 25 lignes.`;

    let estimation = '';
    try { estimation = await askClaude(prompt); }
    catch { estimation = `📊 Pour ${sujets} ${type} avec ${budget.toLocaleString('fr-FR')} FCFA...\n\nContactez notre conseiller pour une estimation personnalisée.\n📞 *+225 01 02 64 20 80*${AKOGOUA_CTA}\n\n↩️ Tapez *menu*`; }

    await clearSession(from);
    return estimation;
  }

  return null;
}

module.exports = { handleEstimation };
