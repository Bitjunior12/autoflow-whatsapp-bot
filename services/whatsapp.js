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

const sendWhatsAppImage = async (to, imageUrl, caption = "") => {
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
      type: "image",
      image: {
        link: imageUrl,
        caption: caption,
      },
    }),
  });

  const data = await response.json();
  console.log("🖼️ Image envoyée à", to);
  console.log("📋 Réponse Meta :", JSON.stringify(data, null, 2));

  if (!response.ok) {
    throw new Error(`Erreur Meta image: ${JSON.stringify(data.error)}`);
  }

  return data;
};

// ✅ NOUVELLE FONCTION - Envoi PDF via WhatsApp
const sendWhatsAppPDF = async (to, pdfBuffer, filename = "devis.pdf", caption = "") => {
  try {
    const phoneNumberId = process.env.PHONE_NUMBER_ID;
    const token = process.env.WHATSAPP_TOKEN;

    // ÉTAPE 1 : Upload du PDF sur Meta
    console.log("📄 Upload PDF en cours...");
    const uploadUrl = `https://graph.facebook.com/v21.0/${phoneNumberId}/media`;

    const formData = new FormData();
    formData.append("messaging_product", "whatsapp");
    formData.append("type", "application/pdf");
    formData.append(
      "file",
      new Blob([pdfBuffer], { type: "application/pdf" }),
      filename
    );

    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const uploadData = await uploadResponse.json();
    console.log("📤 Upload PDF résultat :", JSON.stringify(uploadData));

    if (!uploadResponse.ok || !uploadData.id) {
      throw new Error(`Erreur upload PDF : ${JSON.stringify(uploadData)}`);
    }

    const mediaId = uploadData.id;

    // ÉTAPE 2 : Envoyer le document au client
    const sendUrl = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

    const sendResponse = await fetch(sendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: to,
        type: "document",
        document: {
          id: mediaId,
          filename: filename,
          caption: caption,
        },
      }),
    });

    const sendData = await sendResponse.json();
    console.log("📄 PDF envoyé à", to);
    console.log("📋 Réponse Meta :", JSON.stringify(sendData, null, 2));

    if (!sendResponse.ok) {
      throw new Error(`Erreur envoi PDF : ${JSON.stringify(sendData.error)}`);
    }

    return sendData;

  } catch (err) {
    console.error("❌ Erreur sendWhatsAppPDF :", err.message);
    throw err;
  }
};
// Télécharger une image depuis WhatsApp
const downloadWhatsAppImage = async (mediaId) => {
  const token = process.env.WHATSAPP_TOKEN;

  // Étape 1 : Récupérer l'URL de l'image
  const urlRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const urlData = await urlRes.json();
  if (!urlData.url) throw new Error("URL image introuvable");

  // Étape 2 : Télécharger l'image
  const imgRes = await fetch(urlData.url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const arrayBuffer = await imgRes.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = urlData.mime_type || "image/jpeg";

  return { base64, mimeType };
};
module.exports = { sendWhatsAppMessage, sendWhatsAppImage, sendWhatsAppPDF, downloadWhatsAppImage };