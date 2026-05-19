function getAdminSecret() {
  return process.env.ADMIN_SECRET || process.env.ADMIN_KEY || "";
}

function getRequestToken(req) {
  const auth = req.headers?.authorization || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  return (
    req.headers?.["x-admin-token"] ||
    bearer ||
    req.query?.token ||
    req.query?.adminKey ||
    req.body?.adminKey ||
    req.body?.adminToken ||
    ""
  );
}

function hasAdminAccess(req) {
  const secret = getAdminSecret();
  const token = getRequestToken(req);
  return Boolean(secret && token && token === secret);
}

function requireAdmin(req, res, next) {
  if (!getAdminSecret()) {
    return res.status(503).json({
      success: false,
      error: "Configuration admin manquante."
    });
  }

  if (!hasAdminAccess(req)) {
    return res.status(403).json({
      success: false,
      error: "Acces admin non autorise."
    });
  }

  return next();
}

async function verifyOwnerOrAdmin(req, model, id, codeField = "managementCode") {
  if (hasAdminAccess(req)) return { ok: true, admin: true };

  const managementCode = req.body?.[codeField] || req.query?.[codeField];
  if (!managementCode) {
    return { ok: false, status: 403, error: "Code de gestion requis." };
  }

  const doc = await model.findById(id);
  if (!doc) {
    return { ok: false, status: 404, error: "Document introuvable." };
  }

  if (doc[codeField] !== managementCode) {
    return { ok: false, status: 403, error: "Code de gestion incorrect." };
  }

  return { ok: true, doc };
}

module.exports = {
  getAdminSecret,
  hasAdminAccess,
  requireAdmin,
  verifyOwnerOrAdmin
};
