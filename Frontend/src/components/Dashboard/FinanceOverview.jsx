import React, { useState, useEffect, useContext, useMemo, memo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { LuChevronLeft, LuChevronRight, LuCalendar } from "react-icons/lu";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import { ThemeContext } from "../../context/ThemeContext";
import { getCachedData, setCachedData } from "../../utils/apiCache";
import { addThousandsSeparator } from "../../utils/helper";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

const FinanceOverview = ({ initialYear }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";

  const [year, setYear] = useState(
    () => initialYear || new Date().getFullYear(),
  );
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialYear && initialYear !== year) {
      setYear(initialYear);
    }
  }, [initialYear]);

  useEffect(() => {
    let isMounted = true;
    const fetchAnnualData = async () => {
      const cacheKey = `${API_PATHS.DASHBOARD.GET_TREND_SUMMARY}?year=${year}&calendarYear=true`;
      const cached = getCachedData(cacheKey);
      if (cached && isMounted) {
        setData(cached.data);
      } else {
        setLoading(true);
      }

      try {
        const res = await axiosInstance.get(cacheKey);
        if (isMounted && res.data) {
          setCachedData(cacheKey, res.data);
          setData(res.data.data);
        }
      } catch (err) {
        console.error("Error fetching annual trend summary:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAnnualData();
    return () => {
      isMounted = false;
    };
  }, [year]);

  const months = useMemo(() => data?.months || [], [data]);
  const annualIncome = data?.annualIncome ?? 0;
  const annualExpense = data?.annualExpense ?? 0;
  const annualSavings = data?.annualSavings ?? annualIncome - annualExpense;

  const chartData = useMemo(() => {
    const labels = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    return {
      labels,
      datasets: [
        {
          label: "Income",
          data: months.map((m) => m.income || 0),
          backgroundColor: "#10b981",
          borderRadius: 4,
          borderSkipped: false,
          barPercentage: 0.8,
          categoryPercentage: 0.75,
        },
        {
          label: "Expense",
          data: months.map((m) => m.expense || 0),
          backgroundColor: "#ef4444",
          borderRadius: 4,
          borderSkipped: false,
          barPercentage: 0.8,
          categoryPercentage: 0.75,
        },
        {
          label: "Net Balance",
          data: months.map((m) => m.savings || 0),
          backgroundColor: "#8b5cf6",
          borderRadius: 4,
          borderSkipped: false,
          barPercentage: 0.8,
          categoryPercentage: 0.75,
        },
      ],
    };
  }, [months]);

  const chartOptions = useMemo(() => {
    const tickColor = isDark ? "#94a3b8" : "#64748b";
    const gridColor = isDark ? "rgba(148,163,184,0.12)" : "rgba(226,232,240,0.6)";

    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: "easeOutQuart" },
      plugins: {
        legend: {
          display: true,
          position: "top",
          align: "end",
          labels: {
            color: isDark ? "#e2e8f0" : "#334155",
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
            font: { size: 12, weight: "600" },
            padding: 16,
          },
        },
        tooltip: {
          backgroundColor: isDark
            ? "rgba(15,23,42,0.96)"
            : "rgba(255,255,255,0.98)",
          titleColor: isDark ? "#f1f5f9" : "#0f172a",
          bodyColor: isDark ? "#cbd5e1" : "#334155",
          borderColor: isDark ? "#334155" : "#e2e8f0",
          borderWidth: 1,
          padding: 12,
          boxPadding: 6,
          usePointStyle: true,
          callbacks: {
            title: function (context) {
              const label = context[0]?.label || "";
              return `${label} ${year}`;
            },
            label: function (context) {
              const label = context.dataset.label || "";
              const val = context.raw || 0;
              return ` ${label}: ₹${addThousandsSeparator(val)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: tickColor,
            font: { size: 11, weight: "500" },
          },
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: tickColor,
            font: { size: 11 },
            callback: (val) => {
              const a = Math.abs(val);
              if (a >= 10000000) return (val / 10000000).toFixed(1) + "Cr";
              if (a >= 100000) return (val / 100000).toFixed(1) + "L";
              if (a >= 1000) return (val / 1000).toFixed(0) + "k";
              return "₹" + val;
            },
          },
        },
      },
    };
  }, [isDark, year]);

  return (
    <div className="card h-auto transition-all duration-300 ease-in-out flex flex-col p-5 md:p-6 w-full">
      {/* Header with Title and Year Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h5 className="text-lg font-bold text-gray-900 dark:text-white">
              Financial Overview
            </h5>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
              Jan – Dec {year}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Month-by-month trajectory of your income, expenses, and net balance
          </p>
        </div>

        {/* Year Navigator */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setYear((y) => y - 1)}
            aria-label="Previous year"
            className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-all cursor-pointer"
          >
            <LuChevronLeft className="text-base" />
          </button>
          <div className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-gray-900 dark:text-white">
            <LuCalendar className="text-purple-500" />
            <span>{year}</span>
          </div>
          <button
            type="button"
            onClick={() => setYear((y) => y + 1)}
            aria-label="Next year"
            className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-all cursor-pointer"
          >
            <LuChevronRight className="text-base" />
          </button>
        </div>
      </div>

      {/* Annual Summary KPI Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40">
          <div>
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
              Year Earned
            </span>
            <p className="text-base md:text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
              ₹{addThousandsSeparator(annualIncome)}
            </p>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/40">
          <div>
            <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
              Year Spent
            </span>
            <p className="text-base md:text-lg font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">
              ₹{addThousandsSeparator(annualExpense)}
            </p>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40">
          <div>
            <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
              Net Annual Savings
            </span>
            <p
              className={`text-base md:text-lg font-extrabold mt-0.5 ${
                annualSavings >= 0
                  ? "text-purple-600 dark:text-purple-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {annualSavings < 0 ? "-" : ""}₹
              {addThousandsSeparator(Math.abs(annualSavings))}
            </p>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-[280px] md:h-[320px] relative">
        {loading && !data ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
            Loading {year} financial overview...
          </div>
        ) : (
          <Bar data={chartData} options={chartOptions} />
        )}
      </div>
    </div>
  );
};

export default memo(FinanceOverview);
