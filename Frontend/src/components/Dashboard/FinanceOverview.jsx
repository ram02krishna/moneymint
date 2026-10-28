import React, { memo } from "react";
import ChartJsDoughnutChart from "../Charts/ChartJsDoughnutChart";
import { addThousandsSeparator } from "../../utils/helper";

const FINANCE_COLORS = ["#8b5cf6", "#ef4444", "#10b981"];

const FinanceOverview = ({ totalBalance = 0, totalIncome = 0, totalExpense = 0 }) => {
  const hasData = totalBalance !== 0 || totalIncome !== 0 || totalExpense !== 0;

  const balanceData = hasData
    ? [
        { name: "Total Balance", amount: totalBalance },
        { name: "Total Expenses", amount: totalExpense },
        { name: "Total Income", amount: totalIncome },
      ]
    : [];

  return (
    <div className="card h-auto min-h-[450px] transition-all duration-300 ease-in-out flex flex-col pb-6 w-full">
      <div className="flex items-center justify-between px-2 pt-2">
        <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
          Financial Overview
        </h5>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
          Overview
        </span>
      </div>

      <div className="w-full h-[220px] lg:h-[280px] mt-4 relative flex items-center justify-center shrink-0">
        <ChartJsDoughnutChart
          data={balanceData}
          colors={FINANCE_COLORS}
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

      {!hasData ? (
        <div className="flex-1 flex items-center justify-center text-center text-sm text-gray-400 dark:text-gray-500 py-6">
          No financial data for this month
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3 px-4 flex-1">
          {balanceData.map((item, index) => (
            <div key={item.name} className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 truncate">
                <span
                  className="shrink-0 w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: FINANCE_COLORS[index % FINANCE_COLORS.length],
                  }}
                />
                <span className="text-gray-700 dark:text-gray-300 truncate font-medium">
                  {item.name}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="font-bold text-gray-900 dark:text-white">
                  ₹{addThousandsSeparator(item.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default memo(FinanceOverview);

