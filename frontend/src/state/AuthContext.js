// src/contexts/AuthContext.js
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import axios from "axios";

const API_HOST = process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000";
const API_USERS_BASE = `${API_HOST}/api/users`;

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Save JWT to localStorage
  const saveTokens = (access, refresh) => {
    if (access) localStorage.setItem("accessToken", access);
    if (refresh) localStorage.setItem("refreshToken", refresh);
  };

  const clearTokens = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  };

  // Load tokens + profile on startup
  useEffect(() => {
    const storedAccess = localStorage.getItem("accessToken");

    const init = async () => {
      if (storedAccess) {
        setAccessToken(storedAccess);
        try {
          const res = await axios.get(`${API_USERS_BASE}/profile/`, {
            headers: { Authorization: `Bearer ${storedAccess}` },
          });
          setUser(res.data);
        } catch (e) {
          setUser(null);
        }
      }
      setLoadingAuth(false);
    };

    init();
  }, []);

  // ---------- AUTO REFRESH TOKEN ----------
  const refreshAccessToken = useCallback(async () => {
    if (refreshing) return null;
    setRefreshing(true);

    try {
      const refresh = localStorage.getItem("refreshToken");
      if (!refresh) {
        setRefreshing(false);
        return null;
      }

      const res = await axios.post(`${API_HOST}/api/token/refresh/`, {
        refresh,
      });

      if (res?.data?.access) {
        setAccessToken(res.data.access);
        saveTokens(res.data.access, refresh);
        setRefreshing(false);
        return res.data.access;
      }
    } catch (err) {
      logout();
      setRefreshing(false);
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshing]);

  // ---------- UNIVERSAL AUTH FETCH ----------
  // ---------- UNIVERSAL AUTH FETCH ----------
const authFetch = useCallback(
  async (url, config = {}) => {
    // ✅ Normalize URL → convert relative paths into full backend paths
    let finalUrl = url;

    // If url begins with "/api" → prefix API_HOST
    if (url.startsWith("/api")) {
      finalUrl = `${API_HOST}${url}`;
    }

    // If url does NOT start with http → prefix API_HOST
    else if (!url.startsWith("http://") && !url.startsWith("https://")) {
      finalUrl = `${API_HOST}${url.startsWith("/") ? "" : "/"}${url}`;
    }

    const finalConfig = { ...config };
    finalConfig.headers = finalConfig.headers || {};

    const makeRequest = async (token) => {
      if (token) {
        finalConfig.headers.Authorization = `Bearer ${token}`;
      }
      return axios({
        url: finalUrl,   // <-- fixed
        method: finalConfig.method || "GET",
        data: finalConfig.data,
        params: finalConfig.params,
        headers: finalConfig.headers,
      });
    };

    try {
      const token = accessToken ?? localStorage.getItem("accessToken");
      return await makeRequest(token);
    } catch (err) {
      if (err?.response?.status === 401) {
        const newToken = await refreshAccessToken();
        if (!newToken) throw err;
        return await makeRequest(newToken);
      }
      throw err;
    }
  },
  [accessToken, refreshAccessToken]
);
  // ---------- LOGIN ----------
  const handleLogin = async (username, password, navigate) => {
    try {
      const res = await axios.post(`${API_USERS_BASE}/login/`, {
        username,
        password,
      });

      const { user: userObj, tokens } = res.data;

      setUser(userObj);
      setAccessToken(tokens.access);
      saveTokens(tokens.access, tokens.refresh);

      navigate("/profile");
    } catch (err) {
      console.error("Login failed:", err);
      alert("Invalid username or password");
    }
  };

  // ---------- LOGOUT ----------
  const logout = () => {
    setUser(null);
    setAccessToken(null);
    clearTokens();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        handleLogin, // ← IMPORTANT: Login.js requires this
        logout,
        authFetch,
        loadingAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}