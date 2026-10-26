import React, { useState, useEffect, useContext } from "react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import { addThousandsSeparator } from "../../utils/helper";
import { ThemeContext } from "../../context/ThemeContext";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { TrendingUp, TrendingDown } from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const MonthlyTrendAnalysis = ({ selectedMonth }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [comparisonMetrics, setComparisonMetrics] = useState({
    avgIncome: 0,
    avgExpense: 0,
    avgSavings: 0,
    highestSpendMonth: "",
    highestIncomeMonth: "",
  });

  useEffect(() => {
    fetchTrendData();
  }, [selectedMonth]);

  const getFormattedMonth = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  const fetchTrendData = async () => {
    setLoading(true);
    try {
      const formattedMonth = getFormattedMonth(selectedMonth);
      const res = await axiosInstance.get(
        `${API_PATHS.DASHBOARD.GET_TREND_SUMMARY}?month=${formattedMonth}`,
      );
      const monthData = res.data.data;
      setTrendData(monthData);

      // Calculate comparison metrics
      if (monthData.length > 0) {
        const avgIncome =
          monthData.reduce((sum, m) => sum + m.income, 0) / monthData.length;
        const avgExpense =
          monthData.reduce((sum, m) => sum + m.expense, 0) / monthData.length;
        const avgSavings =
          monthData.reduce((sum, m) => sum + m.savings, 0) / monthData.length;

        const highestSpendMonth = monthData.reduce((prev, current) =>
          prev.expense > current.expense ? prev : current,
        );
        const highestIncomeMonth = monthData.reduce((prev, current) =>
          prev.income > current.income ? prev : current,
        );

        setComparisonMetrics({
          avgIncome,
          avgExpense,
          avgSavings,
          highestSpendMonth: highestSpendMonth.monthDisplay,
          highestIncomeMonth: highestIncomeMonth.monthDisplay,
        });
      }
    } catch (error) {
      console.error("Error fetching trend data:", error);
    } finally {
      setLoading(false);
    }
  };

  const currentMonthData = trendData[trendData.length - 1];
  const previousMonthData = trendData[trendData.length - 2];

  const getExpenseChange = () => {
    if (!currentMonthData || !previousMonthData) return null;
    const change = currentMonthData.expense - previousMonthData.expense;
    const percentage =
      previousMonthData.expense > 0
        ? ((change / previousMonthData.expense) * 100).toFixed(1)
        : 0;
    return { change, percentage };
  };

  const getIncomeChange = () => {
    if (!currentMonthData || !previousMonthData) return null;
    const change = currentMonthData.income - previousMonthData.income;
    const percentage =
      previousMonthData.income > 0
        ? ((change / previousMonthData.income) * 100).toFixed(1)
        : 0;
    return { change, percentage };
  };

  const expenseChange = getExpenseChange();
  const incomeChange = getIncomeChange();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Common chart styling tokens
  const tickColor = isDark ? "#94a3b8" : "#6b7280";
  const gridColor = isDark ? "rgba(148,163,184,0.12)" : "#f3f4f6";

  // 1. Line Chart Data & Options (Income vs Expense)
  const lineChartData = {
    labels: trendData.map((item) => item.monthDisplay),
    datasets: [
      {
        label: "Income",
        data: trendData.map((item) => item.income),
        borderColor: "#10b981",
        backgroundColor: (context) => {
          if (!context.chart.chartArea) return "rgba(16, 185, 129, 0.1)";
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, "rgba(16, 185, 129, 0.3)");
          gradient.addColorStop(1, "rgba(16, 185, 129, 0)");
          return gradient;
        },
        tension: 0.4,
        fill: true,
        pointBackgroundColor: isDark ? "#1e293b" : "#fff",
        pointBorderColor: "#10b981",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: "Expense",
        data: trendData.map((item) => item.expense),
        borderColor: "#ef4444",
        backgroundColor: (context) => {
          if (!context.chart.chartArea) return "rgba(239, 68, 68, 0.1)";
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, "rgba(239, 68, 68, 0.3)");
          gradient.addColorStop(1, "rgba(239, 68, 68, 0)");
          return gradient;
        },
        tension: 0.4,
        fill: true,
        pointBackgroundColor: isDark ? "#1e293b" : "#fff",
        pointBorderColor: "#ef4444",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1000, easing: "easeOutQuart" },
    plugins: {
      legend: {
        display: true,
        position: "top",
        align: "end",
        labels: {
          color: isDark ? "#e2e8f0" : "#4b5563",
          usePointStyle: true,
          boxWidth: 8,
          font: { size: 11 },
        },
      },
      tooltip: {
        backgroundColor: isDark
          ? "rgba(15,23,42,0.95)"
          : "rgba(255,255,255,0.97)",
        titleColor: isDark ? "#f1f5f9" : "#1f2937",
        bodyColor: isDark ? "#cbd5e1" : "#374151",
        borderColor: isDark ? "#334155" : "#e5e7eb",
        borderWidth: 1,
        padding: 10,
        displayColors: true,
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) label += ": ";
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0,
              }).format(context.parsed.y);
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false, drawBorder: false },
        ticks: {
          color: tickColor,
          font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
        },
        border: { display: false },
      },
      y: {
        grid: { color: gridColor, borderDash: [5, 5] },
        ticks: {
          color: tickColor,
          font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
          callback: (value) => "₹" + addThousandsSeparator(value),
        },
        border: { display: false },
      },
    },
    interaction: { mode: "index", intersect: false },
  };

  // 2. Savings Bar Chart Data & Options
  const savingsChartData = {
    labels: trendData.map((item) => item.monthDisplay),
    datasets: [
      {
        label: "Savings",
        data: trendData.map((item) => item.savings),
        backgroundColor: "#3b82f6", // Blue
        borderRadius: 4,
        borderSkipped: false,
        barThickness: 20,
        maxBarThickness: 35,
      },
    ],
  };

  const savingsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1000, easing: "easeOutQuart" },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark
          ? "rgba(15,23,42,0.95)"
          : "rgba(255,255,255,0.97)",
        titleColor: isDark ? "#f1f5f9" : "#1f2937",
        bodyColor: isDark ? "#cbd5e1" : "#374151",
        borderColor: isDark ? "#334155" : "#e5e7eb",
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) label += ": ";
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0,
              }).format(context.parsed.y);
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false, drawBorder: false },
        ticks: {
          color: tickColor,
          font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
        },
        border: { display: false },
      },
      y: {
        grid: { color: gridColor, borderDash: [5, 5] },
        ticks: {
          color: tickColor,
          font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
          callback: (value) => "₹" + addThousandsSeparator(value),
        },
        border: { display: false },
      },
    },
  };

  // 3. Transactions Bar Chart Data & Options
  const transactionsChartData = {
    labels: trendData.map((item) => item.monthDisplay),
    datasets: [
      {
        label: "Transactions",
        data: trendData.map((item) => item.transactions),
        backgroundColor: "#8b5cf6", // Purple
        borderRadius: 4,
        borderSkipped: false,
        barThickness: 20,
        maxBarThickness: 35,
      },
    ],
  };

  const transactionsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 1000, easing: "easeOutQuart" },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark
          ? "rgba(15,23,42,0.95)"
          : "rgba(255,255,255,0.97)",
        titleColor: isDark ? "#f1f5f9" : "#1f2937",
        bodyColor: isDark ? "#cbd5e1" : "#374151",
        borderColor: isDark ? "#334155" : "#e5e7eb",
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: function (context) {
            return `${context.parsed.y} transactions`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false, drawBorder: false },
        ticks: {
          color: tickColor,
          font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
        },
        border: { display: false },
      },
      y: {
        grid: { color: gridColor, borderDash: [5, 5] },
        ticks: {
          color: tickColor,
          font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
          stepSize: 1,
        },
        border: { display: false },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Comparison Metrics */}
      <div className="flex md:grid md:grid-cols-2 lg:grid-cols-5 gap-4 overflow-x-auto md:overflow-x-visible pb-4 md:pb-0 no-scrollbar snap-x snap-mandatory">
        {/* Average Income */}
        <div className="card p-4 flex flex-col justify-between w-[75vw] md:w-auto shrink-0 snap-center">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
            Avg. Monthly Income
          </p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            ₹{addThousandsSeparator(Math.round(comparisonMetrics.avgIncome))}
          </p>
        </div>

        {/* Average Expense */}
        <div className="card p-4 flex flex-col justify-between w-[75vw] md:w-auto shrink-0 snap-center">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
            Avg. Monthly Expense
          </p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            ₹{addThousandsSeparator(Math.round(comparisonMetrics.avgExpense))}
          </p>
        </div>

        {/* Average Savings */}
        <div className="card p-4 flex flex-col justify-between w-[75vw] md:w-auto shrink-0 snap-center">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
            Avg. Monthly Savings
          </p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            ₹{addThousandsSeparator(Math.round(comparisonMetrics.avgSavings))}
          </p>
        </div>

        {/* Highest Spend Month */}
        <div className="card p-4 flex flex-col justify-between w-[75vw] md:w-auto shrink-0 snap-center">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
            Highest Spend
          </p>
          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
            {comparisonMetrics.highestSpendMonth}
          </p>
        </div>

        {/* Highest Income Month */}
        <div className="card p-4 flex flex-col justify-between w-[75vw] md:w-auto shrink-0 snap-center">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
            Highest Income
          </p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {comparisonMetrics.highestIncomeMonth}
          </p>
        </div>
      </div>

      {/* Month-over-Month Comparison */}
      {currentMonthData && previousMonthData && (
        <div className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto md:overflow-x-visible pb-4 md:pb-0 no-scrollbar snap-x snap-mandatory">
          {/* Income Change */}
          <div className="card p-5 w-[80vw] md:w-auto shrink-0 snap-center">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Income vs Last Month
                </p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  ₹{addThousandsSeparator(Math.abs(incomeChange.change))}
                </p>
              </div>
              <div
                className={`flex items-center gap-1 px-3 py-2 rounded-lg ${
                  incomeChange.change >= 0
                    ? "bg-green-100 dark:bg-green-900/30"
                    : "bg-red-100 dark:bg-red-900/30"
                }`}
              >
                {incomeChange.change >= 0 ? (
                  <TrendingUp
                    size={18}
                    className="text-green-600 dark:text-green-400"
                  />
                ) : (
                  <TrendingDown
                    size={18}
                    className="text-red-600 dark:text-red-400"
                  />
                )}
                <span
                  className={`text-xs font-semibold ${
                    incomeChange.change >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {incomeChange.change >= 0 ? "+" : "-"}
                  {Math.abs(incomeChange.percentage)}%
                </span>
              </div>
            </div>
          </div>

          {/* Expense Change */}
          <div className="card p-5 w-[80vw] md:w-auto shrink-0 snap-center">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Expense vs Last Month
                </p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  ₹{addThousandsSeparator(Math.abs(expenseChange.change))}
                </p>
              </div>
              <div
                className={`flex items-center gap-1 px-3 py-2 rounded-lg ${
                  expenseChange.change <= 0
                    ? "bg-green-100 dark:bg-green-900/30"
                    : "bg-red-100 dark:bg-red-900/30"
                }`}
              >
                {expenseChange.change <= 0 ? (
                  <TrendingDown
                    size={18}
                    className="text-green-600 dark:text-green-400"
                  />
                ) : (
                  <TrendingUp
                    size={18}
                    className="text-red-600 dark:text-red-400"
                  />
                )}
                <span
                  className={`text-xs font-semibold ${
                    expenseChange.change <= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {expenseChange.change <= 0 ? "-" : "+"}
                  {Math.abs(expenseChange.percentage)}%
                </span>
              </div>
            </div>
          </div>

          {/* Savings Change */}
          <div className="card p-5 w-[80vw] md:w-auto shrink-0 snap-center">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Savings vs Last Month
                </p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  ₹
                  {addThousandsSeparator(
                    Math.abs(
                      currentMonthData.savings - previousMonthData.savings,
                    ),
                  )}
                </p>
              </div>
              <div
                className={`flex items-center gap-1 px-3 py-2 rounded-lg ${
                  currentMonthData.savings - previousMonthData.savings >= 0
                    ? "bg-green-100 dark:bg-green-900/30"
                    : "bg-red-100 dark:bg-red-900/30"
                }`}
              >
                {currentMonthData.savings - previousMonthData.savings >= 0 ? (
                  <TrendingUp
                    size={18}
                    className="text-green-600 dark:text-green-400"
                  />
                ) : (
                  <TrendingDown
                    size={18}
                    className="text-red-600 dark:text-red-400"
                  />
                )}
                <span
                  className={`text-xs font-semibold ${
                    currentMonthData.savings - previousMonthData.savings >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {currentMonthData.savings - previousMonthData.savings >= 0
                    ? "+"
                    : "-"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trend Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expense Trend */}
        <div className="card p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            12-Month Income vs Expense Trend
          </h3>
          {trendData.length > 0 ? (
            <div className="h-[300px]">
              <Line data={lineChartData} options={lineOptions} />
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-12">
              No data available
            </p>
          )}
        </div>

        {/* Monthly Savings Trend */}
        <div className="card p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            12-Month Savings Trend
          </h3>
          {trendData.length > 0 ? (
            <div className="h-[300px]">
              <Bar data={savingsChartData} options={savingsOptions} />
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-12">
              No data available
            </p>
          )}
        </div>
      </div>

      {/* Transaction Volume Trend */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          Transaction Volume by Month
        </h3>
        {trendData.length > 0 ? (
          <div className="h-[250px]">
            <Bar data={transactionsChartData} options={transactionsOptions} />
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-12">
            No data available
          </p>
        )}
      </div>
    </div>
  );
};

export default MonthlyTrendAnalysis;
