// Stockage en mémoire des sessions actives
const sessions = {};

// Créer ou mettre à jour une session
function setSession(phone, data) {
  sessions[phone] = { ...sessions[phone], ...data };
}

// Récupérer une session
function getSession(phone) {
  return sessions[phone] || null;
}

// Supprimer une session
function clearSession(phone) {
  delete sessions[phone];
}

module.exports = { setSession, getSession, clearSession };