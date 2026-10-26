import React, { useMemo } from "react";
import { addThousandsSeparator, CHART_COLORS } from "../../utils/helper";
import ChartJsPieChart from "../Charts/ChartJsPieChart";

const MonthlyAnalytics = ({ monthlyData, monthName }) => {
  if (!monthlyData) return null;

  const { expenseByCategory = [], incomeBySource = [] } = monthlyData;

  const expenseChartData = useMemo(() => {
    return expenseByCategory.map((item) => ({
      name: item._id || "Other",
      value: item.totalAmount,
    }));
  }, [expenseByCategory]);

  const incomeChartData = useMemo(() => {
    return incomeBySource.map((item) => ({
      name: item._id || "Other",
      value: item.totalAmount,
    }));
  }, [incomeBySource]);

  return (
    <div className="card w-full">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
            Category Breakdown
          </h5>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Analyze your income sources and spending distribution by category
            for {monthName || "this month"}.
          </p>
        </div>
      </div>

      {/* Charts Side-by-Side Grid */}
      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 w-full">
        {/* Expense Breakdown Card */}
        <div className="bg-gray-50/50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col h-auto w-full shrink-0 snap-center">
          <h6 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
            Expense Breakdown by Category
          </h6>
          <div className="flex flex-col h-full">
            <div className="w-full h-[220px] lg:h-[300px] relative flex items-center justify-center shrink-0">
              {expenseChartData.length > 0 ? (
                <>
                  <ChartJsPieChart
                    data={expenseChartData}
                    colors={CHART_COLORS}
                    showLegend={false}
                    donut={true}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6">
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                      Total Expense
                    </span>
                    <span className="text-lg lg:text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      ₹{addThousandsSeparator(monthlyData.totalExpense ?? 0)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-gray-400 text-sm">
                  No expense data available
                </div>
              )}
            </div>

            {expenseChartData.length > 0 && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto max-h-[150px] custom-scrollbar pr-2">
                {expenseChartData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          CHART_COLORS[index % CHART_COLORS.length],
                      }}
                    />
                    <span
                      className="text-xs text-gray-600 dark:text-gray-300 truncate"
                      title={item.name}
                    >
                      {item.name}:{" "}
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                      }).format(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Income Breakdown Card */}
        <div className="bg-gray-50/50 dark:bg-gray-700/50 p-6 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col h-auto w-full shrink-0 snap-center">
          <h6 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4">
            Income Breakdown by Source
          </h6>
          <div className="flex flex-col h-full">
            <div className="w-full h-[220px] lg:h-[300px] relative flex items-center justify-center shrink-0">
              {incomeChartData.length > 0 ? (
                <>
                  <ChartJsPieChart
                    data={incomeChartData}
                    colors={CHART_COLORS}
                    showLegend={false}
                    donut={true}
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6">
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                      Total Income
                    </span>
                    <span className="text-lg lg:text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      ₹{addThousandsSeparator(monthlyData.totalIncome ?? 0)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-gray-400 text-sm">
                  No income data available
                </div>
              )}
            </div>

            {incomeChartData.length > 0 && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto max-h-[150px] custom-scrollbar pr-2">
                {incomeChartData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          CHART_COLORS[index % CHART_COLORS.length],
                      }}
                    />
                    <span
                      className="text-xs text-gray-600 dark:text-gray-300 truncate"
                      title={item.name}
                    >
                      {item.name}:{" "}
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                      }).format(item.value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyAnalytics;
