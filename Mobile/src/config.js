// Base URL of the MoneyMint backend (the SAME Express API the web app uses).
//
//  - Production / Standalone -> https://money-mint-backend.vercel.app (default for release builds)
//  - Local development       -> Override in Mobile/.env (e.g. http://10.0.2.2:5000 or LAN IP)
//
export const DEFAULT_API_URL = "https://money-mint-backend.vercel.app";

export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL
).replace(/\/+$/, "");
