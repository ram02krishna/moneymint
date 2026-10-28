import React, { useMemo } from "react";
import { LuPlus } from "react-icons/lu";
import {
  prepareExpenseLineChartData,
  CHART_COLORS,
  addThousandsSeparator,
  capitalize,
} from "../../utils/helper";
import ChartJsLineChart from "../Charts/ChartJsLineChart";
import ChartJsDoughnutChart from "../Charts/ChartJsDoughnutChart";

const ExpenseOverview = ({ transactions, onAddExpense }) => {
  const lineChartData = useMemo(
    () => prepareExpenseLineChartData(transactions),
    [transactions],
  );
  const categoryChartData = useMemo(() => {
    const map = {};
    (transactions || []).forEach((t) => {
      const k = capitalize(t.category || "Other");
      map[k] = (map[k] || 0) + (t.amount || 0);
    });
    return Object.entries(map)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const totalExpenseValue = useMemo(() => {
    return categoryChartData.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [categoryChartData]);

  const [chartView, setChartView] = React.useState("trend");

  return (
    <div className="card w-full">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
            Expense Overview
          </h5>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track your spending trends and category distribution.
          </p>
        </div>

        <button
          className="add-btn w-full md:w-auto flex-shrink-0"
          onClick={onAddExpense}
        >
          <LuPlus className="text-lg" />
          Add Expense
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
          className={`flex-1 py-1.5 px-2 text-sm font-medium rounded-md transition-all truncate ${chartView === "category" ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400"}`}
          onClick={() => setChartView("category")}
        >
          Breakdown
        </button>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div
          id="expense-line-chart"
          className={`${chartView === "trend" ? "block" : "hidden"} lg:block lg:col-span-2 bg-gray-50/50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700`}
        >
          <h6 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
            Spending Trend
          </h6>
          <div className="h-[220px] lg:h-[300px]">
            <ChartJsLineChart data={lineChartData} />
          </div>
        </div>

        <div
          id="expense-doughnut-chart"
          className={`${chartView === "category" ? "block" : "hidden"} lg:block bg-gray-50/50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col h-auto`}
        >
          <div className="flex items-center justify-between mb-4">
            <h6 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              Category Breakdown
            </h6>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
              By Category
            </span>
          </div>
          <div className="flex flex-col h-full">
            <div className="w-full h-[220px] lg:h-[260px] relative flex items-center justify-center shrink-0">
              {categoryChartData.length > 0 ? (
                <>
                  <ChartJsDoughnutChart
                    data={categoryChartData}
                    colors={CHART_COLORS}
                    showLegend={false}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      Total Expense
                    </span>
                    <span className="text-lg lg:text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      ₹{addThousandsSeparator(totalExpenseValue)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-gray-400 text-sm">No data available</div>
              )}
            </div>
            {categoryChartData.length > 0 && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto max-h-[160px] custom-scrollbar pr-2">
                {categoryChartData.map((item, index) => {
                  const pct =
                    totalExpenseValue > 0
                      ? Math.round((item.amount / totalExpenseValue) * 100)
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

export default ExpenseOverview;
