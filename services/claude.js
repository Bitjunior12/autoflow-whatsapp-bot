const askClaude = async (question, context = "") => {
  try {
    console.log("Question envoyée à Claude :", question);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 500,
        system: `Tu es l'assistant commercial de "Le Partenaire des Éleveurs".

Ton objectif est d'aider, conseiller et orienter chaque client vers une action concrète (achat, formation ou devis).

DOMAINES :
- Élevage de volailles (poulets de chair, poules pondeuses, pintades...)
- Poussins et cheptel
- Matériels d'élevage
- Formation avicole

STYLE :
- Réponds en français
- Maximum 3-4 lignes
- Clair, simple, direct
- Ton professionnel et rassurant

OBLIGATION :
- Donne TOUJOURS une réponse utile, même pour les questions générales sur l'aviculture
- Ajoute toujours un conseil pratique
- Oriente toujours vers une action (acheter, demander devis, formation)

STRATÉGIE :
- Question simple → réponse + suggestion
- Client intéressé → propose directement une action
- Débutant → oriente vers formation ou devis

PRIX AUTORISÉS :
- Chair blanc : 650 FCFA
- Chair roux : 600 FCFA

INTERDICTIONS :
- N'invente jamais de prix non listés ci-dessus
- N'invente pas d'informations

FIN OBLIGATOIRE :
Termine toujours par UNE question d'engagement :
- "Souhaitez-vous commander ?"
- "Voulez-vous un devis personnalisé ?"
- "Souhaitez-vous vous inscrire à la formation ?"

Puis ajoute :
"↩️ Tapez *menu* pour voir nos services"`,
        messages: [
          {
            role: "user",
            content: question,  // ✅ simplifié, pas besoin du tableau
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