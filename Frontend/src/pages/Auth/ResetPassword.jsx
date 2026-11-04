import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FiMail, FiKey } from "react-icons/fi";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import { getErrorMessage } from "../../utils/helper";
import AuthLayout from "../../components/Auth/AuthLayout";
import { IconField, PasswordField, FormAlert } from "../../components/Inputs/IconField";

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState(location.state?.email || "");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // after success, go to login (and cancel that if the person leaves first)
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => navigate("/login"), 2500);
    return () => clearTimeout(timer);
  }, [message, navigate]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) return setError("Enter the 6-digit code from your email.");
    if (password.length < 8) return setError("Password must be at least 8 characters long.");
    if (password !== confirmPassword) return setError("Passwords do not match.");

    setError(null);
    setLoading(true);

    try {
      const { data } = await axiosInstance.put(API_PATHS.AUTH.RESET_PASSWORD, { email, otp, password });
      setMessage(data.message || "Password has been reset successfully.");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to reset password. The code may be invalid or expired."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter the code we emailed you and choose a new password."
      footer={
        <Link to="/login" className="font-semibold text-purple-600 dark:text-purple-400">
          Back to Login
        </Link>
      }
    >
      <form className="space-y-5" onSubmit={handleResetPassword} noValidate>
        <IconField
          label="Email Address"
          icon={FiMail}
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <IconField
          label="Reset Code"
          icon={FiKey}
          type="text"
          inputMode="numeric"
          placeholder="Enter 6-digit code"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          autoComplete="one-time-code"
        />
        <PasswordField
          label="New Password"
          placeholder="Enter new password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        <PasswordField
          label="Confirm New Password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />

        <FormAlert>{error}</FormAlert>
        <FormAlert tone="success">{message}</FormAlert>

        <button type="submit" className="btn-primary" disabled={loading || !!message}>
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    </AuthLayout>
  );
};

export default ResetPassword;
