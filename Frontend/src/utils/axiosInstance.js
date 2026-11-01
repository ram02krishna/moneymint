import axios from "axios";
import { BASE_URL } from "./apiPath";
import { clearCache } from "./apiCache";

let axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: {
    Accept: "application/json",
  },
});

// adding token to request
axiosInstance.interceptors.request.use(
  (config) => {
    let token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// handling responses
axiosInstance.interceptors.response.use(
  (response) => {
    let method = response.config.method?.toUpperCase();
    if (method === "POST" || method === "PUT" || method === "DELETE") {
      clearCache();
    }
    return response;
  },
  (error) => {
    if (error.response) {
      if (
        error.response.status === 401 &&
        !error.config?.url?.includes("/auth/login") &&
        window.location.pathname !== "/login"
      ) {
        localStorage.removeItem("token");
        window.location.href = "/login";
      } else if (error.response.status === 500) {
        console.error("Server error. Please try again later.");
      }
    } else if (error.code === "ECONNABORTED") {
      console.error("Request timeout. Please try again.");
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
