const { clearSession } = require('../../services/session');

async function handleAkogoua(from, msg, text, session) {
  if (msg === '8' && !session?.step) {
    await clearSession(from);
    return `🌐 *AKOGOUA — LA PLATEFORME AVICOLE*
_La référence de la volaille en Côte d'Ivoire_ 🇨🇮

Sur *akogoua.com* vous pouvez :

🛒 *Acheter* — Poussins, volailles vives, matériels d'élevage
📢 *Vendre* — Vos volailles et votre production
👷 *Trouver un technicien* — Vétérinaires et experts avicoles (avec CV)
📋 *Recruter* — Trouvez des profils qualifiés pour votre élevage

✅ Inscription gratuite.
✅ Annonces visibles par tous les éleveurs de Côte d'Ivoire.

👉 *Accédez maintenant :*
🌐 *https://akogoua.com*

↩️ Tapez *menu* pour revenir au menu principal`;
  }

  return null;
}

module.exports = { handleAkogoua };
