import React, { useCallback, useMemo, useRef, useState } from "react";
import { LuCircleCheck, LuCircleAlert, LuInfo, LuX } from "react-icons/lu";
import { ToastContext } from "./ToastContextDefinition";

const STYLES = {
  success: {
    icon: LuCircleCheck,
    ring: "border-green-200 dark:border-green-800/60",
    iconColor: "text-green-500",
  },
  error: {
    icon: LuCircleAlert,
    ring: "border-red-200 dark:border-red-800/60",
    iconColor: "text-red-500",
  },
  info: {
    icon: LuInfo,
    ring: "border-purple-200 dark:border-purple-800/60",
    iconColor: "text-purple-500",
  },
};

export const ToastProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const idRef = useRef(0);

  const remove = useCallback((id) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type, message) => {
      const id = ++idRef.current;
      setItems((prev) => [...prev.slice(-3), { id, type, message }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove],
  );

  const toast = useMemo(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed bottom-5 right-5 z-[200] flex flex-col gap-3 w-[calc(100vw-2.5rem)] max-w-sm pointer-events-none"
        aria-live="polite"
      >
        {items.map((t) => {
          const s = STYLES[t.type];
          const Icon = s.icon;
          return (
            <div
              key={t.id}
              className={`animate-slide-right pointer-events-auto flex items-start gap-3 bg-white dark:bg-gray-800 border ${s.ring} rounded-xl shadow-xl px-4 py-3`}
            >
              <Icon className={`text-xl mt-0.5 shrink-0 ${s.iconColor}`} />
              <p className="flex-1 text-sm text-gray-800 dark:text-gray-100 leading-snug">
                {t.message}
              </p>
              <button
                onClick={() => remove(t.id)}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                aria-label="Dismiss"
              >
                <LuX />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
