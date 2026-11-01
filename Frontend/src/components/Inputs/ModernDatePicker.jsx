"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import {
  LuCalendar,
  LuChevronLeft,
  LuChevronRight,
  LuChevronsLeft,
  LuChevronsRight,
} from "react-icons/lu";
import { motion, AnimatePresence } from "framer-motion";

// Helper to safely parse YYYY-MM-DD or ISO strings into local Date
const parseLocalDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") return null;
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length < 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m, d);
};

const formatDisplayDate = (val) => {
  const d = parseLocalDate(val);
  if (!d) return "Select date";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const ModernDatePicker = ({
  value,
  onChange,
  error,
  label,
  colorTheme = "purple",
  className = "",
  inputClassName = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 320 });

  const triggerRef = useRef(null);
  const popupRef = useRef(null);

  // Initialize currentMonth from selected value
  const getInitialMonth = () => {
    const parsed = parseLocalDate(value);
    if (parsed) {
      return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
    }
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  };

  const [currentMonth, setCurrentMonth] = useState(getInitialMonth);

  const selectedDate = parseLocalDate(value);

  // Sync calendar view when value prop changes
  useEffect(() => {
    const parsed = parseLocalDate(value);
    if (parsed) {
      setCurrentMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    }
  }, [value]);

  // Position calculation with viewport boundary clamping & auto-flip
  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popupWidth = Math.max(rect.width, 320);
    const popupHeight = 360; // Estimated height of calendar popup
    const margin = 8;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top;
    // If not enough space below, but more space above, open above
    if (spaceBelow < popupHeight + margin && spaceAbove > spaceBelow) {
      top = rect.top - popupHeight - margin;
    } else {
      top = rect.bottom + margin;
    }

    // Viewport vertical clamping
    if (top + popupHeight > window.innerHeight - 12) {
      top = Math.max(12, window.innerHeight - popupHeight - 12);
    }
    if (top < 12) {
      top = 12;
    }

    // Horizontal positioning & alignment
    let left = rect.left;
    // If aligning to rect.left overflows the right edge of viewport
    if (left + popupWidth > window.innerWidth - 16) {
      left = rect.right - popupWidth;
    }
    // Clamp to viewport edges
    if (left < 16) {
      left = 16;
    }
    if (left + popupWidth > window.innerWidth - 16) {
      left = window.innerWidth - popupWidth - 16;
    }

    setCoords({
      top: Math.round(top),
      left: Math.round(left),
      width: Math.min(popupWidth, window.innerWidth - 32),
    });
  }, []);

  // Update position on open, scroll, or resize; close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    updateCoords();

    const handleScroll = () => updateCoords();
    const handleResize = () => updateCoords();

    const handleOutsideClick = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        popupRef.current &&
        !popupRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, updateCoords]);

  // Color theme definitions
  const theme = {
    purple: {
      glow: "shadow-[0_0_15px_rgba(139,92,246,0.3)]",
      accent: "text-purple-600 dark:text-purple-400",
      bgAccent: "bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/25",
      ring: "focus:ring-purple-400/50",
      hover: "hover:bg-purple-50 dark:hover:bg-purple-900/30",
      today: "border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-300 font-bold",
    },
    green: {
      glow: "shadow-[0_0_15px_rgba(34,197,94,0.3)]",
      accent: "text-green-600 dark:text-green-400",
      bgAccent: "bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-500/25",
      ring: "focus:ring-green-400/50",
      hover: "hover:bg-green-50 dark:hover:bg-green-900/30",
      today: "border-green-600 text-green-600 dark:border-green-400 dark:text-green-300 font-bold",
    },
    red: {
      glow: "shadow-[0_0_15px_rgba(239,68,68,0.3)]",
      accent: "text-red-600 dark:text-red-400",
      bgAccent: "bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-500/25",
      ring: "focus:ring-red-400/50",
      hover: "hover:bg-red-50 dark:hover:bg-red-900/30",
      today: "border-red-600 text-red-600 dark:border-red-400 dark:text-red-300 font-bold",
    },
  }[colorTheme] || {
    glow: "shadow-[0_0_15px_rgba(139,92,246,0.3)]",
    accent: "text-purple-600 dark:text-purple-400",
    bgAccent: "bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/25",
    ring: "focus:ring-purple-400/50",
    hover: "hover:bg-purple-50 dark:hover:bg-purple-900/30",
    today: "border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-300 font-bold",
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }

    return days;
  };

  const handleSelect = (date) => {
    if (!date) return;

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");

    const formatted = `${y}-${m}-${d}`;
    onChange({ target: { value: formatted } });
    setIsOpen(false);
  };

  const changeMonth = (months) => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + months);
      return newDate;
    });
  };

  const isToday = (date) => {
    if (!date) return false;
    const t = new Date();
    return (
      date.getDate() === t.getDate() &&
      date.getMonth() === t.getMonth() &&
      date.getFullYear() === t.getFullYear()
    );
  };

  const isSelected = (date) => {
    if (!date || !selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const days = getDaysInMonth(currentMonth);
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        {React.isValidElement(label) ? label : label || "Date"}{" "}
        <span className={theme.accent}>*</span>
      </label>

      {/* Input container */}
      <div className="relative" ref={triggerRef}>
        <LuCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none" />

        <input
          readOnly
          value={formatDisplayDate(value)}
          onClick={() => {
            setIsOpen((prev) => !prev);
          }}
          className={`
            w-full pl-10 pr-4 py-2.5 rounded-xl
            bg-gray-100 dark:bg-gray-800
            border border-gray-300 dark:border-gray-700
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-500
            cursor-pointer transition-all
            focus:outline-none focus:ring-2
            ${theme.ring}
            ${isOpen ? theme.glow : ""}
            ${error ? "border-red-400 ring-red-300/40" : ""}
            ${inputClassName}
          `}
        />

        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>

      {/* Calendar Popup Portaled to document.body to avoid clipping */}
      {typeof document !== "undefined" &&
        ReactDOM.createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                ref={popupRef}
                style={{
                  position: "fixed",
                  top: `${coords.top}px`,
                  left: `${coords.left}px`,
                  width: `${coords.width}px`,
                  zIndex: 99999,
                }}
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15 }}
                className="
                  bg-white dark:bg-gray-900
                  rounded-2xl shadow-2xl
                  p-4 border border-gray-200 dark:border-gray-700
                  text-gray-900 dark:text-gray-100
                "
              >
                {/* Header with Year & Month navigation */}
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => changeMonth(-12)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      title="Previous Year"
                    >
                      <LuChevronsLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => changeMonth(-1)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      title="Previous Month"
                    >
                      <LuChevronLeft size={18} />
                    </button>
                  </div>

                  <h2 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white select-none">
                    {currentMonth.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </h2>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => changeMonth(1)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      title="Next Month"
                    >
                      <LuChevronRight size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => changeMonth(12)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      title="Next Year"
                    >
                      <LuChevronsRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Week Days */}
                <div className="grid grid-cols-7 mb-1.5">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="text-center text-xs font-semibold text-gray-400 dark:text-gray-500 py-1"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1">
                  {days.map((date, index) => (
                    <button
                      key={index}
                      type="button"
                      disabled={!date}
                      onClick={() => handleSelect(date)}
                      className={`
                        aspect-square rounded-lg flex items-center justify-center
                        text-xs sm:text-sm font-medium transition-all duration-150
                        ${
                          !date
                            ? "invisible pointer-events-none"
                            : isSelected(date)
                              ? `${theme.bgAccent}`
                              : isToday(date)
                                ? `border ${theme.today} bg-gray-50 dark:bg-gray-800`
                                : `text-gray-700 dark:text-gray-300 ${theme.hover}`
                        }
                      `}
                    >
                      {date?.getDate()}
                    </button>
                  ))}
                </div>

                {/* Bottom Actions */}
                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700/60">
                  <button
                    type="button"
                    onClick={() => handleSelect(new Date())}
                    className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 
                      text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    Today
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 
                      text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
};

export default ModernDatePicker;
