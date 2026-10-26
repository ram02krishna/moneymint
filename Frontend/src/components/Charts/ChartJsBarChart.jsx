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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

const ChartJsBarChart = ({ data }) => {
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
      label: "Budget",
      data: data.map((item) => item.amount),
      backgroundColor: "#8b5cf6",
      borderRadius: 4,
      borderSkipped: false,
      barThickness: hasActual ? 20 : 40,
      maxBarThickness: 50,
    },
  ];

  if (hasActual) {
    datasets.push({
      label: "Actual",
      data: data.map((item) => item.actual),
      backgroundColor: "#f59e0b",
      borderRadius: 4,
      borderSkipped: false,
      barThickness: 20,
      maxBarThickness: 50,
    });
  }

  const chartData = {
    labels: data.map(
      (item) => item?.name || item?.month || item?.source || item?.category,
    ),
    datasets,
  };

  const tickColor = isDark ? "#94a3b8" : "#6b7280";
  const gridColor = isDark ? "rgba(148,163,184,0.12)" : "#f3f4f6";

  const options = {
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
          callback: (value) => "₹" + value,
        },
        border: { display: false },
      },
    },
    interaction: { mode: "index", intersect: false },
  };

  return <Bar data={chartData} options={options} />;
};

export default ChartJsBarChart;
