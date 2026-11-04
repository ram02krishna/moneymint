import { LuSun, LuMoon } from "react-icons/lu";
import { useTheme } from "../../hooks/useTheme";

// The one light/dark switch used in the app bar and on the auth pages.
const ThemeToggle = ({ className = "" }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`icon-btn !p-2.5 !rounded-xl !bg-gray-100 dark:!bg-gray-700 ${className}`}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? <LuSun className="text-lg text-yellow-400" /> : <LuMoon className="text-lg text-purple-600" />}
    </button>
  );
};

export default ThemeToggle;
