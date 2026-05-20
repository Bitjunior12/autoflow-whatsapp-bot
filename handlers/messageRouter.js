const { getSession, setSession, clearSession } = require('../services/session');
const { askClaude } = require('../services/claude');
const { sendWhatsAppMessage } = require('../services/whatsapp');
const {
  MENU_PRINCIPAL, MESSAGE_INCONNU,
  MENU_RACES, MENU_MATERIELS_CHOIX, MENU_ESTIMATION, MENU_SANTE, MENU_BANDE,
} = require('../menus');

const { handleDebutant }   = require('./tunnels/debutant');
const { handlePoussins }   = require('./tunnels/poussins');
const { handleMateriels }  = require('./tunnels/materiels');
const { handleEstimation } = require('./tunnels/estimation');
const { handleFormation }  = require('./tunnels/formation');
const { handleSante }      = require('./tunnels/sante');
const { handleBande }      = require('./tunnels/bande');
const { handleAkogoua }    = require('./tunnels/akogoua');
const { handleConseiller } = require('./tunnels/conseiller');

// ── Relance timers en mémoire ──────────────────────────────────────
const relanceTimers = {};

function cancelRelanceTimer(from) {
  if (!relanceTimers[from]) return;
  const timers = Array.isArray(relanceTimers[from]) ? relanceTimers[from] : [relanceTimers[from]];
  timers.forEach(t => clearTimeout(t));
  delete relanceTimers[from];
}

// ── Helpers ────────────────────────────────────────────────────────
function isSmartQuestion(text) {
  const msg = text.toLowerCase();
  return ['quoi', 'comment', 'pourquoi', 'différence', 'combien', 'conseil', 'expliquer', "c'est quoi", 'avantage', 'inconvénient'].some(w => msg.includes(w));
}

function isHotLead(text) {
  const msg = text.toLowerCase();
  return ['je veux', 'je suis intéressé', 'je veux acheter', 'je commande', 'je veux des poussins', 'je veux commencer'].some(w => msg.includes(w));
}

// ── Navigation retour ──────────────────────────────────────────────
const RETOUR_MAP = {
  'debutant_experience': { step: 'debutant_objectif', msg: `🎯 *Quel est votre objectif principal ?*\n\n1️⃣ Poulets de chair\n2️⃣ Poules pondeuses\n3️⃣ Pintades\n4️⃣ Élevage mixte\n5️⃣ Pas encore défini` },
  'debutant_budget':     { step: 'debutant_experience', msg: `👤 *Avez-vous déjà fait de l'élevage ?*\n\n1️⃣ Oui\n2️⃣ Non, je débute\n3️⃣ J'ai aidé quelqu'un` },
  'debutant_espace':     { step: 'debutant_budget', msg: `💰 *Quel budget souhaitez-vous investir ?*\n\n1️⃣ < 100 000 FCFA\n2️⃣ 100k–300k FCFA\n3️⃣ 300k–700k FCFA\n4️⃣ > 700 000 FCFA\n5️⃣ Non défini` },
  'debutant_ville':      { step: 'debutant_espace', msg: `📐 *Avez-vous un espace disponible ?*\n\n1️⃣ Petit (< 50m²)\n2️⃣ Moyen (50–200m²)\n3️⃣ Grand (> 200m²)\n4️⃣ Pas encore` },
  'debutant_timing':     { step: 'debutant_ville', msg: `📍 *Dans quelle ville se trouve votre projet ?*` },
  'commande_quantite':   { step: 'choix_race',       msg: null },
  'commande_nom':        { step: 'commande_quantite', msg: `📦 *Combien de poussins souhaitez-vous commander ?*\n\nExemple : 500` },
  'commande_ville':      { step: 'commande_nom',      msg: `👤 *Quel est votre nom complet ?*` },
  'materiel_sujets':     { step: 'materiel_choix',   msg: null },
  'materiel_action':     { step: 'materiel_sujets',  msg: `🐔 *Combien de sujets avez-vous dans votre élevage ?*\n\nExemple : 500` },
  'materiel_nom':        { step: 'materiel_action',  msg: `1️⃣ Commander maintenant\n2️⃣ Recevoir un devis` },
  'materiel_ville':      { step: 'materiel_nom',     msg: `👤 *Quel est votre nom complet ?*` },
  'estimation_sujets':   { step: 'estimation_type',  msg: null },
  'estimation_budget':   { step: 'estimation_sujets', msg: `🐔 *Combien de sujets voulez-vous élever ?*\n\nExemple : 500` },
  'sante_description':   { step: 'sante_symptome',   msg: null },
  'sante_libre':         { step: 'sante_symptome',   msg: null },
  'bande_race':          { step: 'bande_action',     msg: null },
  'bande_quantite':      { step: 'bande_race',       msg: `🐔 *Quel type de volailles avez-vous ?*\n\n1️⃣ Chair Blanc\n2️⃣ Chair Roux\n3️⃣ Hybrides\n4️⃣ Pondeuses ISA Brown\n5️⃣ Pintades\n6️⃣ Autre` },
  'bande_date':          { step: 'bande_quantite',   msg: `📦 *Combien de sujets avez-vous reçu ?*\n\nExemple : 100` },
  'debutant_suite':      { step: 'debutant_timing',  msg: `📅 *Quand souhaitez-vous démarrer votre élevage ?*\n\n1️⃣ Cette semaine\n2️⃣ Ce mois-ci\n3️⃣ Dans 1 à 3 mois\n4️⃣ Je me renseigne seulement pour l'instant` },
};

const MENU_FALLBACKS = {
  'choix_race':       MENU_RACES,
  'materiel_choix':   MENU_MATERIELS_CHOIX,
  'estimation_type':  MENU_ESTIMATION,
  'sante_symptome':   MENU_SANTE,
  'bande_action':     MENU_BANDE,
};

async function handleRetour(from, session) {
  const retourInfo = RETOUR_MAP[session?.step];
  if (!retourInfo) { await clearSession(from); return MENU_PRINCIPAL; }
  const message = retourInfo.msg || MENU_FALLBACKS[retourInfo.step] || MENU_PRINCIPAL;
  await setSession(from, { ...session, step: retourInfo.step });
  return `↩️ *Retour en arrière*\n\n${message}`;
}

// ── Dispatcher principal ───────────────────────────────────────────
async function handleMessage(from, text) {
  const msg = text.trim().toLowerCase();
  const session = await getSession(from);

  cancelRelanceTimer(from);

  // Global : menu / annuler
  if (msg === 'menu' || msg === 'annuler') {
    await clearSession(from);
    return MENU_PRINCIPAL;
  }

  // Global : retour
  if (msg === 'retour' || msg === 'back' || msg === 'precedent') {
    return handleRetour(from, session);
  }

  // Politesse
  const POLITESSE = ['merci', 'merci beaucoup', 'ok merci', 'thanks', 'thank you', 'parfait', 'super', "d'accord", 'ok'];
  if (POLITESSE.includes(msg)) {
    return `😊 Avec plaisir ! C'est notre mission de vous accompagner vers la réussite de votre élevage 🐔

💡 *Conseil du jour :*
Un bon éleveur observe ses sujets chaque matin. Les premiers signes de maladie se détectent dans le comportement avant les symptômes visibles.

👉 Besoin d'autre chose ?
↩️ Tapez *menu* pour voir nos services
🌐 Communauté avicole : *akogoua.com*`;
  }

  // Objections prix
  if (['trop cher', "c'est cher", 'pas les moyens', 'cher', 'coûteux', 'hors budget', 'trop coûteux'].some(o => msg.includes(o))) {
    return `💡 *Nous vous comprenons !*

✅ Nos poussins certifiés ont un taux de survie de 95%
✅ Possibilité de commencer petit — dès 50 poussins
✅ Suivi gratuit après votre achat

🐔 Avec 200 poulets chairs, vous pouvez gagner entre *150 000 et 250 000 FCFA* nets en 45 jours.

👉 Tapez *4* pour estimer votre rentabilité
↩️ Tapez *menu* pour voir nos services`;
  }

  // Objections frustration → alerter conseiller
  if (['nul', 'mauvais', 'pas bien', 'déçu', 'ça marche pas', 'pas satisfait'].some(o => msg.includes(o))) {
    const c = process.env.CONSEILLER_PHONE;
    if (c) sendWhatsAppMessage(c, `⚠️ *CLIENT INSATISFAIT !*\n\n📱 +${from}\n💬 "${text}"\n\n👉 À contacter rapidement !`).catch(() => {});
    return `😔 Nous sommes désolés de cette expérience. Votre satisfaction est notre priorité 🙏

Un responsable va vous contacter dans les *2 heures*.

📞 Urgence directe : *+225 01 02 64 20 80*
↩️ Tapez *menu* pour voir nos services`;
  }

  // Objections hésitation
  if (['je réfléchis', 'je verrai', 'plus tard', 'pas maintenant', 'peut-être', 'on verra'].some(o => msg.includes(o))) {
    return `😊 Pas de problème, prenez le temps qu'il vous faut !

💡 *En attendant, sachez que :*
✓ Nos prix poussins sont stables
✓ La demande en volaille augmente chaque mois en CI
✓ Chaque semaine de retard = une bande de moins par an

🌐 Explorez aussi la communauté avicole : *akogoua.com*
↩️ Tapez *menu* pour voir nos services`;
  }

  const step = session?.step;

  // Routing par step actif — si le tunnel retourne null, on tombe sur le fallback Claude
  {
    let r = null;
    if      (step?.startsWith('debutant_'))                          r = await handleDebutant(from, msg, text, session);
    else if (step === 'choix_race' || step?.startsWith('commande_')) r = await handlePoussins(from, msg, text, session);
    else if (step?.startsWith('materiel_'))                          r = await handleMateriels(from, msg, text, session);
    else if (step?.startsWith('estimation_'))                        r = await handleEstimation(from, msg, text, session);
    else if (step === 'choix_formation')                             r = await handleFormation(from, msg, text, session);
    else if (step?.startsWith('sante_') || step === 'question_libre') r = await handleSante(from, msg, text, session);
    else if (step?.startsWith('bande_'))                             r = await handleBande(from, msg, text, session);
    if (r !== null) return r;
  }

  // Routing par choix menu (pas de session active)
  if (!step) {
    if (msg === '1') return await handleDebutant(from, msg, text, session);
    if (msg === '2') return await handlePoussins(from, msg, text, session);
    if (msg === '3') return await handleMateriels(from, msg, text, session);
    if (msg === '4') return await handleEstimation(from, msg, text, session);
    if (msg === '5') return await handleFormation(from, msg, text, session);
    if (msg === '6') return await handleSante(from, msg, text, session);
    if (msg === '7') return await handleBande(from, msg, text, session);
    if (msg === '8') return await handleAkogoua(from, msg, text, session);
    if (msg === '9' || msg === 'contact' || msg === 'conseiller') return await handleConseiller(from, msg, text, session);
  }

  // Salutations / démarrage
  if (['bonjour', 'bonsoir', 'salut', 'hi', 'hello', 'start', '0', 'bj', 'bjr'].includes(msg)) {
    await clearSession(from);
    return MENU_PRINCIPAL;
  }

  // Hot lead → menu
  if (isHotLead(text)) { await clearSession(from); return MENU_PRINCIPAL; }

  // Question intelligente sans session → Claude
  if (isSmartQuestion(text) && !step) {
    const r = await askClaude(text);
    if (r) return r;
  }

  // Fallback Claude avec contexte de session
  if (step) {
    const STEP_CONTEXT = {
      'choix_race':          '1=Chairs Blanc (650F), 2=Chairs Roux (600F), 3=Hybrides (450F), 4=Pintadeaux Galor (1100F), 5=Pontes ISA Brown (1150F), 6=Bleu Hollande (400F), 7=Coquelet Blanc (150F), 8=Pintadeaux Hybrides (900F)',
      'materiel_choix':      '1=Abreuvoirs, 2=Mangeoires, 3=Chauffage, 4=Pack complet',
      'materiel_action':     '1=Commander maintenant, 2=Recevoir un devis',
      'estimation_type':     '1=Poulets de chair, 2=Poules pondeuses, 3=Pintades',
      'choix_formation':     '1=Formation Live Zoom 85 000 FCFA, 2=Formation Pré-enregistrée 27 500 FCFA',
      'sante_symptome':      '1=Mortalités élevées, 2=Diarrhée, 3=Toux/respiratoire, 4=Faiblesse, 5=Mauvaise croissance, 6=Alimentation, 7=Autre (texte libre)',
      'bande_action':        '1=Enregistrer une nouvelle bande, 2=Voir l\'état de ma bande, 3=Signaler un problème sanitaire',
      'bande_race':          '1=Chair Blanc, 2=Chair Roux, 3=Hybrides, 4=Pondeuses ISA Brown, 5=Pintades, 6=Autre',
      'bande_date':          '1=Aujourd\'hui, 2=Hier, 3=Il y a 2 jours, 4=Entrer une date JJ/MM/AAAA',
      'debutant_objectif':   '1=Poulets de chair, 2=Poules pondeuses, 3=Pintades, 4=Élevage mixte, 5=Pas encore défini',
      'debutant_experience': '1=Oui déjà pratiqué, 2=Débutant complet, 3=Aidé quelqu\'un',
      'debutant_budget':     '1=Moins de 100k FCFA, 2=100k–300k, 3=300k–700k, 4=Plus de 700k, 5=Non défini',
      'debutant_espace':     '1=Petit (<50m²), 2=Moyen (50–200m²), 3=Grand (>200m²), 4=Pas encore',
      'debutant_timing':     '1=Cette semaine, 2=Ce mois-ci, 3=Dans 1 à 3 mois, 4=Je me renseigne',
      'debutant_suite':      '1=Estimer mon budget, 2=Voir les matériels, 3=Commander des poussins, 4=Me former, 5=Parler à un conseiller',
    };
    const ctx = STEP_CONTEXT[step];
    const ctxStr = ctx ? ` Les choix disponibles sont : ${ctx}.` : '';
    const r = await askClaude(`Tu es l'assistant avicole du Partenaire des Éleveurs en Côte d'Ivoire. Un éleveur a tapé : "${text}".${ctxStr} Réponds de façon naturelle et utile en français, puis rappelle-lui clairement ses choix avec leurs numéros. Max 5 lignes. Termine par "↩️ Tapez *menu* pour voir toutes nos options"`);
    if (r) return r;
  }

  // Relance pour messages inconnus sans session
  if (!step) {
    const t1 = setTimeout(async () => {
      await sendWhatsAppMessage(from, `👋 Avez-vous pu avancer sur votre projet d'élevage ? 🙂\n\nNous pouvons vous guider étape par étape.\n\n👉 Tapez *menu* pour voir nos services\n🌐 *akogoua.com*`).catch(() => {});
    }, 3600000);
    const t2 = setTimeout(async () => {
      await sendWhatsAppMessage(from, `👍 Beaucoup d'éleveurs ont démarré grâce à un bon accompagnement.\n\n👉 Tapez *menu* pour découvrir nos services\n🌐 Pour acheter, vendre ou recruter : *akogoua.com*`).catch(() => {});
    }, 86400000);
    relanceTimers[from] = [t1, t2];
  }

  const r = await askClaude(text);
  if (r) return r;

  return MESSAGE_INCONNU;
}

module.exports = { handleMessage, relanceTimers };
