const { body, validationResult, param } = require("express-validator");

// error handler for validation
const handleValidationErrors = (req, res, next) => {
  let errors = validationResult(req);
  if (!errors.isEmpty()) {
    const list = errors.array();
    // message carries the first problem so clients that only show `message` stay useful
    return res.status(400).json({
      status: "fail",
      message: list[0].msg,
      errors: list,
    });
  }
  next();
};

// validate income
const validateIncome = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 255 })
    .withMessage("Title must not exceed 255 characters"),
  body("amount")
    .notEmpty()
    .withMessage("Amount is required")
    .isFloat({ min: 0 })
    .withMessage("Amount must be a positive number"),
  body("source")
    .trim()
    .notEmpty()
    .withMessage("Source is required")
    .isLength({ max: 255 })
    .withMessage("Source must not exceed 255 characters"),
  body("category")
    .trim()
    .notEmpty()
    .withMessage("Category is required")
    .isLength({ max: 255 })
    .withMessage("Category must not exceed 255 characters"),
  body("date").optional().isISO8601().withMessage("Date must be a valid date"),
  body("note")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Note must not exceed 500 characters"),
  body("icon")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Icon must not exceed 100 characters"),
];

// validate expense
const validateExpense = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 255 })
    .withMessage("Title must not exceed 255 characters"),
  body("amount")
    .notEmpty()
    .withMessage("Amount is required")
    .isFloat({ min: 0 })
    .withMessage("Amount must be a positive number"),
  body("category")
    .trim()
    .notEmpty()
    .withMessage("Category is required")
    .isLength({ max: 255 })
    .withMessage("Category must not exceed 255 characters"),
  body("date").optional().isISO8601().withMessage("Date must be a valid date"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description must not exceed 500 characters"),
  body("icon")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Icon must not exceed 100 characters"),
];

// validate budget
const validateBudget = [
  body("category")
    .trim()
    .notEmpty()
    .withMessage("Category is required")
    .isLength({ max: 255 })
    .withMessage("Category must not exceed 255 characters"),
  body("amount")
    .notEmpty()
    .withMessage("Amount is required")
    .isFloat({ min: 0 })
    .withMessage("Amount must be a positive number"),
  body("startDate")
    .notEmpty()
    .withMessage("Start date is required")
    .isISO8601()
    .withMessage("Start date must be a valid date"),
  body("endDate")
    .notEmpty()
    .withMessage("End date is required")
    .isISO8601()
    .withMessage("End date must be a valid date"),
  body("isRecurring")
    .optional()
    .isBoolean()
    .withMessage("isRecurring must be a boolean"),
  body("recurrenceType")
    .optional()
    .trim()
    .isIn(["daily", "weekly", "monthly", "annually"])
    .withMessage("Invalid recurrence type"),
  body("endDate").custom((endDate, { req }) => {
    let startDate = req.body.startDate;
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new Error("End date must be after or equal to start date");
    }
    return true;
  }),
];

// validate savings goal
const validateGoal = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Goal title is required")
    .isLength({ max: 255 })
    .withMessage("Title must not exceed 255 characters"),
  body("targetAmount")
    .notEmpty()
    .withMessage("Target amount is required")
    .isFloat({ min: 1 })
    .withMessage("Target amount must be at least 1"),
  body("deadline")
    .optional({ values: "falsy" })
    .isISO8601()
    .withMessage("Deadline must be a valid date"),
  body("icon")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Icon is too long"),
];

// validate goal contribution
const validateContribution = [
  body("amount")
    .notEmpty()
    .withMessage("Amount is required")
    .isFloat()
    .withMessage("Amount must be a number")
    .custom((v) => Number(v) !== 0)
    .withMessage("Amount cannot be zero"),
  body("note")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Note must not exceed 200 characters"),
];

// validate send signup otp
const validateSendSignupOtp = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Must be a valid email")
    .normalizeEmail(),
];

// validate verify signup otp & account creation
const validateVerifySignupOtp = [
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 2, max: 255 })
    .withMessage("Full name must be between 2 and 255 characters"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Must be a valid email")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  body("confirmPassword")
    .notEmpty()
    .withMessage("Confirm password is required")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Password confirmation does not match password");
      }
      return true;
    }),
  body("otp")
    .trim()
    .notEmpty()
    .withMessage("Verification code is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("Verification code must be 6 digits")
    .isNumeric()
    .withMessage("Verification code must contain digits only"),
  body("profileImageUrl")
    .optional()
    .trim()
    .isURL()
    .withMessage("Profile image URL must be a valid URL"),
];

// validate login
const validateLogin = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Must be a valid email")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

// validate google sign in (ID token sent by Google Identity Services)
const validateGoogleAuth = [
  body("credential")
    .isString()
    .withMessage("Google credential is required")
    .trim()
    .notEmpty()
    .withMessage("Google credential is required")
    .isLength({ max: 5000 })
    .withMessage("Invalid Google credential"),
];

// validate change password
const validateChangePassword = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters"),
];

// validate forgot password
const validateForgotPassword = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Must be a valid email")
    .normalizeEmail(),
];

// validate reset password
const validateResetPassword = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Must be a valid email")
    .normalizeEmail(),
  body("otp")
    .trim()
    .notEmpty()
    .withMessage("OTP is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits")
    .isNumeric()
    .withMessage("OTP must contain digits only"),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
];

// validate update user
const validateUpdateUser = [
  body("fullName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage("Full name must be between 2 and 255 characters"),
  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Must be a valid email")
    .normalizeEmail(),
  body("profileImageUrl")
    .optional()
    .trim()
    .isURL()
    .withMessage("Profile image URL must be a valid URL"),
];

// validate mongo id
const validateMongoId = [
  param("id").isMongoId().withMessage("Invalid ID format"),
];

module.exports = {
  handleValidationErrors,
  validateIncome,
  validateExpense,
  validateBudget,
  validateGoal,
  validateContribution,
  validateSendSignupOtp,
  validateVerifySignupOtp,
  validateLogin,
  validateGoogleAuth,
  validateChangePassword,
  validateForgotPassword,
  validateResetPassword,
  validateUpdateUser,
  validateMongoId,
};
