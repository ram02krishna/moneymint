import React from "react";
import TransactionsTable from "../Transactions/TransactionsTable";
import DashboardWidget from "./DashboardWidget";

const RecentIncome = ({ transactions, onSeeMore, className = "" }) => {
  return (
    <DashboardWidget title="Income" onSeeMore={onSeeMore} className={className}>
      <TransactionsTable
        data={transactions?.slice(0, 5)}
        showActions={false}
        type="income"
      />
    </DashboardWidget>
  );
};

export default RecentIncome;
