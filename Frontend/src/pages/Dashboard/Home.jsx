// Import necessary packages and components
import React, { useState, useEffect, useContext } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import { UserContext } from "../../context/UserContextDefinition";
import { getCachedData, setCachedData } from "../../utils/apiCache";
import InfoCard from "../../components/Cards/InfoCard";
import { addThousandsSeparator } from "../../utils/helper";
import { useNavigate } from "react-router-dom";
import RecentTransactions from "../../components/Dashboard/RecentTransactions";
import FinanceOverview from "../../components/Dashboard/FinanceOverview";
import IncomeOverviewCard from "../../components/Dashboard/IncomeOverviewCard";
import ExpenseOverviewCard from "../../components/Dashboard/ExpenseOverviewCard";
import MonthSelector from "../../components/Dashboard/MonthSelector";
import InsightsCard from "../../components/Dashboard/InsightsCard";
import BudgetSnapshot from "../../components/Dashboard/BudgetSnapshot";
import GoalsSnapshot from "../../components/Dashboard/GoalsSnapshot";
import {
  LuCirclePlus,
  LuCircleMinus,
  LuChartPie,
  LuCircleArrowDown,
  LuCircleArrowUp,
  LuWallet,
} from "react-icons/lu";

// Home page
let Home = () => {
  let navigate = useNavigate();
  let [dashboardData, setDashboardData] = useState(null);
  let [monthlyData, setMonthlyData] = useState(null);
  let { user, updateUser, selectedMonth, setSelectedMonth } =
    useContext(UserContext);

  // Format month to YYYY-MM format
  let getFormattedMonth = (date) => {
    let year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  // Fetch default dashboard data on component mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      const cacheKey = `${API_PATHS.DASHBOARD.GET_DATA}`;
      const cached = getCachedData(cacheKey);
      if (cached) {
        setDashboardData(cached.data);
      }
      try {
        const res = await axiosInstance.get(cacheKey);
        setCachedData(cacheKey, res.data);
        setDashboardData(res.data.data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    fetchDashboardData();
  }, [updateUser]);

  // Fetch monthly data when selected month changes
  useEffect(() => {
    const fetchMonthlyData = async () => {
      const formattedMonth = getFormattedMonth(selectedMonth);
      const cacheKey = `${API_PATHS.DASHBOARD.GET_MONTHLY_SUMMARY}?month=${formattedMonth}`;
      const cached = getCachedData(cacheKey);
      if (cached) {
        setMonthlyData(cached.data);
      }
      try {
        const res = await axiosInstance.get(cacheKey);
        setCachedData(cacheKey, res.data);
        setMonthlyData(res.data.data);
      } catch (error) {
        console.error("Error fetching monthly data:", error);
        if (!cached) {
          setMonthlyData(null);
        }
      }
    };

    fetchMonthlyData();
  }, [selectedMonth]);

  const handleMonthChange = (newDate) => {
    setSelectedMonth(newDate);
  };

  const monthName = selectedMonth.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.fullName?.split(" ")[0] || "there";
  const incomeNow = monthlyData?.totalIncome ?? dashboardData?.totalIncome ?? 0;
  const expenseNow =
    monthlyData?.totalExpense ?? dashboardData?.totalExpense ?? 0;
  const insightTransactions =
    monthlyData?.monthlyTransactions || dashboardData?.expenseLast30Days || [];

  return (
    <DashboardLayout activeMenu="Dashboard">
      <div className="w-full max-w-[1400px] mx-auto">
        {/* Greeting hero with quick actions */}
        <div className="hero-card mb-8 animate-fade-up">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <p className="text-purple-100 text-sm font-medium">{monthName}</p>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">
                {greeting}, {firstName} 👋
              </h1>
              <p className="text-purple-100 text-sm mt-2 max-w-md">
                {incomeNow || expenseNow
                  ? `You've earned ₹${addThousandsSeparator(incomeNow)} and spent ₹${addThousandsSeparator(expenseNow)} so far.`
                  : "Add your first income or expense to see your finances come alive."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                className="hero-btn hero-btn-solid"
                onClick={() => navigate("/expense", { state: { openAdd: true } })}
              >
                <LuCircleMinus /> Add expense
              </button>
              <button
                className="hero-btn"
                onClick={() => navigate("/income", { state: { openAdd: true } })}
              >
                <LuCirclePlus /> Add income
              </button>
              <button className="hero-btn" onClick={() => navigate("/budgets")}>
                <LuChartPie /> Budgets
              </button>
            </div>
          </div>
        </div>

        {/* Month Selector */}
        <div className="mb-8">
          <MonthSelector
            selectedMonth={selectedMonth}
            onMonthChange={handleMonthChange}
          />
        </div>

        {/* Top section with summary info cards */}
        <div className="stagger-children grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <InfoCard
            icon={<LuCircleArrowDown />}
            label="Total Income"
            value={
              "₹" +
              addThousandsSeparator(
                monthlyData?.totalIncome ?? dashboardData?.totalIncome ?? 0,
              )
            }
            color="bg-emerald-500"
          />
          <InfoCard
            icon={<LuCircleArrowUp />}
            label="Total Expense"
            value={
              "₹" +
              addThousandsSeparator(
                monthlyData?.totalExpense ?? dashboardData?.totalExpense ?? 0,
              )
            }
            color="bg-rose-500"
          />
          <InfoCard
            icon={<LuWallet />}
            label="Total Savings / Balance"
            value={
              monthlyData
                ? "₹" + addThousandsSeparator(monthlyData?.totalSavings ?? 0)
                : "₹" + addThousandsSeparator(dashboardData?.balance ?? 0)
            }
            color="bg-purple-500"
          />
        </div>

        {/* Smart Financial Insights */}
        <div className="mb-8">
          <InsightsCard
            transactions={insightTransactions}
            totalIncome={incomeNow}
            totalExpense={expenseNow}
            month={selectedMonth}
          />
        </div>

        {/* Financial Planning: Budgets & Savings Goals side-by-side */}
        <div className="stagger-children grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 items-stretch">
          <BudgetSnapshot />
          <GoalsSnapshot />
        </div>

        {/* Annual Financial Overview: Jan to Dec trajectory */}
        <div className="mb-8">
          <FinanceOverview initialYear={selectedMonth.getFullYear()} />
        </div>

        {/* Monthly Visual Analytics: Income Overview & Expense Overview side-by-side */}
        <div className="stagger-children delay-150 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 items-stretch">
          <IncomeOverviewCard
            transactions={
              monthlyData?.monthlyTransactions?.filter(
                (t) => t.type === "income",
              ) ||
              dashboardData?.incomeLast30Days ||
              []
            }
            totalIncome={incomeNow}
          />
          <ExpenseOverviewCard
            transactions={
              monthlyData?.monthlyTransactions?.filter(
                (t) => t.type === "expense",
              ) ||
              dashboardData?.expenseLast30Days ||
              []
            }
            totalExpense={expenseNow}
          />
        </div>

        {/* Recent Transactions */}
        <div className="mb-8">
          <RecentTransactions
            transactions={
              monthlyData?.monthlyTransactions?.slice(0, 5) ||
              dashboardData?.last5Transactions ||
              []
            }
            onSeeMore={() => navigate("/recent-transactions")}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Home;
