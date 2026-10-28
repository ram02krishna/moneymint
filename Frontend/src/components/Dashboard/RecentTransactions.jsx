import React, { memo } from "react";
import TransactionsTable from "../Transactions/TransactionsTable";
import DashboardWidget from "./DashboardWidget";

const RecentTransactions = ({ transactions = [], onSeeMore }) => {
  // Sort transactions by date descending, handling various date formats
  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = Date.parse(a.date) || 0;
    const dateB = Date.parse(b.date) || 0;
    return dateB - dateA;
  });

  return (
    <DashboardWidget title="Recent Transactions" onSeeMore={onSeeMore} className="min-h-0">
      <TransactionsTable
        data={sortedTransactions.slice(0, 5)}
        showActions={false}
      />
    </DashboardWidget>
  );
};

export default memo(RecentTransactions);
