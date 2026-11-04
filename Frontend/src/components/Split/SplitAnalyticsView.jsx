import { useState, useEffect } from "react";
import { LuChartPie, LuTrendingUp, LuLayers, LuUsers, LuReceipt } from "react-icons/lu";
import ChartJsPieChart from "../Charts/ChartJsPieChart";
import ChartJsBarChart from "../Charts/ChartJsBarChart";
import InfoCard from "../Cards/InfoCard";
import EmptyState from "../ui/EmptyState";
import LoadingSpinner from "../LoadingSpinner";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import { addThousandsSeparator, formatCurrency } from "../../utils/helper";

const SplitAnalyticsView = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    let active = true;
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(API_PATHS.SPLIT.ANALYTICS);
        if (active) {
          setAnalytics(res.data?.data);
        }
      } catch (err) {
        console.error("Failed to load split analytics:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchAnalytics();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="py-16">
        <LoadingSpinner text="Computing shared spending analytics..." />
      </div>
    );
  }

  if (!analytics || analytics.totalExpensesCount === 0) {
    return (
      <EmptyState
        icon={<LuChartPie />}
        title="No Shared Expenses Data"
        message="Log shared expenses in groups or with friends to see spending breakdown and analytics."
      />
    );
  }

  const { groupSpending = [], categoryDistribution = [], monthlyTrend = [], totalSharedSpent = 0 } =
    analytics;

  const barChartData = monthlyTrend.map((m) => ({
    month: m.month,
    amount: m.amount,
  }));

  return (
    <div className="space-y-6">
      {/* Top Highlights Banner */}
      <div className="stagger-children stat-grid stat-grid-3 mb-8">
        <InfoCard
          icon={<LuReceipt />}
          label="Total Shared Spending"
          value={`₹${addThousandsSeparator(totalSharedSpent)}`}
          color="bg-purple-500"
          hint={`Across ${analytics.totalExpensesCount} shared expenses`}
        />
        <InfoCard
          icon={<LuLayers />}
          label="Top Category"
          value={categoryDistribution[0]?.category || "None"}
          color="bg-green-500"
          hint={
            categoryDistribution[0]
              ? `₹${addThousandsSeparator(categoryDistribution[0].amount)}`
              : "₹0"
          }
        />
        <InfoCard
          icon={<LuUsers />}
          label="Most Active Group"
          value={groupSpending[0]?.name || "None"}
          color="bg-orange-500"
          hint={
            groupSpending[0]
              ? `₹${addThousandsSeparator(groupSpending[0].totalSpent)}`
              : "₹0"
          }
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Doughnut Chart */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <LuChartPie className="text-purple-600 text-lg" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Category Distribution
            </h3>
          </div>
          <div className="h-64 relative">
            <ChartJsPieChart donut data={categoryDistribution} />
          </div>
        </div>

        {/* Monthly Trend Chart */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <LuTrendingUp className="text-purple-600 text-lg" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Monthly Shared Expenses Trend
            </h3>
          </div>
          <div className="h-64 relative">
            <ChartJsBarChart data={barChartData} label="Shared Spending" color="#8b5cf6" />
          </div>
        </div>
      </div>

      {/* Group Spending Breakdown Table & Summary */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <LuUsers className="text-purple-600 text-lg" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Group-Wise Spending & Contribution
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 text-xs text-gray-400 uppercase tracking-wider">
                <th className="pb-3 font-semibold">Group / Circle</th>
                <th className="pb-3 font-semibold text-right">Total Spent</th>
                <th className="pb-3 font-semibold text-right">You Paid</th>
                <th className="pb-3 font-semibold text-right">Your Share</th>
                <th className="pb-3 font-semibold text-right">Net Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {groupSpending.map((g, idx) => {
                const net = (g.userPaid || 0) - (g.userShare || 0);
                return (
                  <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-3 font-semibold text-gray-900 dark:text-white">
                      {g.name}
                    </td>
                    <td className="py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                      {formatCurrency(g.totalSpent)}
                    </td>
                    <td className="py-3 text-right font-medium text-purple-600 dark:text-purple-400">
                      {formatCurrency(g.userPaid)}
                    </td>
                    <td className="py-3 text-right font-medium text-gray-500">
                      {formatCurrency(g.userShare)}
                    </td>
                    <td className="py-3 text-right font-bold">
                      {net > 0 ? (
                        <span className="text-emerald-500">+{formatCurrency(net)}</span>
                      ) : net < 0 ? (
                        <span className="text-rose-500">{formatCurrency(net)}</span>
                      ) : (
                        <span className="text-gray-400">₹0.00</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SplitAnalyticsView;
