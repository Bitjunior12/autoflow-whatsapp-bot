const { setSession, clearSession } = require('../../services/session');
const { askClaude, CLAUDE_FALLBACK } = require('../../services/claude');
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

const SANTE_SYSTEM = `Tu es Dr. Avicole, vétérinaire expert en aviculture tropicale pour "Le Partenaire des Éleveurs" en Côte d'Ivoire.

MISSION : Analyser le problème sanitaire signalé et donner un conseil pratique immédiat.

FORMAT DE RÉPONSE (respecte cet ordre) :
🔍 Diagnostic probable — 1 à 2 lignes
🦠 Causes fréquentes en Côte d'Ivoire — 1 à 2 lignes
⚡ Actions immédiates à prendre — 2 à 3 lignes
⚠️ Avertissement si le cas est grave — 1 ligne si nécessaire

STYLE : emojis, français, ton expert et rassurant.

FIN OBLIGATOIRE — copie exactement ces 4 lignes sans les modifier :
⚠️ Ce conseil ne remplace pas un vétérinaire.
👷 Trouvez un technicien avicole : *akogoua.com*
📞 Urgence : *+225 01 53 21 74 42*
↩️ Tapez *menu* pour voir nos services`;

const FIN_CONSEIL = `\n\n⚠️ Ce conseil ne remplace pas un vétérinaire.
👷 Trouvez un technicien avicole : *akogoua.com*
📞 Urgence : *+225 01 53 21 74 42*
↩️ Tapez *menu* pour voir nos services`;

const REPONSES_FALLBACK = {
  'Mortalités élevées': `🔍 *Mortalités élevées* — situation urgente à ne pas ignorer.

🦠 Causes fréquentes en Côte d'Ivoire :
Newcastle, Gumboro, Bronchite infectieuse, intoxication à l'aliment ou à l'eau.

⚡ Actions immédiates :
• Isolez les sujets morts et malades du reste du troupeau
• Vérifiez la qualité de l'eau et de l'aliment (odeur, couleur)
• Notez le taux de mortalité journalier et l'âge des sujets
• Contactez un technicien avicole sans attendre${FIN_CONSEIL}`,

  'Diarrhée / selles anormales': `🔍 *Diarrhée / selles anormales* — signe d'infection digestive.

🦠 Causes fréquentes en Côte d'Ivoire :
Coccidiose (fientes rougeâtres), Salmonellose, eau contaminée, changement brusque d'aliment.

⚡ Actions immédiates :
• Observez la couleur : jaune = Newcastle, rouge = Coccidiose, verte = infection sévère
• Donnez de l'eau propre et fraîche en permanence
• Réduisez la densité et améliorez la ventilation
• En cas de fientes rouges, traitez à l'Amprolium ou Toltrazuril${FIN_CONSEIL}`,

  'Toux / difficultés respiratoires': `🔍 *Toux / difficultés respiratoires* — urgence sanitaire.

🦠 Causes fréquentes en Côte d'Ivoire :
Newcastle, Bronchite infectieuse, Mycoplasmose, mauvaise ventilation, poussière excessive.

⚡ Actions immédiates :
• Améliorez immédiatement la ventilation du poulailler
• Vérifiez le statut vaccinal Newcastle (rappels respectés ?)
• Isolez les sujets qui toussent pour éviter la contagion
• ⚠️ La toux groupée peut décimer un troupeau en 48h — agissez vite${FIN_CONSEIL}`,

  'Poulets faibles ou abattus': `🔍 *Poulets faibles ou abattus* — signe de stress ou maladie en évolution.

🦠 Causes fréquentes en Côte d'Ivoire :
Choc thermique (chaleur >35°C), déshydratation, Gumboro, intoxication, début de Newcastle.

⚡ Actions immédiates :
• Vérifiez la température du poulailler (idéal 28-32°C pour les poussins)
• Assurez un accès constant à l'eau fraîche (ajoutez électrolytes si possible)
• Réduisez la densité et ombrager si chaleur excessive
• Séparez les sujets abattus pour observer leur évolution${FIN_CONSEIL}`,

  'Mauvaise croissance': `🔍 *Mauvaise croissance* — problème de performance souvent évitable.

🦠 Causes fréquentes en Côte d'Ivoire :
Aliment de mauvaise qualité ou mal conservé, parasites intestinaux, densité trop élevée, stress chronique.

⚡ Actions immédiates :
• Vérifiez la qualité de l'aliment : odeur, absence de moisissures
• Contrôlez la densité (max 10 sujets/m² pour les chairs)
• Pesez un échantillon de sujets et comparez au standard de la race
• Un traitement antiparasitaire peut aider si la litière est humide${FIN_CONSEIL}`,

  "Problème d'alimentation": `🔍 *Problème d'alimentation* — les sujets refusent de manger ou consomment peu.

🦠 Causes fréquentes en Côte d'Ivoire :
Aliment avarié ou changement brutal de formule, chaleur excessive, maladie en cours, mangeoires insuffisantes.

⚡ Actions immédiates :
• Sentez et inspectez l'aliment (moisissure = danger, jetez-le)
• Tout changement d'aliment doit se faire progressivement sur 3-5 jours
• Vérifiez le ratio mangeoires/sujets (1 mangeoire linéaire pour 25 sujets)
• Une baisse d'appétit précède souvent une maladie — surveillez de près${FIN_CONSEIL}`,

  'default': `🔍 Votre problème nécessite une analyse rapide.

⚡ Actions immédiates :
• Isolez les sujets malades du reste du troupeau
• Vérifiez eau, aliment, ventilation et température
• Notez l'âge des sujets, le nombre touché et depuis quand${FIN_CONSEIL}`,
};

async function repondreQuestion(from, question, symptome = null) {
  try {
    const reponse = await askClaude(`Un éleveur signale : "${question}"`, SANTE_SYSTEM, 700);

    const isUrgent = URGENCE_KEYWORDS.some(k => question.toLowerCase().includes(k));
    if (isUrgent) {
      const c = process.env.CONSEILLER_PHONE;
      if (c) sendWhatsAppMessage(c, `⚠️ *ALERTE SANITAIRE !*\n\n📱 +${from}\n💬 "${question.substring(0, 120)}"\n\n👉 À contacter rapidement`).catch(() => {});
    }

    await clearSession(from);

    if (reponse === CLAUDE_FALLBACK) {
      return REPONSES_FALLBACK[symptome] || REPONSES_FALLBACK['default'];
    }
    return reponse;

  } catch {
    await clearSession(from);
    return REPONSES_FALLBACK[symptome] || REPONSES_FALLBACK['default'];
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
    return await repondreQuestion(
      from,
      `Problème : ${session.symptome}. Description : ${description}`,
      session.symptome
    );
  }

  return null;
}

module.exports = { handleSante };
