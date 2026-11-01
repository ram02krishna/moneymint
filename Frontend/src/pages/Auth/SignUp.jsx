// Import necessary packages and components
import React, { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiUser,
  FiMail,
  FiLock,
  FiEye,
  FiEyeOff,
  FiKey,
  FiClock,
  FiRefreshCw,
  FiArrowLeft,
  FiCheckCircle,
} from "react-icons/fi";
import { LuSun, LuMoon } from "react-icons/lu";
import axiosInstance from "../../utils/axiosInstance";
import { useTheme } from "../../hooks/useTheme";
import { API_PATHS } from "../../utils/apiPath";
import { UserContext } from "../../context/UserContextDefinition";
import uploadImage from "../../utils/uploadImage";
import AuthBranding from "../../components/layouts/AuthBranding";
import ProfilePhotoSelector from "../../components/Inputs/ProfilePhotoSelector";
import GoogleAuthButton from "../../components/Auth/GoogleAuthButton";
import { GOOGLE_CLIENT_ID } from "../../utils/googleConfig";

// SignUp component with 45-second Email OTP Verification
let SignUp = () => {
  const [step, setStep] = useState("form"); // "form" | "otp"
  const [profilePic, setProfilePic] = useState(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP state
  const [otp, setOtp] = useState("");
  const [timeLeft, setTimeLeft] = useState(45);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { updateUser } = useContext(UserContext);

  // 45-second countdown timer for OTP expiration
  useEffect(() => {
    let timer;
    if (step === "otp" && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (step === "otp" && timeLeft === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  // Handle Step 1: Initial Signup Form Submit -> generates & sends 45s OTP
  const handleInitiateSignUp = async (e) => {
    e.preventDefault();

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (fullName.trim().length < 2) {
      setError("Full name must be at least 2 characters.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      // Upload profile picture if provided
      let imgUrl = uploadedImageUrl;
      if (profilePic && !imgUrl) {
        try {
          const imgUploadRes = await uploadImage(profilePic);
          if (imgUploadRes && imgUploadRes.imageUrl) {
            imgUrl = imgUploadRes.imageUrl;
            setUploadedImageUrl(imgUrl);
          }
        } catch (uploadErr) {
          console.warn("Profile photo upload warning:", uploadErr);
        }
      }

      // Request 45-second OTP from backend
      const response = await axiosInstance.post(API_PATHS.AUTH.SEND_SIGNUP_OTP, {
        email: email.trim(),
        fullName: fullName.trim(),
      });

      // Switch to OTP verification screen and start 45-second timer
      setStep("otp");
      setTimeLeft(45);
      setCanResend(false);
      setOtp("");
      setSuccessMessage(
        response.data?.message || "A 6-digit verification code has been sent to your email."
      );
    } catch (err) {
      console.error("Sign up error response:", err.response);
      setError(
        err.response?.data?.message || "Failed to send verification code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2: Resend OTP (only enabled after 45 seconds)
  const handleResendOtp = async () => {
    if (!canResend || resending || loading) return;

    setResending(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await axiosInstance.post(
        API_PATHS.AUTH.RESEND_SIGNUP_OTP,
        {
          email: email.trim(),
          fullName: fullName.trim(),
        },
      );

      // Invalidate previous OTP, restart 45-second timer
      setTimeLeft(45);
      setCanResend(false);
      setOtp("");
      setSuccessMessage(
        response.data?.message || "A new 6-digit verification code has been sent to your email."
      );
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to resend verification code. Please try again."
      );
    } finally {
      setResending(false);
    }
  };

  // Handle Step 2: Verify OTP & Create Account
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();

    if (otp.trim().length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const requestBody = {
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        otp: otp.trim(),
        profileImageUrl: uploadedImageUrl,
      };

      const response = await axiosInstance.post(
        API_PATHS.AUTH.VERIFY_SIGNUP_OTP,
        requestBody,
      );

      const { token, data, message } = response.data;
      setSuccessMessage(message || "Email verified successfully! Account created.");

      if (token) {
        localStorage.setItem("token", token);
        updateUser(data.user);
        setTimeout(() => {
          navigate("/dashboard");
        }, 1000);
      }
    } catch (err) {
      console.error("Verify OTP error:", err.response);
      setError(
        err.response?.data?.message || "Invalid or expired verification code."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-900 transition-colors duration-300">
      {/* Branding component for the authentication pages */}
      <AuthBranding />
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white dark:bg-gray-900 transition-colors duration-300">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-6"
        >
          <div className="flex justify-end mb-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors duration-200"
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? (
                <LuSun className="text-xl text-yellow-500" />
              ) : (
                <LuMoon className="text-xl text-purple-600" />
              )}
            </button>
          </div>

          {step === "form" ? (
            <>
              <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Create an Account
                </h2>
                <p className="mt-2 text-gray-500 dark:text-gray-400">
                  Join us and start tracking your expenses.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleInitiateSignUp}>
                {/* Profile picture upload */}
                <ProfilePhotoSelector image={profilePic} setImage={setProfilePic} />

                {/* Full name field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <FiUser className="absolute top-3.5 left-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Enter Full Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900 focus:border-purple-500 dark:focus:border-purple-500 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>

                {/* Email address field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <FiMail className="absolute top-3.5 left-3 text-gray-400" />
                    <input
                      type="email"
                      placeholder="user@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900 focus:border-purple-500 dark:focus:border-purple-500 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </div>
                </div>

                {/* Password field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <FiLock className="absolute top-3.5 left-3 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900 focus:border-purple-500 dark:focus:border-purple-500 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-3.5 right-3 text-gray-400 hover:text-purple-500 cursor-pointer"
                    >
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>

                {/* Confirm password field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <FiLock className="absolute top-3.5 left-3 text-gray-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-10 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900 focus:border-purple-500 dark:focus:border-purple-500 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute top-3.5 right-3 text-gray-400 hover:text-purple-500 cursor-pointer"
                    >
                      {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-red-500 dark:text-red-400 text-sm text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                    {error}
                  </p>
                )}

                {/* Sign up submit button */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className={`w-full p-3.5 font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors duration-200 shadow-lg shadow-purple-200 dark:shadow-none ${loading ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  {loading ? "Sending Verification Code..." : "Sign Up"}
                </motion.button>
              </form>

              {GOOGLE_CLIENT_ID && (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    <span className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      or
                    </span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  </div>
                  <GoogleAuthButton text="signup_with" onError={setError} />
                </>
              )}

              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-semibold text-purple-600 dark:text-purple-400"
                >
                  Sign In
                </Link>
              </p>
            </>
          ) : (
            /* Step 2: 45-Second Email OTP Verification Screen */
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <button
                type="button"
                onClick={() => {
                  setStep("form");
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 transition-colors cursor-pointer"
              >
                <FiArrowLeft /> Back to registration details
              </button>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 mb-3">
                  <FiMail className="text-2xl" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Verify Your Email
                </h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  We&apos;ve sent a 6-digit verification code to{" "}
                  <strong className="text-gray-900 dark:text-gray-100 block mt-1 break-all">
                    {email}
                  </strong>
                </p>
              </div>

              {/* Live 45-second Countdown Timer Banner */}
              <div
                className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border transition-colors ${
                  timeLeft > 0
                    ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300"
                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
                }`}
              >
                <FiClock className={`text-lg ${timeLeft > 0 ? "animate-pulse" : ""}`} />
                <span className="text-sm font-medium">
                  {timeLeft > 0 ? (
                    <>
                      Code expires in{" "}
                      <span className="font-mono text-base font-bold underline decoration-purple-400">
                        00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
                      </span>
                    </>
                  ) : (
                    <strong className="font-semibold">
                      OTP expired! Please click Resend OTP below.
                    </strong>
                  )}
                </span>
              </div>

              <form className="space-y-5" onSubmit={handleVerifyAndRegister}>
                {/* 6-Digit OTP Input Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
                    Enter 6-Digit Verification Code
                  </label>
                  <div className="relative">
                    <FiKey className="absolute top-4 left-4 text-gray-400 text-lg" />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      autoFocus
                      placeholder="••••••"
                      value={otp}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                        setOtp(val);
                        if (error) setError(null);
                      }}
                      className="w-full pl-12 pr-4 py-3.5 text-center font-mono text-2xl font-bold tracking-[0.4em] bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900 focus:border-purple-500 dark:focus:border-purple-500 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600"
                    />
                  </div>
                </div>

                {/* Resend OTP Button row */}
                <div className="flex items-center justify-between text-sm px-1">
                  <span className="text-gray-500 dark:text-gray-400">
                    Didn&apos;t receive the OTP?
                  </span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={!canResend || resending || loading}
                    className={`font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                      canResend && !resending && !loading
                        ? "text-purple-600 dark:text-purple-400 hover:text-purple-700 underline"
                        : "text-gray-400 dark:text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    <FiRefreshCw className={resending ? "animate-spin" : ""} />
                    {resending
                      ? "Sending..."
                      : canResend
                      ? "Resend OTP"
                      : `Resend in ${timeLeft}s`}
                  </button>
                </div>

                {error && (
                  <p className="text-red-500 dark:text-red-400 text-sm text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                    {error}
                  </p>
                )}

                {successMessage && (
                  <p className="text-green-600 dark:text-green-400 text-sm text-center bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800 inline-flex items-center justify-center gap-2 w-full">
                    <FiCheckCircle className="shrink-0" /> {successMessage}
                  </p>
                )}

                {/* Verify & Create Account Button */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={otp.length !== 6 || loading}
                  className={`w-full p-3.5 font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors duration-200 shadow-lg shadow-purple-200 dark:shadow-none ${
                    otp.length !== 6 || loading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  {loading ? "Verifying OTP..." : "Verify & Create Account"}
                </motion.button>
              </form>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default SignUp;
