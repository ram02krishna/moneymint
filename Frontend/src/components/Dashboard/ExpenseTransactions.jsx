import React from "react";
import TransactionsTable from "../Transactions/TransactionsTable";
import DashboardWidget from "./DashboardWidget";

const ExpenseTransactions = ({ transactions, onSeeMore }) => {
  return (
    <DashboardWidget title="Expenses" onSeeMore={onSeeMore}>
      <TransactionsTable
        data={transactions?.slice(0, 5)}
        showActions={false}
        type="expense"
      />
    </DashboardWidget>
  );
};

export default ExpenseTransactions;
