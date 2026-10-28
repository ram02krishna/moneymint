import React, { useMemo } from "react";
import { LuPlus } from "react-icons/lu";
import {
  prepareIncomeBarChartData,
  CHART_COLORS,
  addThousandsSeparator,
  capitalize,
} from "../../utils/helper";
import ChartJsBarChart from "../Charts/ChartJsBarChart";
import ChartJsDoughnutChart from "../Charts/ChartJsDoughnutChart";

const IncomeOverview = ({ transactions, onAddIncome }) => {
  const barChartData = useMemo(
    () => prepareIncomeBarChartData(transactions),
    [transactions],
  );

  const sourceChartData = useMemo(() => {
    const map = {};
    (transactions || []).forEach((t) => {
      const k = capitalize(t.source || t.category || "Other");
      map[k] = (map[k] || 0) + (t.amount || 0);
    });
    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const totalIncomeValue = useMemo(() => {
    return sourceChartData.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [sourceChartData]);

  const [chartView, setChartView] = React.useState("trend");

  return (
    <div className="card w-full">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
            Income Overview
          </h5>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track your earnings and analyze income sources.
          </p>
        </div>

        <button
          className="add-btn w-full md:w-auto flex-shrink-0"
          onClick={onAddIncome}
        >
          <LuPlus className="text-lg" />
          Add Income
        </button>
      </div>

      {/* Mobile Tabs */}
      <div className="flex w-full lg:hidden bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mb-6">
        <button
          className={`flex-1 py-1.5 px-2 text-sm font-medium rounded-md transition-all truncate ${chartView === "trend" ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"}`}
          onClick={() => setChartView("trend")}
        >
          Trend
        </button>
        <button
          className={`flex-1 py-1.5 px-2 text-sm font-medium rounded-md transition-all truncate ${chartView === "source" ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"}`}
          onClick={() => setChartView("source")}
        >
          Sources
        </button>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Bar Chart Section */}
        <div
          id="income-bar-chart"
          className={`${chartView === "trend" ? "block" : "hidden"} lg:block lg:col-span-2 bg-gray-50/50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700`}
        >
          <h6 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
            Income Trend
          </h6>
          <div className="h-[220px] lg:h-[300px]">
            <ChartJsBarChart data={barChartData} />
          </div>
        </div>

        {/* Doughnut Chart Section */}
        <div
          id="income-doughnut-chart"
          className={`${chartView === "source" ? "block" : "hidden"} lg:block bg-gray-50/50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col h-auto`}
        >
          <div className="flex items-center justify-between mb-4">
            <h6 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Income Sources
            </h6>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              By Source
            </span>
          </div>
          <div className="flex flex-col h-full">
            <div className="w-full h-[220px] lg:h-[260px] relative flex items-center justify-center shrink-0">
              {sourceChartData.length > 0 ? (
                <>
                  <ChartJsDoughnutChart
                    data={sourceChartData}
                    colors={CHART_COLORS}
                    showLegend={false}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      Total Income
                    </span>
                    <span className="text-lg lg:text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      ₹{addThousandsSeparator(totalIncomeValue)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-gray-400 text-sm">No data available</div>
              )}
            </div>

            {sourceChartData.length > 0 && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto max-h-[160px] custom-scrollbar pr-2">
                {sourceChartData.map((item, index) => {
                  const pct =
                    totalIncomeValue > 0
                      ? Math.round((item.amount / totalIncomeValue) * 100)
                      : 0;
                  return (
                    <div
                      key={item.name}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              CHART_COLORS[index % CHART_COLORS.length],
                          }}
                        />
                        <span
                          className="text-gray-700 dark:text-gray-300 truncate font-medium"
                          title={item.name}
                        >
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
        </div>
      </div>
    </div>
  );
};

export default IncomeOverview;
