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

## 3. Build an Installable Standalone APK
The app is configured to connect to the deployed production backend (`https://money-mint-backend.vercel.app`), so it works on any Wi-Fi or mobile data network without Expo Go or a computer running.

```bash
# 1. Log in to your Expo account (free at https://expo.dev)
npx eas-cli login

# 2. Configure project on EAS (only needed once, automatically links projectId)
npx eas-cli init

# 3. Build the standalone installable .apk
npx eas-cli build --platform android --profile preview

# Or build production APK directly:
npx eas-cli build --platform android --profile production-apk

# Or build Google Play Store .aab bundle:
npx eas-cli build --platform android --profile production
```

### Installing the APK on your Android device:
1. When the EAS build finishes, it prints a direct download link and a QR code in the terminal.
2. Open the link on your phone (or scan the QR code) to download the `.apk`.
3. Open the downloaded `.apk` file and tap **Install** (enable "Install unknown apps" for your browser if prompted).
4. You can also install it via USB using ADB:
   ```bash
   adb install MoneyMint.apk
   ```

## Notes
- JWTs from the backend last 1 hour; when one expires the app returns to the login screen automatically.
- Profile photo upload is not in the mobile app yet (web only).
