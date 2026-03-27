const getFetch = async () => {
  if (typeof globalThis.fetch === "function") return globalThis.fetch.bind(globalThis);
  try {
    const mod = await import("node-fetch");
    const fetchFn = mod.default || mod;
    if (typeof fetchFn !== "function") throw new Error("node-fetch importé mais invalide");
    return fetchFn;
  } catch {
    throw new Error("fetch n'est pas disponible. Utilise Node 18+ ou installe 'node-fetch'.");
  }
};

const safeFallbackMessage = "Je rencontre une difficulté technique. Tapez *contact* pour parler à un conseiller.";

const askClaude = async (question) => {
  try {
    const q = typeof question === "string" ? question.trim() : "";
    if (!q) return safeFallbackMessage;

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("❌ ANTHROPIC_API_KEY manquante (env).");
      return safeFallbackMessage;
    }

    const fetchFn = await getFetch();

    console.log("🔥 CLAUDE SONNET ACTIF 🔥");
    console.log("Question envoyée à Claude :", q);

    const response = await fetchFn("https://api.anthropic.com/v1/messages", {
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

PRIX AUTORISÉS :
- Chair blanc : 650 FCFA
- Chair roux : 600 FCFA

INTERDICTIONS :
- N'invente jamais de prix non listés ci-dessus
- N'invente pas d'informations

FIN OBLIGATOIRE :
Termine toujours par UNE question d'engagement puis ajoute :
"↩️ Tapez *menu* pour voir nos services"`,
        messages: [{ role: "user", content: q }],
      }),
    });

    const contentType = response.headers?.get?.("content-type") || "";
    const isJson = contentType.includes("application/json");
    const rawText = isJson ? null : await response.text().catch(() => "");

    let data = null;
    if (isJson) {
      try {
        data = await response.json();
      } catch (e) {
        console.error("❌ Réponse JSON invalide Claude :", e?.message || e);
        return safeFallbackMessage;
      }
    }

    if (!response.ok) {
      const details = data?.error?.message || rawText || `HTTP ${response.status}`;
      console.error("❌ Erreur HTTP Claude :", details);
      return safeFallbackMessage;
    }

    console.log("✅ Réponse Claude :", {
      id: data?.id,
      model: data?.model,
      stop_reason: data?.stop_reason,
      usage: data?.usage,
    });

    if (data?.error) {
      console.error("❌ Erreur API Claude :", data.error.type, "-", data.error.message);
      return safeFallbackMessage;
    }

    if (data?.content && data.content.length > 0 && data.content[0]?.text) {
      return data.content[0].text;
    }

    console.warn("⚠️ Réponse vide inattendue.");
    return safeFallbackMessage;

  } catch (err) {
    console.error("❌ Erreur réseau/serveur :", err?.message || err);
    return safeFallbackMessage;
  }
};

module.exports = { askClaude };