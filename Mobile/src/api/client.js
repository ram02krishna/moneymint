import axios from "axios";
import { API_URL } from "../config";

let token = null;
let onUnauthorized = null;

export const setAuthToken = (t) => {
  token = t;
};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

const client = axios.create({
  baseURL: API_URL,
  timeout: 60000, // generous: serverless backends can cold-start
  headers: { Accept: "application/json" },
});

client.interceptors.request.use((config) => {
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (error) => {
    const isLogin = error.config?.url?.includes("/auth/login");
    if (error.response?.status === 401 && !isLogin && token) {
      // token expired / invalid -> back to login
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

// readable message from any axios error
export const getErrorMessage = (error, fallback = "Something went wrong") => {
  if (error?.code === "ECONNABORTED") return "Request timed out. Please try again.";
  if (!error?.response) return `Cannot reach the server (${API_URL}). Check your connection / API URL.`;
  const data = error.response.data;
  if (data?.errors?.length) return data.errors[0].msg || fallback;
  return data?.message || fallback;
};

export default client;
