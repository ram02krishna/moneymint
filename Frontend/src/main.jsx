import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.jsx";

// Prevent mouse wheel scrolling from changing input[type="number"] values (bad UX)
if (typeof window !== "undefined") {
  window.addEventListener(
    "wheel",
    () => {
      if (document.activeElement && document.activeElement.type === "number") {
        document.activeElement.blur();
      }
    },
    { passive: true }
  );
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>
        <App />
      </GoogleOAuthProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
);