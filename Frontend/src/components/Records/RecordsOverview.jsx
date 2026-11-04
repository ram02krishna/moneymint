import { useMemo, useState } from "react";
import { LuPlus } from "react-icons/lu";
import { prepareDailyTotals, CHART_COLORS, formatCurrency, capitalize } from "../../utils/helper";
import ChartJsBarChart from "../Charts/ChartJsBarChart";
import ChartJsPieChart from "../Charts/ChartJsPieChart";

const PANEL = "bg-gray-50/50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700";

/**
 * Trend + breakdown charts for the month's income or expenses, with the "Add" button.
 * The chart wrappers carry ids so the PDF export can capture them.
 */
const RecordsOverview = ({ config, transactions, onAdd }) => {
  const [view, setView] = useState("trend"); // phones show one chart at a time

  const trendData = useMemo(() => prepareDailyTotals(transactions), [transactions]);

  const breakdown = useMemo(() => {
    const totals = {};
    (transactions || []).forEach((t) => {
      const key = capitalize(config.groupBy(t));
      totals[key] = (totals[key] || 0) + (t.amount || 0);
    });
    return Object.entries(totals)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions, config]);

  const total = breakdown.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="card w-full">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{config.label} Overview</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{config.overviewHint}</p>
        </div>
        <button type="button" className="add-btn add-btn-fill w-full md:w-auto shrink-0" onClick={onAdd}>
          <LuPlus className="text-lg" />
          Add {config.label}
        </button>
      </div>

      <div className="flex w-full lg:hidden bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mb-6" role="tablist">
        {[
          ["trend", "Trend"],
          ["breakdown", config.breakdownTab],
        ].map(([id, text]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={`tab-pill flex-1 truncate ${view === id ? "tab-pill-active" : ""}`}
          >
            {text}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div id={`${config.type}-trend-chart`} className={`${view === "trend" ? "block" : "hidden"} lg:block lg:col-span-2 ${PANEL}`}>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">{config.trendTitle}</h3>
          <div className="h-[220px] lg:h-[300px]">
            <ChartJsBarChart data={trendData} label={config.label} color={config.color} />
          </div>
        </div>

        <div id={`${config.type}-breakdown-chart`} className={`${view === "breakdown" ? "block" : "hidden"} lg:block ${PANEL}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{config.breakdownTitle}</h3>
            <span className={`badge ${config.tagClass}`}>{config.breakdownTag}</span>
          </div>

          <div className="w-full h-[220px] lg:h-[260px] relative flex items-center justify-center">
            {breakdown.length > 0 ? (
              <>
                <ChartJsPieChart donut data={breakdown} colors={CHART_COLORS} showLegend={false} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6">
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{config.totalLabel}</span>
                  <span className="text-lg lg:text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(total)}</span>
                </div>
              </>
            ) : (
              <div className="text-gray-400 text-sm">No data available</div>
            )}
          </div>

          {breakdown.length > 0 && (
            <ul className="mt-4 space-y-2 overflow-y-auto max-h-[160px] custom-scrollbar pr-2">
              {breakdown.map((item, index) => (
                <li key={item.name} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                    <span className="text-gray-700 dark:text-gray-300 truncate font-medium" title={item.name}>
                      {item.name}
                    </span>
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
      </div>
    </div>
  );
};

export default RecordsOverview;
