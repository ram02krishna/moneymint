import { useState, useEffect, useCallback, useContext } from "react";
import { LuUsers, LuPlus, LuHandCoins, LuUserPlus, LuArrowRight, LuArrowRightLeft, LuReceipt, LuChartPie, LuActivity, LuTrendingUp, LuTrendingDown, LuSearch, LuFilter, LuPencil, LuTrash2, LuClock, LuWallet } from "react-icons/lu";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import LoadingSpinner from "../../components/LoadingSpinner";
import CharAvatar from "../../components/Cards/CharAvatar";
import InfoCard from "../../components/Cards/InfoCard";
import AddSplitExpenseModal from "../../components/Split/AddSplitExpenseModal";
import SettleUpModal from "../../components/Split/SettleUpModal";
import CreateGroupModal from "../../components/Split/CreateGroupModal";
import AddFriendModal from "../../components/Split/AddFriendModal";
import FriendDetailModal from "../../components/Split/FriendDetailModal";
import ExpenseDetailModal from "../../components/Split/ExpenseDetailModal";
import GroupDetailView from "../../components/Split/GroupDetailView";
import SplitAnalyticsView from "../../components/Split/SplitAnalyticsView";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import { useToast } from "../../hooks/useToast";
import { useConfirm } from "../../hooks/useConfirm";
import { UserContext } from "../../context/UserContextDefinition";
import { addThousandsSeparator, formatCurrency, emojiFor } from "../../utils/helper";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LuArrowRightLeft },
  { id: "groups", label: "Groups", icon: LuUsers },
  { id: "friends", label: "Friends", icon: LuUserPlus },
  { id: "expenses", label: "All Expenses", icon: LuReceipt },
  { id: "settlements", label: "Settlements", icon: LuHandCoins },
  { id: "analytics", label: "Analytics", icon: LuChartPie },
  { id: "activity", label: "Activity", icon: LuActivity },
];

const SplitExpenses = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useContext(UserContext);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [groups, setGroups] = useState([]);
  const [friends, setFriends] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [activities, setActivities] = useState([]);

  // Search & Filter state for expenses tab
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseDetailTarget, setExpenseDetailTarget] = useState(null);

  const [isSettleUpOpen, setIsSettleUpOpen] = useState(false);
  const [settlePayer, setSettlePayer] = useState(null);
  const [settlePayee, setSettlePayee] = useState(null);
  const [settleAmount, setSettleAmount] = useState(0);
  const [settleGroup, setSettleGroup] = useState(null);

  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);

  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [selectedFriendDetail, setSelectedFriendDetail] = useState(null);

  // Load dashboard and data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [dashRes, grpRes, frRes, expRes, setRes, actRes] = await Promise.all([
        axiosInstance.get(API_PATHS.SPLIT.DASHBOARD),
        axiosInstance.get(API_PATHS.SPLIT.GROUPS.GET_ALL),
        axiosInstance.get(API_PATHS.SPLIT.FRIENDS.GET_ALL),
        axiosInstance.get(API_PATHS.SPLIT.EXPENSES.GET_ALL),
        axiosInstance.get(API_PATHS.SPLIT.SETTLEMENTS.GET_ALL),
        axiosInstance.get(API_PATHS.SPLIT.ACTIVITY),
      ]);

      setDashboardData(dashRes.data?.data);
      setGroups(grpRes.data?.data?.groups || []);
      setFriends(frRes.data?.data?.friends || []);
      setExpenses(expRes.data?.data?.expenses || []);
      setSettlements(setRes.data?.data?.settlements || []);
      setActivities(actRes.data?.data?.activities || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load split expenses data");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Modal Action Handlers
  const handleCreateOrUpdateExpense = async (payload) => {
    if (editingExpense) {
      await axiosInstance.put(
        API_PATHS.SPLIT.EXPENSES.UPDATE(editingExpense._id),
        payload,
      );
      toast.success("Expense updated successfully");
    } else {
      await axiosInstance.post(API_PATHS.SPLIT.EXPENSES.CREATE, payload);
      toast.success("Expense added successfully");
    }
    setEditingExpense(null);
    fetchData();
  };

  const handleDeleteExpense = async (expenseId) => {
    try {
      await axiosInstance.delete(API_PATHS.SPLIT.EXPENSES.DELETE(expenseId));
      toast.success("Expense deleted");
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete expense");
    }
  };

  const handleCreateSettlement = async (payload) => {
    await axiosInstance.post(API_PATHS.SPLIT.SETTLEMENTS.CREATE, payload);
    toast.success("Payment recorded successfully");
    fetchData();
  };

  const handleCreateOrUpdateGroup = async (payload) => {
    if (editingGroup) {
      await axiosInstance.put(
        API_PATHS.SPLIT.GROUPS.UPDATE(editingGroup._id),
        payload,
      );
      toast.success("Group updated successfully");
    } else {
      await axiosInstance.post(API_PATHS.SPLIT.GROUPS.CREATE, payload);
      toast.success("Group created successfully");
    }
    setEditingGroup(null);
    fetchData();
  };

  const handleDeleteGroup = async (grpId) => {
    try {
      await axiosInstance.delete(API_PATHS.SPLIT.GROUPS.DELETE(grpId));
      toast.success("Group deleted");
      setSelectedGroupId(null);
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to delete group");
    }
  };

  const handleAddFriend = async (payload) => {
    await axiosInstance.post(API_PATHS.SPLIT.FRIENDS.ADD, payload);
    toast.success("Friend added successfully");
    fetchData();
  };

  const handleDeleteFriend = async (friendId) => {
    try {
      await axiosInstance.delete(API_PATHS.SPLIT.FRIENDS.DELETE(friendId));
      toast.success("Friend removed");
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to remove friend");
    }
  };

  const openSettleUpWith = (friendOrMember, balance = 0, group = null, targetPayee = null) => {
    if (balance > 0) {
      // User is owed money, so friendOrMember pays user
      setSettlePayer(friendOrMember);
      setSettlePayee(user);
    } else {
      // User owes money, so user pays friendOrMember
      setSettlePayer(user);
      setSettlePayee(targetPayee || friendOrMember);
    }
    setSettleAmount(Math.abs(balance));
    setSettleGroup(group);
    setIsSettleUpOpen(true);
  };

  // Filtered expenses list
  const filteredExpenses = expenses.filter((exp) => {
    const matchCat =
      selectedCategoryFilter === "All" || exp.category === selectedCategoryFilter;
    const matchSearch =
      !searchQuery.trim() ||
      exp.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.paidBy?.some((p) =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    return matchCat && matchSearch;
  });

  const summary = dashboardData?.summary || {
    netBalance: 0,
    youOwe: 0,
    youAreOwed: 0,
    groupsCount: 0,
    friendsCount: 0,
    expensesCount: 0,
  };

  return (
    <DashboardLayout activeMenu="Split Expenses">
      <div className="space-y-6">
        {/* If a group detail is active, render GroupDetailView */}
        {selectedGroupId ? (
          <GroupDetailView
            groupId={selectedGroupId}
            onBack={() => {
              setSelectedGroupId(null);
              fetchData();
            }}
            onAddExpense={() => {
              setEditingExpense(null);
              setIsAddExpenseOpen(true);
            }}
            onSettleUp={(payer, amt, grp, payee) =>
              openSettleUpWith(payer, amt, grp, payee)
            }
            onEditExpense={(exp) => {
              setEditingExpense(exp);
              setIsAddExpenseOpen(true);
            }}
            onDeleteExpense={handleDeleteExpense}
            onEditGroup={(grp) => {
              setEditingGroup(grp);
              setIsCreateGroupOpen(true);
            }}
            onDeleteGroup={handleDeleteGroup}
          />
        ) : (
          <>
            {/* Page Header */}
            <PageHeader
              title="Split Expenses"
              subtitle="Share bills, track group balances, and settle debts with friends"
            >
              <button
                type="button"
                onClick={() => {
                  setEditingExpense(null);
                  setIsAddExpenseOpen(true);
                }}
                className="add-btn add-btn-fill"
              >
                <LuPlus className="text-base" /> Add Expense
              </button>
              <button
                type="button"
                onClick={() => openSettleUpWith(null, 0)}
                className="add-btn add-btn-fill"
              >
                <LuHandCoins className="text-base" /> Settle Up
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingGroup(null);
                  setIsCreateGroupOpen(true);
                }}
                className="add-btn add-btn-fill"
              >
                <LuUsers className="text-base" /> New Group
              </button>
              <button
                type="button"
                onClick={() => setIsAddFriendOpen(true)}
                className="add-btn add-btn-fill"
              >
                <LuUserPlus className="text-base" /> Add Friend
              </button>
            </PageHeader>

            {/* Top Stat Cards matching Expense Tracker design */}
            <div className="stagger-children stat-grid stat-grid-4 mb-8">
              <InfoCard
                icon={<LuWallet />}
                label="Total balance"
                value={
                  summary.netBalance > 0
                    ? `+₹${addThousandsSeparator(summary.netBalance)}`
                    : summary.netBalance < 0
                      ? `-₹${addThousandsSeparator(Math.abs(summary.netBalance))}`
                      : "₹0"
                }
                color={
                  summary.netBalance > 0
                    ? "bg-green-500"
                    : summary.netBalance < 0
                      ? "bg-rose-500"
                      : "bg-purple-500"
                }
                valueClassName={
                  summary.netBalance > 0
                    ? "text-emerald-500"
                    : summary.netBalance < 0
                      ? "text-rose-500"
                      : "text-gray-900 dark:text-white"
                }
                hint={
                  summary.netBalance > 0
                    ? "Overall you are owed"
                    : summary.netBalance < 0
                      ? "Overall you owe"
                      : "All accounts are settled up"
                }
              />
              <InfoCard
                icon={<LuTrendingDown />}
                label="You owe"
                value={`₹${addThousandsSeparator(summary.youOwe)}`}
                color="bg-rose-500"
                valueClassName={
                  summary.youOwe > 0
                    ? "text-rose-500"
                    : "text-gray-900 dark:text-white"
                }
                hint="Amount you owe others"
              />
              <InfoCard
                icon={<LuTrendingUp />}
                label="You are owed"
                value={`₹${addThousandsSeparator(summary.youAreOwed)}`}
                color="bg-green-500"
                valueClassName={
                  summary.youAreOwed > 0
                    ? "text-emerald-500"
                    : "text-gray-900 dark:text-white"
                }
                hint="Amount others owe you"
              />
              <InfoCard
                icon={<LuUsers />}
                label="Friends & Groups"
                value={
                  <span className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-xl font-extrabold text-gray-900 dark:text-white">
                      {friends.length}
                    </span>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {friends.length === 1 ? "friend" : "friends"}
                    </span>
                    <span className="text-gray-300 dark:text-gray-600 mx-0.5">•</span>
                    <span className="text-xl font-extrabold text-gray-900 dark:text-white">
                      {groups.length}
                    </span>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {groups.length === 1 ? "group" : "groups"}
                    </span>
                  </span>
                }
                color="bg-orange-500"
                valueClassName="whitespace-normal leading-tight"
                hint={`${expenses.length} shared expense${expenses.length === 1 ? "" : "s"}`}
              />
            </div>

            {/* Navigation Tabs Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-gray-200 dark:border-gray-700 pb-2">
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer shrink-0 ${
                      active
                        ? "bg-purple-600 text-white shadow-md shadow-purple-600/25"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <Icon className="text-base" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Main Tabs Content */}
            {loading ? (
              <div className="py-20">
                <LoadingSpinner text="Loading split expenses..." />
              </div>
            ) : (
              <>
                {/* 1. DASHBOARD TAB */}
                {activeTab === "dashboard" && (
                  <div className="space-y-6">
                    {/* Groups Quick Row */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <LuUsers className="text-purple-600" />
                          Your Groups ({groups.length})
                        </h3>
                        <button
                          type="button"
                          onClick={() => setActiveTab("groups")}
                          className="card-btn"
                        >
                          View all <LuArrowRight aria-hidden="true" />
                        </button>
                      </div>

                      {groups.length === 0 ? (
                        <div className="card p-6 text-center">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            You are not in any groups yet. Create one for trips, flatmates, or friends!
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingGroup(null);
                              setIsCreateGroupOpen(true);
                            }}
                            className="add-btn add-btn-fill mt-3 mx-auto"
                          >
                            <LuPlus className="text-sm" /> Create First Group
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {groups.slice(0, 3).map((grp) => (
                            <div
                              key={grp._id}
                              onClick={() => setSelectedGroupId(grp._id)}
                              className="card card-interactive p-4 flex items-center justify-between gap-3 group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/40 text-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                  {grp.icon || "👥"}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                    {grp.name}
                                  </h4>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {grp.members?.length || 0} members • {grp.category}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-[11px] text-gray-400 block font-medium">
                                  Your Balance
                                </span>
                                <span
                                  className={`text-sm font-black ${
                                    (grp.userBalance || 0) > 0
                                      ? "text-emerald-500"
                                      : (grp.userBalance || 0) < 0
                                        ? "text-rose-500"
                                        : "text-gray-700 dark:text-gray-300"
                                  }`}
                                >
                                  {(grp.userBalance || 0) > 0
                                    ? `+${formatCurrency(grp.userBalance)}`
                                    : formatCurrency(grp.userBalance || 0)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Friends Quick Row */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <LuUserPlus className="text-purple-600" />
                          Friends Balances ({friends.length})
                        </h3>
                        <button
                          type="button"
                          onClick={() => setActiveTab("friends")}
                          className="card-btn"
                        >
                          View all <LuArrowRight aria-hidden="true" />
                        </button>
                      </div>

                      {friends.length === 0 ? (
                        <div className="card p-6 text-center">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Add friends to track individual debts, share dinners, and settle directly!
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsAddFriendOpen(true)}
                            className="add-btn add-btn-fill mt-3 mx-auto"
                          >
                            <LuPlus className="text-sm" /> Add First Friend
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {friends.slice(0, 4).map((fr) => {
                            const bal = fr.balance || 0;
                            return (
                              <div
                                key={fr._id}
                                onClick={() => setSelectedFriendDetail(fr)}
                                className="card card-interactive p-3.5 flex items-center justify-between gap-2.5"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <CharAvatar
                                    fullName={fr.name}
                                    width="w-9"
                                    height="h-9"
                                    style="text-xs font-bold"
                                  />
                                  <div className="min-w-0">
                                    <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                      {fr.name}
                                    </h4>
                                    <p className="text-[11px] text-gray-400 truncate">
                                      {bal > 0 ? (
                                        <span className="text-emerald-500 font-semibold">
                                          Owes you {formatCurrency(bal)}
                                        </span>
                                      ) : bal < 0 ? (
                                        <span className="text-rose-500 font-semibold">
                                          You owe {formatCurrency(Math.abs(bal))}
                                        </span>
                                      ) : (
                                        "Settled up"
                                      )}
                                    </p>
                                  </div>
                                </div>

                                {bal !== 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openSettleUpWith(fr, bal);
                                    }}
                                    className="add-btn shrink-0"
                                  >
                                    Settle
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Recent Shared Expenses */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <LuReceipt className="text-purple-600" />
                          Recent Shared Expenses
                        </h3>
                        <button
                          type="button"
                          onClick={() => setActiveTab("expenses")}
                          className="card-btn"
                        >
                          View all ({expenses.length}) <LuArrowRight aria-hidden="true" />
                        </button>
                      </div>

                      {expenses.length === 0 ? (
                        <EmptyState
                          icon={<LuReceipt />}
                          title="No Expenses Logged"
                          message="Start adding shared expenses with friends or groups."
                          action={
                            <button
                              type="button"
                              onClick={() => {
                                setEditingExpense(null);
                                setIsAddExpenseOpen(true);
                              }}
                              className="add-btn add-btn-fill"
                            >
                              <LuPlus className="text-sm" /> Add Expense
                            </button>
                          }
                        />
                      ) : (
                        <div className="space-y-2">
                          {expenses.slice(0, 5).map((exp) => (
                            <div
                              key={exp._id}
                              onClick={() => setExpenseDetailTarget(exp)}
                              className="card card-interactive p-4 flex items-center justify-between gap-4"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-900/40 text-xl flex items-center justify-center shrink-0">
                                  {emojiFor(exp.title)}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                    {exp.title}
                                  </h4>
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mt-0.5">
                                    <span>
                                      {new Date(exp.date).toLocaleDateString("en-IN", {
                                        day: "numeric",
                                        month: "short",
                                      })}
                                    </span>
                                    <span>•</span>
                                    <span className="badge badge-purple text-[10px]">
                                      {exp.category || "General"}
                                    </span>
                                    {exp.group && (
                                      <>
                                        <span>•</span>
                                        <span className="text-gray-600 dark:text-gray-300 font-medium">
                                          {exp.group.name}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-base font-black text-gray-900 dark:text-white block">
                                  {formatCurrency(exp.amount)}
                                </span>
                                <span className="text-[11px] text-gray-400">
                                  Paid by {exp.paidBy?.map((p) => p.name).join(", ")}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. GROUPS TAB */}
                {activeTab === "groups" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400">
                        Showing {groups.length} active group{groups.length !== 1 ? "s" : ""}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingGroup(null);
                          setIsCreateGroupOpen(true);
                        }}
                        className="add-btn add-btn-fill"
                      >
                        <LuPlus className="text-sm" /> Create Group
                      </button>
                    </div>

                    {groups.length === 0 ? (
                      <EmptyState
                        icon={<LuUsers />}
                        title="No Groups Yet"
                        message="Groups are great for organizing expenses during vacations, flat sharing, or events."
                        action={
                          <button
                            type="button"
                            onClick={() => {
                              setEditingGroup(null);
                              setIsCreateGroupOpen(true);
                            }}
                            className="add-btn add-btn-fill"
                          >
                            <LuPlus className="text-sm" /> Create Group
                          </button>
                        }
                      />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {groups.map((grp) => {
                          const bal = grp.userBalance || 0;
                          return (
                            <div
                              key={grp._id}
                              onClick={() => setSelectedGroupId(grp._id)}
                              className="card card-interactive p-5 flex flex-col justify-between group space-y-4"
                            >
                              <div>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/40 text-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                                    {grp.icon || "👥"}
                                  </div>
                                  <span className="badge badge-purple text-xs">
                                    {grp.category || "General"}
                                  </span>
                                </div>

                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-3 truncate">
                                  {grp.name}
                                </h3>
                                {grp.description && (
                                  <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                                    {grp.description}
                                  </p>
                                )}
                              </div>

                              <div className="pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-xs">
                                <div>
                                  <span className="text-gray-400 block">Members</span>
                                  <span className="font-bold text-gray-800 dark:text-gray-200">
                                    {grp.members?.length || 0} people
                                  </span>
                                </div>

                                <div className="text-right">
                                  <span className="text-gray-400 block">Your Balance</span>
                                  <span
                                    className={`font-black text-sm ${
                                      bal > 0
                                        ? "text-emerald-500"
                                        : bal < 0
                                          ? "text-rose-500"
                                          : "text-gray-500"
                                    }`}
                                  >
                                    {bal > 0
                                      ? `+${formatCurrency(bal)}`
                                      : formatCurrency(bal)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. FRIENDS TAB */}
                {activeTab === "friends" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400">
                        Showing {friends.length} friend{friends.length !== 1 ? "s" : ""}
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsAddFriendOpen(true)}
                        className="add-btn add-btn-fill"
                      >
                        <LuUserPlus className="text-sm" /> Add Friend
                      </button>
                    </div>

                    {friends.length === 0 ? (
                      <EmptyState
                        icon={<LuUserPlus />}
                        title="No Friends Added"
                        message="Add friends to track shared expenses and settle balances anytime."
                        action={
                          <button
                            type="button"
                            onClick={() => setIsAddFriendOpen(true)}
                            className="add-btn add-btn-fill"
                          >
                            <LuUserPlus className="text-sm" /> Add Friend
                          </button>
                        }
                      />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {friends.map((fr) => {
                          const bal = fr.balance || 0;
                          return (
                            <div
                              key={fr._id}
                              onClick={() => setSelectedFriendDetail(fr)}
                              className="card card-interactive p-4 flex items-center justify-between gap-3 group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {fr.friendUser?.profileImageUrl ? (
                                  <img
                                    src={fr.friendUser.profileImageUrl}
                                    alt={fr.name}
                                    className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-100 dark:ring-purple-900/40"
                                  />
                                ) : (
                                  <CharAvatar
                                    fullName={fr.name}
                                    width="w-12"
                                    height="h-12"
                                    style="text-base font-bold"
                                  />
                                )}
                                <div className="min-w-0">
                                  <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                    {fr.name}
                                  </h4>
                                  <p className="text-xs text-gray-400 truncate">
                                    {fr.email || "No email"}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                {bal > 0 ? (
                                  <span className="badge badge-green text-xs font-bold block mb-1">
                                    +{formatCurrency(bal)}
                                  </span>
                                ) : bal < 0 ? (
                                  <span className="badge badge-red text-xs font-bold block mb-1">
                                    {formatCurrency(bal)}
                                  </span>
                                ) : (
                                  <span className="badge badge-gray text-xs font-medium block mb-1">
                                    Settled
                                  </span>
                                )}

                                {bal !== 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openSettleUpWith(fr, bal);
                                    }}
                                    className="add-btn"
                                  >
                                    Settle
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. ALL EXPENSES TAB */}
                {activeTab === "expenses" && (
                  <div className="space-y-4">
                    {/* Search & Category Filter */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="relative w-full sm:w-72">
                        <LuSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search expenses..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="input-box pl-9 my-0 text-xs py-2 w-full"
                        />
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <LuFilter className="text-gray-400 text-sm" />
                        <select
                          value={selectedCategoryFilter}
                          onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                          className="input-box my-0 text-xs py-2 cursor-pointer w-full sm:w-44"
                        >
                          <option value="All">All Categories</option>
                          <option value="Food & Dining">Food & Dining</option>
                          <option value="Transportation">Transportation</option>
                          <option value="Accommodation">Accommodation</option>
                          <option value="Entertainment">Entertainment</option>
                          <option value="Groceries">Groceries</option>
                          <option value="Utilities">Utilities</option>
                          <option value="Shopping">Shopping</option>
                          <option value="Travel">Travel</option>
                          <option value="General">General</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    {filteredExpenses.length === 0 ? (
                      <EmptyState
                        icon={<LuReceipt />}
                        title="No Expenses Found"
                        message="No shared expenses match your search or filter."
                        action={
                          <button
                            type="button"
                            onClick={() => {
                              setEditingExpense(null);
                              setIsAddExpenseOpen(true);
                            }}
                            className="add-btn add-btn-fill"
                          >
                            <LuPlus className="text-sm" /> Add New Expense
                          </button>
                        }
                      />
                    ) : (
                      <div className="space-y-2">
                        {filteredExpenses.map((exp) => (
                          <div
                            key={exp._id}
                            onClick={() => setExpenseDetailTarget(exp)}
                            className="card card-interactive p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-3.5">
                              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/40 text-2xl flex items-center justify-center shrink-0">
                                {emojiFor(exp.title)}
                              </div>
                              <div>
                                <h4 className="text-base font-bold text-gray-900 dark:text-white">
                                  {exp.title}
                                </h4>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  <span>
                                    {new Date(exp.date).toLocaleDateString("en-IN", {
                                      day: "numeric",
                                      month: "short",
                                    })}
                                  </span>
                                  <span>•</span>
                                  <span className="badge badge-purple text-[10px]">
                                    {exp.category || "General"}
                                  </span>
                                  {exp.group && (
                                    <>
                                      <span>•</span>
                                      <span className="text-gray-700 dark:text-gray-300 font-semibold">
                                        {exp.group.name}
                                      </span>
                                    </>
                                  )}
                                  <span>•</span>
                                  <span>
                                    Paid by{" "}
                                    <strong>
                                      {exp.paidBy?.map((p) => p.name).join(", ")}
                                    </strong>
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-4">
                              <div className="text-left sm:text-right">
                                <span className="text-xs text-gray-400 block font-medium">
                                  Total Amount
                                </span>
                                <span className="text-lg font-black text-gray-900 dark:text-white">
                                  {formatCurrency(exp.amount)}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingExpense(exp);
                                    setIsAddExpenseOpen(true);
                                  }}
                                  className="icon-btn"
                                  title="Edit"
                                >
                                  <LuPencil className="text-sm" />
                                </button>
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (
                                      await confirm({
                                        title: "Delete expense?",
                                        message: `"${exp.title}" will be removed for everyone in it.`,
                                        confirmLabel: "Delete",
                                      })
                                    ) {
                                      handleDeleteExpense(exp._id);
                                    }
                                  }}
                                  className="icon-btn icon-btn-danger"
                                  title="Delete"
                                >
                                  <LuTrash2 className="text-sm" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 5. SETTLEMENTS TAB */}
                {activeTab === "settlements" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400">
                        Showing {settlements.length} settlement payment{settlements.length !== 1 ? "s" : ""}
                      </p>
                      <button
                        type="button"
                        onClick={() => openSettleUpWith(null, 0)}
                        className="add-btn add-btn-fill"
                      >
                        <LuHandCoins className="text-sm" /> Record Payment
                      </button>
                    </div>

                    {settlements.length === 0 ? (
                      <EmptyState
                        icon={<LuHandCoins />}
                        title="No Settlements Recorded"
                        message="Record payments made between friends or group members to clear debts."
                        action={
                          <button
                            type="button"
                            onClick={() => openSettleUpWith(null, 0)}
                            className="add-btn add-btn-fill"
                          >
                            <LuHandCoins className="text-sm" /> Record Settlement
                          </button>
                        }
                      />
                    ) : (
                      <div className="space-y-2">
                        {settlements.map((s) => (
                          <div
                            key={s._id}
                            className="card p-4 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 text-lg flex items-center justify-center font-bold shrink-0">
                                ✓
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                  {s.payer?.name} paid {s.payee?.name}
                                </h4>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {new Date(s.date).toLocaleDateString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}{" "}
                                  • {s.paymentMethod}
                                  {s.group ? ` • Group: ${s.group.name}` : ""}
                                  {s.referenceNumber ? ` (${s.referenceNumber})` : ""}
                                </p>
                              </div>
                            </div>

                            <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(s.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 6. ANALYTICS TAB */}
                {activeTab === "analytics" && <SplitAnalyticsView />}

                {/* 7. ACTIVITY FEED TAB */}
                {activeTab === "activity" && (
                  <div className="space-y-3">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                      Recent Activity Feed
                    </h3>

                    {activities.length === 0 ? (
                      <EmptyState
                        icon={<LuActivity />}
                        title="No Activity Yet"
                        message="Expenses added, settlements recorded, and group events will appear here."
                      />
                    ) : (
                      <div className="card p-4 space-y-3">
                        {activities.map((act) => (
                          <div
                            key={act._id}
                            className="p-3 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl flex items-center justify-between gap-3 border border-gray-100 dark:border-gray-700/50"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center text-sm shrink-0">
                                <LuActivity className="text-sm" />
                              </span>
                              <div>
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                  {act.description || act.title}
                                </p>
                                <span className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                                  <LuClock className="text-xs" />
                                  {new Date(act.createdAt).toLocaleString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            </div>

                            {act.amount && (
                              <span className="text-sm font-bold text-gray-900 dark:text-white">
                                {formatCurrency(act.amount)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Modals */}
        <AddSplitExpenseModal
          isOpen={isAddExpenseOpen}
          onClose={() => {
            setIsAddExpenseOpen(false);
            setEditingExpense(null);
          }}
          onSubmit={handleCreateOrUpdateExpense}
          initialData={editingExpense}
          groups={groups}
          friends={friends}
          defaultGroupId={selectedGroupId}
        />

        <SettleUpModal
          isOpen={isSettleUpOpen}
          onClose={() => setIsSettleUpOpen(false)}
          onSubmit={handleCreateSettlement}
          defaultPayer={settlePayer}
          defaultPayee={settlePayee}
          defaultAmount={settleAmount}
          defaultGroup={settleGroup}
          friends={friends}
          groups={groups}
        />

        <CreateGroupModal
          isOpen={isCreateGroupOpen}
          onClose={() => {
            setIsCreateGroupOpen(false);
            setEditingGroup(null);
          }}
          onSubmit={handleCreateOrUpdateGroup}
          initialData={editingGroup}
          friends={friends}
        />

        <AddFriendModal
          isOpen={isAddFriendOpen}
          onClose={() => setIsAddFriendOpen(false)}
          onSubmit={handleAddFriend}
        />

        <FriendDetailModal
          isOpen={!!selectedFriendDetail}
          onClose={() => setSelectedFriendDetail(null)}
          friend={selectedFriendDetail}
          onSettleUp={(fr, bal) => openSettleUpWith(fr, bal)}
          onDeleteFriend={handleDeleteFriend}
        />

        <ExpenseDetailModal
          isOpen={!!expenseDetailTarget}
          onClose={() => setExpenseDetailTarget(null)}
          expense={expenseDetailTarget}
          onEdit={(exp) => {
            setEditingExpense(exp);
            setIsAddExpenseOpen(true);
          }}
          onDelete={handleDeleteExpense}
        />
      </div>
    </DashboardLayout>
  );
};

export default SplitExpenses;
