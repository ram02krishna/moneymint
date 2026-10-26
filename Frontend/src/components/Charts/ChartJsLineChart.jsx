import React, { useContext } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { ThemeContext } from "../../context/ThemeContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const ChartJsLineChart = ({ data }) => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === "dark";

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
        No data available
      </div>
    );
  }

  const chartData = {
    labels: data.map((item) => item?.name || item?.month || item?.category),
    datasets: [
      {
        label: "Amount",
        data: data.map((item) => item.amount),
        borderColor: "#8b5cf6",
        backgroundColor: (context) => {
          if (!context.chart.chartArea) {
            return "rgba(139, 92, 246, 0.2)";
          }
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, "rgba(139, 92, 246, 0.5)");
          gradient.addColorStop(1, "rgba(139, 92, 246, 0)");
          return gradient;
        },
        tension: 0.4,
        fill: true,
        pointBackgroundColor: isDark ? "#1e293b" : "#fff",
        pointBorderColor: "#8b5cf6",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const tickColor = isDark ? "#94a3b8" : "#6b7280";
  const gridColor = isDark ? "rgba(148,163,184,0.12)" : "#f3f4f6";

  const options = {
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
        displayColors: false,
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

  return <Line data={chartData} options={options} />;
};

export default ChartJsLineChart;
