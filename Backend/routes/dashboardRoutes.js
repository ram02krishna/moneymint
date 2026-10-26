const express = require("express");
const rateLimit = require("express-rate-limit");
const { Protect } = require("../middleware/authMiddleware");
const {
  getDashboardSummary,
  getDashboardExpenseSummary,
  getMonthlyDashboardSummary,
  getMonthlyExpenses,
  getMonthlyIncome,
  getTrendSummary,
} = require("../controllers/dashboardController");

let router = express.Router();

// dashboard rate limiter
let dashboardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "development" ? 100000 : 1000,
  message: "Too many requests to dashboard, wait a bit",
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(dashboardLimiter);

// get dashboard summary
router.get("/", Protect, getDashboardSummary);

// get expenses by category
router.get("/expense-summary-by-category", Protect, getDashboardExpenseSummary);

// get monthly summary
router.get("/monthly-summary", Protect, getMonthlyDashboardSummary);

// get trend summary
router.get("/trend-summary", Protect, getTrendSummary);

// get monthly expenses
router.get("/monthly-expenses", Protect, getMonthlyExpenses);

// get monthly income
router.get("/monthly-income", Protect, getMonthlyIncome);

module.exports = router;
