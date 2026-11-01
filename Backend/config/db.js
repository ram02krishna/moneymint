let mongoose = require("mongoose");

let cachedPromise = null;

let connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (cachedPromise) {
    await cachedPromise;
    return;
  }

  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is missing from environment variables!");
    throw new Error("MONGO_URI environment variable is missing.");
  }

  try {
    let options = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    };

    cachedPromise = mongoose.connect(process.env.MONGO_URI, options);

    await cachedPromise;
    console.log("MongoDB connected successfully.");
  } catch (error) {
    console.error("MongoDB connection error:", error.message || error);
    cachedPromise = null;
    throw new Error(`Database connection failed: ${error.message}`);
  }
};

module.exports = connectDB;
