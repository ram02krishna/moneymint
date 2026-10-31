// Identical endpoints to Frontend/src/utils/apiPath.js
export const API_PATHS = {
  AUTH: {
    LOGIN: "/api/v1/auth/login",
    REGISTER: "/api/v1/auth/register",
    GET_USER_INFO: "/api/v1/auth/getUser",
    CHANGE_PASSWORD: "/api/v1/auth/change-password",
    UPDATE_USER_INFO: "/api/v1/auth/update",
    FORGOT_PASSWORD: "/api/v1/auth/forgot-password",
    RESET_PASSWORD: "/api/v1/auth/reset-password",
    GOOGLE: "/api/v1/auth/google",
  },
  DASHBOARD: {
    GET_DATA: "/api/v1/dashboard",
    GET_MONTHLY_SUMMARY: "/api/v1/dashboard/monthly-summary",
    GET_TREND_SUMMARY: "/api/v1/dashboard/trend-summary",
  },
  IMAGE: { UPLOAD: "/api/v1/auth/upload-image" },
  INCOME: "/api/v1/income",
  DOWNLOAD: {
    INCOME: "/api/v1/income/download-excel",
    EXPENSE: "/api/v1/expense/download-excel",
    TRANSACTIONS: "/api/v1/transactions/download-excel",
  },
  EXPENSE: "/api/v1/expense",
  TRANSACTIONS: "/api/v1/transactions",
  BUDGET: {
    ROOT: "/api/v1/budgets",
    REPORT: "/api/v1/budgets/report/actual-vs-budget",
  },
  SPLITS: {
    GROUPS: "/api/v1/splits/groups",
    GROUP: (id) => `/api/v1/splits/groups/${id}`,
    DELETE_GROUP: (id) => `/api/v1/splits/groups/${id}`,
    ADD_MEMBER: (id) => `/api/v1/splits/groups/${id}/members`,
    ADD_EXPENSE: (id) => `/api/v1/splits/groups/${id}/expenses`,
    SETTLE: (id) => `/api/v1/splits/groups/${id}/settlements`,
    SEARCH_FRIEND: "/api/v1/splits/friends/search",
  },
  GOALS: {
    ROOT: "/api/v1/goals",
    CONTRIBUTE: (id) => `/api/v1/goals/${id}/contribute`,
  },
};
