const express = require("express");
const rateLimit = require("express-rate-limit");
const { Protect } = require("../middleware/authMiddleware");
const expenseController = require("../controllers/expenseController");
const {
  handleValidationErrors,
  validateExpense,
  validateMongoId,
} = require("../middleware/validationMiddleware");

let router = express.Router();

// expense rate limiter
let expenseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: "Too many requests to expense endpoints, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(expenseLimiter);

// add expense
router.post(
  "/",
  Protect,
  validateExpense,
  handleValidationErrors,
  expenseController.addExpense,
);

// get expenses
router.get("/", Protect, expenseController.getAllExpenses);

// update expense
router.put(
  "/:id",
  Protect,
  validateMongoId,
  validateExpense,
  handleValidationErrors,
  expenseController.updateExpense,
);

// delete expense
router.delete(
  "/:id",
  Protect,
  validateMongoId,
  handleValidationErrors,
  expenseController.deleteExpense,
);

// download excel
router.get("/download-excel", Protect, expenseController.downloadExpenseExcel);

module.exports = router;
