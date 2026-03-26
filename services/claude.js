const askClaude = async (question) => {
  try {
    console.log("🔥 CLAUDE VERSION HAÏKU ACTIVE 🔥");
    console.log("Question envoyée à Claude :", question);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307", // ✅ CORRIGÉ ICI
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

PRIX AUTORISÉS :
- Chair blanc : 650 FCFA
- Chair roux : 600 FCFA

INTERDICTIONS :
- N'invente jamais de prix non listés ci-dessus
- N'invente pas d'informations

FIN OBLIGATOIRE :
Termine toujours par UNE question d'engagement puis ajoute :
"↩️ Tapez *menu* pour voir nos services"`,
        messages: [
          {
            role: "user",
            content: question,
          },
        ],
      }),
    });

    const data = await response.json();
    console.log("Réponse brute Claude :", JSON.stringify(data, null, 2));

    // Détection erreur API
    if (data.error) {
      console.error("❌ Erreur API Claude :", data.error.type, "-", data.error.message);
      return "Je rencontre une difficulté technique. Tapez *contact* pour parler à un conseiller.";
    }

    if (data.content && data.content.length > 0 && data.content[0].text) {
      return data.content[0].text;
    }

    console.warn("⚠️ Réponse vide inattendue :", JSON.stringify(data));
    return null;

  } catch (err) {
    console.error("❌ Erreur réseau/serveur :", err.message);
    return null;
  }
};

module.exports = { askClaude };