import { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiUser, FiMail, FiKey, FiClock, FiRefreshCw, FiArrowLeft, FiCheckCircle } from "react-icons/fi";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import { UserContext } from "../../context/UserContextDefinition";
import uploadImage from "../../utils/uploadImage";
import { getErrorMessage } from "../../utils/helper";
import { GOOGLE_CLIENT_ID } from "../../utils/googleConfig";
import AuthLayout from "../../components/Auth/AuthLayout";
import { IconField, PasswordField, FormAlert } from "../../components/Inputs/IconField";
import ProfilePhotoSelector from "../../components/Inputs/ProfilePhotoSelector";
import GoogleAuthButton from "../../components/Auth/GoogleAuthButton";

// Must match OTP_EXPIRY_SECONDS on the server
const OTP_SECONDS = 45;

// Two steps: details form -> email code. Creating the account happens when the code is verified.
const SignUp = () => {
  const navigate = useNavigate();
  const { login } = useContext(UserContext);

  const [step, setStep] = useState("form"); // "form" | "otp"
  const [profilePic, setProfilePic] = useState(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [otp, setOtp] = useState("");
  const [timeLeft, setTimeLeft] = useState(OTP_SECONDS);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const canResend = timeLeft === 0;

  useEffect(() => {
    if (step !== "otp" || timeLeft === 0) return undefined;
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [step, timeLeft]);

  // a different photo must be uploaded again, not replaced by the previous upload
  const handlePhotoChange = (file) => {
    setProfilePic(file);
    setUploadedImageUrl(null);
  };

  const startCountdown = () => {
    setTimeLeft(OTP_SECONDS);
    setOtp("");
  };

  const handleInitiateSignUp = async (e) => {
    e.preventDefault();

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) return setError("All fields are required.");
    if (fullName.trim().length < 2) return setError("Full name must be at least 2 characters.");
    if (password.length < 8) return setError("Password must be at least 8 characters long.");
    if (password !== confirmPassword) return setError("Passwords do not match.");

    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (profilePic && !uploadedImageUrl) {
        try {
          const uploaded = await uploadImage(profilePic);
          if (uploaded?.imageUrl) setUploadedImageUrl(uploaded.imageUrl);
        } catch (uploadErr) {
          // the photo is optional, so a failed upload must not block sign-up
          console.warn("Profile photo upload failed:", uploadErr);
        }
      }

      const { data } = await axiosInstance.post(API_PATHS.AUTH.SEND_SIGNUP_OTP, {
        email: email.trim(),
        fullName: fullName.trim(),
      });

      setStep("otp");
      startCountdown();
      setSuccessMessage(data?.message || "A 6-digit verification code has been sent to your email.");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to send verification code. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend || resending || loading) return;

    setResending(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { data } = await axiosInstance.post(API_PATHS.AUTH.RESEND_SIGNUP_OTP, {
        email: email.trim(),
        fullName: fullName.trim(),
      });
      startCountdown();
      setSuccessMessage(data?.message || "A new 6-digit verification code has been sent to your email.");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to resend verification code. Please try again."));
    } finally {
      setResending(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return setError("Please enter the complete 6-digit verification code.");

    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const { data } = await axiosInstance.post(API_PATHS.AUTH.VERIFY_SIGNUP_OTP, {
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        otp,
        profileImageUrl: uploadedImageUrl,
      });

      login(data.token, data.data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err, "Invalid or expired verification code."));
      setLoading(false);
    }
  };

  const orDivider = (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      <span className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500">or</span>
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
    </div>
  );

  if (step === "form") {
    return (
      <AuthLayout
        title="Create an Account"
        subtitle="Join us and start tracking your expenses."
        footer={
          <>
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-purple-600 dark:text-purple-400">
              Sign In
            </Link>
          </>
        }
      >
        <form className="space-y-5" onSubmit={handleInitiateSignUp} noValidate>
          <ProfilePhotoSelector image={profilePic} setImage={handlePhotoChange} />

          <IconField
            label="Full Name"
            icon={FiUser}
            type="text"
            placeholder="Enter your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
          />
          <IconField
            label="Email Address"
            icon={FiMail}
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <PasswordField
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm Password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />

          <FormAlert>{error}</FormAlert>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Sending verification code..." : "Sign Up"}
          </button>
        </form>

        {GOOGLE_CLIENT_ID && (
          <>
            {orDivider}
            <GoogleAuthButton text="signup_with" onError={setError} />
          </>
        )}
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Verify Your Email">
      <button
        type="button"
        onClick={() => {
          setStep("form");
          setError(null);
          setSuccessMessage(null);
        }}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 cursor-pointer"
      >
        <FiArrowLeft /> Back to registration details
      </button>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
        We&apos;ve sent a 6-digit verification code to
        <strong className="text-gray-900 dark:text-gray-100 block mt-1 break-all">{email}</strong>
      </p>

      <div
        className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border ${
          timeLeft > 0
            ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300"
            : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
        }`}
      >
        <FiClock className={`text-lg ${timeLeft > 0 ? "animate-pulse" : ""}`} />
        <span className="text-sm font-medium">
          {timeLeft > 0 ? (
            <>
              Code expires in <span className="font-mono text-base font-bold">00:{String(timeLeft).padStart(2, "0")}</span>
            </>
          ) : (
            "Code expired. Please resend a new one below."
          )}
        </span>
      </div>

      <form className="space-y-5" onSubmit={handleVerifyAndRegister} noValidate>
        <IconField
          label="Verification Code"
          icon={FiKey}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          autoFocus
          placeholder="••••••"
          value={otp}
          onChange={(e) => {
            setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
            if (error) setError(null);
          }}
          className="text-center font-mono text-2xl font-bold tracking-[0.4em]"
        />

        <div className="flex items-center justify-between text-sm px-1">
          <span className="text-gray-500 dark:text-gray-400">Didn&apos;t receive the code?</span>
          <button
            type="button"
            onClick={handleResendOtp}
            disabled={!canResend || resending || loading}
            className="font-semibold inline-flex items-center gap-1.5 text-purple-600 dark:text-purple-400 hover:text-purple-700 disabled:text-gray-400 dark:disabled:text-gray-500 disabled:cursor-not-allowed cursor-pointer"
          >
            <FiRefreshCw className={resending ? "animate-spin" : ""} />
            {resending ? "Sending..." : canResend ? "Resend code" : `Resend in ${timeLeft}s`}
          </button>
        </div>

        <FormAlert>{error}</FormAlert>
        {successMessage && (
          <p role="status" className="flex items-center justify-center gap-2 text-sm p-2.5 rounded-lg text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20">
            <FiCheckCircle className="shrink-0" /> {successMessage}
          </p>
        )}

        <button type="submit" className="btn-primary" disabled={otp.length !== 6 || loading}>
          {loading ? "Verifying..." : "Verify & Create Account"}
        </button>
      </form>
    </AuthLayout>
  );
};

export default SignUp;
