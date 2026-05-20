const { setSession, clearSession } = require('../../services/session');
const { sendWhatsAppMessage } = require('../../services/whatsapp');
const { MENU_CONSEILLER } = require('../../menus');

const MOTIFS = {
  '1': 'Commande de poussins',
  '2': 'Achat de matériel',
  '3': 'Informations sur la formation',
  '4': 'Problème urgent sur élevage',
  '5': 'Autre demande',
};

async function handleConseiller(from, msg, text, session) {
  if ((msg === '9' || msg === 'contact' || msg === 'conseiller') && !session?.step) {
    await setSession(from, { step: 'conseiller_motif' });
    return MENU_CONSEILLER;
  }

  if (session?.step === 'conseiller_motif') {
    if (!MOTIFS[msg]) return `❓ Tapez un numéro entre *1* et *5*.\n↩️ Tapez *menu* pour annuler`;
    await setSession(from, { ...session, step: 'conseiller_nom', motif: MOTIFS[msg] });
    return `✅ Motif : *${MOTIFS[msg]}*

👤 *Quel est votre nom complet ?*
↩️ Tapez *retour* pour modifier le motif`;
  }

  if (session?.step === 'conseiller_nom') {
    const nom = text.trim();
    if (nom.length < 2) return `❌ Nom invalide. Entrez votre nom complet.`;
    await setSession(from, { ...session, step: 'conseiller_message', nom });
    return `✅ Nom : *${nom}*

💬 *Décrivez brièvement votre demande :*

Exemple : "Je veux commander 500 poussins chairs pour Bouaké"
↩️ Tapez *retour* pour corriger le nom`;
  }

  if (session?.step === 'conseiller_message') {
    const messageClient = text.trim();
    if (messageClient.length < 5) return `❌ Message trop court. Décrivez votre demande.`;
    const { motif, nom } = session;

    try {
      const c = process.env.CONSEILLER_PHONE;
      if (c) await sendWhatsAppMessage(c,
        `📞 *DEMANDE DE CONTACT !*\n\n👤 Nom : ${nom}\n📱 Téléphone : +${from}\n🎯 Motif : ${motif}\n💬 Message : ${messageClient}\n\n👉 À rappeler rapidement !`
      );
    } catch (err) { console.error('❌ Notification conseiller :', err.message); }

    await clearSession(from);
    return `✅ *Demande transmise à notre équipe !*

👤 Nom : ${nom}
🎯 Motif : ${motif}
💬 Message : ${messageClient}

📞 Un conseiller vous contactera sous *2h* sur ce numéro.

⚡ *Pour une urgence, appelez directement :*
*+225 01 02 64 20 80*

↩️ Tapez *menu* pour revenir au menu principal`;
  }

  return null;
}

module.exports = { handleConseiller };
