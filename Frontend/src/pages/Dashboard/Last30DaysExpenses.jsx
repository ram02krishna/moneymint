import React, { useMemo, memo } from "react";
import ChartJsDoughnutChart from "../../components/Charts/ChartJsDoughnutChart";
import {
  addThousandsSeparator,
  prepareTitleAndCategoryData,
  CHART_COLORS,
} from "../../utils/helper";

const Last30DaysExpenses = ({ data }) => {
  const chartData = useMemo(
    () => prepareTitleAndCategoryData(data) || [],
    [data],
  );
  const totalExpense = useMemo(
    () => data?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0,
    [data],
  );

  return (
    <div className="card h-auto min-h-[450px] transition-all duration-300 ease-in-out flex flex-col pb-6 w-full shrink-0 snap-center">
      <div className="flex items-center justify-between px-2 pt-2">
        <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
          Last 30 Days Expenses
        </h5>
      </div>

      <div className="w-full h-[220px] lg:h-[300px] mt-4 relative flex items-center justify-center shrink-0">
        <ChartJsDoughnutChart
          data={chartData}
          colors={CHART_COLORS}
          showLegend={false}
        />

        {chartData.length > 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Total Expense
            </span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              ₹{addThousandsSeparator(totalExpense)}
            </span>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3 px-4">
        {chartData.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <span
              className="shrink-0 w-3 h-3 rounded-full"
              style={{
                backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
              }}
            />
            <span className="text-xs text-gray-600 dark:text-gray-300 truncate">
              {item.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default memo(Last30DaysExpenses);
