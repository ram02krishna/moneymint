import React, { useContext } from "react";
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
import { ThemeContext } from "../../context/ThemeContext";
import { addThousandsSeparator } from "../../utils/helper";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

const ChartJsBarChart = ({ data, label = "Income", color = "#10b981" }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
        No data available
      </div>
    );
  }

  const hasActual = data.some((item) => item.actual !== undefined);

  const datasets = [
    {
      label: label,
      data: data.map((item) => item.amount),
      backgroundColor: color,
      hoverBackgroundColor: color + "dd",
      borderRadius: 6,
      borderSkipped: false,
      barThickness: data.length <= 3 ? 36 : hasActual ? 20 : undefined,
      maxBarThickness: 48,
    },
  ];

  if (hasActual) {
    datasets.push({
      label: "Actual",
      data: data.map((item) => item.actual),
      backgroundColor: "#f59e0b",
      borderRadius: 6,
      borderSkipped: false,
      barThickness: 20,
      maxBarThickness: 48,
    });
  }

  const chartData = {
    labels: data.map(
      (item) => item?.name || item?.month || item?.source || item?.category,
    ),
    datasets,
  };

  const tickColor = isDark ? "#94a3b8" : "#6b7280";
  const gridColor = isDark ? "rgba(148,163,184,0.12)" : "rgba(226,232,240,0.6)";

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: "easeOutQuart" },
    plugins: {
      legend: {
        display: true,
        position: "top",
        align: "end",
        labels: {
          color: isDark ? "#e2e8f0" : "#4b5563",
          usePointStyle: true,
          boxWidth: 8,
          boxHeight: 8,
          font: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: "600" },
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: isDark
          ? "rgba(15,23,42,0.96)"
          : "rgba(255,255,255,0.98)",
        titleColor: isDark ? "#f1f5f9" : "#1f2937",
        bodyColor: isDark ? "#cbd5e1" : "#374151",
        borderColor: isDark ? "#334155" : "#e5e7eb",
        borderWidth: 1,
        padding: 10,
        displayColors: true,
        usePointStyle: true,
        callbacks: {
          label: function (context) {
            let itemLabel = context.dataset.label || "Amount";
            const val = context.parsed.y ?? context.raw ?? 0;
            return ` ${itemLabel}: ₹${addThousandsSeparator(val)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false, drawBorder: false },
        ticks: {
          color: tickColor,
          font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: "500" },
        },
        border: { display: false },
      },
      y: {
        grid: { color: gridColor, borderDash: [4, 4] },
        ticks: {
          color: tickColor,
          font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
          callback: (value) => {
            const a = Math.abs(value);
            if (a >= 10000000) return "₹" + (value / 10000000).toFixed(1) + "Cr";
            if (a >= 100000) return "₹" + (value / 100000).toFixed(1) + "L";
            if (a >= 1000) return "₹" + addThousandsSeparator(value);
            return "₹" + value;
          },
        },
        border: { display: false },
      },
    },
    interaction: { mode: "index", intersect: false },
  };

  return <Bar data={chartData} options={options} />;
};

export default ChartJsBarChart;
