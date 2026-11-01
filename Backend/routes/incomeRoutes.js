const express = require("express");
const rateLimit = require("express-rate-limit");
const { Protect } = require("../middleware/authMiddleware");
const {
  addIncome,
  getAllIncome,
  deleteIncome,
  updateIncome,
  downloadIncomeExcel,
} = require("../controllers/incomeController");
const {
  handleValidationErrors,
  validateIncome,
  validateMongoId,
} = require("../middleware/validationMiddleware");

let router = express.Router();

// income rate limiter
let incomeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: "Too many requests to income, wait a bit",
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(incomeLimiter);

// add income
router.post("/", Protect, validateIncome, handleValidationErrors, addIncome);

// get incomes
router.get("/", Protect, getAllIncome);

// update income
router.put(
  "/:id",
  Protect,
  validateMongoId,
  validateIncome,
  handleValidationErrors,
  updateIncome,
);

// delete income
router.delete(
  "/:id",
  Protect,
  validateMongoId,
  handleValidationErrors,
  deleteIncome,
);

// download excel
router.get("/download-excel", Protect, downloadIncomeExcel);

module.exports = router;
