# MoneyMint Mobile (Android)

React Native (Expo) app for MoneyMint. It talks to the **same Express/MongoDB backend** as the web app,
using the same `/api/v1/...` endpoints and the same JWT login, so data is shared between web and phone.

## Features
Full parity with the web app:
- **Auth:** login, sign up, forgot/reset password (OTP), secure token storage (Android Keystore)
- **Dashboard:** greeting + quick add, insights, financial overview donut, last-30-days expense chart, category spending, budget & goal snapshots, recent transactions
- **Monthly Analytics tab:** income/expense totals, expense-by-category and income-by-source donuts, 12-month trends (income vs expense line chart, savings and transaction bars), averages, highest-spend/income month and month-over-month change
- **One-tap month picker:** tap the month name on any screen, then tap a month (or tap the year to jump to any year). Arrows still step one month
- **Transactions:** All / Income / Expense filters, search, infinite scroll, add / edit / delete, totals, **Excel and PDF export**
- **Budgets** and **Savings goals** (More tab → Savings goals)
- **Split expenses** (More tab): groups, add existing MoneyMint members by email, equal/exact/percentage/share splits, payer/participant selection, per-member balances, and full or partial settlement history
- **More tab:** Income, Expenses, Goals shortcuts, edit profile, **profile photo upload**, change password, dark mode, log out

## 1. Backend Connectivity & Environment
By default, the app connects to the live production backend:
`https://money-mint-backend.vercel.app`

This allows the app to work seamlessly as a standalone APK on any Wi-Fi or mobile data network.

For local development against your PC:
```bash
cd Mobile
cp .env.example .env      # edit EXPO_PUBLIC_API_URL
```
| Where you run it                | `EXPO_PUBLIC_API_URL`                          |
|---------------------------------|------------------------------------------------|
| Standalone APK / Mobile Data    | `https://money-mint-backend.vercel.app` (default) |
| Android emulator, local backend | `http://10.0.2.2:5000`                         |
| Real phone, local backend       | `http://<your-PC-LAN-IP>:5000` (same Wi-Fi, port 5000 allowed in firewall) |

No backend code changes are needed (it already accepts requests that have no browser `Origin`).

## 2. Run Locally in Development
```bash
cd Mobile
npm install
npx expo start
```
Scan the QR code with **Expo Go** on your phone, or press `a` to open an Android emulator.

## 3. Build & Rebuild an Installable Standalone APK
The app is configured to connect to the deployed production backend (`https://money-mint-backend.vercel.app`), so it works on any Wi-Fi or mobile data network without Expo Go or a computer running.

### A. First-Time Setup (One Time Only)
If you haven't linked your project or logged in yet:
```bash
# 1. Log in to your Expo account (free at https://expo.dev)
npx eas-cli login

# 2. Link your project on EAS (only needed the very first time)
npx eas-cli init
```
*(Note: Your project is already linked with project ID `609eb442-258e-4859-9d8c-c7ded7872d05`. You do not need to run `eas init` again).*

---

### B. Build / Rebuild the APK (Normal Workflow)
Whenever you make changes to the app code and want a new APK:

```bash
cd Mobile

# Standard rebuild command
npx eas-cli build --platform android --profile preview
```

> **Tip (Version Increment):** Before rebuilding for an update, bump `versionCode` (e.g., `1` → `2`) and `version` (e.g., `"1.1.0"` → `"1.1.1"`) in `app.json` so Android recognizes the new APK as an update to your existing installed app.

---

### C. Clean Rebuild (Clear Cache)
If you updated dependencies or want to ensure EAS builds from scratch without using cached artifacts:
```bash
npx eas-cli build --platform android --profile preview --clear-cache
```

---

### D. Check Existing Builds & Download APKs (Without Rebuilding)
If a build already completed and you just want the download link or QR code again without rebuilding:
```bash
# List all previous builds with their status, download URLs, and IDs
npx eas-cli build:list

# View details of a specific build
npx eas-cli build:view [BUILD_ID]
```
You can also visit your web dashboard directly to download any build:
👉 **https://expo.dev/accounts/ram02krishna/projects/moneymint/builds**

---

### E. Re-linking EAS Project (Troubleshooting)
If EAS ever reports that the project ID is invalid or you want to link it to a different account:
1. Open `app.json` and remove the `extra.eas.projectId` and `owner` lines.
2. Run:
   ```bash
   npx eas-cli init
   ```
3. Choose your account and create/link the project.

---

### F. Other Build Profiles
```bash
# Standalone APK using the production-apk profile:
npx eas-cli build --platform android --profile production-apk

# Google Play Store .aab bundle:
npx eas-cli build --platform android --profile production
```

---

### G. Installing the APK on your Android device:
1. When the EAS build finishes, it prints a direct download link and a QR code in the terminal.
2. Open the link on your phone (or scan the QR code) to download the `.apk`.
3. Open the downloaded `.apk` file and tap **Install** (enable "Install unknown apps" for your browser if prompted).
4. If an older version is already installed on your device:
   - If Android allows updating, it will install on top preserving data.
   - If there is a signature or version conflict, uninstall the old app first and install the new APK.
5. You can also install it via USB using ADB:
   ```bash
   adb install MoneyMint.apk
   # Or install update replacing existing app:
   adb install -r MoneyMint.apk
   ```

## Notes
- JWTs from the backend last 1 hour; when one expires the app returns to the login screen automatically.

## Google Sign-In on Android (required one-time setup)
`DEVELOPER_ERROR` means Google does not recognise the APK. Fix it in Google Cloud Console:
1. Get the SHA-1 of the key that signs your APK: `npx eas-cli credentials -p android` -> pick the build profile -> *Keystore* -> copy **SHA1 Fingerprint**.
2. APIs & Services -> Credentials -> **Create credentials -> OAuth client ID -> Android**:
   package name `com.moneymint.app`, paste the SHA-1. (Add a second Android client for every other signing key: Play App Signing key, local debug key.)
3. Keep the **Web application** client ID as `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and in the backend `GOOGLE_CLIENT_ID`.
4. OAuth consent screen: set to *In production*, or add your Gmail as a test user.
5. Rebuild the APK (changes in Cloud Console can take a few minutes to apply).
