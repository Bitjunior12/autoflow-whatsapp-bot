const axios = require("axios");

const sendWhatsAppMessage = async (to, message) => {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: {
          body: message,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(error.response?.data || error.message);
    throw error;
  }
};

module.exports = { sendWhatsAppMessage };