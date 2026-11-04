import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiMail } from "react-icons/fi";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import { validateEmail, getErrorMessage } from "../../utils/helper";
import AuthLayout from "../../components/Auth/AuthLayout";
import { IconField, FormAlert } from "../../components/Inputs/IconField";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // move on to the reset page once the code has been sent (cancelled if the person leaves first)
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => navigate("/reset-password", { state: { email } }), 1500);
    return () => clearTimeout(timer);
  }, [message, email, navigate]);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!validateEmail(email)) return setError("Please enter a valid email address.");

    setError(null);
    setLoading(true);

    try {
      const { data } = await axiosInstance.post(API_PATHS.AUTH.FORGOT_PASSWORD, { email });
      setMessage(data.message || "If an account exists for that email, a reset code has been sent.");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to send the reset code. Try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot Password?"
      subtitle="Enter your email and we'll send you a 6-digit reset code."
      footer={
        <Link to="/login" className="font-semibold text-purple-600 dark:text-purple-400">
          Back to Login
        </Link>
      }
    >
      <form className="space-y-5" onSubmit={handleForgotPassword} noValidate>
        <IconField
          label="Email Address"
          icon={FiMail}
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        <FormAlert>{error}</FormAlert>
        <FormAlert tone="success">{message}</FormAlert>

        <button type="submit" className="btn-primary" disabled={loading || !!message}>
          {loading ? "Sending..." : "Send Reset Code"}
        </button>
      </form>
    </AuthLayout>
  );
};

export default ForgotPassword;
