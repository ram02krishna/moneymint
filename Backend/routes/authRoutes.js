const express = require("express");
const { Protect } = require("../middleware/authMiddleware");
const {
  sendSignupOtp,
  verifySignupOtp,
  registerUser,
  loginUser,
  googleAuth,
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
  validateSendSignupOtp,
  validateVerifySignupOtp,
  validateRegister,
  validateLogin,
  validateGoogleAuth,
  validateChangePassword,
  validateUpdateUser,
  validateForgotPassword,
  validateResetPassword,
} = require("../middleware/validationMiddleware");

let router = express.Router();

// send signup 45-second verification OTP
router.post(
  "/send-signup-otp",
  validateSendSignupOtp,
  handleValidationErrors,
  sendSignupOtp,
);

// resend signup OTP (same cooldown rules as the first send)
router.post("/resend-signup-otp", validateSendSignupOtp, handleValidationErrors, sendSignupOtp);

// verify signup OTP & create account
router.post(
  "/verify-signup-otp",
  validateVerifySignupOtp,
  handleValidationErrors,
  verifySignupOtp,
);

// register route (requires OTP verification)
router.post(
  "/register",
  validateRegister,
  handleValidationErrors,
  registerUser,
);

// login route
router.post("/login", validateLogin, handleValidationErrors, loginUser);

// google sign in / sign up
router.post("/google", validateGoogleAuth, handleValidationErrors, googleAuth);

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
