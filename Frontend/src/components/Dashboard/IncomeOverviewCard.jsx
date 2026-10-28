import React, { useMemo, memo } from "react";
import ChartJsDoughnutChart from "../Charts/ChartJsDoughnutChart";
import { addThousandsSeparator, capitalize, CHART_COLORS } from "../../utils/helper";

const IncomeOverviewCard = ({ transactions = [], totalIncome = 0 }) => {
  const chartData = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      const k = capitalize(t.source || t.category || "Other");
      map[k] = (map[k] || 0) + (t.amount || 0);
    });
    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const total = totalIncome || chartData.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="card h-auto min-h-[450px] transition-all duration-300 ease-in-out flex flex-col pb-6 w-full">
      <div className="flex items-center justify-between px-2 pt-2">
        <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
          Income Overview
        </h5>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
          By Source
        </span>
      </div>

      <div className="w-full h-[220px] lg:h-[280px] mt-4 relative flex items-center justify-center shrink-0">
        <ChartJsDoughnutChart
          data={chartData}
          colors={CHART_COLORS}
          showLegend={false}
        />
        {chartData.length > 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Total Income
            </span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              ₹{addThousandsSeparator(total)}
            </span>
          </div>
        )}
      </div>

      {chartData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center text-sm text-gray-400 dark:text-gray-500 py-6">
          No income recorded this month
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3 px-4 flex-1">
          {chartData.slice(0, 6).map((item, index) => {
            const pct = total > 0 ? Math.round((item.amount / total) * 100) : 0;
            return (
              <div key={item.name} className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="shrink-0 w-3 h-3 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="text-gray-700 dark:text-gray-300 truncate font-medium">
                    {item.name}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-gray-900 dark:text-white">
                    ₹{addThousandsSeparator(item.amount)}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500 ml-1">
                    ({pct}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default memo(IncomeOverviewCard);

