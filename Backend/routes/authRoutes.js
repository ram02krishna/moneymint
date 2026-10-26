const express = require("express");
const { Protect } = require("../middleware/authMiddleware");
const {
  registerUser,
  loginUser,
  getUserInfo,
  updateUser,
  changePassword,
  forgotPassword,
  resetPassword,
  uploadProfileImage,
} = require("../controllers/authController");
const upload = require("../middleware/uploadMiddleware");
const {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validateChangePassword,
  validateUpdateUser,
  validateForgotPassword,
  validateResetPassword,
} = require("../middleware/validationMiddleware");

let router = express.Router();

// register route
router.post(
  "/register",
  validateRegister,
  handleValidationErrors,
  registerUser,
);

// login route
router.post("/login", validateLogin, handleValidationErrors, loginUser);

// get user info
router.get("/getUser", Protect, getUserInfo);

// update user
router.put(
  "/update",
  Protect,
  validateUpdateUser,
  handleValidationErrors,
  updateUser,
);

// change password
router.post(
  "/change-password",
  Protect,
  validateChangePassword,
  handleValidationErrors,
  changePassword,
);

// upload image
router.post("/upload-image", upload.single("image"), uploadProfileImage);

// forgot password
router.post(
  "/forgot-password",
  validateForgotPassword,
  handleValidationErrors,
  forgotPassword,
);

// reset password
router.put(
  "/reset-password",
  validateResetPassword,
  handleValidationErrors,
  resetPassword,
);

module.exports = router;
