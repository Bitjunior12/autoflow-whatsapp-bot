const { setSession, clearSession } = require('../../services/session');
const { askClaude } = require('../../services/claude');
const Registration = require('../../models/Registration');
const { sendWhatsAppMessage } = require('../../services/whatsapp');
const { MENU_MATERIELS_CHOIX, AKOGOUA_CTA } = require('../../menus');

const MATERIELS = { '1': 'Abreuvoirs', '2': 'Mangeoires', '3': 'Chauffage', '4': 'Pack complet' };

async function handleMateriels(from, msg, text, session) {
  if (msg === '3' && !session?.step) {
    await setSession(from, { step: 'materiel_choix' });
    return MENU_MATERIELS_CHOIX;
  }

  if (session?.step === 'materiel_choix') {
    if (!MATERIELS[msg]) return null;
    await setSession(from, { ...session, step: 'materiel_sujets', materiel: MATERIELS[msg] });
    return `✅ Choix : *${MATERIELS[msg]}*

🐔 *Combien de sujets avez-vous dans votre élevage ?*

Exemple : 500
↩️ Tapez *retour* pour modifier le choix`;
  }

  if (session?.step === 'materiel_sujets') {
    const sujets = parseInt(text.trim().replace(/\s/g, ''));
    if (isNaN(sujets) || sujets < 1) {
      if (text.trim().length > 5) {
        const r = await askClaude(`L'éleveur cherche du matériel (${session.materiel}) et a tapé : "${text}". Réponds brièvement et rappelle-lui de saisir le nombre de sujets. Exemple : *500*`);
        return r;
      }
      return `❌ Entrez un nombre valide. Exemple : *500*`;
    }

    const prompt = `Tu es expert en équipement avicole en Côte d'Ivoire pour "Le Partenaire des Éleveurs".
Un éleveur a ${sujets} sujets et cherche : ${session.materiel}.
Recommande en 4-5 lignes :
1. La quantité exacte nécessaire
2. Les références avec prix :
   - Abreuvoir Automatique Jumbo : 11 000 FCFA
   - Abreuvoir avec pied 11L : 4 500 FCFA
   - Abreuvoir avec pied 6L : 3 000 FCFA
   - Abreuvoir sans pied 11L : 4 300 FCFA
   - Abreuvoir conique 5L : 1 800 FCFA
   - Mangeoire démarrage : 1 500 FCFA
   - Mangeoire anti-gaspillage (tête jaune) : 2 500 FCFA
   - Mangeoire métallique : 1 700 FCFA
   - Fourneau de chauffage : 8 000 FCFA
3. Le coût total estimé
Format WhatsApp avec emojis et *gras*. Termine par : "Souhaitez-vous commander ou recevoir un devis ?"`;

    let conseil = '';
    try { conseil = await askClaude(prompt); }
    catch { conseil = `Pour ${sujets} sujets (${session.materiel}), notre équipe vous préparera une liste adaptée.\n\nSouhaitez-vous commander ou recevoir un devis ?`; }

    await setSession(from, { ...session, step: 'materiel_action', sujets });
    return conseil + `\n\n1️⃣ Commander maintenant\n2️⃣ Recevoir un devis\n\n↩️ Tapez *menu* pour annuler`;
  }

  if (session?.step === 'materiel_action') {
    if (msg !== '1' && msg !== '2') return null;
    const action = msg === '1' ? 'commande' : 'devis';
    await setSession(from, { ...session, step: 'materiel_nom', action });
    return `✅ *${action === 'commande' ? 'Commande' : 'Devis'} sélectionné*

👤 *Quel est votre nom complet ?*
↩️ Tapez *retour* pour revenir`;
  }

  if (session?.step === 'materiel_nom') {
    const nom = text.trim();
    if (nom.length < 2) return `❌ Nom invalide.`;
    await setSession(from, { ...session, step: 'materiel_ville', nom });
    return `✅ Nom : *${nom}*

📍 *Dans quelle ville souhaitez-vous être livré ?*
↩️ Tapez *retour* pour corriger le nom`;
  }

  if (session?.step === 'materiel_ville') {
    const ville = text.trim();
    if (ville.length < 2) return `❌ Ville invalide.`;
    const { materiel, sujets, action, nom } = session;

    try {
      await Registration.create({ phone: from, name: nom, type: action === 'commande' ? 'commande_materiel' : 'devis_materiel', ville, profil: `${materiel} | ${sujets} sujets` });
      const c = process.env.CONSEILLER_PHONE;
      if (c) await sendWhatsAppMessage(c,
        `🏪 *${action === 'commande' ? 'COMMANDE' : 'DEVIS'} MATÉRIELS !*\n\n👤 ${nom}\n📱 +${from}\n📍 ${ville}\n🛒 ${materiel}\n🐔 ${sujets} sujets\n\n👉 À traiter sous 24h`
      );
    } catch (err) { console.error('❌ Matériel :', err.message); }

    await clearSession(from);
    return `🎉 *${action === 'commande' ? 'Commande' : 'Devis'} enregistré !*

📋 *Récapitulatif :*
👤 Nom : ${nom}
📍 Ville : ${ville}
🛒 Matériel : ${materiel}
🐔 Pour : ${sujets} sujets

✅ Un conseiller vous contactera sous *24h*.
📞 Urgence : *+225 01 02 64 20 80*${AKOGOUA_CTA}

↩️ Tapez *menu* pour revenir au menu principal`;
  }

  return null;
}

module.exports = { handleMateriels };
