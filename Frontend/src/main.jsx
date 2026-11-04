import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.jsx";
import { GOOGLE_CLIENT_ID } from "./utils/googleConfig";

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

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {GOOGLE_CLIENT_ID ? (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <App />
      </GoogleOAuthProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
);