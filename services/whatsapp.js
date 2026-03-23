const sendWhatsAppMessage = async (to, message) => {
  const url = `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`;

  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to,
    type: "text",
    text: { body: message },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  // 👇 LOG COMPLET pour voir l'erreur exacte
  console.log("📤 Envoi WhatsApp vers", to);
  console.log("📋 Réponse Meta :", JSON.stringify(data, null, 2));

  if (!response.ok) {
    throw new Error(`Erreur Meta API: ${JSON.stringify(data.error)}`);
  }

  return data;
};
if (!response.ok) {
  console.error("❌ ERREUR META");
  console.error("Status:", response.status);
  console.error("Error:", JSON.stringify(data.error, null, 2));
}

module.exports = { sendWhatsAppMessage };
```

---

### Étape 2 — Vérifie tes variables sur Render

Va sur **Render → Environment Variables** et confirme :
```
PHONE_NUMBER_ID  =  4007178102836234
WHATSAPP_TOKEN   =  EAAhUdc99xuwBRBLGYCNRuiWsNklm2njs3bDIjCtFmrgzZA912mfMOxHD8KqfQVn5dsPVCqSyZAoNt8yiB7pTLFlLWKo9bHWlmcYikxYcMCTy8IKYYR4aGft6zcY1LZBZBdpcaXjXk73HMeAel7JCqJ6POQcy89ZBWCZAxWAcXvTkvhh0ZAQktkr8rAakTixcRcqrbvdQGZCuLpXq3RiiN05Dj9FLPB0PJjveqNdX2wqU76u5NbDUDo5SyRu8n8Do0zTcVdhVMwUEc4SLGDI89vf42JijZBjSc7uPZBhQZDZD
WABA_ID          =  4007178102836234
VERIFY_TOKEN     =  autoflow123
```

---

### Étape 3 — Partage le log après correction

Après le redéploiement, renvoie un message WhatsApp et copie ici la ligne :
```
module.exports = { sendWhatsAppMessage };