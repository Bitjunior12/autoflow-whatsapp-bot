const { setSession, clearSession } = require('../../services/session');
const { askClaude } = require('../../services/claude');
const Order = require('../../models/Order');
const { sendWhatsAppMessage, sendWhatsAppPDF } = require('../../services/whatsapp');
const { generateDevisPDF } = require('../../services/pdf');
const { PRIX_POUSSINS, MENU_RACES, AKOGOUA_CTA } = require('../../menus');

async function handlePoussins(from, msg, text, session) {
  if (msg === '2' && !session?.step) {
    await setSession(from, { step: 'choix_race' });
    return MENU_RACES;
  }

  if (session?.step === 'choix_race') {
    const choix = PRIX_POUSSINS[msg];
    if (!choix) return null;
    await setSession(from, { ...session, step: 'commande_quantite', race: choix.race, prix: choix.prix });
    return `✅ Race choisie : *${choix.race}*
Prix unitaire : *${choix.prix} FCFA*

📦 *Combien de poussins souhaitez-vous commander ?*

Exemple : 500
↩️ Tapez *retour* pour choisir une autre race`;
  }

  if (session?.step === 'commande_quantite') {
    const quantite = parseInt(text.trim().replace(/\s/g, ''));
    if (isNaN(quantite) || quantite < 1) {
      if (text.trim().length > 5) {
        const r = await askClaude(`L'éleveur commande des poussins et a tapé : "${text}". Réponds brièvement en expert et rappelle-lui de saisir un nombre. Exemple : *500*`);
        return r;
      }
      return `❌ Entrez un nombre valide. Exemple : *500*`;
    }
    const total = quantite * session.prix;
    await setSession(from, { ...session, step: 'commande_nom', quantite, total });
    return `✅ Quantité : *${quantite} poussins*
💰 Total estimé : *${total.toLocaleString('fr-FR')} FCFA*

👤 *Quel est votre nom complet ?*
↩️ Tapez *retour* pour modifier la quantité`;
  }

  if (session?.step === 'commande_nom') {
    const nom = text.trim();
    if (nom.length < 2) return `❌ Nom invalide. Entrez votre nom complet.`;
    await setSession(from, { ...session, step: 'commande_ville', nom });
    return `✅ Nom : *${nom}*

📍 *Dans quelle ville souhaitez-vous être livré ?*
↩️ Tapez *retour* pour corriger le nom`;
  }

  if (session?.step === 'commande_ville') {
    const ville = text.trim();
    if (ville.length < 2) return `❌ Ville invalide.`;
    const { race, prix, quantite, total, nom } = session;

    try {
      await Order.create({ phone: from, name: nom, race, quantity: quantite, unitPrice: prix, totalPrice: total, ville, status: 'en_attente' });
      const c = process.env.CONSEILLER_PHONE;
      if (c) await sendWhatsAppMessage(c,
        `🐥 *NOUVELLE COMMANDE POUSSINS !*\n\n👤 ${nom}\n📱 +${from}\n📍 ${ville}\n🐔 ${race}\n📦 ${quantite} poussins\n💰 ${total.toLocaleString('fr-FR')} FCFA\n\n👉 À confirmer sous 24h`
      );
    } catch (err) { console.error('❌ Commande poussins :', err.message); }

    try {
      const pdfBuffer = await generateDevisPDF({ nom, phone: from, ville, items: [{ designation: `Poussins ${race}`, quantite, prixUnitaire: prix }] });
      await sendWhatsAppMessage(from,
        `🎉 *Commande enregistrée avec succès !*\n\n📋 *Récapitulatif :*\n👤 Nom : ${nom}\n📍 Ville : ${ville}\n🐔 Race : ${race}\n📦 Quantité : ${quantite} poussins\n💰 Total : ${total.toLocaleString('fr-FR')} FCFA\n\n✅ Votre facture proforma est en cours d'envoi...`
      );
      await sendWhatsAppPDF(from, pdfBuffer, `Facture_Proforma_${nom.replace(/\s/g, '_')}.pdf`, `📄 Votre facture proforma - Le Partenaire des Éleveurs`);
    } catch {
      await sendWhatsAppMessage(from,
        `🎉 *Commande enregistrée !*\n\n👤 ${nom} | 📍 ${ville}\n🐔 ${race} — ${quantite} poussins\n💰 ${total.toLocaleString('fr-FR')} FCFA\n\n✅ Un conseiller vous contactera sous *24h*.`
      );
    }

    await clearSession(from);
    return `📞 Un conseiller vous contactera sous *24h* pour les modalités de paiement et livraison.${AKOGOUA_CTA}\n\n↩️ Tapez *menu* pour revenir au menu principal`;
  }

  return null;
}

module.exports = { handlePoussins };
