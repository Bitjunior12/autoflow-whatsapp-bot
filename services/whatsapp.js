const sendWhatsAppMessage = async (to, message) => {
  const url = `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
      type: "text",
      text: { body: message },
    }),
  });

  const data = await response.json();

  console.log("📤 Envoi vers", to);
  console.log("📋 Réponse Meta :", JSON.stringify(data, null, 2));

  if (!response.ok) {
    throw new Error(`Erreur Meta: ${JSON.stringify(data.error)}`);
  }

  return data;
};

module.exports = { sendWhatsAppMessage };