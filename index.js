require('dotenv').config();
const express    = require('express');
const rateLimit  = require('express-rate-limit');
const connectDB  = require('./config/database');
const { buildHealthReport } = require('./services/health');
const { relanceTimers }     = require('./handlers/messageRouter');

const webhookRoute = require('./routes/webhook');
const dataRoute    = require('./routes/data');

const app = express();
app.use(express.json());
app.set('trust proxy', 1);
app.use(express.static('public'));

// ── Rate limiting ────────────────────────────────────────────────────
app.use('/webhook', rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
app.use('/api',     rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// ── Routes ───────────────────────────────────────────────────────────
app.use('/webhook', webhookRoute);
app.use('/',        dataRoute);

// ── Health ───────────────────────────────────────────────────────────
const APP_STARTED_AT = new Date();

app.get('/api/health', (req, res) => {
  const report = buildHealthReport({ startedAt: APP_STARTED_AT, relanceTimers });
  res.status(report.status === 'ok' ? 200 : 503).json(report);
});

app.get('/api/health/details', (req, res) => {
  const report = buildHealthReport({ startedAt: APP_STARTED_AT, relanceTimers, includeDetails: true });
  res.status(report.status === 'ok' ? 200 : 503).json(report);
});

// ── WABA subscription ────────────────────────────────────────────────
async function subscribeToWABA() {
  const wabaId = process.env.WABA_ID;
  const token  = process.env.WHATSAPP_TOKEN;
  if (!wabaId || !token) { console.warn('⚠️ WABA_ID ou WHATSAPP_TOKEN manquant'); return; }
  try {
    const res  = await fetch(`https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) console.log('✅ App abonnée au WABA');
    else console.warn('⚠️ WABA subscription :', JSON.stringify(data));
  } catch (err) { console.error('❌ WABA subscription :', err.message); }
}

// ── Keep-alive (Render free tier) ────────────────────────────────────
const KEEP_ALIVE_URL = process.env.APP_URL || 'https://autoflow-v2.onrender.com';
setInterval(async () => {
  try { await fetch(KEEP_ALIVE_URL); console.log('💓 Keep-alive ping'); }
  catch (err) { console.error('Keep-alive error:', err.message); }
}, 14 * 60 * 1000);

// ── Start ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

function startServer(port = PORT) {
  return app.listen(port, async () => {
    console.log(`🚀 Autoflow V2 lancé sur le port ${port}`);
    await subscribeToWABA();
  });
}

if (require.main === module) {
  connectDB();
  startServer();
}

module.exports = { app, startServer };
