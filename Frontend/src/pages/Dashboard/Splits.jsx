import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import Modal from "../../components/layouts/Modal";
import InfoCard from "../../components/Cards/InfoCard";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import LoadingSpinner from "../../components/LoadingSpinner";
import CharAvatar from "../../components/Cards/CharAvatar";
import { UserContext } from "../../context/UserContextDefinition";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import { useToast } from "../../hooks/useToast";
import {
  addThousandsSeparator,
  formatShortDate,
  getErrorMessage,
} from "../../utils/helper";
import {
  LuPlus,
  LuTrash2,
  LuUsers,
  LuReceipt,
  LuArrowLeftRight,
  LuUserPlus,
  LuCircleDollarSign,
  LuHistory,
  LuTriangleAlert,
  LuHandCoins,
  LuClock3,
} from "react-icons/lu";

const emailList = (value) =>
  value
    .split(/[\n,;]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const emptyExpense = () => ({
  title: "",
  amount: "",
  category: "General",
  note: "",
  paidByUserId: "",
  splitType: "equal",
});

export default function Splits() {
  const { user } = useContext(UserContext);
  const toast = useToast();

  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState("");
  const [detailsCache, setDetailsCache] = useState({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [friendOpen, setFriendOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [settlementOpen, setSettlementOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Form states
  const [groupForm, setGroupForm] = useState({ name: "", description: "", memberEmails: "" });
  const [friendEmail, setFriendEmail] = useState("");
  const [expenseForm, setExpenseForm] = useState(emptyExpense());
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [participantValues, setParticipantValues] = useState({});
  const [settlementForm, setSettlementForm] = useState(null);

  const currentUserId = String(user?._id || user?.id || "");

  // Fetch detail for a specific group
  const fetchGroupDetail = useCallback(async (groupId, silent = false) => {
    if (!groupId) return null;
    if (!silent) setDetailLoading(true);
    try {
      const response = await axiosInstance.get(API_PATHS.SPLITS.GROUP(groupId));
      const nextDetail = response.data?.data;
      if (nextDetail) {
        setDetailsCache((prev) => ({ ...prev, [groupId]: nextDetail }));
      }
      return nextDetail;
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load group details"));
      return null;
    } finally {
      if (!silent) setDetailLoading(false);
    }
  }, [toast]);

  // Initial load or refresh groups list
  const refreshGroups = useCallback(async (targetGroupId = "") => {
    try {
      const response = await axiosInstance.get(API_PATHS.SPLITS.GROUPS);
      const nextGroups = response.data?.data?.groups || [];
      setGroups(nextGroups);

      const nextActiveId =
        targetGroupId ||
        (nextGroups.some((g) => g._id === activeGroupId) ? activeGroupId : nextGroups[0]?._id || "");

      setActiveGroupId(nextActiveId);

      if (nextActiveId) {
        // Fetch detail immediately for faster data loading
        await fetchGroupDetail(nextActiveId, Boolean(detailsCache[nextActiveId]));
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load groups"));
    } finally {
      setInitialLoading(false);
    }
  }, [activeGroupId, detailsCache, fetchGroupDetail, toast]);

  useEffect(() => {
    refreshGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When activeGroupId changes, retrieve or fetch group detail
  const activeDetail = useMemo(() => {
    return detailsCache[activeGroupId] || null;
  }, [detailsCache, activeGroupId]);

  const selectGroup = (groupId) => {
    if (groupId === activeGroupId) return;
    setActiveGroupId(groupId);
    if (!detailsCache[groupId]) {
      fetchGroupDetail(groupId, false);
    } else {
      // Re-fetch in background to ensure latest state without blocking UI
      fetchGroupDetail(groupId, true);
    }
  };

  // Sync form defaults whenever active group detail changes
  useEffect(() => {
    if (activeDetail?.group?.members?.length) {
      const members = activeDetail.group.members;
      setExpenseForm((prev) => ({
        ...prev,
        paidByUserId: currentUserId || members[0]?.userId || "",
      }));
      setSelectedParticipants(members.map((m) => m.userId));
      setParticipantValues(
        Object.fromEntries(members.map((m) => [m.userId, { amount: "", percentage: "", shares: "1" }]))
      );
    }
  }, [activeDetail, currentUserId]);

  // Split calculations
  const changeSplitType = (type) => {
    setExpenseForm((form) => ({ ...form, splitType: type }));
    setParticipantValues((old) => {
      const ids = selectedParticipants;
      const count = Math.max(ids.length, 1);
      return Object.fromEntries(
        ids.map((id) => [
          id,
          {
            ...(old[id] || {}),
            amount: ids.length ? (Number(expenseForm.amount || 0) / count).toFixed(2) : "0",
            percentage: ids.length ? (100 / count).toFixed(1) : "0",
            shares: old[id]?.shares || "1",
          },
        ])
      );
    });
  };

  const toggleParticipant = (userId) => {
    setSelectedParticipants((selected) => {
      const next = selected.includes(userId)
        ? selected.filter((id) => id !== userId)
        : [...selected, userId];
      setParticipantValues((values) => {
        const count = Math.max(next.length, 1);
        const updated = {
          ...values,
          [userId]: values[userId] || {
            amount: "",
            percentage: String((100 / count).toFixed(1)),
            shares: "1",
          },
        };
        if (expenseForm.splitType === "percentage" && next.length) {
          next.forEach((id) => {
            updated[id] = {
              ...(updated[id] || {}),
              percentage: (100 / count).toFixed(1),
            };
          });
        }
        return updated;
      });
      return next;
    });
  };

  const setParticipantValue = (id, key, value) => {
    setParticipantValues((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [key]: value },
    }));
  };

  // Handlers
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (groupForm.name.trim().length < 2) {
      toast.error("Group name must be at least 2 characters.");
      return;
    }
    setSaving(true);
    try {
      const response = await axiosInstance.post(API_PATHS.SPLITS.GROUPS, {
        ...groupForm,
        memberEmails: emailList(groupForm.memberEmails),
      });
      const newGroup = response.data?.data?.group;
      toast.success("Group created successfully");
      setGroupForm({ name: "", description: "", memberEmails: "" });
      setCreateOpen(false);

      if (newGroup?._id) {
        await refreshGroups(newGroup._id);
        await fetchGroupDetail(newGroup._id, false);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not create group"));
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!activeDetail?.group?._id) return;
    setSaving(true);
    try {
      await axiosInstance.post(API_PATHS.SPLITS.ADD_MEMBER(activeDetail.group._id), {
        email: friendEmail.trim().toLowerCase(),
      });
      toast.success("Member added to group");
      setFriendEmail("");
      setFriendOpen(false);
      await fetchGroupDetail(activeDetail.group._id, false);
      await refreshGroups(activeDetail.group._id);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not add member"));
    } finally {
      setSaving(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!activeDetail?.group?._id) return;
    const amount = Number(expenseForm.amount);
    if (!expenseForm.title.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Please enter a valid expense title and amount.");
      return;
    }
    if (!selectedParticipants.length) {
      toast.error("Select at least one participant.");
      return;
    }

    const participants = selectedParticipants.map((userId) => ({
      userId,
      ...(expenseForm.splitType === "exact"
        ? { amount: Number(participantValues[userId]?.amount) }
        : {}),
      ...(expenseForm.splitType === "percentage"
        ? { percentage: Number(participantValues[userId]?.percentage) }
        : {}),
      ...(expenseForm.splitType === "shares"
        ? { shares: Number(participantValues[userId]?.shares) }
        : {}),
    }));

    setSaving(true);
    try {
      await axiosInstance.post(API_PATHS.SPLITS.ADD_EXPENSE(activeDetail.group._id), {
        ...expenseForm,
        amount,
        participants,
      });
      toast.success("Shared bill recorded successfully");
      setExpenseForm({
        ...emptyExpense(),
        paidByUserId: currentUserId || activeDetail.group.members[0]?.userId || "",
      });
      setExpenseOpen(false);
      await fetchGroupDetail(activeDetail.group._id, false);
      await refreshGroups(activeDetail.group._id);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not record expense"));
    } finally {
      setSaving(false);
    }
  };

  const handleSettlement = async (e) => {
    e.preventDefault();
    if (!activeDetail?.group?._id || !settlementForm) return;
    const amount = Number(settlementForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid settlement amount.");
      return;
    }
    setSaving(true);
    try {
      await axiosInstance.post(API_PATHS.SPLITS.SETTLE(activeDetail.group._id), {
        ...settlementForm,
        amount,
      });
      toast.success("Settlement recorded successfully");
      setSettlementForm(null);
      setSettlementOpen(false);
      await fetchGroupDetail(activeDetail.group._id, false);
      await refreshGroups(activeDetail.group._id);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not record settlement"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!activeGroupId) return;
    setDeleting(true);
    try {
      await axiosInstance.delete(API_PATHS.SPLITS.DELETE_GROUP(activeGroupId));
      toast.success("Group deleted successfully");
      setDeleteConfirmOpen(false);

      // Optimistically update group list and cache
      const remainingGroups = groups.filter((g) => g._id !== activeGroupId);
      setGroups(remainingGroups);
      setDetailsCache((prev) => {
        const copy = { ...prev };
        delete copy[activeGroupId];
        return copy;
      });

      const nextActive = remainingGroups[0]?._id || "";
      setActiveGroupId(nextActive);
      if (nextActive) {
        fetchGroupDetail(nextActive, Boolean(detailsCache[nextActive]));
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not delete group"));
    } finally {
      setDeleting(false);
    }
  };

  // Summaries
  const currentGroup = groups.find((g) => g._id === activeGroupId);
  const currentBalance = useMemo(() => {
    if (activeDetail?.balances) {
      const item = activeDetail.balances.find((b) => b.userId === currentUserId);
      return item?.balance || 0;
    }
    return currentGroup?.myBalance || 0;
  }, [activeDetail, currentGroup, currentUserId]);

  const totalGroupExpenses = useMemo(() => {
    if (!activeDetail?.expenses) return 0;
    return activeDetail.expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  }, [activeDetail]);

  const totalGroupSettlements = useMemo(() => {
    if (!activeDetail?.settlements) return 0;
    return activeDetail.settlements.reduce((sum, stl) => sum + Number(stl.amount || 0), 0);
  }, [activeDetail]);

  const memberName = (id) =>
    activeDetail?.group?.members?.find((m) => m.userId === id)?.fullName || "Group member";

  return (
    <DashboardLayout activeMenu="Split Expenses">
      <div className="w-full max-w-[1400px] mx-auto">
        <PageHeader
          title="Split Expenses"
          subtitle="Share bills, track group balances, and settle up with friends."
        >
          <button
            className="add-btn add-btn-fill"
            onClick={() => {
              setGroupForm({ name: "", description: "", memberEmails: "" });
              setCreateOpen(true);
            }}
          >
            <LuPlus className="text-lg" /> New Group
          </button>
        </PageHeader>

        {initialLoading ? (
          <div className="py-24 flex justify-center">
            <LoadingSpinner text="Loading split expenses..." />
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            icon={<LuUsers />}
            title="No Expense Groups Yet"
            message="Create a group for trips, roommates, dinner bills, or shared projects to track balances and settle up easily."
            action={
              <button
                className="add-btn add-btn-fill"
                onClick={() => setCreateOpen(true)}
              >
                <LuPlus className="text-lg" /> Create your first group
              </button>
            }
          />
        ) : (
          <>
            {/* Top Metric Cards */}
            <div className="stagger-children flex md:grid md:grid-cols-3 gap-6 mb-8 overflow-x-auto md:overflow-x-visible pb-4 md:pb-0 no-scrollbar snap-x snap-mandatory">
              <InfoCard
                icon={<LuCircleDollarSign />}
                label="Your net balance"
                value={`₹${addThousandsSeparator(Math.abs(currentBalance).toFixed(2))}`}
                color={
                  currentBalance > 0
                    ? "bg-green-500"
                    : currentBalance < 0
                    ? "bg-red-500"
                    : "bg-purple-500"
                }
                hint={
                  currentBalance > 0
                    ? "Owed to you in this group"
                    : currentBalance < 0
                    ? "You owe in this group"
                    : "All settled up"
                }
              />
              <InfoCard
                icon={<LuReceipt />}
                label="Shared bills"
                value={`${activeDetail?.expenses?.length || 0} Bills`}
                color="bg-purple-500"
                hint={`₹${addThousandsSeparator(totalGroupExpenses.toFixed(2))} total recorded`}
              />
              <InfoCard
                icon={<LuArrowLeftRight />}
                label="Settlements"
                value={`${activeDetail?.settlements?.length || 0} Settled`}
                color="bg-blue-500"
                hint={`₹${addThousandsSeparator(totalGroupSettlements.toFixed(2))} paid back`}
              />
            </div>

            {/* Main content grid */}
            <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
              {/* Left Column: Group list */}
              <aside className="card p-5 space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-gray-100 dark:border-gray-700">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <LuUsers className="text-purple-600 dark:text-purple-400" /> Your Groups
                  </h2>
                  <span className="badge badge-purple">{groups.length}</span>
                </div>

                <div className="space-y-2.5 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
                  {groups.map((group) => {
                    const isActive = activeGroupId === group._id;
                    const bal = group.myBalance || 0;
                    return (
                      <button
                        key={group._id}
                        type="button"
                        onClick={() => selectGroup(group._id)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                          isActive
                            ? "bg-purple-50/80 dark:bg-purple-950/40 border-purple-300 dark:border-purple-600 shadow-sm"
                            : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-800"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                            {group.name}
                          </p>
                          <span
                            className={`badge shrink-0 ${
                              bal > 0
                                ? "badge-green"
                                : bal < 0
                                ? "badge-red"
                                : "badge-gray"
                            }`}
                          >
                            {bal > 0
                              ? `+₹${addThousandsSeparator(bal.toFixed(0))}`
                              : bal < 0
                              ? `-₹${addThousandsSeparator(Math.abs(bal).toFixed(0))}`
                              : "Settled"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                          {group.members?.length || 0} members
                          {group.description ? ` · ${group.description}` : ""}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </aside>

              {/* Right Column: Group ledger details */}
              <section className="space-y-6 min-w-0">
                {!activeDetail && detailLoading ? (
                  <div className="card p-16 flex justify-center">
                    <LoadingSpinner text="Loading group details..." />
                  </div>
                ) : !activeDetail ? (
                  <div className="card p-12 text-center text-gray-500 dark:text-gray-400">
                    Select a group to view its balances and bills.
                  </div>
                ) : (
                  <>
                    {/* Active Group Header Card */}
                    <div className="card p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 text-white flex items-center justify-center text-xl shadow-md shadow-purple-500/20 shrink-0">
                            <LuUsers />
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
                                {activeDetail.group.name}
                              </h2>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                              {activeDetail.group.description || "Shared expenses and settlements"}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                              Created {formatShortDate(activeDetail.group.createdAt)} ·{" "}
                              {activeDetail.group.members.length} members
                            </p>
                          </div>
                        </div>

                        {/* Actions: Add Friend, Record Bill, Delete Group */}
                        <div className="flex flex-wrap items-center gap-2.5">
                          <button
                            type="button"
                            className="add-btn text-xs py-2 px-3.5"
                            onClick={() => {
                              setFriendEmail("");
                              setFriendOpen(true);
                            }}
                          >
                            <LuUserPlus className="text-base" /> Add Member
                          </button>
                          <button
                            type="button"
                            className="add-btn add-btn-fill text-xs py-2 px-3.5"
                            onClick={() => {
                              setExpenseForm({
                                ...emptyExpense(),
                                paidByUserId: currentUserId || activeDetail.group.members[0]?.userId || "",
                              });
                              setExpenseOpen(true);
                            }}
                          >
                            <LuReceipt className="text-base" /> Record Bill
                          </button>
                          <button
                            type="button"
                            className="p-2.5 rounded-xl border border-red-200 dark:border-red-900/50 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                            title="Delete Group"
                            aria-label="Delete Group"
                            onClick={() => setDeleteConfirmOpen(true)}
                          >
                            <LuTrash2 className="text-lg" />
                          </button>
                        </div>
                      </div>

                      {/* Members Avatars Row */}
                      <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-3">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-1">
                          Members:
                        </span>
                        {activeDetail.group.members.map((member) => (
                          <div
                            key={member.userId}
                            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gray-50 dark:bg-gray-700/60 border border-gray-200/60 dark:border-gray-700"
                          >
                            {member.profileImageUrl ? (
                              <img
                                src={member.profileImageUrl}
                                alt=""
                                className="w-5 h-5 rounded-full object-cover"
                              />
                            ) : (
                              <CharAvatar
                                fullName={member.fullName}
                                width="w-5"
                                height="h-5"
                                style="text-[10px] font-semibold"
                              />
                            )}
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                              {member.fullName}
                              {member.userId === currentUserId ? " (you)" : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Ledger Balances and Settlements */}
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Person Balances Card */}
                      <div className="card p-6">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                          <LuCircleDollarSign className="text-purple-600 dark:text-purple-400" />
                          Balances by Person
                        </h3>
                        <div className="space-y-3">
                          {activeDetail.balances.map((item) => {
                            const isMe = item.userId === currentUserId;
                            return (
                              <div
                                key={item.userId}
                                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50/70 dark:bg-gray-800/70 border border-gray-100 dark:border-gray-700"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                    {item.fullName}
                                    {isMe ? " (you)" : ""}
                                  </p>
                                  <p className="text-xs text-gray-400 dark:text-gray-500">
                                    {item.balance > 0
                                      ? "Should receive"
                                      : item.balance < 0
                                      ? "Owes the group"
                                      : "Settled up"}
                                  </p>
                                </div>
                                <span
                                  className={`text-sm font-extrabold ${
                                    item.balance > 0
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : item.balance < 0
                                      ? "text-red-600 dark:text-red-400"
                                      : "text-gray-400"
                                  }`}
                                >
                                  {item.balance > 0 ? "+" : item.balance < 0 ? "−" : ""}₹
                                  {addThousandsSeparator(Math.abs(item.balance).toFixed(2))}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Settle Up Card */}
                      <div className="card p-6">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                          <LuArrowLeftRight className="text-purple-600 dark:text-purple-400" />
                          Suggested Settlements
                        </h3>
                        {activeDetail.suggestedDebts?.length === 0 ? (
                          <div className="p-8 text-center rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                              🎉 Everyone is settled up!
                            </p>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                              No outstanding payments in this group.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {activeDetail.suggestedDebts.map((debt, index) => (
                              <div
                                key={`${debt.fromUserId}-${debt.toUserId}-${index}`}
                                className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col gap-2.5"
                              >
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200 truncate">
                                    <span className="truncate">{debt.fromName}</span>
                                    <span className="text-xs text-gray-400">pays</span>
                                    <span className="truncate">{debt.toName}</span>
                                  </div>
                                  <span className="font-extrabold text-gray-900 dark:text-white">
                                    ₹{addThousandsSeparator(debt.amount.toFixed(2))}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSettlementForm({
                                      fromUserId: debt.fromUserId,
                                      toUserId: debt.toUserId,
                                      amount: String(debt.amount),
                                      note: "",
                                    });
                                    setSettlementOpen(true);
                                  }}
                                  className="w-full py-1.5 px-3 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-bold transition cursor-pointer"
                                >
                                  Record Settlement
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* History Card */}
                    <div className="card p-6">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                        <LuHistory className="text-purple-600 dark:text-purple-400" />
                        Activity & Transaction History
                      </h3>
                      {activeDetail.history?.length === 0 ? (
                        <div className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
                          <LuClock3 className="mx-auto text-3xl mb-2 opacity-50" />
                          No transactions recorded in this group yet.
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                          {activeDetail.history.map((item) => {
                            const isSettlement = item.type === "settlement";
                            return (
                              <div
                                key={`${item.type}-${item._id}`}
                                className="py-4 first:pt-0 last:pb-0 flex items-start gap-3.5"
                              >
                                <div
                                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg ${
                                    isSettlement
                                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                                      : "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400"
                                  }`}
                                >
                                  {isSettlement ? <LuHandCoins /> : <LuReceipt />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                                      {isSettlement
                                        ? `${item.fromName} paid ${item.toName}`
                                        : item.title}
                                    </p>
                                    <span
                                      className={`text-sm font-extrabold shrink-0 ${
                                        isSettlement
                                          ? "text-emerald-600 dark:text-emerald-400"
                                          : "text-gray-900 dark:text-white"
                                      }`}
                                    >
                                      {isSettlement ? "− " : ""}₹
                                      {addThousandsSeparator(Number(item.amount).toFixed(2))}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                    {formatShortDate(item.date)}
                                    {!isSettlement &&
                                      ` · Paid by ${item.paidByName} · Split ${item.splitType}`}
                                    {item.note ? ` · "${item.note}"` : ""}
                                  </p>
                                  {!isSettlement && item.participants?.length > 0 && (
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                      {item.participants
                                        .map(
                                          (p) =>
                                            `${p.fullName}: ₹${addThousandsSeparator(
                                              Number(p.amount).toFixed(2)
                                            )}`
                                        )
                                        .join("  |  ")}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </section>
            </div>
          </>
        )}

        {/* Modal: Create Group */}
        <Modal
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          title="Create a New Group"
        >
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div>
              <label className="field-label block mb-1.5">Group Name *</label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={80}
                placeholder="e.g. Goa Trip, Apartment 402, Team Dinner"
                value={groupForm.name}
                onChange={(e) => setGroupForm((v) => ({ ...v, name: e.target.value }))}
                className="input-box"
              />
            </div>
            <div>
              <label className="field-label block mb-1.5">Description (optional)</label>
              <input
                type="text"
                maxLength={300}
                placeholder="Brief note or trip details"
                value={groupForm.description}
                onChange={(e) => setGroupForm((v) => ({ ...v, description: e.target.value }))}
                className="input-box"
              />
            </div>
            <div>
              <label className="field-label block mb-1.5">
                Friends' MoneyMint Account Emails
              </label>
              <textarea
                rows={2}
                placeholder="alex@example.com, sam@example.com"
                value={groupForm.memberEmails}
                onChange={(e) => setGroupForm((v) => ({ ...v, memberEmails: e.target.value }))}
                className="input-box resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                Separate multiple emails with commas. Members must have existing MoneyMint accounts. You can also add members later.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary"
              >
                {saving ? "Creating..." : "Create Group"}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal: Add Member */}
        <Modal
          isOpen={friendOpen}
          onClose={() => setFriendOpen(false)}
          title="Add Member to Group"
        >
          <form onSubmit={handleAddMember} className="space-y-4">
            <div>
              <label className="field-label block mb-1.5">Friend's Account Email *</label>
              <input
                type="email"
                required
                placeholder="friend@example.com"
                value={friendEmail}
                onChange={(e) => setFriendEmail(e.target.value)}
                className="input-box"
              />
              <p className="text-xs text-gray-400 mt-1">
                Your friend must have a registered MoneyMint account with this email address.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setFriendOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary"
              >
                {saving ? "Adding..." : "Add Member"}
              </button>
            </div>
          </form>
        </Modal>

        {/* Modal: Record Shared Bill */}
        <Modal
          isOpen={expenseOpen}
          onClose={() => setExpenseOpen(false)}
          title="Record a Shared Bill"
        >
          {activeDetail?.group && (
            <form onSubmit={handleAddExpense} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              <div>
                <label className="field-label block mb-1.5">What was it for? *</label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  placeholder="e.g. Dinner, Groceries, Flight tickets"
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm((v) => ({ ...v, title: e.target.value }))}
                  className="input-box"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="field-label block mb-1.5">Total Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm((v) => ({ ...v, amount: e.target.value }))}
                    className="input-box"
                  />
                </div>
                <div>
                  <label className="field-label block mb-1.5">Category</label>
                  <input
                    type="text"
                    maxLength={60}
                    placeholder="General, Food, Travel..."
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm((v) => ({ ...v, category: e.target.value }))}
                    className="input-box"
                  />
                </div>
              </div>

              <div>
                <label className="field-label block mb-1.5">Who paid? *</label>
                <select
                  required
                  value={expenseForm.paidByUserId}
                  onChange={(e) => setExpenseForm((v) => ({ ...v, paidByUserId: e.target.value }))}
                  className="input-box"
                >
                  <option value="">Select payer</option>
                  {activeDetail.group.members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.fullName}
                      {m.userId === currentUserId ? " (you)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="field-label block mb-1.5">Split Method</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    ["equal", "Equal"],
                    ["exact", "Exact Amounts"],
                    ["percentage", "% Percent"],
                    ["shares", "Shares"],
                  ].map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => changeSplitType(val)}
                      className={`tab-pill text-xs py-2 ${
                        expenseForm.splitType === val ? "tab-pill-active" : ""
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="field-label">Split Among</label>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedParticipants(activeDetail.group.members.map((m) => m.userId))
                    }
                    className="text-xs text-purple-600 dark:text-purple-400 font-semibold cursor-pointer"
                  >
                    Select All
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {activeDetail.group.members.map((member) => {
                    const isSelected = selectedParticipants.includes(member.userId);
                    return (
                      <div
                        key={member.userId}
                        className={`p-2.5 rounded-xl border transition ${
                          isSelected
                            ? "bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800"
                            : "border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800"
                        }`}
                      >
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleParticipant(member.userId)}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex-1">
                            {member.fullName}
                            {member.userId === currentUserId ? " (you)" : ""}
                          </span>
                          {expenseForm.splitType === "equal" && isSelected && (
                            <span className="text-xs text-gray-400">Equal</span>
                          )}
                        </label>
                        {isSelected && expenseForm.splitType !== "equal" && (
                          <div className="mt-2 pl-7">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder={
                                expenseForm.splitType === "exact"
                                  ? "Exact amount (₹)"
                                  : expenseForm.splitType === "percentage"
                                  ? "Percentage (%)"
                                  : "Shares count"
                              }
                              value={
                                participantValues[member.userId]?.[
                                  expenseForm.splitType === "exact"
                                    ? "amount"
                                    : expenseForm.splitType === "percentage"
                                    ? "percentage"
                                    : "shares"
                                ] || ""
                              }
                              onChange={(e) =>
                                setParticipantValue(
                                  member.userId,
                                  expenseForm.splitType === "exact"
                                    ? "amount"
                                    : expenseForm.splitType === "percentage"
                                    ? "percentage"
                                    : "shares",
                                  e.target.value
                                )
                              }
                              className="input-box text-xs py-1.5"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="field-label block mb-1.5">Note (optional)</label>
                <input
                  type="text"
                  maxLength={500}
                  placeholder="Extra info or link"
                  value={expenseForm.note}
                  onChange={(e) => setExpenseForm((v) => ({ ...v, note: e.target.value }))}
                  className="input-box"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setExpenseOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedParticipants.length}
                  className="btn-primary"
                >
                  {saving ? "Saving..." : "Save Shared Bill"}
                </button>
              </div>
            </form>
          )}
        </Modal>

        {/* Modal: Settle Balance */}
        <Modal
          isOpen={settlementOpen}
          onClose={() => setSettlementOpen(false)}
          title="Record Settlement"
        >
          {settlementForm && (
            <form onSubmit={handleSettlement} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800 text-sm font-semibold text-gray-800 dark:text-gray-200">
                <span className="text-purple-600 dark:text-purple-400 font-bold">
                  {memberName(settlementForm.fromUserId)}
                </span>{" "}
                pays{" "}
                <span className="text-purple-600 dark:text-purple-400 font-bold">
                  {memberName(settlementForm.toUserId)}
                </span>
              </div>

              <div>
                <label className="field-label block mb-1.5">Amount Paid (₹) *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={settlementForm.amount}
                  onChange={(e) =>
                    setSettlementForm((v) => ({ ...v, amount: e.target.value }))
                  }
                  className="input-box"
                />
              </div>

              <div>
                <label className="field-label block mb-1.5">Payment Note (optional)</label>
                <input
                  type="text"
                  maxLength={300}
                  placeholder="UPI ref, Google Pay, cash..."
                  value={settlementForm.note}
                  onChange={(e) =>
                    setSettlementForm((v) => ({ ...v, note: e.target.value }))
                  }
                  className="input-box"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSettlementOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? "Saving..." : "Confirm Settlement"}
                </button>
              </div>
            </form>
          )}
        </Modal>

        {/* Modal: Delete Group Confirmation */}
        <Modal
          isOpen={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          title="Delete Group"
        >
          <div className="space-y-4 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center text-2xl shrink-0">
                <LuTriangleAlert />
              </div>
              <div>
                <h4 className="text-base font-bold text-gray-900 dark:text-white">
                  Delete "{activeDetail?.group?.name || "this group"}"?
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Are you sure you want to permanently delete this group? All shared bills, history, and settlement records for this group will be completely erased.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteGroup}
                className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-200 dark:shadow-none transition-all cursor-pointer disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Group"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </DashboardLayout>
  );
}
