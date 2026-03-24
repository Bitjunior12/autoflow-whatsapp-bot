const askClaude = async (question, context = "") => {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: `Tu es l'assistant virtuel de "Le Partenaire des Éleveurs", une entreprise spécialisée en aviculture en Côte d'Ivoire.

Tu réponds aux questions des clients sur :
- L'élevage de volailles (poulets de chair, pondeuses, pintades)
- Nos produits : poussins, matériels d'élevage
- Nos services : formation avicole, programme DECEM, devis bâtiment
- Les bonnes pratiques en aviculture

Nos prix :
- Formation : 85 000 FCFA/mois
- Poussins chairs blanc : 650 FCFA/unité
- Poussins chairs roux : 600 FCFA/unité
- Poussins hybrides : 450 FCFA/unité
- Pintadeaux Galor : 1 100 FCFA/unité
- Pontes ISA Brown : 1 150 FCFA/unité
- Bleu Hollande : 400 FCFA/unité
- Coquelet Blanc : 150 FCFA/unité
- Pintadeaux Hybrides : 900 FCFA/unité

Règles importantes :
- Réponds toujours en français
- Sois concis (max 3-4 lignes)
- Si tu ne sais pas, dis "Tapez *contact* pour parler à un conseiller"
- Termine toujours par "↩️ Tapez *menu* pour voir nos services"
- N'invente jamais de prix ou d'informations`,
        messages: [
          {
            role: "user",
            content: question,
          },
        ],
      }),
    });

    const data = await response.json();

    if (data.content && data.content[0]) {
      return data.content[0].text;
    }
    return null;
  } catch (err) {
    console.error("❌ Erreur Claude API :", err.message);
    return null;
  }
};

module.exports = { askClaude };