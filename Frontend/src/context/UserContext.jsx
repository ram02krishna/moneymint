import { useState, useCallback, useEffect, useMemo } from "react";
import { UserContext } from "./UserContextDefinition";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPath";
import { clearCache } from "../utils/apiCache";

const readSavedUser = () => {
  try {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const UserProvider = ({ children }) => {
  const [user, setUser] = useState(readSavedUser);
  // only block the UI while loading when there is a token but nothing cached to show yet
  const [loading, setLoading] = useState(() => !!localStorage.getItem("token") && !readSavedUser());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());

  const updateUser = useCallback((userData) => {
    setUser(userData);
    if (userData) localStorage.setItem("user", JSON.stringify(userData));
    else localStorage.removeItem("user");
  }, []);

  // one place that starts a session (email login, sign-up and Google all use it)
  const login = useCallback(
    (token, userData) => {
      clearCache();
      localStorage.setItem("token", token);
      updateUser(userData);
    },
    [updateUser],
  );

  const clearUser = useCallback(() => {
    setUser(null);
    setSelectedMonth(new Date());
    clearCache();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }, []);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!localStorage.getItem("token")) {
        setLoading(false);
        setUser(null);
        return;
      }

      try {
        const response = await axiosInstance.get(API_PATHS.AUTH.GET_USER_INFO);
        const fresh = response?.data?.data?.user;
        if (fresh) updateUser(fresh);
      } catch (error) {
        // A 401 is handled by the axios interceptor (it clears the session).
        // Being offline or a server hiccup must NOT sign the person out.
        console.error("Error fetching user info:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, [updateUser]);

  const value = useMemo(
    () => ({ user, loading, login, updateUser, clearUser, selectedMonth, setSelectedMonth }),
    [user, loading, login, updateUser, clearUser, selectedMonth],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export default UserProvider;
