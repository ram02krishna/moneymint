import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Pie, Doughnut } from "react-chartjs-2";
import { useTheme } from "../../hooks/useTheme";
import { CHART_COLORS, formatCurrency } from "../../utils/helper";
import { getChartTheme, getLegendLabels, getTooltipStyle } from "./chartTheme";

ChartJS.register(ArcElement, Tooltip, Legend);

// Lets the tooltip follow the cursor instead of the slice centre
if (!Tooltip.positioners.cursor) {
  Tooltip.positioners.cursor = (_items, eventPos) => ({ x: eventPos.x, y: eventPos.y });
}

// data: [{ name | category, amount | value }]. `donut` turns the pie into a ring.
const ChartJsPieChart = ({ data, colors = CHART_COLORS, showLegend = true, donut = false }) => {
  const isDark = useTheme().theme === "dark";

  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">No data available</div>;
  }

  const chartData = {
    labels: data.map((item) => item.name || item.category),
    datasets: [
      {
        data: data.map((item) => item.amount ?? item.value),
        backgroundColor: colors,
        borderColor: getChartTheme(isDark).surface,
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: donut ? "75%" : "0%",
    animation: { duration: 800, easing: "easeOutQuart" },
    plugins: {
      legend: {
        display: showLegend,
        position: "bottom",
        labels: { ...getLegendLabels(isDark), pointStyle: "circle", padding: 20, font: { size: 12 } },
      },
      tooltip: {
        ...getTooltipStyle(isDark),
        position: "cursor",
        callbacks: { label: (context) => ` ${context.label}: ${formatCurrency(context.parsed)}` },
      },
    },
  };

  const Chart = donut ? Doughnut : Pie;
  return <Chart data={chartData} options={options} />;
};

export default ChartJsPieChart;
