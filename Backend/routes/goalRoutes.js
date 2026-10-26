const express = require("express");
const rateLimit = require("express-rate-limit");
const { Protect } = require("../middleware/authMiddleware");
const {
  createGoal,
  getGoals,
  updateGoal,
  addContribution,
  deleteGoal,
} = require("../controllers/goalController");
const {
  handleValidationErrors,
  validateGoal,
  validateContribution,
  validateMongoId,
} = require("../middleware/validationMiddleware");

let router = express.Router();

let goalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: "Too many requests to goals, wait a bit",
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(goalLimiter);

router
  .route("/")
  .get(Protect, getGoals)
  .post(Protect, validateGoal, handleValidationErrors, createGoal);

router.post(
  "/:id/contribute",
  Protect,
  validateMongoId,
  validateContribution,
  handleValidationErrors,
  addContribution,
);

router
  .route("/:id")
  .put(
    Protect,
    validateMongoId,
    validateGoal,
    handleValidationErrors,
    updateGoal,
  )
  .delete(Protect, validateMongoId, handleValidationErrors, deleteGoal);

module.exports = router;
