const { setSession, clearSession } = require('../../services/session');
const { askClaude } = require('../../services/claude');
const { sendWhatsAppMessage } = require('../../services/whatsapp');
const { MENU_SANTE } = require('../../menus');

const SYMPTOMES = {
  '1': 'Mortalités élevées',
  '2': 'Diarrhée / selles anormales',
  '3': 'Toux / difficultés respiratoires',
  '4': 'Poulets faibles ou abattus',
  '5': 'Mauvaise croissance',
  '6': "Problème d'alimentation",
};

const URGENCE_KEYWORDS = ['mortalit', 'mort', 'toux', 'respirat', 'abattu', 'diarrhée', 'faible'];

async function repondreQuestion(from, question) {
  const prompt = `Tu es Dr. Avicole, vétérinaire expert en aviculture tropicale pour "Le Partenaire des Éleveurs" en Côte d'Ivoire.

Un éleveur signale ce problème : "${question}"

Réponds en expert avec :
1. L'analyse du problème probable
2. Les causes les plus fréquentes en Côte d'Ivoire
3. Des actions immédiates concrètes et réalisables
4. Une mise en garde si le problème est grave

STYLE : 5 lignes max, emojis, ton rassurant et expert.

Termine OBLIGATOIREMENT par :
"⚠️ Ce conseil ne remplace pas un vétérinaire.
👷 Trouvez un technicien avicole près de chez vous : *akogoua.com*
📞 Urgence : *+225 01 02 64 20 80*
↩️ Tapez *menu* pour voir nos services"`;

  try {
    const reponse = await askClaude(prompt);
    // Alerte conseiller si symptôme urgent
    const isUrgent = URGENCE_KEYWORDS.some(k => question.toLowerCase().includes(k));
    if (isUrgent) {
      const c = process.env.CONSEILLER_PHONE;
      if (c) sendWhatsAppMessage(c, `⚠️ *ALERTE SANITAIRE !*\n\n📱 +${from}\n💬 "${question.substring(0, 120)}"\n\n👉 À contacter rapidement`).catch(() => {});
    }
    await clearSession(from);
    return reponse;
  } catch {
    await clearSession(from);
    return `Je n'ai pas pu analyser votre problème technique.

📞 Contactez directement notre expert :
*+225 01 02 64 20 80*

👷 Trouvez un technicien avicole : *akogoua.com*

↩️ Tapez *menu* pour revenir au menu principal`;
  }
}

async function handleSante(from, msg, text, session) {
  if (msg === '6' && !session?.step) {
    await setSession(from, { step: 'sante_symptome' });
    return MENU_SANTE;
  }

  // Compatibilité question_libre (V1)
  if (session?.step === 'question_libre') {
    return await repondreQuestion(from, text);
  }

  if (session?.step === 'sante_symptome') {
    if (SYMPTOMES[msg]) {
      const symptome = SYMPTOMES[msg];
      await setSession(from, { ...session, step: 'sante_description', symptome });
      return `🩺 Symptôme : *${symptome}*

📝 *Décrivez ce que vous observez exactement :*
• Depuis combien de temps ?
• Combien de sujets sont touchés ?
• Quel âge ont vos sujets ?
• Y a-t-il eu des changements récents (aliment, eau, température) ?

Écrivez librement.
↩️ Tapez *retour* pour changer le symptôme`;
    }

    if (msg === '7') {
      await setSession(from, { ...session, step: 'sante_libre' });
      return `📝 *Décrivez votre problème librement :*

Exemple : "Mes poulets ont des fientes vertes depuis 3 jours et ne mangent plus"

↩️ Tapez *retour* pour choisir dans la liste`;
    }

    // Texte libre direct (si > 8 caractères)
    if (text.trim().length > 8) {
      return await repondreQuestion(from, text.trim());
    }

    return null;
  }

  if (session?.step === 'sante_libre') {
    const question = text.trim();
    if (question.length < 5) return `❌ Décrivez davantage votre problème pour que je puisse vous aider.`;
    return await repondreQuestion(from, question);
  }

  if (session?.step === 'sante_description') {
    const description = text.trim();
    if (description.length < 5) return `❌ Décrivez davantage ce que vous observez.`;
    return await repondreQuestion(from, `Problème : ${session.symptome}. Description : ${description}`);
  }

  return null;
}

module.exports = { handleSante };
