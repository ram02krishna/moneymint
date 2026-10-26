// imports
import React, { lazy, Suspense, useContext } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";

import UserProvider from "./context/UserContext.jsx";
import { UserContext } from "./context/UserContextDefinition";
import { ThemeProvider } from "./context/ThemeContext.jsx";
<<<<<<< HEAD
import { ToastProvider } from "./context/ToastContext.jsx";
=======
>>>>>>> 27e5bca306b6bf527d8a4e62359317d6d501bbb6

import ErrorBoundary from "./components/ErrorBoundary";
import LoadingSpinner from "./components/LoadingSpinner";

// lazy loading pages to make it faster
let Login = lazy(() => import("./pages/Auth/Login"));
let SignUp = lazy(() => import("./pages/Auth/SignUp"));
let ForgotPassword = lazy(() => import("./pages/Auth/ForgotPassword"));
let ResetPassword = lazy(() => import("./pages/Auth/ResetPassword"));
let Home = lazy(() => import("./pages/Dashboard/Home"));
let Income = lazy(() => import("./pages/Dashboard/Income"));
let Expense = lazy(() => import("./pages/Dashboard/Expense"));
let Settings = lazy(() => import("./pages/Dashboard/Settings"));
let RecentTransactionsPage = lazy(
  () => import("./pages/Dashboard/RecentTransactionsPage"),
);
let MonthlyAnalyticsPage = lazy(
  () => import("./pages/Dashboard/MonthlyAnalytics"),
);
<<<<<<< HEAD
let Budgets = lazy(() => import("./pages/Dashboard/Budgets"));
let Goals = lazy(() => import("./pages/Dashboard/Goals"));
=======
>>>>>>> 27e5bca306b6bf527d8a4e62359317d6d501bbb6

// wrapper for protected routes
let ProtectedRoute = ({ Component }) => {
  let { user, loading } = useContext(UserContext);

  if (loading) {
    return <LoadingSpinner fullScreen text="Authenticating..." />;
  }

  return user ? <Component /> : <Navigate to="/login" replace />;
};

// main app
let App = () => {
  return (
    <ErrorBoundary>
      <UserProvider>
        <ThemeProvider>
<<<<<<< HEAD
          <ToastProvider>
=======
>>>>>>> 27e5bca306b6bf527d8a4e62359317d6d501bbb6
          <div>
            <Router>
              <ErrorBoundary>
                <Suspense
                  fallback={
                    <LoadingSpinner fullScreen text="Loading application..." />
                  }
                >
                  <Routes>
                    {/* redirect to login */}
                    <Route
                      path="/"
                      element={<Navigate to="/login" replace />}
                    />

                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<SignUp />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />

                    {/* pages that need login */}
                    <Route
                      path="/dashboard"
                      element={<ProtectedRoute Component={Home} />}
                    />
                    <Route
                      path="/income"
                      element={<ProtectedRoute Component={Income} />}
                    />
                    <Route
                      path="/expense"
                      element={<ProtectedRoute Component={Expense} />}
                    />
                    <Route
<<<<<<< HEAD
                      path="/budgets"
                      element={<ProtectedRoute Component={Budgets} />}
                    />
                    <Route
                      path="/goals"
                      element={<ProtectedRoute Component={Goals} />}
                    />
                    <Route
=======
>>>>>>> 27e5bca306b6bf527d8a4e62359317d6d501bbb6
                      path="/settings"
                      element={<ProtectedRoute Component={Settings} />}
                    />
                    <Route
                      path="/recent-transactions"
                      element={
                        <ProtectedRoute Component={RecentTransactionsPage} />
                      }
                    />
                    <Route
                      path="/monthly-analytics"
                      element={
                        <ProtectedRoute Component={MonthlyAnalyticsPage} />
                      }
                    />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </Router>
            <Analytics />
          </div>
<<<<<<< HEAD
          </ToastProvider>
=======
>>>>>>> 27e5bca306b6bf527d8a4e62359317d6d501bbb6
        </ThemeProvider>
      </UserProvider>
    </ErrorBoundary>
  );
};

export default App;
