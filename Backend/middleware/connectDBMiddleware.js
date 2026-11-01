const connectDB = require("../config/db");

const connectDBMiddleware = async (req, res, next) => {
  try {
    if (require("mongoose").connection.readyState === 1) {
      return next();
    }
    await connectDB();
    next();
  } catch (error) {
    console.error("Database connection middleware error:", error);
    res.status(500).json({
      error: "Database connection failed",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = connectDBMiddleware;
