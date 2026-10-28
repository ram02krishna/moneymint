import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import { UserContext } from "../../context/UserContextDefinition";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import {
  LuArrowLeftRight,
  LuCheck,
  LuCircleDollarSign,
  LuClock3,
  LuHistory,
  LuPlus,
  LuReceipt,
  LuUsers,
  LuWallet,
} from "react-icons/lu";

const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value) || 0);
const dateLabel = (value) => value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Today";
const emailList = (value) => value.split(/[\n,;]+/).map((item) => item.trim().toLowerCase()).filter(Boolean);
const getError = (error) => error?.response?.data?.message || "Something went wrong. Please try again.";

const PrimaryButton = ({ children, onClick, disabled, type = "button", className = "" }) => (
  <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-purple-500 dark:hover:bg-purple-400 ${className}`}>{children}</button>
);
const Field = ({ label, ...props }) => (
  <label className="block min-w-0 text-sm font-medium text-gray-700 dark:text-gray-200">
    {label}
    <input {...props} className={`mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-purple-900 ${props.className || ""}`} />
  </label>
);

const emptyExpense = () => ({ title: "", amount: "", category: "General", note: "", paidByUserId: "", splitType: "equal" });

export default function Splits() {
  const { user } = useContext(UserContext);
  const [groups, setGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState("");
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: "", description: "", memberEmails: "" });
  const [friendEmail, setFriendEmail] = useState("");
  const [friendOpen, setFriendOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState(emptyExpense());
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [participantValues, setParticipantValues] = useState({});
  const [settlementForm, setSettlementForm] = useState(null);

  const refreshGroups = useCallback(async (chooseId = "") => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(API_PATHS.SPLITS.GROUPS);
      const nextGroups = response.data?.data?.groups || [];
      setGroups(nextGroups);
      setActiveGroupId((current) => {
        const nextActive = chooseId || current;
        if (nextActive && nextGroups.some((group) => group._id === nextActive)) return nextActive;
        return nextGroups[0]?._id || "";
      });
      setError("");
    } catch (e) {
      setError(getError(e));
    } finally { setLoading(false); }
  }, []);

  const refreshDetail = useCallback(async (groupId = activeGroupId) => {
    if (!groupId) return;
    setDetailLoading(true);
    try {
      const response = await axiosInstance.get(API_PATHS.SPLITS.GROUP(groupId));
      const next = response.data?.data;
      setDetail(next);
      setExpenseForm(() => ({ ...emptyExpense(), paidByUserId: String(user?._id || user?.id || "") || next?.group?.members?.[0]?.userId || "" }));
      setSelectedParticipants(next?.group?.members?.map((member) => member.userId) || []);
      setParticipantValues(Object.fromEntries((next?.group?.members || []).map((member) => [member.userId, { amount: "", percentage: "", shares: "1" }])));
      setError("");
    } catch (e) { setError(getError(e)); }
    finally { setDetailLoading(false); }
  }, [activeGroupId, user]);

  useEffect(() => { refreshGroups(); }, [refreshGroups]);
  useEffect(() => { if (activeGroupId) refreshDetail(activeGroupId); else setDetail(null); }, [activeGroupId, refreshDetail]);

  const changeSplitType = (type) => {
    setExpenseForm((form) => ({ ...form, splitType: type }));
    setParticipantValues((old) => {
      const ids = selectedParticipants;
      return Object.fromEntries(ids.map((id) => [id, { ...(old[id] || {}), amount: ids.length ? (Number(expenseForm.amount || 0) / ids.length).toFixed(2) : "0", percentage: ids.length ? String(100 / ids.length) : "0", shares: old[id]?.shares || "1" }]));
    });
  };

  const toggleParticipant = (userId) => {
    setSelectedParticipants((selected) => {
      const next = selected.includes(userId) ? selected.filter((id) => id !== userId) : [...selected, userId];
      setParticipantValues((values) => {
        const updated = { ...values, [userId]: values[userId] || { amount: "", percentage: String(100 / Math.max(next.length, 1)), shares: "1" } };
        if (expenseForm.splitType === "percentage" && next.length) {
          next.forEach((id) => { updated[id] = { ...(updated[id] || {}), percentage: String(100 / next.length) }; });
        }
        return updated;
      });
      return next;
    });
  };

  const handleCreateGroup = async (event) => {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const response = await axiosInstance.post(API_PATHS.SPLITS.GROUPS, { ...groupForm, memberEmails: emailList(groupForm.memberEmails) });
      const groupId = response.data?.data?.group?._id;
      setGroupForm({ name: "", description: "", memberEmails: "" }); setCreateOpen(false); setNotice("Group created successfully.");
      await refreshGroups(groupId); if (groupId) { setActiveGroupId(groupId); await refreshDetail(groupId); }
    } catch (e) { setError(getError(e)); }
    finally { setSaving(false); }
  };

  const handleAddFriend = async (event) => {
    event.preventDefault(); if (!detail?.group?._id) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await axiosInstance.post(API_PATHS.SPLITS.ADD_MEMBER(detail.group._id), { email: friendEmail.trim().toLowerCase() });
      setFriendEmail(""); setFriendOpen(false); setNotice("Friend added to the group.");
      await refreshDetail(detail.group._id); await refreshGroups(detail.group._id);
    } catch (e) { setError(getError(e)); }
    finally { setSaving(false); }
  };

  const handleAddExpense = async (event) => {
    event.preventDefault(); if (!detail?.group?._id) return;
    const amount = Number(expenseForm.amount);
    if (!expenseForm.title.trim() || !Number.isFinite(amount) || amount <= 0) { setError("Enter an expense description and a positive amount."); return; }
    if (!selectedParticipants.length) { setError("Select at least one participant."); return; }
    const participants = selectedParticipants.map((userId) => ({ userId, ...(expenseForm.splitType === "exact" ? { amount: Number(participantValues[userId]?.amount) } : {}), ...(expenseForm.splitType === "percentage" ? { percentage: Number(participantValues[userId]?.percentage) } : {}), ...(expenseForm.splitType === "shares" ? { shares: Number(participantValues[userId]?.shares) } : {}) }));
    setSaving(true); setError(""); setNotice("");
    try {
      await axiosInstance.post(API_PATHS.SPLITS.ADD_EXPENSE(detail.group._id), { ...expenseForm, amount, participants });
      setNotice("Shared expense recorded. Balances are updated."); setExpenseForm({ ...emptyExpense(), paidByUserId: user?._id || user?.id || detail.group.members[0]?.userId });
      await refreshDetail(detail.group._id); await refreshGroups(detail.group._id);
    } catch (e) { setError(getError(e)); }
    finally { setSaving(false); }
  };

  const handleSettlement = async (event) => {
    event.preventDefault(); if (!detail?.group?._id || !settlementForm) return;
    const amount = Number(settlementForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) { setError("Enter a valid settlement amount."); return; }
    setSaving(true); setError(""); setNotice("");
    try {
      await axiosInstance.post(API_PATHS.SPLITS.SETTLE(detail.group._id), { ...settlementForm, amount });
      setSettlementForm(null); setNotice("Settlement saved to the group history.");
      await refreshDetail(detail.group._id); await refreshGroups(detail.group._id);
    } catch (e) { setError(getError(e)); }
    finally { setSaving(false); }
  };

  const currentBalance = useMemo(() => (detail?.balances || []).find((balance) => balance.userId === String(user?._id || user?.id || ""))?.balance || 0, [detail, user]);
  const memberName = (id) => detail?.group?.members?.find((member) => member.userId === id)?.fullName || "Group member";
  const setParticipantValue = (id, key, value) => setParticipantValues((previous) => ({ ...previous, [id]: { ...(previous[id] || {}), [key]: value } }));

  return (
    <DashboardLayout activeMenu="Split Expenses">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-purple-600 dark:text-purple-400">Shared spending</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Split expenses</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">Share bills, keep track of balances, and settle up without mixing group spending into your personal expense reports.</p>
          </div>
          <PrimaryButton onClick={() => { setCreateOpen((value) => !value); setError(""); }}><LuPlus size={18} /> New group</PrimaryButton>
        </div>

        {notice && <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"><LuCheck className="mt-0.5 shrink-0" size={18} />{notice}</div>}
        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</div>}

        {createOpen && <form onSubmit={handleCreateGroup} className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Create a group</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Group name" value={groupForm.name} required minLength={2} maxLength={80} placeholder="e.g. Goa trip" onChange={(e) => setGroupForm((v) => ({ ...v, name: e.target.value }))} />
            <Field label="Description (optional)" value={groupForm.description} maxLength={300} placeholder="Trip, home, dinner…" onChange={(e) => setGroupForm((v) => ({ ...v, description: e.target.value }))} />
            <Field label="Friends' account emails" value={groupForm.memberEmails} placeholder="alex@example.com, sam@example.com" onChange={(e) => setGroupForm((v) => ({ ...v, memberEmails: e.target.value }))} />
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Friends must have an existing MoneyMint account. You can also add members after creating the group.</p>
          <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setCreateOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">Cancel</button><PrimaryButton type="submit" disabled={saving}>{saving ? "Creating…" : "Create group"}</PrimaryButton></div>
        </form>}

        <div className="grid items-start gap-6 lg:grid-cols-[310px_minmax(0,1fr)]">
          <aside className="space-y-3">
            <div className="flex items-center justify-between"><h2 className="text-base font-bold text-gray-900 dark:text-white">Your groups</h2><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">{groups.length}</span></div>
            {loading ? <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800">Loading groups…</div> : groups.length === 0 ? <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-8 text-center dark:border-gray-700 dark:bg-gray-800"><LuUsers className="mx-auto text-purple-500" size={30} /><p className="mt-3 font-semibold text-gray-900 dark:text-white">No groups yet</p><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create a group to start sharing bills.</p><button onClick={() => setCreateOpen(true)} className="mt-4 text-sm font-bold text-purple-600 dark:text-purple-400">Create your first group</button></div> : groups.map((group) => <button key={group._id} onClick={() => { setActiveGroupId(group._id); setError(""); setNotice(""); }} className={`w-full rounded-2xl border p-4 text-left transition ${activeGroupId === group._id ? "border-purple-300 bg-purple-50 shadow-sm dark:border-purple-700 dark:bg-purple-950/30" : "border-gray-200 bg-white hover:border-purple-200 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-purple-700"}`}>
              <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"><LuUsers size={21} /></div><div className="min-w-0 flex-1"><p className="truncate font-bold text-gray-900 dark:text-white">{group.name}</p><p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{group.members.length} members</p><p className={`mt-2 text-sm font-bold ${group.myBalance > 0 ? "text-emerald-600 dark:text-emerald-400" : group.myBalance < 0 ? "text-rose-600 dark:text-rose-400" : "text-gray-500 dark:text-gray-400"}`}>{group.myBalance > 0 ? `${money(group.myBalance)} owed to you` : group.myBalance < 0 ? `${money(Math.abs(group.myBalance))} you owe` : "All settled"}</p></div></div>
            </button>)}
          </aside>

          <section className="min-w-0 space-y-5">
            {!activeGroupId ? <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800"><LuWallet size={38} className="text-purple-500" /><h2 className="mt-3 text-lg font-bold text-gray-900 dark:text-white">Shared expenses, simplified</h2><p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">Select a group to record bills and track who owes whom.</p></div> : detailLoading || !detail ? <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800">Loading group ledger…</div> : <>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="flex items-start gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"><LuUsers size={23} /></div><div><h2 className="text-xl font-extrabold text-gray-900 dark:text-white">{detail.group.name}</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{detail.group.description || "Shared expenses and settlements"}</p><p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Created {dateLabel(detail.group.createdAt)} · {detail.group.members.length} members</p></div></div><button onClick={() => { setFriendOpen((v) => !v); setError(""); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"><LuPlus size={16} /> Add friend</button></div>
                {friendOpen && <form onSubmit={handleAddFriend} className="mt-5 flex flex-col gap-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-900 sm:flex-row"><div className="flex-1"><Field label="Friend's MoneyMint email" value={friendEmail} type="email" required placeholder="friend@example.com" onChange={(e) => setFriendEmail(e.target.value)} /></div><div className="flex items-end gap-2"><PrimaryButton type="submit" disabled={saving}>{saving ? "Adding…" : "Add member"}</PrimaryButton><button type="button" onClick={() => setFriendOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700">Cancel</button></div></form>}
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Your net balance</p><p className={`mt-2 text-2xl font-extrabold ${currentBalance > 0 ? "text-emerald-600 dark:text-emerald-400" : currentBalance < 0 ? "text-rose-600 dark:text-rose-400" : "text-gray-900 dark:text-white"}`}>{money(Math.abs(currentBalance))}</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{currentBalance > 0 ? "others owe you" : currentBalance < 0 ? "you owe the group" : "you are settled up"}</p></div>
                  <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Shared bills</p><p className="mt-2 text-2xl font-extrabold text-gray-900 dark:text-white">{detail.expenses.length}</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{money(detail.expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0))} recorded</p></div>
                  <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Settlements</p><p className="mt-2 text-2xl font-extrabold text-gray-900 dark:text-white">{detail.settlements.length}</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{money(detail.settlements.reduce((sum, item) => sum + Number(item.amount || 0), 0))} paid back</p></div>
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 sm:p-6">
                  <div className="mb-4 flex items-center gap-2"><LuReceipt className="text-purple-600 dark:text-purple-400" size={20} /><h3 className="text-lg font-bold text-gray-900 dark:text-white">Record a shared bill</h3></div>
                  <form className="space-y-4" onSubmit={handleAddExpense}>
                    <Field label="What was it for?" value={expenseForm.title} required maxLength={120} placeholder="Dinner, groceries, hotel…" onChange={(e) => setExpenseForm((v) => ({ ...v, title: e.target.value }))} />
                    <div className="grid grid-cols-2 gap-3"><Field label="Total amount (₹)" value={expenseForm.amount} required type="number" min="0.01" step="0.01" placeholder="0.00" onChange={(e) => setExpenseForm((v) => ({ ...v, amount: e.target.value }))} /><Field label="Category" value={expenseForm.category} maxLength={60} placeholder="General" onChange={(e) => setExpenseForm((v) => ({ ...v, category: e.target.value }))} /></div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Paid by<select required value={expenseForm.paidByUserId} onChange={(e) => setExpenseForm((v) => ({ ...v, paidByUserId: e.target.value }))} className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"><option value="">Choose payer</option>{detail.group.members.map((member) => <option key={member.userId} value={member.userId}>{member.fullName}{member.userId === String(user?._id || user?.id || "") ? " (you)" : ""}</option>)}</select></label>
                    <div><p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Split method</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[["equal", "Equal"], ["exact", "Exact amounts"], ["percentage", "% Percent"], ["shares", "Shares"]].map(([value, label]) => <button type="button" key={value} onClick={() => changeSplitType(value)} className={`rounded-xl border px-2 py-2 text-xs font-bold transition ${expenseForm.splitType === value ? "border-purple-400 bg-purple-50 text-purple-700 dark:border-purple-600 dark:bg-purple-950/40 dark:text-purple-300" : "border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"}`}>{label}</button>)}</div></div>
                    <div><div className="mb-2 flex items-center justify-between"><p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Who participated?</p><button type="button" onClick={() => setSelectedParticipants(detail.group.members.map((member) => member.userId))} className="text-xs font-semibold text-purple-600 dark:text-purple-400">Select all</button></div><div className="space-y-2">{detail.group.members.map((member) => { const selected = selectedParticipants.includes(member.userId); return <div key={member.userId} className={`rounded-xl border p-3 ${selected ? "border-purple-200 bg-purple-50/60 dark:border-purple-900 dark:bg-purple-950/20" : "border-gray-200 dark:border-gray-700"}`}><label className="flex cursor-pointer items-center gap-3"><input type="checkbox" checked={selected} onChange={() => toggleParticipant(member.userId)} className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" /><span className="min-w-0 flex-1 text-sm font-semibold text-gray-800 dark:text-gray-100">{member.fullName}{member.userId === String(user?._id || user?.id || "") ? " (you)" : ""}</span>{expenseForm.splitType === "equal" && selected && <span className="text-xs text-gray-500">Equal share</span>}</label>{selected && expenseForm.splitType !== "equal" && <div className="mt-3 pl-7"><Field label={expenseForm.splitType === "exact" ? "Share amount (₹)" : expenseForm.splitType === "percentage" ? "Percentage (%)" : "Number of shares"} value={participantValues[member.userId]?.[expenseForm.splitType === "exact" ? "amount" : expenseForm.splitType === "percentage" ? "percentage" : "shares"] ?? ""} type="number" min="0" step={expenseForm.splitType === "exact" ? "0.01" : "0.01"} required onChange={(e) => setParticipantValue(member.userId, expenseForm.splitType === "exact" ? "amount" : expenseForm.splitType === "percentage" ? "percentage" : "shares", e.target.value)} /></div>}</div>; })}</div></div>
                    <Field label="Note (optional)" value={expenseForm.note} maxLength={500} placeholder="Add a detail for the group" onChange={(e) => setExpenseForm((v) => ({ ...v, note: e.target.value }))} />
                    <PrimaryButton type="submit" disabled={saving || !selectedParticipants.length} className="w-full">{saving ? "Saving…" : "Save shared expense"}</PrimaryButton>
                    <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">Shared bills are kept separate from your personal expenses. Amounts are split to the cent, and rounding remainders are allocated deterministically.</p>
                  </form>
                </div>

                <div className="space-y-5">
                  <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 sm:p-6"><div className="mb-4 flex items-center gap-2"><LuCircleDollarSign className="text-purple-600 dark:text-purple-400" size={20} /><h3 className="text-lg font-bold text-gray-900 dark:text-white">Balances by person</h3></div><div className="space-y-3">{detail.balances.map((balance) => <div key={balance.userId} className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0 dark:border-gray-700"><div className="min-w-0"><p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{balance.fullName}{balance.userId === String(user?._id || user?.id || "") ? " (you)" : ""}</p><p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{balance.balance > 0 ? "Should receive" : balance.balance < 0 ? "Should pay" : "Settled up"}</p></div><p className={`shrink-0 text-sm font-bold ${balance.balance > 0 ? "text-emerald-600 dark:text-emerald-400" : balance.balance < 0 ? "text-rose-600 dark:text-rose-400" : "text-gray-500"}`}>{balance.balance < 0 ? "−" : balance.balance > 0 ? "+" : ""}{money(Math.abs(balance.balance))}</p></div>)}</div></div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 sm:p-6"><div className="mb-4 flex items-center gap-2"><LuArrowLeftRight className="text-purple-600 dark:text-purple-400" size={20} /><h3 className="text-lg font-bold text-gray-900 dark:text-white">Settle up</h3></div>{detail.suggestedDebts.length === 0 ? <p className="rounded-xl bg-emerald-50 px-4 py-5 text-center text-sm font-medium text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">Everyone is settled up. Nice work!</p> : <div className="space-y-3">{detail.suggestedDebts.map((debt, index) => <div key={`${debt.fromUserId}-${debt.toUserId}-${index}`} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700"><div className="flex flex-wrap items-center gap-2 text-sm"><span className="font-semibold text-gray-900 dark:text-white">{debt.fromName}</span><LuArrowRightLeft className="text-gray-400" size={15} /><span className="font-semibold text-gray-900 dark:text-white">{debt.toName}</span><span className="ml-auto font-extrabold text-gray-900 dark:text-white">{money(debt.amount)}</span></div><button onClick={() => { setSettlementForm({ fromUserId: debt.fromUserId, toUserId: debt.toUserId, amount: String(debt.amount), note: "" }); setError(""); }} className="mt-3 w-full rounded-lg bg-purple-50 px-3 py-2 text-xs font-bold text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/60">Record settlement / partial payment</button></div>)}</div>}
                    {settlementForm && <form onSubmit={handleSettlement} className="mt-4 space-y-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-900"><div className="text-sm font-bold text-gray-900 dark:text-white">{memberName(settlementForm.fromUserId)} pays {memberName(settlementForm.toUserId)}</div><Field label="Amount paid (₹)" type="number" required min="0.01" step="0.01" value={settlementForm.amount} onChange={(e) => setSettlementForm((v) => ({ ...v, amount: e.target.value }))} /><Field label="Note (optional)" value={settlementForm.note} maxLength={300} placeholder="UPI, cash, partial payment…" onChange={(e) => setSettlementForm((v) => ({ ...v, note: e.target.value }))} /><div className="flex gap-2"><PrimaryButton type="submit" disabled={saving} className="flex-1">{saving ? "Saving…" : "Confirm settlement"}</PrimaryButton><button type="button" onClick={() => setSettlementForm(null)} className="rounded-xl px-3 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700">Cancel</button></div><p className="text-xs text-gray-500 dark:text-gray-400">Partial settlements are supported; the amount cannot exceed the currently outstanding balance between the selected members.</p></form>}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 sm:p-6"><div className="mb-4 flex items-center gap-2"><LuHistory className="text-purple-600 dark:text-purple-400" size={20} /><h3 className="text-lg font-bold text-gray-900 dark:text-white">Transaction history</h3></div>{detail.history.length === 0 ? <div className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"><LuClock3 className="mx-auto mb-2" size={24} />No activity in this group yet. Add the first shared bill above.</div> : <div className="divide-y divide-gray-100 dark:divide-gray-700">{detail.history.map((item) => <div key={`${item.type}-${item._id}`} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0"><div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.type === "settlement" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400"}`}>{item.type === "settlement" ? <LuArrowLeftRight size={19} /> : <LuReceipt size={19} />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold text-gray-900 dark:text-white">{item.type === "settlement" ? `${item.fromName} paid ${item.toName}` : item.title}</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{dateLabel(item.date)}{item.type === "expense" ? ` · Paid by ${item.paidByName} · Split ${item.splitType}` : " · Settlement"}</p>{item.note && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.note}</p>}</div><p className={`shrink-0 font-extrabold ${item.type === "settlement" ? "text-emerald-600 dark:text-emerald-400" : "text-gray-900 dark:text-white"}`}>{item.type === "settlement" ? "− " : ""}{money(item.amount)}</p></div>{item.type === "expense" && <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">{item.participants.map((participant) => `${participant.fullName}: ${money(participant.amount)}`).join(" · ")}</p>}</div></div>)}</div>}</div>
            </>}
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
