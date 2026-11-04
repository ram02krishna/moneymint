import { lazy, Suspense, useContext, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";

import UserProvider from "./context/UserContext.jsx";
import { UserContext } from "./context/UserContextDefinition";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";
import { ConfirmProvider } from "./context/ConfirmContext.jsx";

import ErrorBoundary from "./components/ErrorBoundary";
import LoadingSpinner from "./components/LoadingSpinner";

// pages are loaded on demand to keep the first load fast
const Login = lazy(() => import("./pages/Auth/Login"));
const SignUp = lazy(() => import("./pages/Auth/SignUp"));
const ForgotPassword = lazy(() => import("./pages/Auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/Auth/ResetPassword"));
const Home = lazy(() => import("./pages/Dashboard/Home"));
const Income = lazy(() => import("./pages/Dashboard/Income"));
const Expense = lazy(() => import("./pages/Dashboard/Expense"));
const Settings = lazy(() => import("./pages/Dashboard/Settings"));
const RecentTransactionsPage = lazy(() => import("./pages/Dashboard/RecentTransactionsPage"));
const MonthlyAnalyticsPage = lazy(() => import("./pages/Dashboard/MonthlyAnalytics"));
const Budgets = lazy(() => import("./pages/Dashboard/Budgets"));
const Goals = lazy(() => import("./pages/Dashboard/Goals"));
const SplitExpenses = lazy(() => import("./pages/Dashboard/SplitExpenses"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PROTECTED_ROUTES = [
  ["/dashboard", Home],
  ["/income", Income],
  ["/expense", Expense],
  ["/budgets", Budgets],
  ["/goals", Goals],
  ["/split-expenses", SplitExpenses],
  ["/settings", Settings],
  ["/recent-transactions", RecentTransactionsPage],
  ["/monthly-analytics", MonthlyAnalyticsPage],
];

const PUBLIC_ROUTES = [
  ["/login", Login],
  ["/signup", SignUp],
  ["/forgot-password", ForgotPassword],
  ["/reset-password", ResetPassword],
];

// Scroll to top instantly when navigating between pages
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
};

// Pages that need a signed-in user
const ProtectedRoute = ({ Component }) => {
  const { user, loading } = useContext(UserContext);

  if (loading) return <LoadingSpinner fullScreen text="Authenticating..." />;
  return user ? <Component /> : <Navigate to="/login" replace />;
};

// Login/sign-up pages: someone who is already signed in goes straight to the dashboard
const PublicRoute = ({ Component }) => {
  const { user, loading } = useContext(UserContext);

  if (loading) return <LoadingSpinner fullScreen text="Loading..." />;
  return user ? <Navigate to="/dashboard" replace /> : <Component />;
};

const App = () => (
  <ErrorBoundary>
    <UserProvider>
      <ThemeProvider>
        <ToastProvider>
          <ConfirmProvider>
            <Router>
              <ScrollToTop />
              <Suspense fallback={<LoadingSpinner fullScreen text="Loading application..." />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />

                  {PUBLIC_ROUTES.map(([path, Component]) => (
                    <Route key={path} path={path} element={<PublicRoute Component={Component} />} />
                  ))}
                  {PROTECTED_ROUTES.map(([path, Component]) => (
                    <Route key={path} path={path} element={<ProtectedRoute Component={Component} />} />
                  ))}

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </Router>
            <Analytics />
          </ConfirmProvider>
        </ToastProvider>
      </ThemeProvider>
    </UserProvider>
  </ErrorBoundary>
);

export default App;
