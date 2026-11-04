const User = require("../models/User");
const Otp = require("../models/Otp");
const jwt = require("jsonwebtoken");
const cloudinary = require("../config/cloudinary");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { validateEmail, validateObjectId } = require("../utils/queryValidator");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");
const { OAuth2Client } = require("google-auth-library");
const normalizeEmail = require("validator/lib/normalizeEmail");
const { signupOtpEmail, resetPasswordEmail } = require("../utils/emailTemplates");

const OTP_EXPIRY_SECONDS = 45;
const MAX_RESET_ATTEMPTS = 5;
const { RESET_EXPIRY_MINUTES } = User;

// Google Client ID(s) from Google Cloud Console. Comma separate to allow
// more than one (e.g. web + Android + iOS client IDs).
const getGoogleClientIds = () =>
  (process.env.GOOGLE_CLIENT_ID || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

const googleClient = new OAuth2Client();

const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new AppError("JWT_SECRET is missing", 500);
  }
  return jwt.sign({ id: id }, process.env.JWT_SECRET, { expiresIn: "1h" });
};

// send 45-second signup verification OTP
exports.sendSignupOtp = asyncHandler(async (req, res, next) => {
  const { email, fullName } = req.body;
  const myEmail = validateEmail(email);

  // 1. Check if an account with this email already exists
  const userExists = await User.findOne({ email: myEmail });
  if (userExists) {
    return next(
      new AppError(
        "An account with this email address already exists. Please log in or use another email address.",
        400,
      ),
    );
  }

  // 2. Spam / rate protection: always enforce the cooldown, a client flag must never bypass it
  const existingOtp = await Otp.findOne({ email: myEmail, purpose: "signup" });
  if (existingOtp) {
    const elapsedMs = Date.now() - existingOtp.lastSentAt.getTime();
    if (elapsedMs < OTP_EXPIRY_SECONDS * 1000) {
      const waitSeconds = Math.ceil((OTP_EXPIRY_SECONDS * 1000 - elapsedMs) / 1000);
      return next(
        new AppError(
          `Please wait ${waitSeconds}s before requesting a new OTP.`,
          429,
        ),
      );
    }
  }

  // 3. Immediately invalidate any previous OTP for this email
  await Otp.deleteMany({ email: myEmail, purpose: "signup" });

  // 4. Generate a secure, random 6-digit OTP
  const otp = crypto.randomInt(100000, 1000000).toString();

  // 5. Store OTP securely using SHA-256 hash and 45-second expiry
  const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_SECONDS * 1000);

  await Otp.create({
    email: myEmail,
    otpHash,
    purpose: "signup",
    expiresAt,
    attempts: 0,
    lastSentAt: new Date(),
  });

  // 6. Send OTP to user's email
  const { html, text: message } = signupOtpEmail(otp, fullName, OTP_EXPIRY_SECONDS);

  try {
    await sendEmail({
      email: myEmail,
      subject: "Your MoneyMint Verification Code",
      message,
      html,
    });

    res.status(200).json({
      status: "success",
      message: "Verification code sent to your email.",
      expiresIn: OTP_EXPIRY_SECONDS,
    });
  } catch (emailError) {
    console.error("Email delivery failed:", emailError?.message || emailError);
    // Cleanup OTP if email delivery failed
    await Otp.deleteMany({ email: myEmail, purpose: "signup" });
    return next(
      new AppError(
        "Failed to send verification email. Please check your email address or try again later.",
        500,
      ),
    );
  }
});

// verify signup OTP & create account
exports.verifySignupOtp = asyncHandler(async (req, res, next) => {
  const { fullName, email, password, profileImageUrl, otp } = req.body;
  const myEmail = validateEmail(email);

  if (!otp || typeof otp !== "string" || otp.trim().length !== 6) {
    return next(new AppError("Please provide a valid 6-digit verification code.", 400));
  }

  // 1. Prevent duplicate accounts (race condition check)
  const userExists = await User.findOne({ email: myEmail });
  if (userExists) {
    return next(
      new AppError(
        "An account with this email address already exists. Please log in or use another email address.",
        400,
      ),
    );
  }

  // 2. Fetch active OTP record
  const otpRecord = await Otp.findOne({ email: myEmail, purpose: "signup" });
  if (!otpRecord) {
    return next(
      new AppError(
        "No verification code found. Please request a new OTP.",
        400,
      ),
    );
  }

  // 3. Prevent excessive verification attempts (max 5)
  if (otpRecord.attempts >= 5) {
    await Otp.deleteOne({ _id: otpRecord._id });
    return next(
      new AppError(
        "Too many failed verification attempts. Please request a new OTP.",
        429,
      ),
    );
  }

  // 4. Enforce exact 45-second expiration
  if (Date.now() > otpRecord.expiresAt.getTime()) {
    await Otp.deleteOne({ _id: otpRecord._id });
    return next(
      new AppError(
        "The verification code has expired. Please request a new OTP.",
        400,
      ),
    );
  }

  // 5. Compare hashed OTP securely
  const candidateHash = crypto.createHash("sha256").update(otp.trim()).digest("hex");
  if (candidateHash !== otpRecord.otpHash) {
    const updatedAttempts = otpRecord.attempts + 1;
    if (updatedAttempts >= 5) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return next(
        new AppError(
          "Too many failed verification attempts. Please request a new OTP.",
          429,
        ),
      );
    } else {
      await Otp.updateOne({ _id: otpRecord._id }, { $set: { attempts: updatedAttempts } });
      const remaining = 5 - updatedAttempts;
      return next(
        new AppError(
          `Invalid verification code. You have ${remaining} attempt${remaining === 1 ? "" : "s"} left.`,
          400,
        ),
      );
    }
  }

  // 6. OTP is verified! Immediately invalidate the OTP to prevent reuse
  await Otp.deleteMany({ email: myEmail, purpose: "signup" });

  // 7. Create user account
  const newUser = await User.create({
    fullName: fullName ? fullName.trim() : "",
    email: myEmail,
    password,
    profileImageUrl: profileImageUrl || null,
  });

  res.status(201).json({
    status: "success",
    message: "Email verified successfully! Account created.",
    token: generateToken(newUser._id),
    data: {
      user: newUser,
    },
  });
});

// login user function
exports.loginUser = asyncHandler(async (req, res, next) => {
  let { email, password } = req.body;

  // check email
  let myEmail = validateEmail(email);

  let foundUser = await User.findOne({ email: myEmail }).select("+password");

  // account created with Google and no password set yet
  if (foundUser && !foundUser.password) {
    return next(
      new AppError(
        'This account uses Google sign-in. Use "Continue with Google", or reset your password to also log in with email.',
        400,
      ),
    );
  }

  if (!foundUser || !(await foundUser.comparePassword(password))) {
    return next(new AppError("Wrong email or password", 401));
  }

  res.status(200).json({
    status: "success",
    token: generateToken(foundUser._id),
    data: {
      user: foundUser,
    },
  });
});

// google sign in / sign up (one endpoint does both)
exports.googleAuth = asyncHandler(async (req, res, next) => {
  const clientIds = getGoogleClientIds();
  if (clientIds.length === 0) {
    return next(new AppError("GOOGLE_CLIENT_ID is missing", 500));
  }

  // verify the ID token with Google (signature, expiry, audience, issuer)
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: req.body.credential,
      audience: clientIds,
    });
    payload = ticket.getPayload();
  } catch (error) {
    console.error("Google verifyIdToken error:", error?.message || error);
    return next(new AppError("Google sign-in failed. Please try again.", 401));
  }

  if (!payload || !payload.sub || !payload.email) {
    return next(new AppError("Google sign-in failed. Please try again.", 401));
  }
  if (!payload.email_verified) {
    return next(new AppError("Your Google email is not verified.", 401));
  }

  const googleId = payload.sub;
  // Same normalisation the email/password flow applies (validators use normalizeEmail),
  // otherwise a Gmail address with dots/+tags would never match its password account.
  const rawEmail = payload.email.trim().toLowerCase();
  const email = normalizeEmail(rawEmail) || rawEmail;
  const picture = payload.picture || null;

  // 1) returning Google user
  let user = await User.findOne({ googleId });
  let isNewUser = false;

  if (!user) {
    // 2) existing email/password account -> link Google to it
    user = await User.findOne({ email: { $in: [...new Set([email, rawEmail])] } });

    if (user) {
      user.googleId = googleId;
      if (!user.profileImageUrl && picture) user.profileImageUrl = picture;
      await user.save({ validateBeforeSave: false });
    } else {
      // 3) brand new user -> sign up
      user = await User.create({
        fullName: payload.name || email.split("@")[0],
        email,
        googleId,
        profileImageUrl: picture,
      });
      isNewUser = true;
    }
  }

  res.status(isNewUser ? 201 : 200).json({
    status: "success",
    token: generateToken(user._id),
    isNewUser,
    data: { user },
  });
});

// get user info
exports.getUserInfo = asyncHandler(async (req, res, next) => {
  let myUser = await User.findById(req.user.id).select("-password");
  if (!myUser) {
    return next(new AppError("User not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: { user: myUser },
  });
});

// update user
exports.updateUser = asyncHandler(async (req, res, next) => {
  let { fullName, email, profileImageUrl } = req.body;

  let uId = validateObjectId(req.user.id, "User ID");

  let updatedUser = await User.findByIdAndUpdate(
    uId,
    { fullName: fullName, email: email, profileImageUrl: profileImageUrl },
    { new: true, runValidators: true },
  ).select("-password");

  if (!updatedUser) {
    return next(new AppError("User not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

// change password function
exports.changePassword = asyncHandler(async (req, res, next) => {
  let { currentPassword, newPassword } = req.body;

  let myUser = await User.findById(req.user.id).select("+password");

  if (myUser && !myUser.password) {
    return next(
      new AppError(
        'This account uses Google sign-in and has no password yet. Use "Forgot Password" on the login page to set one.',
        400,
      ),
    );
  }

  if (!myUser || !(await myUser.comparePassword(currentPassword))) {
    return next(new AppError("Wrong current password", 400));
  }

  myUser.password = newPassword;
  await myUser.save();

  res.status(200).json({
    status: "success",
    message: "Password changed",
  });
});

// forgot password: always answers the same way so the endpoint can't be used to
// find out which emails are registered.
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const myEmail = validateEmail(req.body.email);
  const genericReply = {
    status: "success",
    message: "If an account exists for that email, a reset code has been sent.",
  };

  const user = await User.findOne({ email: myEmail });
  if (!user) return res.status(200).json(genericReply);

  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const { html, text } = resetPasswordEmail(resetToken, RESET_EXPIRY_MINUTES);

  try {
    await sendEmail({ email: user.email, subject: "Your MoneyMint password reset code", message: text, html });
    res.status(200).json(genericReply);
  } catch (emailError) {
    console.error("Reset email failed:", emailError?.message || emailError);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError("There was an error sending the email. Try again later!", 500));
  }
});

// reset password: the code is single use and dies after too many wrong guesses
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const { email, otp, password } = req.body;
  const myEmail = validateEmail(email);
  const invalid = () => new AppError("OTP is invalid or has expired", 400);

  const user = await User.findOne({ email: myEmail });
  if (!user || !user.resetPasswordToken || !user.resetPasswordExpire || user.resetPasswordExpire.getTime() < Date.now()) {
    return next(invalid());
  }

  if ((user.resetPasswordAttempts || 0) >= MAX_RESET_ATTEMPTS) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.resetPasswordAttempts = 0;
    await user.save({ validateBeforeSave: false });
    return next(new AppError("Too many incorrect codes. Please request a new one.", 429));
  }

  const candidate = Buffer.from(crypto.createHash("sha256").update(String(otp)).digest("hex"));
  const stored = Buffer.from(user.resetPasswordToken);
  const matches = candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored);

  if (!matches) {
    user.resetPasswordAttempts = (user.resetPasswordAttempts || 0) + 1;
    await user.save({ validateBeforeSave: false });
    return next(invalid());
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  user.resetPasswordAttempts = 0;
  await user.save();

  res.status(200).json({
    status: "success",
    message: "Password reset successful. Please log in.",
  });
});

// upload profile pic
exports.uploadProfileImage = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError("Please upload a file", 400));
  }

  let uploadTask = cloudinary.uploader.upload_stream(
    {
      folder: "expense_tracker_uploads",
    },
    (error, result) => {
      if (error) {
        console.error("Cloudinary error:", JSON.stringify(error, null, 2));
        return next(new AppError("Image upload failed", 500));
      }
      res.status(200).json({
        status: "success",
        data: {
          imageUrl: result.secure_url,
        },
      });
    },
  );

  uploadTask.end(req.file.buffer);
});
