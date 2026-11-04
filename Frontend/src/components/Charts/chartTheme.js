import { addThousandsSeparator } from "../../utils/helper";

// Shared look for every Chart.js chart, so light/dark colours and fonts only live here.
const CHART_FONT = "'Plus Jakarta Sans', sans-serif";

export const getChartTheme = (isDark) => ({
  tick: isDark ? "#94a3b8" : "#6b7280",
  grid: isDark ? "rgba(148,163,184,0.12)" : "rgba(226,232,240,0.6)",
  legend: isDark ? "#e2e8f0" : "#4b5563",
  surface: isDark ? "#1f2937" : "#ffffff",
});

export const getTooltipStyle = (isDark) => ({
  backgroundColor: isDark ? "rgba(15,23,42,0.96)" : "rgba(255,255,255,0.98)",
  titleColor: isDark ? "#f1f5f9" : "#1f2937",
  bodyColor: isDark ? "#cbd5e1" : "#374151",
  borderColor: isDark ? "#334155" : "#e5e7eb",
  borderWidth: 1,
  padding: 10,
  usePointStyle: true,
});

export const getLegendLabels = (isDark) => ({
  color: getChartTheme(isDark).legend,
  usePointStyle: true,
  boxWidth: 8,
  boxHeight: 8,
  padding: 12,
  font: { family: CHART_FONT, size: 12, weight: "600" },
});

// 1,20,000 -> ₹1.2L on the axis, full figure in tooltips
const formatAxisAmount = (value) => {
  const abs = Math.abs(value);
  if (abs >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `₹${addThousandsSeparator(value)}`;
  return `₹${value}`;
};

// Shared y-axis/x-axis definition for the cartesian (bar/line) charts
export const getCartesianScales = (isDark) => {
  const theme = getChartTheme(isDark);
  return {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { color: theme.tick, font: { family: CHART_FONT, size: 11, weight: "500" } },
    },
    y: {
      grid: { color: theme.grid, borderDash: [4, 4] },
      border: { display: false },
      ticks: { color: theme.tick, font: { family: CHART_FONT, size: 11 }, callback: formatAxisAmount },
    },
  };
};
