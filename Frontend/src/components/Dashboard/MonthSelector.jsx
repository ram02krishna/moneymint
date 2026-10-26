import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

const MonthSelector = ({ selectedMonth, onMonthChange }) => {
  const [displayMonth, setDisplayMonth] = useState(new Date());
  const [isOpen, setIsOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [startYear, setStartYear] = useState(2015);
  const [endYear, setEndYear] = useState(2035);

  const dropdownRef = React.useRef(null);

  useEffect(() => {
    setDisplayMonth(new Date(selectedMonth));
    setSelectedYear(new Date(selectedMonth).getFullYear());
  }, [selectedMonth]);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const handlePreviousMonth = () => {
    const newDate = new Date(displayMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    onMonthChange(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(displayMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    onMonthChange(newDate);
  };

  const handleCurrentMonth = () => {
    const today = new Date();
    onMonthChange(today);
  };

  const handleMonthSelect = (monthIndex) => {
    const newDate = new Date(selectedYear, monthIndex, 1);
    onMonthChange(newDate);
    setIsOpen(false);
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
  };

  const handlePreviousYear = () => {
    if (selectedYear > startYear) {
      setSelectedYear(selectedYear - 1);
    }
  };

  const handleNextYear = () => {
    if (selectedYear < endYear) {
      setSelectedYear(selectedYear + 1);
    }
  };

  const isCurrentMonth =
    displayMonth.getMonth() === new Date().getMonth() &&
    displayMonth.getFullYear() === new Date().getFullYear();

  // Generate year list for dropdown
  const generateYearList = () => {
    const years = [];
    for (let i = startYear; i <= endYear; i++) {
      years.push(i);
    }
    return years;
  };

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between p-2 sm:p-3 gap-2 transition-all duration-300">
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Left Chevron */}
        <button
          onClick={handlePreviousMonth}
          className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg transition-all duration-200 active:scale-95"
          title="Previous Month"
          aria-label="Previous Month"
        >
          <ChevronLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
        </button>

        {/* Month Picker dropdown trigger */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 border border-purple-200/50 dark:border-purple-800/30 rounded-lg hover:shadow-sm transition-all duration-200 whitespace-nowrap text-purple-700 dark:text-purple-400 font-semibold text-xs sm:text-sm"
          >
            <Calendar size={14} className="sm:w-[16px] sm:h-[16px]" />
            <span>
              {monthNames[displayMonth.getMonth()]} {displayMonth.getFullYear()}
            </span>
            <ChevronDown
              size={12}
              className="opacity-80 sm:w-[14px] sm:h-[14px]"
            />
          </button>

          {/* Month & Year Picker Dropdown */}
          {isOpen && (
            <div className="absolute top-full left-0 mt-2 w-[calc(100vw-2.5rem)] max-w-xs sm:w-80 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 p-5 transition-all animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Year Selection */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Select Year
                </label>
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={handlePreviousYear}
                    disabled={selectedYear <= startYear}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <select
                    value={selectedYear}
                    onChange={(e) => handleYearChange(parseInt(e.target.value))}
                    className="flex-1 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white font-medium text-center text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {generateYearList().map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleNextYear}
                    disabled={selectedYear >= endYear}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
              </div>

              {/* Month Selection Grid */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Select Month
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {monthNames.map((month, index) => (
                    <button
                      key={index}
                      onClick={() => handleMonthSelect(index)}
                      className={`py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                        index === displayMonth.getMonth() &&
                        selectedYear === displayMonth.getFullYear()
                          ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                          : "bg-gray-50 dark:bg-gray-700/50 hover:bg-purple-50 dark:hover:bg-purple-900/30 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {month.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Navigation / Actions */}
              <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                <button
                  onClick={handleCurrentMonth}
                  className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-xs transition-colors shadow-sm"
                >
                  Today
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-white rounded-lg font-medium text-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Chevron */}
        <button
          onClick={handleNextMonth}
          className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg transition-all duration-200 active:scale-95"
          title="Next Month"
          aria-label="Next Month"
        >
          <ChevronRight size={16} className="sm:w-[18px] sm:h-[18px]" />
        </button>
      </div>

      {/* Right Action Button: Today */}
      <button
        onClick={handleCurrentMonth}
        className={`px-3 sm:px-4 py-1.5 rounded-lg font-semibold text-[10px] sm:text-xs uppercase tracking-wider transition-all duration-200 whitespace-nowrap ${
          isCurrentMonth
            ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 cursor-default"
            : "bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
        }`}
      >
        Today
      </button>
    </div>
  );
};

export default MonthSelector;
