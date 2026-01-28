// src/lib/api.js
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000";

// Use top-level /api base so we can call all endpoints (users, courses, chat...)
const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // keep this if you use cookie-based auth for CORS
});

// Endpoint used to refresh access token (adjust if your backend differs)
const REFRESH_ENDPOINT = "/token/refresh/";

// Small helper: safely parse JSON response body (axios handles JSON normally)
async function tryRefreshToken() {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return null;

  try {
    // Call the refresh endpoint
    const resp = await axios.post(
      `${API_BASE}/api${REFRESH_ENDPOINT}`,
      { refresh: refreshToken },
      {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      }
    );

    if (resp.status === 200 && resp.data?.access) {
      const newAccess = resp.data.access;
      // store for other consumers
      localStorage.setItem("accessToken", newAccess);
      return newAccess;
    }
    return null;
  } catch (err) {
    console.warn("Token refresh failed:", err?.response?.data || err.message || err);
    // If refresh failed, remove tokens to force login
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    return null;
  }
}

// REQUEST interceptor: refresh token (unless this is the refresh request) then attach Authorization header
api.interceptors.request.use(
  async (config) => {
    try {
      // Prevent recursion for refresh endpoint
      const isRefreshCall =
        config.url &&
        (config.url.endsWith(REFRESH_ENDPOINT) ||
          config.url.includes(REFRESH_ENDPOINT) ||
          config.url === `${API_BASE}/api${REFRESH_ENDPOINT}`);

      if (!isRefreshCall) {
        // Attempt refresh before each request (Option A: aggressive refresh)
        // If you prefer less aggressive behavior, only refresh when access is missing or expired.
        await tryRefreshToken();
      }

      // Attach access token if present
      const accessToken = localStorage.getItem("accessToken");
      if (accessToken) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${accessToken}`;
      } else {
        // Ensure header removed when no token
        if (config.headers) delete config.headers.Authorization;
      }
    } catch (err) {
      console.error("Request interceptor error:", err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE interceptor: on 401 try a single refresh + retry the original request
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // if there is no config or we've already retried once, reject
    if (!originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    // only attempt refresh on 401 Unauthorized
    const status = error.response?.status;
    if (status === 401) {
      originalRequest._retry = true;

      // avoid attempting refresh if the failed call IS the refresh endpoint
      const isRefreshCall =
        originalRequest.url &&
        (originalRequest.url.endsWith(REFRESH_ENDPOINT) ||
          originalRequest.url.includes(REFRESH_ENDPOINT) ||
          originalRequest.url === `${API_BASE}/api${REFRESH_ENDPOINT}`);

      if (isRefreshCall) {
        // refresh endpoint failed — give up
        return Promise.reject(error);
      }

      // Try refresh
      const newAccess = await tryRefreshToken();
      if (newAccess) {
        // set new header and retry
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        try {
          const retryResp = await axios({
            ...originalRequest,
            baseURL: originalRequest.baseURL || `${API_BASE}/api`,
            withCredentials: true,
          });
          return retryResp;
        } catch (retryErr) {
          return Promise.reject(retryErr);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;