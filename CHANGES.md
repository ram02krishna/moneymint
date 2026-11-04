# Review changes

## Backend – security & correctness
- **Split module authorization**: group add/remove member, expense update/delete, settlement create/delete, and `?groupId=` listings now require group membership or involvement (previously any logged-in user could touch any ID). `GET /split/expenses/:id` (unused, unprotected) removed.
- **Password reset**: secure random code (`crypto.randomInt`), single use, locked after 5 wrong guesses, forgot/reset added to the strict rate limiter, `forgot-password` no longer reveals whether an email exists.
- **Mass assignment**: `updateBudget` only accepts whitelisted fields (a client could overwrite `user`). Amounts coerced to numbers (string concatenation bug in the budget-vs-income rule).
- **HTML-entity corruption**: validators no longer `.escape()` text (`McDonald's` was saved as `McDonald&#x27;s`). `scripts/decode-legacy-entities.js` repairs existing rows.
- **Search crashes**: user search text is regex-escaped (typing `(` caused a 500 / ReDoS).
- **Google sign-in** now normalises Gmail addresses like email sign-up does (dots / `+tags` created duplicate accounts and broke "forgot password").
- Itemized split: items assigned to non-registered people were silently dropped and re-assigned to someone else; now resolved by key/user/name, and inconsistent input is rejected.
- Updating a split expense amount without payers could unbalance the ledger; now validated. Deleted groups no longer leak into balances. Monthly analytics trend is chronological.
- Crashes fixed when adding a member/friend by email only.
- Wrong current password returns 400 (it was 401 and logged the user out).
- Upload endpoint: 5 MB limit, proper 400 errors, stricter rate limit. JSON 404 for unknown routes. Single CORS config (`config/cors.js`); `api/index.js` simplified.
- Removed dead code: `/register` route + validator, `sanitizeMongoParams` (a no-op under Express 5), `expense-summary-by-category`, `Expense.notes`, redundant indexes, empty dashboard loop. Shared helpers: date ranges (UTC), pagination caps, Excel export, email templates, split access/balance logic (3 copy-pasted blocks).
- 17 unit tests (`npm test`).

## Frontend
- **Broken pagination** on Income/Expense fixed (Next always snapped back to page 1). Both pages are now one `RecordsPage`; PDF exports cover the whole month; Excel export on Transactions respects the month.
- Session fixes: going offline no longer logs you out; logout no longer wipes the theme; 401 handling; signed-in users skip login; 404 page; no dark-mode flash.
- **Consistency**: one confirm dialog + toasts replace every `alert()`/`confirm()`; shared auth layout/fields, `PageHeader`, `Pagination`, `ThemeToggle`, stat-card grid, date picker, buttons (`btn-primary/secondary/danger`), charts theme, `BreakdownCard`. ErrorBoundary now matches the design/dark mode.
- Bugs: PDF showed `¹` for `₹` and summed income as "Total Expense"; sign-up reused a stale uploaded photo; settle-up stored a Friend id as a user id; chart legend truncation; stale effects.
- Dead code removed: `TransactionInfoCard`, Doughnut/Line chart, duplicate overview cards/forms, unused CSS/animations, unused API paths, `recharts`, `moment`, `lucide-react`, `lightningcss`, `prettier`, `.npmrc` workaround. ESLint no longer hides unused capitalised imports.

## Mobile
- Fixed a crash on the sign-up OTP screen (`useEffect` was never imported); simplified countdown; removed unused imports.

## Left as-is (your call)
- 45-second sign-up code lifetime is very short for email delivery.
- "Total budgets ≤ total income (all time)" rule blocks budgets before any income exists.
- `/auth/upload-image` stays public (sign-up uploads a photo before the account exists).
- `*.vercel.app` origins are still allowed by CORS; set `ALLOW_VERCEL_PREVIEWS=false` to tighten.
- Friend search lets any user find others by name/email (needed for adding friends).
- 11 `react-hooks/set-state-in-effect` lint warnings remain (modals resetting form state on open).
