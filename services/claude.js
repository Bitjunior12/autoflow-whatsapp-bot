const askClaude = async (question, context = "") => {
  try {
    console.log("📤 Question envoyée à Claude :", question);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 500,

        system: `Tu es l'assistant commercial de "Le Partenaire des Éleveurs".

Ton objectif est d'aider, conseiller et orienter chaque client vers une action concrète (achat, formation ou devis).

DOMAINES :
- Élevage de volailles
- Poussins
- Matériels
- Formation avicole

STYLE :
- Réponds en français
- Maximum 3-4 lignes
- Clair, simple, direct
- Ton professionnel et rassurant

OBLIGATION :
- Donne toujours une réponse utile
- Ajoute toujours un conseil pratique
- Oriente toujours vers une action

STRATÉGIE :
- Question simple → réponse + suggestion
- Client intéressé → propose une action directe
- Débutant → oriente vers formation ou devis

PRIX AUTORISÉS :
- Chair blanc : 650 FCFA
- Chair roux : 600 FCFA

INTERDICTIONS :
- N'invente jamais de prix
- N'invente pas d'informations

FIN OBLIGATOIRE :
Termine toujours par UNE question d'engagement.

Puis ajoute :
"↩️ Tapez *menu* pour voir nos services"`,

        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: question,
              },
            ],
          },
        ],
      }),
    });

    // 🔥 Gestion erreur HTTP
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Claude HTTP Error:", errorText);
      return "❌ Une erreur est survenue. Tapez *menu* pour continuer.";
    }

    const data = await response.json();

    console.log("📥 Réponse Claude :", JSON.stringify(data, null, 2));

    // ✅ Extraction réponse sécurisée
    if (data?.content?.length > 0 && data.content[0]?.text) {
      return data.content[0].text;
    }

    return "👉 Tapez *menu* pour voir nos services ou *contact* pour un conseiller.";

  } catch (err) {
    console.error("❌ Erreur Claude API :", err.message);

    return `❌ Le service est momentanément indisponible.

👉 Tapez *menu* pour continuer
👉 Ou *contact* pour parler à un conseiller`;
  }
};

module.exports = { askClaude };