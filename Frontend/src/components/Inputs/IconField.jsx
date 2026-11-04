import { useId, useState } from "react";
import { FiLock, FiEye, FiEyeOff } from "react-icons/fi";

// Labelled input with a leading icon, built on the shared .input-box style.
export const IconField = ({ label, icon: Icon, trailing, className = "", ...inputProps }) => {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="field-label block">
        {label}
      </label>
      <div className="relative mt-2">
        {Icon && <Icon className="absolute top-1/2 -translate-y-1/2 left-3.5 text-gray-400 pointer-events-none" aria-hidden="true" />}
        <input id={id} className={`input-box !m-0 ${Icon ? "!pl-10" : ""} ${trailing ? "!pr-11" : ""} ${className}`} {...inputProps} />
        {trailing}
      </div>
    </div>
  );
};

export const PasswordField = ({ label = "Password", ...props }) => {
  const [visible, setVisible] = useState(false);

  return (
    <IconField
      label={label}
      icon={FiLock}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute top-1/2 -translate-y-1/2 right-3 p-1 text-gray-400 hover:text-purple-500 cursor-pointer"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <FiEyeOff /> : <FiEye />}
        </button>
      }
      {...props}
    />
  );
};

// Inline form feedback (errors are announced to screen readers).
export const FormAlert = ({ tone = "error", children }) => {
  if (!children) return null;
  const styles =
    tone === "error"
      ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
      : "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20";

  return (
    <p role={tone === "error" ? "alert" : "status"} className={`text-sm text-center p-2.5 rounded-lg ${styles}`}>
      {children}
    </p>
  );
};
