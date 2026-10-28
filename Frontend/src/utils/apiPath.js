export let BASE_URL = import.meta.env.VITE_BASE_URL || "http://localhost:5000";
// my api paths
export let API_PATHS = {
  AUTH: {
    LOGIN: "/api/v1/auth/login",
    REGISTER: "/api/v1/auth/register",
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
    GET_EXPENSE_SUMMARY: "/api/v1/dashboard/expense-summary-by-category",
    GET_TREND_SUMMARY: "/api/v1/dashboard/trend-summary",
  },
  INCOME: {
    ADD_INCOME: "/api/v1/income",
    GET_ALL_INCOME: "/api/v1/income",
    DELETE_INCOME: (incomeId) => `/api/v1/income/${incomeId}`,
    DOWNLOAD_INCOME: `/api/v1/income/download-excel`,
  },
  EXPENSE: {
    ADD_EXPENSE: "/api/v1/expense",
    GET_ALL_EXPENSE: "/api/v1/expense",
    DELETE_EXPENSE: (expenseId) => `/api/v1/expense/${expenseId}`,
    DOWNLOAD_EXPENSE: `/api/v1/expense/download-excel`,
  },
  BUDGET: {
    ADD_BUDGET: "/api/v1/budgets",
    GET_ALL_BUDGETS: "/api/v1/budgets",
    GET_BUDGET: (budgetId) => `/api/v1/budgets/${budgetId}`,
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
  SPLITS: {
    GROUPS: "/api/v1/splits/groups",
    GROUP: (groupId) => `/api/v1/splits/groups/${groupId}`,
    ADD_MEMBER: (groupId) => `/api/v1/splits/groups/${groupId}/members`,
    ADD_EXPENSE: (groupId) => `/api/v1/splits/groups/${groupId}/expenses`,
    SETTLE: (groupId) => `/api/v1/splits/groups/${groupId}/settlements`,
    SEARCH_FRIEND: "/api/v1/splits/friends/search",
  },
  TRANSACTIONS: {
    GET_ALL_TRANSACTIONS: "/api/v1/transactions",
    DOWNLOAD_EXCEL: "/api/v1/transactions/download-excel",
  },
};
