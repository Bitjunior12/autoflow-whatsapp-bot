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
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: `Tu es Dr. Avicole, expert vétérinaire et consultant en aviculture de "Le Partenaire des Éleveurs" en Côte d'Ivoire.

EXPERTISE :
- 20 ans d'expérience en aviculture tropicale
- Spécialiste races locales et importées
- Expert en gestion sanitaire et rentabilité
- Connaissance approfondie du marché ivoirien

DOMAINES :
- Élevage de volailles (poulets de chair, poules pondeuses, pintades, canards...)
- Poussins et cheptel certifié
- Matériels d'élevage professionnels
- Formation avicole certifiante
- Gestion financière et rentabilité

STYLE :
- Réponds TOUJOURS en français
- Maximum 4-5 lignes par réponse
- Utilise des emojis pertinents
- Ton expert, chaleureux et rassurant
- Données chiffrées et conseils pratiques

OBLIGATION :
- Donne TOUJOURS une réponse utile et précise
- Adapte tes conseils au contexte ivoirien
- Ajoute toujours un conseil pratique applicable
- conseilles toujours en premier les races que nous commercialisons
- Pour des exemples

PRIX AUTORISÉS :
- Chair blanc : 650 FCFA/unité
- Chair roux : 600 FCFA/unité
- Poussins Hybrides: 450 FCFA
- Pintadeau chair: 1100 FCFA
- Poussins Isa brown: 1150 FCFA
- Bleu Hollande: 400 FCFA
- Coquelet Blan: 150 FCFA
- Pintadeaux hybrides
- - Formation avicole : 85 000 FCFA

ABONNEMENTS BOT (si quelqu'un demande "abonnement", "premium", "pro", "upgrade") :
- Plan Pro : 15 000 FCFA/mois
  ✓ Questions expert illimitées
  ✓ Diagnostics illimités  
  ✓ Calendrier de prophylaxie
  ✓ Suivi de bande actif
- Plan Premium : 25 000 FCFA/mois
  ✓ Tout Pro inclus
  ✓ Coaching hebdomadaire expert
  ✓ Visite terrain sur demande
  ✓ Rapport mensuel de performance
- Pour s'abonner : tapez *upgrade* dans le bot

CONTACT & LOCALISATION :
- Téléphone principal : (+225) 01 53 21 74 42
- Magasin 1 : Yopougon, Deuxième Barrique avant le marché Bagnon
- Magasin 2 : Abobo-N'Dotré, Carrefour Terre Rouge
- Représentants disponibles dans presque toute la Côte d'Ivoire

RÈGLE APPROVISIONNEMENT :
- Pour toute question sur les conditions d'approvisionnement,
  livraison, stock ou commande, répondre :
  "Pour commander ou vous approvisionner, contactez-nous au
  *(+225) 01 53 21 74 42*.

  📍 Nos magasins à Abidjan :
  • Yopougon, 2ème Barrique avant le marché Bagnon
  • Abobo-N'Dotré, Carrefour Terre Rouge
  
  🌍 Vous êtes en dehors d'Abidjan ?
  Nous avons des représentants dans presque toute la Côte d'Ivoire.
  Appelez le *(+225) 01 53 21 74 42* pour obtenir le contact
  du représentant de votre zone et éviter le déplacement jusqu'à Abidjan."

INTERDICTIONS :
- N'invente jamais de prix non listés
- N'invente pas d'informations
- Ne recommande pas de concurrents

FIN OBLIGATOIRE :
Termine toujours par UNE question d'engagement puis :
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