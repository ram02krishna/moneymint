import { useContext } from "react";
import { LuCircleArrowDown, LuCircleArrowUp, LuWallet } from "react-icons/lu";
import { UserContext } from "../../context/UserContextDefinition";
import { useCachedGet } from "../../hooks/useCachedGet";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import PageHeader from "../../components/ui/PageHeader";
import MonthSelector from "../../components/Dashboard/MonthSelector";
import MonthlyAnalytics from "../../components/Dashboard/MonthlyAnalytics";
import MonthlyTrendAnalysis from "../../components/Dashboard/MonthlyTrendAnalysis";
import InfoCard from "../../components/Cards/InfoCard";
import LoadingSpinner from "../../components/LoadingSpinner";
import { API_PATHS } from "../../utils/apiPath";
import { formatCurrency, toMonthKey, formatMonthLabel } from "../../utils/helper";

const MonthlyAnalyticsPage = () => {
  const { selectedMonth, setSelectedMonth } = useContext(UserContext);
  const monthName = formatMonthLabel(selectedMonth);

  const { data, loading, error, reload } = useCachedGet(
    `${API_PATHS.DASHBOARD.GET_MONTHLY_SUMMARY}?month=${toMonthKey(selectedMonth)}`,
    "Failed to load monthly data",
  );

  return (
    <DashboardLayout activeMenu="Monthly Analytics">
      <div className="w-full max-w-[1400px] mx-auto">
        <PageHeader title="Monthly Analytics" subtitle={monthName} />

        <div className="space-y-6">
          <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />

          {loading ? (
            <div className="flex items-center justify-center min-h-[320px]">
              <LoadingSpinner text="Loading monthly data..." />
            </div>
          ) : error ? (
            <div className="card text-center py-8">
              <p className="text-red-500">{error}</p>
              <button type="button" onClick={reload} className="btn-primary !w-auto mt-4">
                Retry
              </button>
            </div>
          ) : data ? (
            <>
              <div className="stat-grid stat-grid-3">
                <InfoCard icon={<LuCircleArrowDown />} label="Total Income" value={formatCurrency(data.totalIncome)} color="bg-emerald-500" />
                <InfoCard icon={<LuCircleArrowUp />} label="Total Expense" value={formatCurrency(data.totalExpense)} color="bg-rose-500" />
                <InfoCard icon={<LuWallet />} label="Total Savings" value={formatCurrency(data.totalSavings)} color="bg-purple-500" />
              </div>

              <MonthlyAnalytics monthlyData={data} monthName={monthName} />
              <MonthlyTrendAnalysis selectedMonth={selectedMonth} />
            </>
          ) : null}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MonthlyAnalyticsPage;
