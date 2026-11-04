const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// my files
const connectDB = require("./config/db");
const { corsOptions } = require("./config/cors");
const authRoutes = require("./routes/authRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const incomeRoutes = require("./routes/incomeRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const budgetRoutes = require("./routes/budgetRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const goalRoutes = require("./routes/goalRoutes");
const splitRoutes = require("./routes/splitRoutes");
const globalErrorHandler = require("./middleware/errorMiddleware");
const AppError = require("./utils/AppError");
const connectDBMiddleware = require("./middleware/connectDBMiddleware");

const app = express();

app.use(compression());

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  }),
);

app.use(cors(corsOptions));

// server rate limiter
const normalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  message: "Too many requests, try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// login rate limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: "Too many login attempts, wait a bit.",
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
});

// upload rate limiter
const imgLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many uploads.",
  standardHeaders: true,
  legacyHeaders: false,
});

app.set("trust proxy", 1);
app.use((req, res, next) => {
  if (
    req.path.startsWith("/api/v1/auth/login") ||
    req.path.startsWith("/api/v1/auth/forgot-password") ||
    req.path.startsWith("/api/v1/auth/reset-password") ||
    req.path.startsWith("/api/v1/auth/google") ||
    req.path.startsWith("/api/v1/auth/send-signup-otp") ||
    req.path.startsWith("/api/v1/auth/resend-signup-otp") ||
    req.path.startsWith("/api/v1/auth/verify-signup-otp")
  ) {
    return authLimiter(req, res, next);
  }
  if (req.path.startsWith("/api/v1/auth/upload-image")) {
    return imgLimiter(req, res, next);
  }
  return normalLimiter(req, res, next);
});

app.use(express.json());
app.use(connectDBMiddleware);

// testing route
app.get("/", (req, res) => {
  res.json({ message: "My server is running fine" });
});

// my api routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/expense", expenseRoutes);
app.use("/api/v1/income", incomeRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/budgets", budgetRoutes);
app.use("/api/v1/transactions", transactionRoutes);
app.use("/api/v1/goals", goalRoutes);
app.use("/api/v1/split", splitRoutes);

// anything that reached this point matched no route
app.use((req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
});

// errors handled here
app.use(globalErrorHandler);

module.exports = app;

const runServer = async () => {
  try {
    await connectDB(); // connect database
    const myPort = process.env.PORT || 5000;

    // start listening
    if (require.main === module) {
      app.listen(myPort, () => {
        console.log(`Server started on port ${myPort}`);
      });
    }
  } catch (err) {
    console.error("Error starting up:", err);
    process.exit(1);
  }
};

if (require.main === module) {
  runServer();
}
