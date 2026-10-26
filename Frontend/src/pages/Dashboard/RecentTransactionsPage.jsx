// src/pages/Dashboard/RecentTransactionsPage.jsx
import React, { useEffect, useState, useCallback, useContext } from "react";
import { UserContext } from "../../context/UserContextDefinition";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import LoadingSpinner from "../../components/LoadingSpinner";
import TransactionInfoCard from "../../components/Cards/TransactionInfoCard";
import MonthSelector from "../../components/Dashboard/MonthSelector";

import { LuDownload, LuFileText } from "react-icons/lu";
import TransactionsTable from "../../components/Transactions/TransactionsTable";
import { generatePDF } from "../../utils/pdfGenerator";
import { getCachedData, setCachedData } from "../../utils/apiCache";

// RecentTransactionsPage component
let RecentTransactionsPage = () => {
  // State variables for transaction data and loading state
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { selectedMonth, setSelectedMonth } = useContext(UserContext);

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(15); // Show 15 items per page

  // download to excel
  const handleDownloadExcel = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(
        API_PATHS.TRANSACTIONS.DOWNLOAD_EXCEL,
        {
          responseType: "blob",
        },
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "transactions.xlsx"); // Set the file name
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url); // Clean up the URL object
    } catch (error) {
      console.error("Error downloading transactions:", error);
      setError("Failed to download transaction data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Format month to YYYY-MM format
  const getFormattedMonth = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  // fetch transactions for month
  const fetchAllTransactions = useCallback(async () => {
    const formattedMonth = getFormattedMonth(selectedMonth);
    const cacheKey = `${API_PATHS.TRANSACTIONS.GET_ALL_TRANSACTIONS}?month=${formattedMonth}&page=${page}&limit=${limit}`;
    const cached = getCachedData(cacheKey);

    if (cached) {
      setTransactions(cached.data.transactions);
      if (cached.data.pagination) {
        setTotalPages(cached.data.pagination.totalPages);
      }
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await axiosInstance.get(cacheKey);
      if (response.data && response.data.data.transactions) {
        setCachedData(cacheKey, response.data);
        setTransactions(response.data.data.transactions);

        // Update pagination info
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.totalPages);
        }
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      if (!cached) {
        setError("Failed to load transaction data. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [page, selectedMonth]);

  // Fetch transaction data on component mount and when month changes
  useEffect(() => {
    setPage(1); // Reset to page 1 on month change
    fetchAllTransactions();
  }, [selectedMonth, fetchAllTransactions]);

  // Fetch when page changes
  useEffect(() => {
    fetchAllTransactions();
  }, [page, fetchAllTransactions]);

  const handleMonthChange = (newDate) => {
    setSelectedMonth(newDate);
  };

  return (
    <DashboardLayout activeMenu="Transactions">
      <div className="w-full max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Transactions
          </h1>

          <div className="flex gap-2">
            <button
              className="card-btn"
              onClick={() =>
                generatePDF(
                  "Transaction Report",
                  transactions,
                  [],
                  "transaction",
                )
              }
            >
              <LuFileText className="text-base" /> PDF
            </button>
            <button className="card-btn" onClick={handleDownloadExcel}>
              <LuDownload className="text-base" /> Excel
            </button>
          </div>
        </div>

        {/* MONTH SELECTOR */}
        <div className="mb-8">
          <MonthSelector
            selectedMonth={selectedMonth}
            onMonthChange={handleMonthChange}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <LoadingSpinner text="Loading transaction data..." />
          </div>
        ) : error ? (
          <div className="card">
            <div className="text-center text-red-500 py-8">
              <p>{error}</p>
              <button
                onClick={fetchAllTransactions}
                className="mt-4 btn-primary"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="w-full">
              <div className="card">
                <TransactionsTable data={transactions} showActions={false} />

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3 sm:px-6 mt-4">
                    <div className="flex flex-1 justify-between sm:hidden">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 ${page === 1 ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        Previous
                      </button>
                      <button
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={page === totalPages}
                        className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 ${page === totalPages ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          Showing page{" "}
                          <span className="font-medium">{page}</span> of{" "}
                          <span className="font-medium">{totalPages}</span>
                        </p>
                      </div>
                      <div>
                        <nav
                          className="isolate inline-flex -space-x-px rounded-md shadow-sm"
                          aria-label="Pagination"
                        >
                          <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${page === 1 ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            <span className="sr-only">Previous</span>
                            <svg
                              className="h-5 w-5"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                fillRule="evenodd"
                                d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() =>
                              setPage((p) => Math.min(totalPages, p + 1))
                            }
                            disabled={page === totalPages}
                            className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${page === totalPages ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            <span className="sr-only">Next</span>
                            <svg
                              className="h-5 w-5"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                fillRule="evenodd"
                                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default RecentTransactionsPage;
