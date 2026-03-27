const Session = require("../models/Session");

async function setSession(phone, data) {
  try {
    const existing = await Session.findOne({ phone });
    if (existing) {
      existing.data = { ...existing.data, ...data };
      existing.updatedAt = new Date();
      await existing.save();
    } else {
      await Session.create({ phone, data });
    }
  } catch (err) {
    console.error("❌ Erreur setSession :", err.message);
  }
}

async function getSession(phone) {
  try {
    const session = await Session.findOne({ phone });
    return session ? session.data : null;
  } catch (err) {
    console.error("❌ Erreur getSession :", err.message);
    return null;
  }
}

async function clearSession(phone) {
  try {
    await Session.deleteOne({ phone });
  } catch (err) {
    console.error("❌ Erreur clearSession :", err.message);
  }
}

module.exports = { setSession, getSession, clearSession };