export const BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:5000";
// my api paths
export const API_PATHS = {
  AUTH: {
    LOGIN: "/api/v1/auth/login",
    SEND_SIGNUP_OTP: "/api/v1/auth/send-signup-otp",
    RESEND_SIGNUP_OTP: "/api/v1/auth/resend-signup-otp",
    VERIFY_SIGNUP_OTP: "/api/v1/auth/verify-signup-otp",
    GOOGLE: "/api/v1/auth/google",
    GET_USER_INFO: "/api/v1/auth/getUser",
    CHANGE_PASSWORD: "/api/v1/auth/change-password",
    UPDATE_USER_INFO: "/api/v1/auth/update",
    FORGOT_PASSWORD: "/api/v1/auth/forgot-password",
    RESET_PASSWORD: "/api/v1/auth/reset-password",
  },
  DASHBOARD: {
    GET_DATA: "/api/v1/dashboard",
    GET_MONTHLY_SUMMARY: "/api/v1/dashboard/monthly-summary",
    GET_MONTHLY_EXPENSES: "/api/v1/dashboard/monthly-expenses",
    GET_MONTHLY_INCOME: "/api/v1/dashboard/monthly-income",
    GET_TREND_SUMMARY: "/api/v1/dashboard/trend-summary",
  },
  INCOME: {
    ADD_INCOME: "/api/v1/income",
    UPDATE_INCOME: (incomeId) => `/api/v1/income/${incomeId}`,
    DELETE_INCOME: (incomeId) => `/api/v1/income/${incomeId}`,
    DOWNLOAD_INCOME: `/api/v1/income/download-excel`,
  },
  EXPENSE: {
    ADD_EXPENSE: "/api/v1/expense",
    UPDATE_EXPENSE: (expenseId) => `/api/v1/expense/${expenseId}`,
    DELETE_EXPENSE: (expenseId) => `/api/v1/expense/${expenseId}`,
    DOWNLOAD_EXPENSE: `/api/v1/expense/download-excel`,
  },
  BUDGET: {
    ADD_BUDGET: "/api/v1/budgets",
    UPDATE_BUDGET: (budgetId) => `/api/v1/budgets/${budgetId}`,
    DELETE_BUDGET: (budgetId) => `/api/v1/budgets/${budgetId}`,
    GET_REPORT: "/api/v1/budgets/report/actual-vs-budget",
  },
  GOALS: {
    GET_ALL_GOALS: "/api/v1/goals",
    ADD_GOAL: "/api/v1/goals",
    UPDATE_GOAL: (goalId) => `/api/v1/goals/${goalId}`,
    DELETE_GOAL: (goalId) => `/api/v1/goals/${goalId}`,
    CONTRIBUTE: (goalId) => `/api/v1/goals/${goalId}/contribute`,
  },
  IMAGE: {
    UPLOAD_IMAGE: "/api/v1/auth/upload-image",
  },
  TRANSACTIONS: {
    GET_ALL_TRANSACTIONS: "/api/v1/transactions",
    DOWNLOAD_EXCEL: "/api/v1/transactions/download-excel",
  },
  SPLIT: {
    DASHBOARD: "/api/v1/split/dashboard",
    GROUPS: {
      GET_ALL: "/api/v1/split/groups",
      CREATE: "/api/v1/split/groups",
      GET_ONE: (id) => `/api/v1/split/groups/${id}`,
      UPDATE: (id) => `/api/v1/split/groups/${id}`,
      DELETE: (id) => `/api/v1/split/groups/${id}`,
      ADD_MEMBER: (id) => `/api/v1/split/groups/${id}/members`,
      REMOVE_MEMBER: (id, memberId) => `/api/v1/split/groups/${id}/members/${memberId}`,
    },
    FRIENDS: {
      GET_ALL: "/api/v1/split/friends",
      ADD: "/api/v1/split/friends",
      SEARCH_USERS: (q) => `/api/v1/split/friends/search-users?q=${encodeURIComponent(q)}`,
      GET_ONE: (id) => `/api/v1/split/friends/${id}`,
      DELETE: (id) => `/api/v1/split/friends/${id}`,
    },
    EXPENSES: {
      GET_ALL: "/api/v1/split/expenses",
      CREATE: "/api/v1/split/expenses",
      UPDATE: (id) => `/api/v1/split/expenses/${id}`,
      DELETE: (id) => `/api/v1/split/expenses/${id}`,
    },
    SETTLEMENTS: {
      GET_ALL: "/api/v1/split/settlements",
      CREATE: "/api/v1/split/settlements",
    },
    ACTIVITY: "/api/v1/split/activity",
    ANALYTICS: "/api/v1/split/analytics",
  },
};
