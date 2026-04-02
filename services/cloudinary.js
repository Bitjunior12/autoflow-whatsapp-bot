const cloudinary = require('cloudinary').v2;
const https      = require('https');
const http       = require('http');

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Uploader une image depuis une URL WhatsApp ─────────────────
async function uploadImageFromUrl(imageUrl, folder = 'lpe-bot') {
  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder:         folder,
      resource_type:  'image',
      transformation: [{ width: 800, crop: 'limit', quality: 'auto' }]
    });
    return result.secure_url;
  } catch (err) {
    console.error('❌ Erreur upload Cloudinary :', err.message);
    return null;
  }
}

// ── Uploader depuis un buffer base64 ──────────────────────────
async function uploadImageFromBase64(base64Data, mimeType, folder = 'lpe-bot') {
  try {
    const dataUri = `data:${mimeType};base64,${base64Data}`;
    const result  = await cloudinary.uploader.upload(dataUri, {
      folder:         folder,
      resource_type:  'image',
      transformation: [{ width: 800, crop: 'limit', quality: 'auto' }]
    });
    return result.secure_url;
  } catch (err) {
    console.error('❌ Erreur upload Cloudinary base64 :', err.message);
    return null;
  }
}

module.exports = {
  uploadImageFromUrl,
  uploadImageFromBase64,
};