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

## 1. Point the app at your backend
```bash
cd Mobile
cp .env.example .env      # then edit EXPO_PUBLIC_API_URL
```
| Where you run it                | `EXPO_PUBLIC_API_URL`                          |
|---------------------------------|------------------------------------------------|
| Android emulator, local backend | `http://10.0.2.2:5000`                         |
| Real phone, local backend       | `http://<your-PC-LAN-IP>:5000` (same Wi-Fi, allow port 5000 in the firewall) |
| Deployed backend (recommended)  | `https://your-backend.vercel.app`              |

No backend code changes are needed (it already accepts requests that have no browser `Origin`).

## 2. Run it
```bash
npm install
npx expo start
```
Scan the QR code with **Expo Go** on your phone, or press `a` to open an Android emulator.

## 3. Build an installable APK
```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview     # produces an .apk you can install
eas build -p android --profile production  # .aab for Google Play
```
Release builds block plain `http://` traffic on Android, so use an **https** backend URL for APK/AAB builds.

## Notes
- JWTs from the backend last 1 hour; when one expires the app returns to the login screen automatically.
- Profile photo upload is not in the mobile app yet (web only).
