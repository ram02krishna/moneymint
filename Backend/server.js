const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// my files
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const incomeRoutes = require("./routes/incomeRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const budgetRoutes = require("./routes/budgetRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
<<<<<<< HEAD
const goalRoutes = require("./routes/goalRoutes");
=======
>>>>>>> 27e5bca306b6bf527d8a4e62359317d6d501bbb6
const globalErrorHandler = require("./middleware/errorMiddleware");
const { sanitizeMongoParams } = require("./middleware/validationMiddleware");
const connectDBMiddleware = require("./middleware/connectDBMiddleware");

const app = express();

app.use(compression());

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);

// CORS setup
let defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://expense-tracker-omega-wine.vercel.app",
];
if (process.env.CLIENT_URL) {
  defaultAllowedOrigins.push(
    ...process.env.CLIENT_URL.split(",").map((url) => url.trim()),
  );
}

const corsOptions = {
  origin: (origin, callback) => {
    // allow if no origin (e.g. mobile apps, curl)
    if (!origin) return callback(null, true);

    if (
      defaultAllowedOrigins.indexOf(origin) !== -1 ||
      origin.endsWith(".vercel.app")
    ) {
      callback(null, true);
    } else {
      console.error(`CORS error: ${origin} not allowed`);
      callback(null, false);
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "Accept"],
  credentials: true,
};

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
  max: 1000,
  message: "Too many logins, wait a bit.",
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
});

// upload rate limiter
const imgLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: "Too many uploads.",
  standardHeaders: true,
  legacyHeaders: false,
});

app.set("trust proxy", 1);
app.use((req, res, next) => {
  if (
    req.path.startsWith("/api/v1/auth/login") ||
    req.path.startsWith("/api/v1/auth/register")
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
app.use(sanitizeMongoParams);

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
<<<<<<< HEAD
app.use("/api/v1/goals", goalRoutes);
=======
>>>>>>> 27e5bca306b6bf527d8a4e62359317d6d501bbb6

// errors handled here
app.use(globalErrorHandler);

module.exports = app;

const runServer = async () => {
  try {
    await connectDB(); // connect database
    let myPort = process.env.PORT || 5000;

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
