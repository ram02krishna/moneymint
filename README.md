## Expense Tracker

Hi! This is a full-stack expense tracker app I built using the MERN stack (MongoDB, Express, React, Node.js). I made this project to practice building a complete web application from scratch — including user auth, a REST API, database design, and a proper frontend with charts and data export features.

It's basically an app where you can log your income and expenses, set budgets for different categories, see charts of your spending, and download reports as Excel or PDF files.

---

## What I learned building this

- How JWT authentication works end-to-end (signing tokens, protecting routes, handling expiry)
- How to structure a Node/Express backend with proper MVC separation (models, controllers, routes)
- How to use Mongoose for database operations and schema validation
- How to handle file uploads with Multer and store images on Cloudinary
- How to generate Excel files using ExcelJS
- How to use Chart.js inside React to make interactive data visualizations
- How to implement security best practices like rate limiting, input validation, and helmet headers

---

## Features

### Authentication & User Management
- Sign Up / Login with JWT (tokens expire after 1 hour)
- Password hashing with bcryptjs
- Forgot Password & Reset Password via Email OTP Verification (Resend)
- Profile management — update your name, email, and profile picture
- Profile pictures uploaded to Cloudinary via Multer

### Dashboard & Analytics
- Overview dashboard showing total income, total expenses, and balance
- Charts built with Chart.js (bar, line, doughnut)
- Monthly Analytics page to compare income vs. expenses over months
- Last 30 Days Expenses view

### Income & Expense Management
- Add, edit, and delete income or expense entries
- Categorize each transaction (e.g. Food, Transport, Salary, etc.)
- Filter transactions by month
- Recent Transactions page with paginated history

### Budget Management
- Set monthly budgets for different categories
- See visual indicators for how much of each budget you've used

### Export & Reports
- Download your transactions as a formatted Excel (.xlsx) file
- Generate PDF reports

### Settings
- Update profile info
- Change your password

---

## Tech Stack

**Frontend**
- React 18 + Vite
- Tailwind CSS
- Axios (for API calls)
- Chart.js (for charts)
- React Router DOM (for routing)

**Backend**
- Node.js + Express.js v5
- MongoDB + Mongoose
- JWT for authentication
- bcryptjs for password hashing
- Cloudinary + Multer for image uploads
- Resend for sending emails
- ExcelJS for generating Excel files
- Helmet for security headers
- express-rate-limit for rate limiting
- express-validator for input validation
- node-cache for in-memory caching

---

## Project Structure

```
Expense_Tracker/
├── Backend/
│   ├── api/                    # Vercel serverless entry
│   ├── config/                 # DB connection & config
│   ├── controllers/            # Business logic for each route
│   │   ├── authController.js
│   │   ├── budgetController.js
│   │   ├── dashboardController.js
│   │   ├── expenseController.js
│   │   ├── incomeController.js
│   │   └── transactionController.js
│   ├── middleware/             # Auth middleware, validation, rate limiting
│   ├── models/                 # Mongoose schemas
│   │   ├── User.js
│   │   ├── Income.js
│   │   ├── Expense.js
│   │   └── Budget.js
│   ├── routes/                 # Express routes
│   │   ├── authRoutes.js
│   │   ├── incomeRoutes.js
│   │   ├── expenseRoutes.js
│   │   ├── budgetRoutes.js
│   │   ├── dashboardRoutes.js
│   │   └── transactionRoutes.js
│   ├── utils/                  # PDF and Excel generation helpers
│   ├── .env.example
│   ├── server.js
│   └── vercel.json
│
└── Frontend/
    ├── src/
    │   ├── assets/
    │   ├── components/
    │   │   ├── Cards/
    │   │   ├── Charts/
    │   │   ├── Dashboard/
    │   │   ├── Expense/
    │   │   ├── Income/
    │   │   ├── Inputs/
    │   │   ├── Transactions/
    │   │   ├── layouts/        # Navbar, Modal
    │   │   ├── ErrorBoundary.jsx
    │   │   └── LoadingSpinner.jsx
    │   ├── context/            # Global state with React Context
    │   ├── hooks/              # Custom hooks
    │   ├── pages/
    │   │   ├── Auth/
    │   │   │   ├── Login.jsx
    │   │   │   ├── SignUp.jsx
    │   │   │   ├── ForgotPassword.jsx
    │   │   │   └── ResetPassword.jsx
    │   │   └── Dashboard/
    │   │       ├── Home.jsx
    │   │       ├── Income.jsx
    │   │       ├── Expense.jsx
    │   │       ├── MonthlyAnalytics.jsx
    │   │       ├── Last30DaysExpenses.jsx
    │   │       ├── RecentTransactionsPage.jsx
    │   │       └── Settings.jsx
    │   ├── utils/
    │   ├── App.jsx
    │   └── main.jsx
    └── index.html
```

---

## How to run this locally

### 1. Clone the project
```bash
git clone https://github.com/ram02krishna/Expense_Tracker.git
cd Expense_Tracker
```

### 2. Set up the Backend
```bash
cd Backend
npm install
```

Create a `.env` file in the `Backend/` folder. You can copy the example file:
```bash
cp .env.example .env
```

Then fill in your values:
```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
SESSION_SECRET=your_session_secret
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
RESEND_API_KEY=your_resend_api_key
FRONTEND_URL=http://localhost:5173
```

Start the backend:
```bash
npm run dev
```

### 3. Set up the Frontend
Open a new terminal and go into the Frontend folder:
```bash
cd Frontend
npm install
```

Create a `.env` file:
```env
VITE_BASE_URL=http://localhost:5000
```

Start the frontend:
```bash
npm run dev
```

Now open `http://localhost:5173` in your browser and you're good to go!

---

## Environment Variables Reference

### Backend (`Backend/.env`)

| Variable | What it's for |
|---|---|
| `MONGO_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | Secret used to sign JWT tokens (make it long and random) |
| `SESSION_SECRET` | Secret for express-session |
| `PORT` | Port the backend runs on (default: 5000) |
| `NODE_ENV` | `development` or `production` |
| `CLIENT_URL` | Your frontend URL (needed for CORS) |
| `CLOUDINARY_CLOUD_NAME` | From your Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | From your Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | From your Cloudinary dashboard |
| `RESEND_API_KEY` | Your Resend API Key |
| `FRONTEND_URL` | Frontend URL for the email link |

### Frontend (`Frontend/.env`)

| Variable | What it's for |
|---|---|
| `VITE_BASE_URL` | URL of your backend API (e.g. `http://localhost:5000`) |

---

## API Endpoints

All routes are prefixed with `/api/v1`. Protected routes need an `Authorization: Bearer <token>` header.

### Auth — `/api/v1/auth`

| Method | Endpoint | Protected | Description |
|---|---|---|---|
| POST | `/register` | No | Create a new account |
| POST | `/login` | No | Login and get a JWT |
| GET | `/getUser` | Yes | Get your profile |
| PUT | `/update` | Yes | Update your profile |
| POST | `/change-password` | Yes | Change your password |
| POST | `/upload-image` | Yes | Upload a profile photo |
| POST | `/forgot-password` | No | Request password reset OTP |
| PUT | `/reset-password` | No | Reset password with OTP |

### Income — `/api/v1/income`

| Method | Endpoint | Protected | Description |
|---|---|---|---|
| GET | `/` | Yes | Get all income entries |
| POST | `/` | Yes | Add an income entry |
| PUT | `/:id` | Yes | Edit an income entry |
| DELETE | `/:id` | Yes | Delete an income entry |
| GET | `/download-excel` | Yes | Download as Excel |

### Expense — `/api/v1/expense`

| Method | Endpoint | Protected | Description |
|---|---|---|---|
| GET | `/` | Yes | Get all expense entries |
| POST | `/` | Yes | Add an expense entry |
| PUT | `/:id` | Yes | Edit an expense entry |
| DELETE | `/:id` | Yes | Delete an expense entry |
| GET | `/download-excel` | Yes | Download as Excel |

### Budget — `/api/v1/budgets`

| Method | Endpoint | Protected | Description |
|---|---|---|---|
| GET | `/` | Yes | Get all budgets |
| POST | `/` | Yes | Create a budget |
| GET | `/:id` | Yes | Get a single budget |
| PUT | `/:id` | Yes | Update a budget |
| DELETE | `/:id` | Yes | Delete a budget |
| GET | `/report/actual-vs-budget` | Yes | Actual vs budget report |

### Dashboard — `/api/v1/dashboard`

| Method | Endpoint | Protected | Description |
|---|---|---|---|
| GET | `/` | Yes | Get dashboard summary |

### Transactions — `/api/v1/transactions`

| Method | Endpoint | Protected | Description |
|---|---|---|---|
| GET | `/` | Yes | Get all transactions (income + expense combined) |

---

## Security stuff I implemented

I tried to make the app reasonably secure. Here's what I added:

- **JWT auth** with 1-hour expiry and httpOnly cookies for sessions
- **bcryptjs** to hash passwords (never storing plain text)
- **Rate limiting** — auth endpoints allow only 5 requests per 15 minutes to prevent brute force attacks
- **express-validator** to validate and sanitize all inputs
- **Helmet.js** to set secure HTTP headers (CSP, X-Frame-Options, HSTS, etc.)
- **CORS** configured to only allow requests from the frontend URL
- **Mongoose** to prevent NoSQL injection via parameterized queries

For more details see [SECURITY.md](./Backend/SECURITY.md).

---

## Author

**Ram Krishna**  
GitHub: [ram02krishna](https://github.com/ram02krishna)

Feel free to fork it, use it, or suggest improvements!