import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { Bar } from "react-chartjs-2";
import { useTheme } from "../../hooks/useTheme";
import { addThousandsSeparator } from "../../utils/helper";
import { getCartesianScales, getLegendLabels, getTooltipStyle } from "./chartTheme";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// data: [{ month | name, amount, actual? }]. `actual` adds a second series (budget vs actual).
const ChartJsBarChart = ({ data, label = "Income", color = "#10b981" }) => {
  const isDark = useTheme().theme === "dark";

  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">No data available</div>;
  }

  const hasActual = data.some((item) => item.actual !== undefined);
  const bar = { borderRadius: 6, borderSkipped: false, maxBarThickness: 48 };

  const datasets = [
    {
      ...bar,
      label,
      data: data.map((item) => item.amount),
      backgroundColor: color,
      hoverBackgroundColor: `${color}dd`,
      barThickness: data.length <= 3 ? 36 : hasActual ? 20 : undefined,
    },
  ];

  if (hasActual) {
    datasets.push({ ...bar, label: "Actual", data: data.map((item) => item.actual), backgroundColor: "#f59e0b", barThickness: 20 });
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: "easeOutQuart" },
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: true, position: "top", align: "end", labels: getLegendLabels(isDark) },
      tooltip: {
        ...getTooltipStyle(isDark),
        callbacks: {
          label: (context) => ` ${context.dataset.label || "Amount"}: ₹${addThousandsSeparator(context.parsed.y ?? 0)}`,
        },
      },
    },
    scales: getCartesianScales(isDark),
  };

  return (
    <Bar
      data={{ labels: data.map((item) => item?.name || item?.month), datasets }}
      options={options}
    />
  );
};

export default ChartJsBarChart;
