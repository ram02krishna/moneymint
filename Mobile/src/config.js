// Base URL of the MoneyMint backend (the SAME Express API the web app uses).
//
//  - Android emulator  -> http://10.0.2.2:5000   (emulator's alias for your PC's localhost)
//  - Physical phone    -> http://<your-PC-LAN-IP>:5000   (phone and PC on the same Wi-Fi)
//  - Production        -> your deployed HTTPS backend URL (e.g. the Vercel one)
//
// Set it in Mobile/.env:  EXPO_PUBLIC_API_URL=https://your-backend.example.com
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:5000"
).replace(/\/+$/, "");
