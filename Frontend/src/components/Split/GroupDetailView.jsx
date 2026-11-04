import { useState, useEffect, useCallback, useContext } from "react";
import { LuUsers, LuPlus, LuHandCoins, LuReceipt, LuArrowLeft, LuPencil, LuTrash2, LuUserPlus, LuZap, LuCheck, LuArrowRight, LuWallet } from "react-icons/lu";
import CharAvatar from "../Cards/CharAvatar";
import InfoCard from "../Cards/InfoCard";
import EmptyState from "../ui/EmptyState";
import LoadingSpinner from "../LoadingSpinner";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import { UserContext } from "../../context/UserContextDefinition";
import { addThousandsSeparator, formatCurrency, emojiFor, getErrorMessage } from "../../utils/helper";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";

const GroupDetailView = ({
  groupId,
  onBack,
  onAddExpense,
  onSettleUp,
  onEditExpense,
  onDeleteExpense,
  onEditGroup,
  onDeleteGroup,
}) => {
  const confirm = useConfirm();
  const toast = useToast();
  const { user } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [groupData, setGroupData] = useState(null);
  const [activeTab, setActiveTab] = useState("expenses"); // "expenses", "members", "settlements", "debts"
  const [debtViewMode, setDebtViewMode] = useState("simplified"); // "simplified" or "detailed"

  // Add member modal/inline state
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState("");

  // only the first load replaces the screen with a spinner; refreshes after edits update in place
  const fetchGroupDetail = useCallback(async () => {
    try {
      const res = await axiosInstance.get(API_PATHS.SPLIT.GROUPS.GET_ONE(groupId));
      setGroupData(res.data?.data);
    } catch (err) {
      console.error("Failed to load group:", err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (groupId) fetchGroupDetail();
  }, [groupId, fetchGroupDetail]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    setMemberError("");
    if (!newMemberName.trim() && !newMemberEmail.trim()) {
      setMemberError("Please enter name or email");
      return;
    }

    try {
      setAddingMember(true);
      await axiosInstance.post(API_PATHS.SPLIT.GROUPS.ADD_MEMBER(groupId), {
        name: newMemberName.trim() || newMemberEmail.split("@")[0],
        email: newMemberEmail.trim().toLowerCase(),
      });
      setNewMemberName("");
      setNewMemberEmail("");
      setShowAddMember(false);
      fetchGroupDetail();
    } catch (err) {
      setMemberError(err?.response?.data?.message || err.message || "Failed to add member");
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!(await confirm({ title: "Remove member?", message: `"${memberName}" will be removed from this group.`, confirmLabel: "Remove" }))) return;
    try {
      await axiosInstance.delete(
        API_PATHS.SPLIT.GROUPS.REMOVE_MEMBER(groupId, memberId),
      );
      fetchGroupDetail();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to remove member"));
    }
  };

  if (loading) {
    return (
      <div className="py-20">
        <LoadingSpinner text="Loading group details..." />
      </div>
    );
  }

  if (!groupData || !groupData.group) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500 mb-4">Group not found or archived.</p>
        <button type="button" onClick={onBack} className="btn-secondary">
          ← Back to All Groups
        </button>
      </div>
    );
  }

  const { group, expenses = [], settlements = [], simplifiedDebts = [], detailedDebts = [] } =
    groupData;
  const userBalance = group.userBalance || 0;
  const debtsToDisplay = debtViewMode === "simplified" ? simplifiedDebts : detailedDebts;

  const isCreator =
    String(group.creator?._id || group.creator) === String(user?._id);

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Back button & Title bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-purple-600 transition-colors cursor-pointer"
          >
            <LuArrowLeft className="text-lg" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{group.icon || "👥"}</span>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                {group.name}
              </h1>
              <span className="badge badge-purple text-xs">
                {group.category || "General"}
              </span>
            </div>
            {group.description && (
              <p className="text-xs text-gray-400 mt-0.5">{group.description}</p>
            )}
          </div>
        </div>

        {/* Group Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onAddExpense(group._id)}
            className="add-btn add-btn-fill"
          >
            <LuPlus className="text-base" /> Add Group Expense
          </button>
          <button
            type="button"
            onClick={() => onSettleUp(null, 0, group)}
            className="add-btn"
          >
            <LuHandCoins className="text-base" /> Settle Up
          </button>
          <button
            type="button"
            onClick={() => onEditGroup(group)}
            className="card-btn"
            title="Edit group"
          >
            <LuPencil className="text-sm" /> Edit
          </button>
          {isCreator && (
            <button
              type="button"
              onClick={async () => {
                if (await confirm({ title: "Delete group?", message: `"${group.name}" and its history will be hidden for all members.`, confirmLabel: "Delete" })) {
                  onDeleteGroup(group._id);
                }
              }}
              className="card-btn hover:text-red-600"
              title="Delete group"
            >
              <LuTrash2 className="text-sm" />
            </button>
          )}
        </div>
      </div>

      {/* Top Banner Stats Grid */}
      <div className="stagger-children stat-grid stat-grid-3 mb-8">
        <InfoCard
          icon={<LuWallet />}
          label="Your balance in group"
          value={
            userBalance > 0
              ? `+₹${addThousandsSeparator(userBalance)}`
              : userBalance < 0
                ? `-₹${addThousandsSeparator(Math.abs(userBalance))}`
                : "₹0"
          }
          color={
            userBalance > 0
              ? "bg-green-500"
              : userBalance < 0
                ? "bg-rose-500"
                : "bg-purple-500"
          }
          valueClassName={
            userBalance > 0
              ? "text-emerald-500"
              : userBalance < 0
                ? "text-rose-500"
                : "text-gray-900 dark:text-white"
          }
          hint={
            userBalance > 0
              ? "You are owed"
              : userBalance < 0
                ? "You owe"
                : "Settled up"
          }
        />
        <InfoCard
          icon={<LuReceipt />}
          label="Total group spending"
          value={`₹${addThousandsSeparator(group.totalSpent || 0)}`}
          color="bg-purple-500"
          hint={`Across ${expenses.length} shared expense${expenses.length !== 1 ? "s" : ""}`}
        />
        <InfoCard
          icon={<LuUsers />}
          label="Members & Debts"
          value={`${group.members?.length || 0} Members`}
          color="bg-orange-500"
          hint={`${debtsToDisplay.length} payment${debtsToDisplay.length !== 1 ? "s" : ""} to settle all`}
        />
      </div>

      {/* Suggested Payments / Debt Simplification Box */}
      <div className="p-5 bg-linear-to-br from-purple-500/10 via-purple-500/5 to-transparent rounded-3xl border border-purple-200/80 dark:border-purple-800/60 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center text-sm shadow-md shadow-purple-600/30">
              <LuZap className="text-base" />
            </span>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Suggested Payments ({debtViewMode === "simplified" ? "Simplified" : "Detailed"})
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {debtViewMode === "simplified"
                  ? "Smart debt simplification reduces the total number of payments needed to zero out all balances."
                  : "Showing individual non-simplified debts from every expense."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 bg-white/80 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 text-xs">
            <button
              type="button"
              onClick={() => setDebtViewMode("simplified")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                debtViewMode === "simplified"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              ⚡ Simplified ({simplifiedDebts.length})
            </button>
            <button
              type="button"
              onClick={() => setDebtViewMode("detailed")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                debtViewMode === "detailed"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Ledger ({detailedDebts.length})
            </button>
          </div>
        </div>

        {debtsToDisplay.length === 0 ? (
          <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-2xl border border-purple-100 dark:border-purple-900/40 text-center">
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5">
              <LuCheck className="text-base" /> Everyone in this group is all settled up!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {debtsToDisplay.map((debt, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between gap-3 hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
              >
                <div className="flex items-center gap-2 text-sm min-w-0">
                  <span className="font-bold text-gray-900 dark:text-white truncate">
                    {debt.fromMember?.name || debt.from}
                  </span>
                  <LuArrowRight className="text-purple-600 shrink-0 text-sm" />
                  <span className="font-bold text-gray-900 dark:text-white truncate">
                    {debt.toMember?.name || debt.to}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-black text-purple-600 dark:text-purple-400 text-sm">
                    {formatCurrency(debt.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onSettleUp(debt.fromMember, debt.amount, group, debt.toMember)
                    }
                    className="add-btn"
                  >
                    Pay
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Member inline form if active */}
      {showAddMember && (
        <form
          onSubmit={handleAddMember}
          className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-purple-200 dark:border-purple-800 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <LuUserPlus className="text-purple-600" /> Add Member to Group
            </h4>
            <button
              type="button"
              onClick={() => setShowAddMember(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Cancel
            </button>
          </div>

          {memberError && (
            <p className="text-xs text-red-500 font-medium">{memberError}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Full Name"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="input-box my-0 text-xs py-2"
              required
            />
            <input
              type="email"
              placeholder="Email (optional, to sync registered account)"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              className="input-box my-0 text-xs py-2"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              disabled={addingMember}
              className="btn-primary w-auto"
            >
              {addingMember ? "Adding..." : "Add Member"}
            </button>
          </div>
        </form>
      )}

      {/* Group Navigation Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setActiveTab("expenses")}
          className={`pb-3 px-5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === "expenses"
              ? "border-purple-600 text-purple-600 dark:text-purple-400"
              : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          }`}
        >
          Expenses ({expenses.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("members")}
          className={`pb-3 px-5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === "members"
              ? "border-purple-600 text-purple-600 dark:text-purple-400"
              : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          }`}
        >
          Members & Balances ({group.members?.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("settlements")}
          className={`pb-3 px-5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === "settlements"
              ? "border-purple-600 text-purple-600 dark:text-purple-400"
              : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
          }`}
        >
          Settlements ({settlements.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "expenses" && (
        <div className="space-y-3">
          {expenses.length === 0 ? (
            <EmptyState
              icon={<LuReceipt />}
              title="No Group Expenses Yet"
              message="Add shared bills, food orders, or travel expenses to start tracking."
              action={
                <button
                  type="button"
                  onClick={() => onAddExpense(group._id)}
                  className="add-btn add-btn-fill"
                >
                  <LuPlus className="text-sm" /> Add First Expense
                </button>
              }
            />
          ) : (
            <div className="space-y-2">
              {expenses.map((exp) => (
                <div
                  key={exp._id}
                  onClick={() => onEditExpense(exp)}
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
                        <span>•</span>
                        <span>
                          Paid by{" "}
                          <strong className="text-gray-700 dark:text-gray-300">
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
                          onEditExpense(exp);
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
                          if (await confirm({ title: "Delete expense?", message: `"${exp.title}" will be removed for everyone in it.`, confirmLabel: "Delete" })) {
                            onDeleteExpense(exp._id);
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

      {activeTab === "members" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(group.members || []).map((m) => {
              const balance = m.balance || 0;
              return (
                <div
                  key={m._id}
                  className="card p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CharAvatar
                      fullName={m.name}
                      width="w-11"
                      height="h-11"
                      style="text-sm font-bold"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {m.name}
                        </h4>
                        {m.role === "admin" && (
                          <span className="badge badge-purple text-[9px] px-1.5 py-0">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate">
                        Spent {formatCurrency(m.totalPaid || 0)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {balance > 0 ? (
                      <span className="badge badge-green text-xs font-bold block">
                        +{formatCurrency(balance)}
                      </span>
                    ) : balance < 0 ? (
                      <span className="badge badge-red text-xs font-bold block">
                        {formatCurrency(balance)}
                      </span>
                    ) : (
                      <span className="badge badge-gray text-xs font-semibold block">
                        Settled
                      </span>
                    )}

                    {Math.abs(balance) <= 0.01 && m.role !== "admin" && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m._id, m.name)}
                        className="text-[10px] text-gray-400 hover:text-red-500 mt-1 cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "settlements" && (
        <div className="space-y-3">
          {settlements.length === 0 ? (
            <EmptyState
              icon={<LuHandCoins />}
              title="No Settlements Yet"
              message="When members make payments to settle up their debts in this group, they will appear here."
              action={
                <button
                  type="button"
                  onClick={() => onSettleUp(null, 0, group)}
                  className="add-btn add-btn-fill"
                >
                  <LuHandCoins className="text-sm" /> Record First Settlement
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
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 text-lg flex items-center justify-center font-bold shrink-0">
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
    </div>
  );
};

export default GroupDetailView;
