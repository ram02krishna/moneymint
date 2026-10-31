import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import client, { setAuthToken, setUnauthorizedHandler } from "../api/client";
import { API_PATHS } from "../api/paths";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  const clearSession = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync("token").catch(() => {});
  }, []);

  const startSession = useCallback(async (token, nextUser) => {
    setAuthToken(token);
    await SecureStore.setItemAsync("token", token);
    setUser(nextUser);
  }, []);

  // restore the session on app start
  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync("token");
        if (saved) {
          setAuthToken(saved);
          const res = await client.get(API_PATHS.AUTH.GET_USER_INFO);
          setUser(res.data.data.user);
        }
      } catch {
        await clearSession();
      } finally {
        setBooting(false);
      }
    })();
  }, [clearSession]);

  const login = useCallback(
    async (email, password) => {
      const res = await client.post(API_PATHS.AUTH.LOGIN, { email, password });
      await startSession(res.data.token, res.data.data.user);
    },
    [startSession],
  );

  const register = useCallback(
    async ({ fullName, email, password }) => {
      const res = await client.post(API_PATHS.AUTH.REGISTER, {
        fullName,
        email,
        password,
        confirmPassword: password,
      });
      await startSession(res.data.token, res.data.data.user);
    },
    [startSession],
  );

  const loginWithGoogle = useCallback(
    async (idToken) => {
      const res = await client.post(API_PATHS.AUTH.GOOGLE, { credential: idToken });
      await startSession(res.data.token, res.data.data.user);
      return res.data;
    },
    [startSession],
  );

  const value = useMemo(
    () => ({ user, booting, login, register, loginWithGoogle, logout: clearSession, setUser }),
    [user, booting, login, register, loginWithGoogle, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
