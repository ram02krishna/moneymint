import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiMail } from "react-icons/fi";
import { UserContext } from "../../context/UserContextDefinition";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import { validateEmail, getErrorMessage } from "../../utils/helper";
import { GOOGLE_CLIENT_ID } from "../../utils/googleConfig";
import AuthLayout from "../../components/Auth/AuthLayout";
import { IconField, PasswordField, FormAlert } from "../../components/Inputs/IconField";
import GoogleAuthButton from "../../components/Auth/GoogleAuthButton";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { login } = useContext(UserContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!validateEmail(email)) return setError("Please enter a valid email address.");
    if (!password) return setError("Please enter your password.");

    setError(null);
    setLoading(true);

    try {
      const { data } = await axiosInstance.post(API_PATHS.AUTH.LOGIN, { email, password });
      login(data.token, data.data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err, "Login failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Please enter your details to sign in."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link to="/signup" className="font-semibold text-purple-600 dark:text-purple-400">
            Sign up
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleLogin} noValidate>
        <IconField
          label="Email Address"
          icon={FiMail}
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
        />
        <div>
          <PasswordField
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <div className="flex justify-end mt-2">
            <Link to="/forgot-password" className="text-sm font-medium text-purple-600 hover:text-purple-500 dark:text-purple-400">
              Forgot Password?
            </Link>
          </div>
        </div>

        <FormAlert>{error}</FormAlert>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      {GOOGLE_CLIENT_ID && (
        <>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500">or</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>
          <GoogleAuthButton text="signin_with" onError={setError} />
        </>
      )}
    </AuthLayout>
  );
};

export default Login;
