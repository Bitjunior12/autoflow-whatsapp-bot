const { setSession, clearSession } = require('../../services/session');
const Bande = require('../../models/Bande');
const { MENU_BANDE, MENU_SANTE, AKOGOUA_CTA } = require('../../menus');

const RACES_BANDE = {
  '1': 'Poulets de chair (Chair Blanc)',
  '2': 'Poulets de chair (Chair Roux)',
  '3': 'Poulets de chair (Hybrides)',
  '4': 'Poules pondeuses (ISA Brown)',
  '5': 'Pintades',
  '6': 'Autre race',
};

function getProchainVaccin(ageJours, race) {
  const isPonte = race.includes('pondeuse') || race.includes('ISA');
  const isPintade = race.includes('intade');

  if (!isPonte && !isPintade) {
    // Poulets de chair (cycle ~45 jours)
    if (ageJours < 1)  return `🔔 *Prochaine étape :* Préparez l'éleveuse (32-33°C) avant l'arrivée`;
    if (ageJours < 7)  return `🔔 *Prochaine vaccination :* Newcastle B1 (oculaire) à J7 — dans *${7 - ageJours} jours*`;
    if (ageJours < 14) return `🔔 *Prochaine vaccination :* Gumboro (eau de boisson) à J14 — dans *${14 - ageJours} jours*`;
    if (ageJours < 21) return `🔔 *Prochaine vaccination :* Rappel Newcastle + Gumboro à J21 — dans *${21 - ageJours} jours*`;
    if (ageJours < 28) return `🔔 *Prochaine vaccination :* Rappel Newcastle à J28 — dans *${28 - ageJours} jours*`;
    if (ageJours < 45) return `✅ Programme vaccinal terminé — Phase de finition en cours (abattage vers J45)`;
    return `✅ Bande en fin de cycle — préparez la commercialisation`;
  }

  if (isPonte) {
    if (ageJours < 7)  return `🔔 *Prochaine vaccination :* Newcastle à J7 — dans *${7 - ageJours} jours*`;
    if (ageJours < 14) return `🔔 *Prochaine vaccination :* Gumboro à J14 — dans *${14 - ageJours} jours*`;
    if (ageJours < 21) return `🔔 *Prochaine vaccination :* Rappel Newcastle à J21 — dans *${21 - ageJours} jours*`;
    if (ageJours < 42) return `🔔 *Prochaine vaccination :* BI + Newcastle à J42 — dans *${42 - ageJours} jours*`;
    if (ageJours < 70) return `🔔 *Prochaine vaccination :* Rappel BI à J70 — dans *${70 - ageJours} jours*`;
    return `✅ Programme vaccinal de base terminé — Maintenant en phase de ponte`;
  }

  return `✅ Suivez le calendrier vaccinal recommandé par votre vétérinaire`;
}

async function handleBande(from, msg, text, session) {
  if (msg === '7' && !session?.step) {
    await setSession(from, { step: 'bande_action' });
    return MENU_BANDE;
  }

  if (session?.step === 'bande_action') {
    if (msg === '1') {
      await setSession(from, { step: 'bande_race' });
      return `🐔 *ENREGISTRER UNE NOUVELLE BANDE*

Quel type de volailles avez-vous ?

1️⃣ Poulets de chair (Chair Blanc)
2️⃣ Poulets de chair (Chair Roux)
3️⃣ Poulets de chair (Hybrides)
4️⃣ Poules pondeuses (ISA Brown)
5️⃣ Pintades
6️⃣ Autre race

Tapez le numéro de votre choix.
↩️ Tapez *menu* pour annuler`;
    }

    if (msg === '2') {
      const bande = await Bande.findOne({ phone: from, actif: true }).sort({ createdAt: -1 });
      await clearSession(from);
      if (!bande) {
        return `❌ Aucune bande enregistrée pour ce numéro.

👉 Tapez *7* puis *1* pour enregistrer votre première bande.
↩️ Tapez *menu* pour revenir au menu principal`;
      }
      const ageJours = Math.floor((Date.now() - new Date(bande.dateEntree).getTime()) / (1000 * 60 * 60 * 24));
      const prochainVaccin = getProchainVaccin(ageJours, bande.race);
      return `📊 *ÉTAT DE VOTRE BANDE*
_Le Partenaire des Éleveurs_

🐔 Race : *${bande.race}*
📦 Nombre de sujets : *${bande.nombreSujets}*
📅 Date d'entrée : *${new Date(bande.dateEntree).toLocaleDateString('fr-FR')}*
⏱️ Âge actuel : *${ageJours} jours*

${prochainVaccin}

💡 Taux de mortalité normal : < 2% la 1ère semaine, < 5% total

📞 Problème ? Tapez *6* pour un conseil sanitaire
↩️ Tapez *menu* pour revenir au menu principal${AKOGOUA_CTA}`;
    }

    if (msg === '3') {
      await setSession(from, { step: 'sante_symptome' });
      return MENU_SANTE;
    }

    return null;
  }

  if (session?.step === 'bande_race') {
    if (!RACES_BANDE[msg]) return null;
    await setSession(from, { ...session, step: 'bande_quantite', race: RACES_BANDE[msg] });
    return `✅ Race : *${RACES_BANDE[msg]}*

📦 *Combien de sujets avez-vous reçu ?*

Exemple : 100
↩️ Tapez *retour* pour modifier la race`;
  }

  if (session?.step === 'bande_quantite') {
    const qte = parseInt(text.trim().replace(/\s/g, ''));
    if (isNaN(qte) || qte < 1) return `❌ Entrez un nombre valide. Exemple : *100*`;
    await setSession(from, { ...session, step: 'bande_date', nombreSujets: qte });
    return `✅ Nombre de sujets : *${qte}*

📅 *Quand les poussins sont-ils arrivés ?*

1️⃣ Aujourd'hui
2️⃣ Hier
3️⃣ Il y a 2 jours
4️⃣ Entrer une date (format JJ/MM/AAAA)

↩️ Tapez *retour* pour modifier la quantité`;
  }

  if (session?.step === 'bande_date') {
    let dateEntree = new Date();
    if (msg === '1') { dateEntree = new Date(); }
    else if (msg === '2') { dateEntree = new Date(Date.now() - 86400000); }
    else if (msg === '3') { dateEntree = new Date(Date.now() - 2 * 86400000); }
    else {
      const parts = text.trim().split('/');
      if (parts.length === 3) {
        const parsed = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        if (!isNaN(parsed.getTime())) { dateEntree = parsed; }
        else return `❌ Date invalide. Utilisez le format JJ/MM/AAAA\nExemple : 15/05/2026`;
      } else {
        return `❓ Tapez *1*, *2*, *3* ou une date au format JJ/MM/AAAA.\n↩️ Tapez *menu* pour annuler`;
      }
    }

    const { race, nombreSujets } = session;
    try { await Bande.create({ phone: from, race, nombreSujets, dateEntree, actif: true }); }
    catch (err) { console.error('❌ Bande :', err.message); }

    const ageJours = Math.floor((Date.now() - dateEntree.getTime()) / (1000 * 60 * 60 * 24));
    const prochainVaccin = getProchainVaccin(ageJours, race);

    await clearSession(from);
    return `✅ *Bande enregistrée avec succès !*

🐔 Race : *${race}*
📦 Sujets : *${nombreSujets}*
📅 Entrée : *${dateEntree.toLocaleDateString('fr-FR')}*
⏱️ Âge actuel : *${ageJours} jours*

${prochainVaccin}

💡 *Conseil de démarrage :*
Surveillez la température (32-33°C les 3 premiers jours). La mortalité normale est inférieure à 2% la première semaine.

📞 Problème ? Tapez *6* pour un conseil sanitaire
↩️ Tapez *menu* pour revenir au menu principal${AKOGOUA_CTA}`;
  }

  return null;
}

module.exports = { handleBande };
