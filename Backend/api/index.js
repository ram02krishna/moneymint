const app = require("../server");
const connectDB = require("../config/db");

// This is the serverless function handler for Vercel
module.exports = async (req, res) => {
  // Ensure CORS headers are always attached, even on errors or preflight
  const origin = req.headers.origin;
  if (
    origin &&
    (origin.endsWith(".vercel.app") ||
      origin.includes("localhost") ||
      (process.env.CLIENT_URL && process.env.CLIENT_URL.includes(origin)))
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-CSRF-Token, Accept",
    );
  }

  // Preflight requests (OPTIONS) should succeed immediately without waiting for DB
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    await connectDB();
    return app(req, res);
  } catch (error) {
    console.error("Serverless handler DB error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error. Could not connect to the database.",
      details: error.message,
    });
  }
};
