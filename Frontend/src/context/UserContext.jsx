import React, { useState, useCallback, useEffect } from "react";
import { UserContext } from "./UserContextDefinition";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPath";

let UserProvider = ({ children }) => {
  let [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  let [loading, setLoading] = useState(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const savedUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    return !!token && !savedUser;
  });
  let [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => {
    let fetchUserInfo = async () => {
      let token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        setUser(null);
        return;
      }

      try {
        let response = await axiosInstance.get(API_PATHS.AUTH.GET_USER_INFO);
        if (response?.data?.data?.user) {
          setUser(response.data.data.user);
          localStorage.setItem("user", JSON.stringify(response.data.data.user));
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
        // remove token if it's invalid
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  // update the user state
  let updateUser = useCallback((userData) => {
    setUser(userData);
    if (userData) {
      localStorage.setItem("user", JSON.stringify(userData));
    } else {
      localStorage.removeItem("user");
    }
  }, []);

  // remove the user data
  let clearUser = useCallback(() => {
    setUser(null);
    setSelectedMonth(new Date());
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        updateUser,
        clearUser,
        selectedMonth,
        setSelectedMonth,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export default UserProvider;
