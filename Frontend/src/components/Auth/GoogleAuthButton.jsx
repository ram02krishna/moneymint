import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { UserContext } from "../../context/UserContextDefinition";
import { useTheme } from "../../hooks/useTheme";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import { GOOGLE_CLIENT_ID } from "../../utils/googleConfig";

// "Continue with Google" button. The same backend endpoint handles both
// sign in and sign up, so this is used on the Login and SignUp pages.
// `text` is one of: "signin_with" | "signup_with" | "continue_with"
const GoogleAuthButton = ({ text = "continue_with", onError }) => {
  const { updateUser } = useContext(UserContext);
  const { theme } = useTheme();
  const navigate = useNavigate();

  // not configured -> hide the button instead of crashing the page
  if (!GOOGLE_CLIENT_ID) return null;

  const handleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      onError?.("Google sign-in failed. Please try again.");
      return;
    }
    onError?.(null);

    try {
      const response = await axiosInstance.post(API_PATHS.AUTH.GOOGLE, {
        credential: credentialResponse.credential,
      });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.data.user));
      updateUser(response.data.data.user);
      navigate("/dashboard");
    } catch (err) {
      onError?.(
        err.response?.data?.message ||
          "Google sign-in failed. Please try again.",
      );
    }
  };

  return (
    <div className="w-full flex justify-center">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => onError?.("Google sign-in failed. Check Authorized Origins in Google Cloud Console.")}
        text={text}
        shape="pill"
        size="large"
        width="340"
        theme={theme === "dark" ? "filled_black" : "outline"}
      />
    </div>
  );
};

export default GoogleAuthButton;
