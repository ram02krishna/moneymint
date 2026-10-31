# MoneyMint Backend

This is the backend API for my MoneyMint app, built with Node.js and Express. It connects to a MongoDB database to store users, expenses, and incomes.

## What it does

- Handles user signup, login, and profile updates using JWT for security.
- Supports Google sign in / sign up (Google ID token verified on the server).
- Handles password resets with email links using Resend.
- Manages personal expenses, income, budgets, goals, and the shared-expense ledger.
- Supports group membership, four bill-splitting modes, cent-accurate net balances, suggested repayments, full/partial settlements, and transaction history. Shared expenses are stored separately from personal expenses.
- Sends data to the frontend so it can display charts and dashboards.
- Uploads profile pictures to Cloudinary.

## Tech Stack Used

- **Node.js & Express.js:** For the server and API routes.
- **MongoDB & Mongoose:** For the database and models.
- **JWT (jsonwebtoken):** To keep users logged in securely.
- **Bcryptjs:** To hash passwords so they aren't stored as plain text.
- **Multer & Cloudinary:** For handling image uploads.
- **Resend:** To send password reset emails.
- **Dotenv:** To manage environment variables.

## Getting Started

1. Go into the Backend folder and install packages:
   ```bash
   npm install
   ```

2. Create a `.env` file and add your config:
   ```env
   MONGO_URI=your_mongo_database_url
   JWT_SECRET=any_secret_string_you_want
   PORT=5000
   CLIENT_URL=http://localhost:5173
   CLOUDINARY_CLOUD_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_cloudinary_key
   CLOUDINARY_API_SECRET=your_cloudinary_secret
   RESEND_API_KEY=your_resend_api_key
   FRONTEND_URL=http://localhost:5173
   GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   ```

3. Run the calculation tests with `npm test`.

4. Run the server:
   ```bash
   npm run dev
   ```
   It uses nodemon, so it will automatically restart if you make any changes to the code.

## Google OAuth setup

1. Open [Google Cloud Console](https://console.cloud.google.com/) > **APIs & Services** > **OAuth consent screen** and configure it (app name, support email). Add yourself as a test user while the app is in "Testing".
2. Go to **Credentials** > **Create credentials** > **OAuth client ID** > **Web application**.
3. Under **Authorized JavaScript origins**, add these origins (no paths):
   - `http://localhost:5173` (local development)
   - `https://moneymint-app.vercel.app` (deployed frontend)

   Leave **Authorized redirect URIs** empty. Google sign-in uses a popup and returns an ID token.
4. Copy the OAuth **Client ID** (not the client secret) to both Vercel projects:
   - **Frontend project:** `VITE_GOOGLE_CLIENT_ID` = your OAuth Client ID
   - **Backend project:** `GOOGLE_CLIENT_ID` = the same OAuth Client ID
5. Set the other deployment URLs in Vercel:
   - **Frontend project:** `VITE_BASE_URL=https://money-mint-backend.vercel.app`
   - **Backend project:** `CLIENT_URL=https://moneymint-app.vercel.app`
   - **Backend project:** `FRONTEND_URL=https://moneymint-app.vercel.app`

   Add these variables for the appropriate Vercel environments, then redeploy both projects. Keep local `.env` values pointed at localhost.

Endpoint: `POST /api/v1/auth/google` with `{ "credential": "<Google ID token>" }`. It creates the account if the email is new, signs in if it already exists, and links Google to an existing email/password account with the same (Google-verified) email.
