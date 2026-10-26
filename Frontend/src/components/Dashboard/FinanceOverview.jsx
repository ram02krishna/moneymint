import React, { memo } from "react";
import ChartJsDoughnutChart from "../Charts/ChartJsDoughnutChart";
import { addThousandsSeparator, CHART_COLORS } from "../../utils/helper";

const FinanceOverview = ({ totalBalance, totalIncome, totalExpense }) => {
  const hasData = totalBalance !== 0 || totalIncome !== 0 || totalExpense !== 0;

  const balanceData = hasData
    ? [
        { name: "Total Balance", amount: totalBalance },
        { name: "Total Expenses", amount: totalExpense },
        { name: "Total Income", amount: totalIncome },
      ]
    : [];

  return (
    <div className="card h-auto min-h-[450px] lg:min-h-[520px] transition-all duration-300 ease-in-out flex flex-col pb-6">
      <div className="flex items-center justify-between px-2 pt-2">
        <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
          Financial Overview
        </h5>
      </div>
      <div className="w-full h-[220px] lg:h-[300px] mt-4 relative flex items-center justify-center shrink-0">
        <ChartJsDoughnutChart
          data={balanceData}
          colors={CHART_COLORS}
          showLegend={false}
        />
        {hasData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Total Balance
            </span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              ₹{addThousandsSeparator(totalBalance)}
            </span>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3 px-4">
        {balanceData.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <span
              className="shrink-0 w-3 h-3 rounded-full"
              style={{
                backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
              }}
            />
            <span className="text-xs text-gray-600 dark:text-gray-300 truncate">
              {item.name}: ₹{addThousandsSeparator(item.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default memo(FinanceOverview);
