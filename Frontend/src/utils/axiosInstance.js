import axios from "axios";
import { BASE_URL } from "./apiPath";
import { clearCache } from "./apiCache";

// A 401 from these means "wrong credentials", not "your session expired".
const CREDENTIAL_ENDPOINTS = ["/auth/login", "/auth/google", "/auth/change-password"];

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: {
    Accept: "application/json",
  },
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => {
    // any write invalidates the cached reads
    if (["POST", "PUT", "DELETE"].includes(response.config.method?.toUpperCase())) {
      clearCache();
    }
    return response;
  },
  (error) => {
    const url = error.config?.url || "";
    const sessionExpired =
      error.response?.status === 401 &&
      !CREDENTIAL_ENDPOINTS.some((path) => url.includes(path)) &&
      window.location.pathname !== "/login";

    if (sessionExpired) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      clearCache();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
