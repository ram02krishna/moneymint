import React, { memo } from "react";
import TransactionsTable from "../Transactions/TransactionsTable";
import { LuArrowRight } from "react-icons/lu";

const RecentTransactions = ({ transactions = [], onSeeMore }) => {
  // Sort transactions by date descending, handling various date formats
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = Date.parse(a.date) || 0;
    const dateB = Date.parse(b.date) || 0;
    return dateB - dateA;
  });

  return (
    <div className="card h-auto transition-all duration-300 ease-in-out flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h5 className="text-lg font-semibold text-gray-900 dark:text-white">
          Recent Transactions
        </h5>
        {onSeeMore && (
          <button className="card-btn" onClick={onSeeMore}>
            See All <LuArrowRight className="text-base" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <TransactionsTable
          data={sortedTransactions.slice(0, 5)}
          showActions={false}
        />
      </div>
    </div>
  );
};

export default memo(RecentTransactions);
