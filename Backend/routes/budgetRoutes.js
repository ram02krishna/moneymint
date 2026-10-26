const express = require("express");
const rateLimit = require("express-rate-limit");
const { Protect } = require("../middleware/authMiddleware");
const {
  createBudget,
  getBudgets,
  getBudget,
  updateBudget,
  deleteBudget,
  getBudgetVsActual,
} = require("../controllers/budgetController");
const {
  handleValidationErrors,
  validateBudget,
  validateMongoId,
} = require("../middleware/validationMiddleware");

let router = express.Router();

// budget rate limiter
let budgetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: "Too many requests to budget, wait a bit",
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(budgetLimiter);

router
  .route("/")
  .post(Protect, validateBudget, handleValidationErrors, createBudget)
  .get(Protect, getBudgets);

router.get("/report/actual-vs-budget", Protect, getBudgetVsActual);

router
  .route("/:id")
  .get(Protect, validateMongoId, handleValidationErrors, getBudget)
  .put(
    Protect,
    validateMongoId,
    validateBudget,
    handleValidationErrors,
    updateBudget,
  )
  .delete(Protect, validateMongoId, handleValidationErrors, deleteBudget);

module.exports = router;
