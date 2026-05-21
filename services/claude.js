const axios = require('axios');

const CLAUDE_FALLBACK = 'Je rencontre une difficulté technique. Tapez *contact* pour parler à un conseiller.';
const safeFallbackMessage = CLAUDE_FALLBACK;

const askClaude = async (question, systemOverride = null, maxTokens = 500) => {
  try {
    const q = typeof question === 'string' ? question.trim() : '';
    if (!q) return safeFallbackMessage;
    if (!process.env.ANTHROPIC_API_KEY) { console.error('❌ ANTHROPIC_API_KEY manquante.'); return safeFallbackMessage; }

    console.log('🤖 Claude appelé :', q.substring(0, 80) + '...');

    const { data } = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        system: systemOverride || `Tu es Dr. Avicole, expert vétérinaire et consultant en aviculture de "Le Partenaire des Éleveurs" en Côte d'Ivoire.

EXPERTISE :
- 20 ans d'expérience en aviculture tropicale
- Spécialiste races locales et importées
- Expert en gestion sanitaire et rentabilité
- Connaissance approfondie du marché ivoirien

STYLE :
- Réponds TOUJOURS en français
- Maximum 5 lignes par réponse
- Utilise des emojis pertinents
- Ton expert, chaleureux et rassurant

PRIX POUSSINS :
- Chair Blanc : 650 FCFA | Chair Roux : 600 FCFA | Hybrides : 450 FCFA
- Pintadeau Galor : 1 100 FCFA | Pontes ISA Brown : 1 150 FCFA
- Bleu Hollande : 400 FCFA | Coquelet Blanc : 150 FCFA | Pintadeaux Hybrides : 900 FCFA

LOCALISATION :
- Magasin 1 : Yopougon, 2ème Barrique avant le marché Bagnon
- Magasin 2 : Abobo-N'Dotré, Carrefour Terre Rouge
- Tél : (+225) 01 53 21 74 42

RÈGLE ORIENTATION :
Pour toute question sur acheter/vendre/recruter/technicien, oriente vers : *akogoua.com*

INTERDICTIONS :
- N'invente jamais de prix non listés
- Ne recommande pas de concurrents
- Ne cite aucun autre site web que akogoua.com

FIN OBLIGATOIRE :
Termine toujours par "↩️ Tapez *menu* pour voir nos services"`,
        messages: [{ role: 'user', content: q }],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
      }
    );

    if (data?.content?.[0]?.text) return data.content[0].text;
    return safeFallbackMessage;
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    console.error('❌ Erreur Claude :', msg);
    return safeFallbackMessage;
  }
};

module.exports = { askClaude, CLAUDE_FALLBACK };
