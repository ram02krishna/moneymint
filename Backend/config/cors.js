// Single source of truth for which browser origins may call the API.
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://expense-tracker-omega-wine.vercel.app",
  ...(process.env.CLIENT_URL || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
];

// Vercel preview deployments (*.vercel.app) are allowed unless explicitly turned off.
const allowVercelPreviews = process.env.ALLOW_VERCEL_PREVIEWS !== "false";

const isAllowedOrigin = (origin) => {
  if (allowedOrigins.includes(origin)) return true;
  if (!allowVercelPreviews) return false;
  try {
    const { protocol, hostname } = new URL(origin);
    return protocol === "https:" && hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
};

const corsOptions = {
  origin: (origin, callback) => {
    // no Origin header: mobile app, curl, server-to-server
    if (!origin || isAllowedOrigin(origin)) return callback(null, true);
    console.error(`CORS error: ${origin} not allowed`);
    callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  credentials: true,
};

module.exports = { corsOptions, isAllowedOrigin };
