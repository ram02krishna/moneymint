import { useMemo, memo } from "react";
import ChartJsPieChart from "../Charts/ChartJsPieChart";
import { formatCurrency, capitalize, CHART_COLORS } from "../../utils/helper";

// Donut + legend for a month's income (by source) or expenses (by category).
// `config` comes from RECORD_TYPES, `total` is the month total when the API provides one.
const BreakdownCard = ({ config, transactions = [], total: knownTotal = 0 }) => {
  const chartData = useMemo(() => {
    const totals = {};
    transactions.forEach((t) => {
      const key = capitalize(config.groupBy(t));
      totals[key] = (totals[key] || 0) + (t.amount || 0);
    });
    return Object.entries(totals)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, config]);

  const total = knownTotal || chartData.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="card min-h-[450px] flex flex-col pb-6 w-full">
      <div className="flex items-center justify-between px-2 pt-2">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{config.label} Overview</h2>
        <span className={`badge ${config.tagClass}`}>{config.breakdownTag}</span>
      </div>

      <div className="w-full h-[220px] lg:h-[280px] mt-4 relative flex items-center justify-center shrink-0">
        <ChartJsPieChart donut data={chartData} colors={CHART_COLORS} showLegend={false} />
        {chartData.length > 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{config.totalLabel}</span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(total)}</span>
          </div>
        )}
      </div>

      {chartData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center text-sm text-gray-400 dark:text-gray-500 py-6">
          No {config.singular} recorded this month
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3 px-4 flex-1">
          {chartData.slice(0, 6).map((item, index) => (
            <li key={item.name} className="flex items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-2 truncate">
                <span className="shrink-0 w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                <span className="text-gray-700 dark:text-gray-300 truncate font-medium">{item.name}</span>
              </span>
              <span className="text-right shrink-0">
                <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(item.amount)}</span>
                <span className="text-gray-400 dark:text-gray-500 ml-1">({total > 0 ? Math.round((item.amount / total) * 100) : 0}%)</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default memo(BreakdownCard);
