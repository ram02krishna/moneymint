import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";

const light = {
  bg: "#f8fafc",
  card: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  sub: "#64748b",
  primary: "#7c3aed",
  primarySoft: "#f3e8ff",
  inputBg: "#ffffff",
  track: "#e2e8f0",
  success: "#10b981",
  successSoft: "#d1fae5",
  danger: "#ef4444",
  dangerSoft: "#fee2e2",
  warn: "#f59e0b",
  warnSoft: "#fef3c7",
  overlay: "rgba(15,23,42,0.5)",
};

const dark = {
  bg: "#0b1120",
  card: "#1e293b",
  border: "#334155",
  text: "#f1f5f9",
  sub: "#94a3b8",
  primary: "#8b5cf6",
  primarySoft: "rgba(139,92,246,0.2)",
  inputBg: "#0f172a",
  track: "#334155",
  success: "#34d399",
  successSoft: "rgba(52,211,153,0.15)",
  danger: "#f87171",
  dangerSoft: "rgba(248,113,113,0.15)",
  warn: "#fbbf24",
  warnSoft: "rgba(251,191,36,0.15)",
  overlay: "rgba(0,0,0,0.65)",
};

const ThemeContext = createContext({ colors: light, isDark: false, toggle: () => {} });

export const ThemeProvider = ({ children }) => {
  const system = useColorScheme();
  const [mode, setMode] = useState(null); // null = follow system

  useEffect(() => {
    SecureStore.getItemAsync("theme").then((v) => {
      if (v === "light" || v === "dark") setMode(v);
    });
  }, []);

  const isDark = (mode || system) === "dark";
  const value = useMemo(
    () => ({
      isDark,
      colors: isDark ? dark : light,
      toggle: () => {
        const next = isDark ? "light" : "dark";
        setMode(next);
        SecureStore.setItemAsync("theme", next);
      },
    }),
    [isDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
