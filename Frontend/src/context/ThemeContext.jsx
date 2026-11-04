import { useState, useEffect, useMemo, useCallback } from "react";
import { ThemeContext } from "./ThemeContextDefinition";

const readInitialTheme = () => {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // storage unavailable (private mode): fall through to the system preference
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(readInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // ignore: the theme just won't persist
    }
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme((prev) => (prev === "light" ? "dark" : "light")), []);
  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
