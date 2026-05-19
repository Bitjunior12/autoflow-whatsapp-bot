const os = require("os");
const mongoose = require("mongoose");

const CONNECTION_STATES = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting"
};

function getDatabaseHealth() {
  const readyState = mongoose.connection.readyState;
  const state = CONNECTION_STATES[readyState] || "unknown";

  return {
    state,
    readyState,
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null
  };
}

function buildHealthReport(options = {}) {
  const {
    startedAt = new Date(),
    relanceTimers = {},
    includeDetails = false
  } = options;

  const database = getDatabaseHealth();
  const status = database.state === "connected" ? "ok" : "degraded";

  const report = {
    status,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    startedAt: new Date(startedAt).toISOString(),
    database
  };

  if (!includeDetails) {
    return report;
  }

  return {
    ...report,
    process: {
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      memory: process.memoryUsage()
    },
    app: {
      env: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || null,
      activeRelanceTimers: Object.keys(relanceTimers).length
    },
    system: {
      hostname: os.hostname(),
      uptimeSeconds: Math.floor(os.uptime()),
      loadAverage: os.loadavg()
    }
  };
}

module.exports = {
  buildHealthReport
};
