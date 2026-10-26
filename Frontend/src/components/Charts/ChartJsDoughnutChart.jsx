import React, { useContext } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { ThemeContext } from "../../context/ThemeContext";
import { CHART_COLORS } from "../../utils/helper";

ChartJS.register(ArcElement, Tooltip, Legend);

if (!Tooltip.positioners.cursor) {
  Tooltip.positioners.cursor = function (_items, eventPos) {
    return { x: eventPos.x, y: eventPos.y };
  };
}

const ChartJsDoughnutChart = ({ data, colors, showLegend = true }) => {
  const { theme } = useContext(ThemeContext);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
        No data available
      </div>
    );
  }

  const defaultColors = CHART_COLORS;

  const chartData = {
    labels: data.map((item) => item.name || item.category || item.source),
    datasets: [
      {
        data: data.map((item) => item.amount || item.value),
        backgroundColor: colors || defaultColors,
        borderColor: theme === "dark" ? "#1f2937" : "#ffffff",
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "75%",
    animation: { duration: 1000, easing: "easeOutQuart" },
    plugins: {
      legend: {
        display: showLegend,
        position: "bottom",
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          padding: 20,
          font: {
            family: "'Plus Jakarta Sans', sans-serif",
            size: 12,
          },
          color: theme === "dark" ? "#e2e8f0" : "#4b5563",
        },
      },
      tooltip: {
        position: "cursor",
        backgroundColor:
          theme === "dark" ? "rgba(30,41,59,0.95)" : "rgba(255,255,255,0.95)",
        titleColor: theme === "dark" ? "#f1f5f9" : "#1f2937",
        bodyColor: theme === "dark" ? "#cbd5e1" : "#1f2937",
        borderColor: theme === "dark" ? "#334155" : "#e5e7eb",
        borderWidth: 1,
        padding: 10,
        caretSize: 6,
        callbacks: {
          label: function (context) {
            let label = context.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed !== null) {
              label += new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
              }).format(context.parsed);
            }
            return label;
          },
        },
      },
    },
  };

  return <Doughnut data={chartData} options={options} />;
};

export default ChartJsDoughnutChart;
