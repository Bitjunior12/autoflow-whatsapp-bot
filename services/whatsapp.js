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
      to,
      type: "text",
      text: { body: message },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Erreur Meta: ${JSON.stringify(data.error)}`);
  }

  return data;
};

const sendWhatsAppPDF = async (to, pdfBuffer, filename = "devis.pdf", caption = "") => {
  const phoneNumberId = process.env.PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;

  const formData = new FormData();
  formData.append("messaging_product", "whatsapp");
  formData.append("type", "application/pdf");
  formData.append(
    "file",
    new Blob([pdfBuffer], { type: "application/pdf" }),
    filename
  );

  const uploadResponse = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const uploadData = await uploadResponse.json();
  if (!uploadResponse.ok || !uploadData.id) {
    throw new Error(`Erreur upload PDF: ${JSON.stringify(uploadData)}`);
  }

  const sendResponse = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "document",
      document: {
        id: uploadData.id,
        filename,
        caption,
      },
    }),
  });

  const sendData = await sendResponse.json();
  if (!sendResponse.ok) {
    throw new Error(`Erreur envoi PDF: ${JSON.stringify(sendData.error)}`);
  }

  return sendData;
};

module.exports = { sendWhatsAppMessage, sendWhatsAppPDF };
