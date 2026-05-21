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
  'Mortalités élevées': `🔍 *Mortalités élevées* — situation urgente, chaque heure compte.

🦠 Causes selon l'âge des sujets :
• *J1–J7* : mauvaise température d'éleveuse, déshydratation à l'arrivée, Salmonellose
• *J8–J21* : Gumboro (immunodépression), Coccidiose aiguë, Newcastle
• *J22+* : Newcastle, Bronchite infectieuse, intoxication (aliment ou eau)

⚡ Actions immédiates :
• Retirez et enterrez les cadavres — ne les laissez jamais dans le poulailler
• Isolez immédiatement les sujets malades dans un espace séparé
• Calculez votre taux : (morts / total) × 100 — au-delà de 3%/jour c'est critique
• Vérifiez l'eau : chlorez-la (2 gouttes d'eau de Javel/litre) ou changez la source
• Vérifiez l'aliment : odeur rance ou moisissures = jetez tout le lot
• Ne déplacez aucun sujet vers d'autres élevages — risque de contagion
⚠️ Mortalité > 5% en 24h = appelez un technicien avicole aujourd'hui${FIN_CONSEIL}`,

  'Diarrhée / selles anormales': `🔍 *Diarrhée / selles anormales* — lisez la couleur pour identifier la cause.

🎨 *Guide des couleurs de fientes :*
• 🟡 Jaune soufre = Newcastle ou Salmonellose
• 🔴 Rouge/marron sanglant = Coccidiose (urgence J10–J25)
• 🟢 Verte = infection sévère (Newcastle avancé ou Choléra aviaire)
• ⬜ Blanche crémeuse = Gumboro ou Salmonellose pullorum
• 💧 Très liquide = déshydratation, chaleur, changement d'aliment

⚡ Actions immédiates :
• Fientes rouges → traitez à l'*Amprolium* (1g/litre d'eau pendant 5 jours) ou *Toltrazuril*
• Fientes jaunes/vertes → isolez et consultez en urgence (suspicion Newcastle)
• Assurez de l'eau propre et fraîche à volonté — 2× plus en saison chaude
• Nettoyez et séchez la litière humide (favorise la Coccidiose)
• Évitez tout stress : manipulation, changement de densité, bruit${FIN_CONSEIL}`,

  'Toux / difficultés respiratoires': `🔍 *Toux / difficultés respiratoires* — urgence sanitaire, agissez dans les 12h.

🦠 Causes selon les symptômes observés :
• *Râles humides + yeux larmoyants* → Mycoplasmose ou Bronchite infectieuse
• *Toux + torticolis (tête tordue)* → Newcastle nerveux — très contagieux
• *Éternuements + gonflement du visage* → Coryza infectieux (bactérie)
• *Gêne respiratoire sans toux* → chaleur excessive ou ammoniaque élevé dans l'air

⚡ Actions immédiates :
• Ouvrez les fenêtres / améliorez la ventilation immédiatement
• Vérifiez le carnet vaccinal : Newcastle rappelé à J7, J21, J28 ?
• Isolez tous les sujets qui toussent — la transmission est aérienne et rapide
• Aspergez le sol d'eau pour réduire la poussière (si cause environnementale)
• Mycoplasmose → *Tylosine* ou *Oxytétracycline* dans l'eau (5 jours)
• Coryza → *Sulfadiméthoxine* + vitamines A et C dans l'eau
⚠️ La toux collective peut décimer 30% d'un troupeau en 48h — n'attendez pas${FIN_CONSEIL}`,

  'Poulets faibles ou abattus': `🔍 *Poulets faibles ou abattus* — stress ou maladie en installation, agissez vite.

🌡️ Vérifiez d'abord la température :
• *< 2 semaines* : idéal 32–34°C sous l'éleveuse
• *2–4 semaines* : idéal 28–30°C
• *> 4 semaines* : idéal 24–28°C
• Au-delà de 35°C → stress thermique immédiat (haletement, ailes écartées)

🦠 Autres causes fréquentes :
• *Gumboro (J14–J28)* : abattement soudain + diarrhée blanche, taux de mortalité monte vite
• *Hypoglycémie du poussin* (J1–J3) : poussins qui piaillent et s'écroulent = eau sucrée urgente
• *Intoxication* : aliment moisi (aflatoxines) — abattement progressif sur plusieurs jours

⚡ Actions immédiates :
• Stress thermique → ventilation forcée + eau fraîche avec *électrolytes* (sel + sucre : 1 càc sel + 4 càc sucre / litre)
• Poussins J1–J3 faibles → eau tiède sucrée (50g sucre/litre) à la pipette si nécessaire
• Isolez les sujets abattus et observez 6h pour voir si ça s'aggrave
• Vérifiez que tous les sujets accèdent aux abreuvoirs (pas de dominance)${FIN_CONSEIL}`,

  'Mauvaise croissance': `🔍 *Mauvaise croissance* — comparez aux repères standards avant d'agir.

📊 *Poids cibles Chair Blanc (référence Côte d'Ivoire) :*
• J7 : ~170g | J14 : ~400g | J21 : ~750g | J28 : ~1 200g | J35 : ~1 800g | J42 : ~2 500g
Si vos sujets sont en-dessous de 20% de ces valeurs, le problème est confirmé.

🦠 Causes fréquentes :
• *Aliment* : protéines insuffisantes (démarrage < 22% protéines), aliment rassis ou mal stocké
• *Parasites* : vers intestinaux (ascaris) fréquents si litière humide ou sol non cimenté
• *Densité* : au-delà de 10 sujets/m² les plus faibles ne mangent pas assez
• *Maladie subclinique* : Mycoplasmose chronique, Coccidiose légère non détectée

⚡ Actions immédiates :
• Pesez 10 sujets au hasard et calculez le poids moyen — comparez au tableau ci-dessus
• Inspectez l'aliment : vérifiez la date de fabrication, pas de moisissures ni d'odeur
• Déparasitez avec *Lévamisole* (1ml/litre d'eau, 3 jours) si litière ancienne ou humide
• Réduisez la densité si > 10 sujets/m² — les plus faibles reprennent souvent seuls
• Ajoutez des vitamines B + acides aminés dans l'eau pendant 5 jours${FIN_CONSEIL}`,

  "Problème d'alimentation": `🔍 *Problème d'alimentation* — les sujets refusent de manger ou consomment anormalement peu.

📊 *Consommation normale par sujet/jour (Chair Blanc) :*
• J1–J7 : 15–20g | J8–J14 : 30–40g | J15–J21 : 55–70g
• J22–J28 : 85–100g | J29–J35 : 110–130g | J36–J45 : 140–160g
Une baisse de > 30% par rapport à ces valeurs est anormale.

🦠 Causes fréquentes :
• *Aliment avarié* : moisissures (aflatoxines) = refus total ou consommation très faible
• *Changement brutal de formule* : transition non progressive sur 3–5 jours
• *Chaleur > 33°C* : les poulets réduisent naturellement leur consommation de 5% par degré
• *Mangeoires insuffisantes* : 1 mangeoire tubulaire pour 25 sujets minimum
• *Début de maladie* : la baisse d'appétit précède souvent la toux ou la diarrhée de 12–24h

⚡ Actions immédiates :
• Sentez et observez l'aliment : moisi ou rance → jetez tout le lot immédiatement
• Installez des mangeoires supplémentaires si ratio insuffisant
• En saison chaude : distribuez l'aliment le matin tôt (6h–8h) et en soirée (17h–19h)
• Transition d'aliment : mélangez ancien + nouveau (70/30 → 50/50 → 30/70 → 100%) sur 4 jours
• Ajoutez des vitamines B12 + acide folique dans l'eau pour stimuler l'appétit${FIN_CONSEIL}`,

  'default': `🔍 *Problème sanitaire détecté* — voici les premiers réflexes à avoir.

📋 Observez et notez immédiatement :
• Âge exact de vos sujets (en jours)
• Nombre de sujets touchés sur le total de la bande
• Depuis combien de temps le problème est apparu
• Tout changement récent : aliment, eau, fournisseur, température

⚡ Premiers réflexes universels :
• Isolez les sujets malades pour éviter la contagion
• Vérifiez l'eau : propre, fraîche, renouvelée 2×/jour minimum
• Vérifiez l'aliment : odeur, texture, date de fabrication
• Assurez une bonne ventilation sans courant d'air direct
• Ne donnez aucun médicament sans diagnostic précis — risque de résistance

💡 Pour un conseil personnalisé, tapez *6* et choisissez le symptôme le plus proche de ce que vous observez.${FIN_CONSEIL}`,
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
