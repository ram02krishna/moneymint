import React, { useState, useEffect, useCallback, useContext } from "react";
import { UserContext } from "../../context/UserContextDefinition";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import MonthSelector from "../../components/Dashboard/MonthSelector";
import MonthlyAnalytics from "../../components/Dashboard/MonthlyAnalytics";
import MonthlyTrendAnalysis from "../../components/Dashboard/MonthlyTrendAnalysis";
import InfoCard from "../../components/Cards/InfoCard";
import LoadingSpinner from "../../components/LoadingSpinner";
import { addThousandsSeparator } from "../../utils/helper";
import { getCachedData, setCachedData } from "../../utils/apiCache";
import {
  MdAccountBalanceWallet,
  MdTrendingUp,
  MdTrendingDown,
} from "react-icons/md";

const MonthlyAnalyticsPage = () => {
  const { selectedMonth, setSelectedMonth } = useContext(UserContext);
  const [monthlyData, setMonthlyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Format month to YYYY-MM format
  const getFormattedMonth = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  // Fetch monthly data when selected month changes
  const fetchMonthlyData = useCallback(async () => {
    const formattedMonth = getFormattedMonth(selectedMonth);
    const cacheKey = `${API_PATHS.DASHBOARD.GET_MONTHLY_SUMMARY}?month=${formattedMonth}`;
    const cached = getCachedData(cacheKey);

    if (cached) {
      setMonthlyData(cached.data);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await axiosInstance.get(cacheKey);
      setCachedData(cacheKey, res.data);
      setMonthlyData(res.data.data);
    } catch (err) {
      console.error("Error fetching monthly data:", err);
      if (!cached) {
        setError("Failed to load monthly data");
        setMonthlyData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchMonthlyData();
  }, [fetchMonthlyData]);

  const handleMonthChange = (newDate) => {
    setSelectedMonth(newDate);
  };

  const monthName = selectedMonth.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <DashboardLayout activeMenu="Monthly Analytics">
      <div className="w-full max-w-[1400px] mx-auto">
        {/* Page Title */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Monthly Analytics
        </h1>

        {/* Month Selector */}
        <div className="mb-8">
          <MonthSelector
            selectedMonth={selectedMonth}
            onMonthChange={handleMonthChange}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <LoadingSpinner text="Loading monthly data..." />
          </div>
        ) : error ? (
          <div className="card">
            <div className="text-center text-red-500 py-8">
              <p>{error}</p>
              <button onClick={fetchMonthlyData} className="mt-4 btn-primary">
                Retry
              </button>
            </div>
          </div>
        ) : monthlyData ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="flex md:grid md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-x-auto md:overflow-x-visible pb-4 md:pb-0 no-scrollbar snap-x snap-mandatory">
              <InfoCard
                icon={<MdAccountBalanceWallet />}
                label="Total Income"
                value={
                  "₹" + addThousandsSeparator(monthlyData?.totalIncome ?? 0)
                }
                color="bg-orange-500"
              />
              <InfoCard
                icon={<MdTrendingDown />}
                label="Total Expense"
                value={
                  "₹" + addThousandsSeparator(monthlyData?.totalExpense ?? 0)
                }
                color="bg-red-500"
              />
              <InfoCard
                icon={<MdTrendingUp />}
                label="Total Savings"
                value={
                  "₹" + addThousandsSeparator(monthlyData?.totalSavings ?? 0)
                }
                color="bg-purple-500"
              />
            </div>

            {/* Category Breakdown Section */}
            <div className="w-full">
              <MonthlyAnalytics
                monthlyData={monthlyData}
                monthName={monthName}
              />
            </div>

            {/* 12-Month Trends Section */}
            <div className="w-full">
              <MonthlyTrendAnalysis selectedMonth={selectedMonth} />
            </div>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
};

export default MonthlyAnalyticsPage;
