import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../theme";
import { useToast } from "../context/ToastContext";
import { Badge, Button, Card, Chip, ChipRow, ConfirmSheet, DateField, EmptyState, Header, IconButton, Input, Loading, Screen, SectionTitle, Sheet, StatTile } from "../components/ui";
import client, { getErrorMessage } from "../api/client";
import { API_PATHS } from "../api/paths";
import { inr, shortDate, toDateString } from "../utils/format";

const EXPENSE_CATEGORIES = ["Food & Dining", "Transportation", "Accommodation", "Entertainment", "Groceries", "Utilities", "Shopping", "Travel", "General", "Other"];
const GROUP_CATEGORIES = [
  { id: "Trip", icon: "✈️" }, { id: "Home", icon: "🏠" }, { id: "Roommates", icon: "🛋️" },
  { id: "Couple", icon: "💑" }, { id: "Office", icon: "🏢" }, { id: "Friends", icon: "🍻" },
  { id: "Project", icon: "🎯" }, { id: "Other", icon: "👥" },
];
const PAYMENT_METHODS = ["UPI", "Cash", "Bank Transfer", "PayPal", "Card", "Other"];
const SPLIT_METHODS = [
  ["equal", "Equally"], ["exact", "Exact amounts"], ["percentage", "Percentages"],
  ["shares", "Shares"], ["itemized", "Itemized"],
];
const TABS = [
  ["dashboard", "Dashboard", "grid-outline"], ["groups", "Groups", "people-outline"],
  ["friends", "Friends", "person-add-outline"], ["expenses", "Expenses", "receipt-outline"],
  ["settlements", "Settlements", "cash-outline"], ["analytics", "Analytics", "pie-chart-outline"],
  ["activity", "Activity", "pulse-outline"],
];
const today = () => toDateString(new Date());
const idOf = (value) => value && typeof value === "object" ? String(value._id || value.id || "") : value ? String(value) : "";
const partyKey = (person) => idOf(person?.user) || idOf(person?._id) || person?.name || "";
const personName = (person) => person?.name || person?.fullName || "Unknown";
const cleanName = (name) => String(name || "").replace(/ \(You\)$/, "");
const errorText = (error, fallback) => getErrorMessage(error, fallback);

function ChoiceRow({ label, selected, onPress, detail }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 }}>
      <View style={{ width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : "transparent", alignItems: "center", justifyContent: "center" }}>
        {selected ? <Ionicons name="checkmark" size={15} color="#fff" /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontWeight: "600" }}>{label}</Text>
        {detail ? <Text style={{ color: colors.sub, fontSize: 12, marginTop: 2 }}>{detail}</Text> : null}
      </View>
    </Pressable>
  );
}

function ExpenseCard({ expense, onEdit, onDelete, onPress }) {
  const { colors } = useTheme();
  const groupName = expense.group?.name;
  return (
    <Card style={{ marginBottom: 10 }}>
      <Pressable onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 22 }}>{expense.group?.icon || "🧾"}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: "800", fontSize: 15 }} numberOfLines={1}>{expense.title}</Text>
          <Text style={{ color: colors.sub, fontSize: 12, marginTop: 3 }} numberOfLines={1}>
            {expense.category || "General"}{groupName ? ` · ${groupName}` : ""} · {shortDate(expense.date)}
          </Text>
          <Text style={{ color: colors.sub, fontSize: 12, marginTop: 3 }} numberOfLines={1}>
            Paid by {(expense.paidBy || []).map((p) => personName(p)).join(", ") || "—"}
          </Text>
        </View>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>{inr(expense.amount)}</Text>
      </Pressable>
      <View style={{ flexDirection: "row", justifyContent: "flex-end", borderTopWidth: 1, borderTopColor: colors.border, marginTop: 12, paddingTop: 5 }}>
        <IconButton name="create-outline" onPress={onEdit} color={colors.primary} />
        <IconButton name="trash-outline" onPress={onDelete} color={colors.danger} />
      </View>
    </Card>
  );
}

export default function SplitExpensesScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [groups, setGroups] = useState([]);
  const [friends, setFriends] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [activities, setActivities] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [groupData, setGroupData] = useState(null);
  const [groupLoading, setGroupLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseForm, setExpenseForm] = useState(null);
  const [splitMethod, setSplitMethod] = useState("equal");
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [singlePayer, setSinglePayer] = useState("");
  const [multiplePayers, setMultiplePayers] = useState(false);
  const [payerAmounts, setPayerAmounts] = useState({});
  const [exactShares, setExactShares] = useState({});
  const [percentages, setPercentages] = useState({});
  const [ratios, setRatios] = useState({});
  const [items, setItems] = useState([{ name: "Item 1", price: "", assignedTo: [] }]);
  const [tax, setTax] = useState("");
  const [tip, setTip] = useState("");
  const [savingExpense, setSavingExpense] = useState(false);

  const [groupOpen, setGroupOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupForm, setGroupForm] = useState({ name: "", description: "", category: "Trip", simplifyDebts: true });
  const [groupFriendKeys, setGroupFriendKeys] = useState([]);
  const [groupCustomMembers, setGroupCustomMembers] = useState([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");

  const [friendOpen, setFriendOpen] = useState(false);
  const [friendMode, setFriendMode] = useState("search");
  const [friendQuery, setFriendQuery] = useState("");
  const [friendResults, setFriendResults] = useState([]);
  const [friendSearching, setFriendSearching] = useState(false);
  const [friendForm, setFriendForm] = useState({ name: "", email: "", phone: "" });
  const [friendDetail, setFriendDetail] = useState(null);

  const [settlementOpen, setSettlementOpen] = useState(false);
  const [settlementDefaults, setSettlementDefaults] = useState({});
  const [settlementForm, setSettlementForm] = useState(null);
  const [savingSettlement, setSavingSettlement] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [memberForm, setMemberForm] = useState({ name: "", email: "" });

  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [dash, grp, fr, exp, set, act] = await Promise.all([
        client.get(API_PATHS.SPLIT.DASHBOARD), client.get(API_PATHS.SPLIT.GROUPS.GET_ALL),
        client.get(API_PATHS.SPLIT.FRIENDS.GET_ALL), client.get(API_PATHS.SPLIT.EXPENSES.GET_ALL),
        client.get(API_PATHS.SPLIT.SETTLEMENTS.GET_ALL), client.get(API_PATHS.SPLIT.ACTIVITY),
      ]);
      setDashboard(dash.data?.data);
      setGroups(grp.data?.data?.groups || []);
      setFriends(fr.data?.data?.friends || []);
      setExpenses(exp.data?.data?.expenses || []);
      setSettlements(set.data?.data?.settlements || []);
      setActivities(act.data?.data?.activities || []);
    } catch (error) {
      toast.error(errorText(error, "Could not load split expenses"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useFocusEffect(useCallback(() => {
    setSelectedGroupId(null);
    setActiveTab("dashboard");
    load();
  }, [load]));

  useEffect(() => {
    if (activeTab !== "analytics") return;
    let active = true;
    setAnalyticsLoading(true);
    client.get(API_PATHS.SPLIT.ANALYTICS)
      .then((response) => { if (active) setAnalytics(response.data?.data || null); })
      .catch((error) => { if (active) toast.error(errorText(error, "Could not load split analytics")); })
      .finally(() => { if (active) setAnalyticsLoading(false); });
    return () => { active = false; };
  }, [activeTab, toast]);

  const fetchGroupDetail = useCallback(async (id = selectedGroupId) => {
    if (!id) return;
    setGroupLoading(true);
    try {
      const response = await client.get(API_PATHS.SPLIT.GROUPS.GET_ONE(id));
      setGroupData(response.data?.data || null);
    } catch (error) {
      toast.error(errorText(error, "Could not load group details"));
      setGroupData(null);
    } finally {
      setGroupLoading(false);
    }
  }, [selectedGroupId, toast]);

  useEffect(() => {
    if (selectedGroupId) fetchGroupDetail(selectedGroupId);
  }, [selectedGroupId, fetchGroupDetail]);

  useEffect(() => {
    if (friendMode !== "search" || friendQuery.trim().length < 2) {
      setFriendResults([]);
      return undefined;
    }
    let active = true;
    const timer = setTimeout(async () => {
      setFriendSearching(true);
      try {
        const response = await client.get(API_PATHS.SPLIT.FRIENDS.SEARCH_USERS(friendQuery.trim()));
        if (active) setFriendResults(response.data?.data?.users || []);
      } catch (error) {
        if (active) toast.error(errorText(error, "Could not search users"));
      } finally {
        if (active) setFriendSearching(false);
      }
    }, 350);
    return () => { active = false; clearTimeout(timer); };
  }, [friendMode, friendQuery, toast]);

  const summary = dashboard?.summary || {};
  const currentUserId = idOf(user?._id);
  const currentUserEmail = user?.email?.toLowerCase();
  const friendParty = (friend) => ({
    user: idOf(friend.friendUser) || null,
    _id: idOf(friend.friendUser) || idOf(friend._id),
    name: friend.name,
    email: friend.email || "",
  });
  const openGroupDetails = (groupId) => {
    setActiveTab("group-expenses");
    setSelectedGroupId(groupId);
  };

  const availableMembers = useMemo(() => {
    const list = [{
      key: currentUserId || "currentUser", user: currentUserId || null,
      name: `${user?.fullName || "You"} (You)`, email: user?.email || "", isSelf: true,
    }];
    const groupId = expenseForm?.group || "";
    if (groupId) {
      const group = groups.find((g) => idOf(g._id) === String(groupId));
      (group?.members || []).forEach((member) => {
        const uid = idOf(member.user);
        const isSelf = (uid && uid === currentUserId) || (member.email && member.email.toLowerCase() === currentUserEmail);
        if (isSelf) return;
        const key = uid || idOf(member._id) || member.name;
        if (!list.some((person) => person.key === key)) list.push({ key, user: uid || null, name: personName(member), email: member.email || "" });
      });
    } else {
      friends.forEach((friend) => {
        const uid = idOf(friend.friendUser);
        const key = uid || idOf(friend._id) || friend.name;
        if (!list.some((person) => person.key === key)) list.push({ key, user: uid || null, name: friend.name, email: friend.email || "" });
      });
    }
    return list;
  }, [currentUserEmail, currentUserId, expenseForm?.group, friends, groups, user?.email, user?.fullName]);

  const openNewExpense = (groupId = null) => {
    const group = groupId ? groups.find((g) => idOf(g._id) === String(groupId)) : null;
    const selected = [currentUserId || "currentUser"];
    if (group) {
      group.members.forEach((m) => {
        const uid = idOf(m.user);
        const key = uid || idOf(m._id) || m.name;
        if (!((uid && uid === currentUserId) || (m.email && m.email.toLowerCase() === currentUserEmail))) selected.push(key);
      });
    } else if (friends[0]) selected.push(idOf(friends[0].friendUser) || idOf(friends[0]._id) || friends[0].name);
    setEditingExpense(null);
    setExpenseForm({ title: "", amount: "", category: "Food & Dining", date: today(), notes: "", group: groupId ? String(groupId) : "" });
    setSplitMethod("equal");
    setSelectedKeys(selected);
    setSinglePayer(currentUserId || "currentUser");
    setMultiplePayers(false);
    setPayerAmounts({});
    setExactShares({});
    setPercentages({});
    setRatios({});
    setItems([{ name: "Item 1", price: "", assignedTo: [] }]);
    setTax("");
    setTip("");
    setExpenseOpen(true);
  };

  const openEditExpense = (expense) => {
    const groupId = idOf(expense.group);
    const resolveKey = (party) => {
      const key = partyKey(party);
      const candidates = groupId
        ? groups.find((group) => idOf(group._id) === groupId)?.members || []
        : friends;
      const match = candidates.find((candidate) =>
        (idOf(candidate.user || candidate.friendUser) && idOf(candidate.user || candidate.friendUser) === key) ||
        (party.email && candidate.email?.toLowerCase() === party.email.toLowerCase()) ||
        (party.name && candidate.name?.toLowerCase() === party.name.toLowerCase()),
      );
      return match ? idOf(match.user || match.friendUser) || idOf(match._id) || match.name : key;
    };
    const selected = (expense.participants || []).map(resolveKey).filter(Boolean);
    const payerMap = {};
    (expense.paidBy || []).forEach((p) => { payerMap[resolveKey(p)] = String(p.amount); });
    const exact = {}, pct = {}, shareRatio = {};
    (expense.participants || []).forEach((p) => {
      const key = resolveKey(p);
      exact[key] = String(p.shareAmount ?? "");
      if (p.percentage != null) pct[key] = String(p.percentage);
      if (p.shares != null) shareRatio[key] = String(p.shares);
    });
    setEditingExpense(expense);
    setExpenseForm({ title: expense.title || "", amount: String(expense.amount || ""), category: expense.category || "General", date: toDateString(expense.date), notes: expense.notes || "", group: groupId });
    setSplitMethod(expense.splitMethod || "equal");
    setSelectedKeys(selected);
    setSinglePayer(resolveKey(expense.paidBy?.[0] || {}) || currentUserId || "currentUser");
    setMultiplePayers((expense.paidBy || []).length > 1);
    setPayerAmounts(payerMap);
    setExactShares(exact);
    setPercentages(pct);
    setRatios(shareRatio);
    setItems((expense.itemDetails || []).length ? expense.itemDetails.map((item) => ({ name: item.name, price: String(item.price || ""), assignedTo: item.assignedTo || [] })) : [{ name: "Item 1", price: "", assignedTo: [] }]);
    setTax(String(expense.tax || ""));
    setTip(String(expense.tip || ""));
    setExpenseOpen(true);
  };

  const selectedMembers = availableMembers.filter((person) => selectedKeys.includes(person.key));
  const toggleParticipant = (key) => {
    if (selectedKeys.includes(key)) {
      setSelectedKeys((previous) => previous.filter((item) => item !== key));
      setItems((previous) => previous.map((item) => ({
        ...item,
        assignedTo: item.assignedTo.filter((personKey) => personKey !== key),
      })));
    } else {
      setSelectedKeys((previous) => [...previous, key]);
    }
  };
  const amountValue = Number(expenseForm?.amount) || 0;
  const participantShares = useMemo(() => {
    const count = selectedMembers.length;
    if (!count || amountValue <= 0) return [];
    const cents = Math.round(amountValue * 100);
    if (splitMethod === "equal") {
      const base = Math.floor(cents / count);
      let remainder = cents - base * count;
      return selectedMembers.map(() => {
        const value = base + (remainder-- > 0 ? 1 : 0);
        return value / 100;
      });
    }
    if (splitMethod === "exact") return selectedMembers.map((p) => Number(exactShares[p.key]) || 0);
    if (splitMethod === "percentage") {
      const raw = selectedMembers.map((p) => Math.round(cents * (Number(percentages[p.key]) || 0) / 100));
      const diff = cents - raw.reduce((sum, item) => sum + item, 0);
      const largest = raw.indexOf(Math.max(...raw));
      if (largest >= 0) raw[largest] += diff;
      return raw.map((v) => v / 100);
    }
    if (splitMethod === "shares") {
      const total = selectedMembers.reduce((sum, p) => sum + (Number(ratios[p.key]) || 0), 0);
      if (!total) return selectedMembers.map(() => 0);
      const raw = selectedMembers.map((p) => Math.round(cents * (Number(ratios[p.key]) || 0) / total));
      const diff = cents - raw.reduce((sum, item) => sum + item, 0);
      const largest = selectedMembers.reduce((best, p, i) => (Number(ratios[p.key]) || 0) > (Number(ratios[selectedMembers[best]?.key]) || 0) ? i : best, 0);
      raw[largest] += diff;
      return raw.map((v) => v / 100);
    }
    const subtotal = selectedMembers.map((p) => items.reduce((sum, item) => {
      if (!item.assignedTo.includes(p.key)) return sum;
      const people = item.assignedTo.length || 1;
      return sum + Math.round((Number(item.price) || 0) * 100 / people) / 100;
    }, 0));
    const fullSubtotal = subtotal.reduce((sum, value) => sum + value, 0);
    const extras = Number(tax || 0) + Number(tip || 0);
    return subtotal.map((value) => fullSubtotal ? value + extras * value / fullSubtotal : 0);
  }, [amountValue, exactShares, items, percentages, ratios, selectedKeys, selectedMembers, splitMethod, tax, tip]);

  const saveExpense = async () => {
    if (!expenseForm?.title.trim()) return toast.error("Enter an expense title");
    if (!Number.isFinite(amountValue) || amountValue <= 0) return toast.error("Enter a valid positive amount");
    if (!selectedMembers.length) return toast.error("Select at least one participant");
    if (splitMethod === "exact" && Math.round(selectedMembers.reduce((s, p) => s + (Number(exactShares[p.key]) || 0), 0) * 100) !== Math.round(amountValue * 100)) return toast.error("Exact shares must add up to the expense total");
    if (splitMethod === "percentage" && Math.abs(selectedMembers.reduce((s, p) => s + (Number(percentages[p.key]) || 0), 0) - 100) > 0.05) return toast.error("Percentages must add up to 100%");
    if (splitMethod === "shares" && selectedMembers.some((p) => (Number(ratios[p.key]) || 0) <= 0)) return toast.error("Each person needs at least one share");
    if (splitMethod === "itemized") {
      const total = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0) + (Number(tax) || 0) + (Number(tip) || 0);
      if (Math.abs(total - amountValue) > 0.01) return toast.error(`Items, tax and tip must add up to ${inr(amountValue)}`);
      if (items.some((item) => Number(item.price) > 0 && !item.assignedTo.length)) return toast.error("Assign every item to at least one person");
    }
    const payers = multiplePayers
      ? availableMembers.filter((p) => Number(payerAmounts[p.key]) > 0).map((p) => ({ user: p.user || null, name: cleanName(p.name), email: p.email || "", amount: Number(payerAmounts[p.key]) }))
      : (() => {
        const payer = availableMembers.find((p) => p.key === singlePayer) || availableMembers[0];
        return payer ? [{ user: payer.user || null, name: cleanName(payer.name), email: payer.email || "", amount: amountValue }] : [];
      })();
    if (!payers.length) return toast.error("Choose who paid for this expense");
    if (multiplePayers && Math.round(payers.reduce((sum, p) => sum + p.amount, 0) * 100) !== Math.round(amountValue * 100)) return toast.error("Payer amounts must add up to the expense total");
    const participants = selectedMembers.map((p, index) => ({
      key: p.key, user: p.user || null, name: cleanName(p.name), email: p.email || "",
      shareAmount: Number(participantShares[index] || 0),
      percentage: splitMethod === "percentage" ? Number(percentages[p.key]) || 0 : null,
      shares: splitMethod === "shares" ? Number(ratios[p.key]) || 1 : null,
    }));
    const payload = {
      ...expenseForm, amount: amountValue, group: expenseForm.group || null, paidBy: payers,
      splitMethod, participants,
      itemDetails: splitMethod === "itemized" ? items.map((item) => ({ ...item, price: Number(item.price) || 0 })) : [],
      tax: splitMethod === "itemized" ? Number(tax) || 0 : 0,
      tip: splitMethod === "itemized" ? Number(tip) || 0 : 0,
    };
    setSavingExpense(true);
    try {
      if (editingExpense) await client.put(API_PATHS.SPLIT.EXPENSES.UPDATE(editingExpense._id), payload);
      else await client.post(API_PATHS.SPLIT.EXPENSES.CREATE, payload);
      toast.success(editingExpense ? "Expense updated" : "Expense added");
      setExpenseOpen(false);
      await load();
      if (selectedGroupId) await fetchGroupDetail(selectedGroupId);
    } catch (error) {
      toast.error(errorText(error, "Could not save expense"));
    } finally {
      setSavingExpense(false);
    }
  };

  const openGroupForm = (group = null) => {
    setEditingGroup(group);
    setGroupForm({ name: group?.name || "", description: group?.description || "", category: group?.category || "Trip", simplifyDebts: group?.simplifyDebts !== false });
    setGroupFriendKeys([]);
    setGroupCustomMembers([]);
    setNewMemberName("");
    setNewMemberEmail("");
    setGroupOpen(true);
  };

  const saveGroup = async () => {
    if (!groupForm.name.trim()) return toast.error("Enter a group name");
    const category = GROUP_CATEGORIES.find((item) => item.id === groupForm.category) || GROUP_CATEGORIES[0];
    const members = [
      ...friends.filter((friend) => groupFriendKeys.includes(idOf(friend.friendUser) || idOf(friend._id))).map((friend) => ({
        user: idOf(friend.friendUser) || null, name: friend.name, email: friend.email || "",
      })),
      ...groupCustomMembers,
      ...(newMemberName.trim() || newMemberEmail.trim() ? [{
        name: newMemberName.trim() || newMemberEmail.trim().split("@")[0],
        email: newMemberEmail.trim().toLowerCase(),
      }] : []),
    ];
    const payload = { ...groupForm, name: groupForm.name.trim(), description: groupForm.description.trim(), icon: category.icon, members };
    try {
      if (editingGroup) await client.put(API_PATHS.SPLIT.GROUPS.UPDATE(editingGroup._id), payload);
      else await client.post(API_PATHS.SPLIT.GROUPS.CREATE, payload);
      toast.success(editingGroup ? "Group updated" : "Group created");
      setGroupOpen(false);
      await load();
      if (editingGroup && selectedGroupId) await fetchGroupDetail(selectedGroupId);
    } catch (error) {
      toast.error(errorText(error, "Could not save group"));
    }
  };

  const openSettlement = (options = {}) => {
    const self = currentUserId || "currentUser";
    const amount = Number(options.amount) || 0;
    const payer = options.payer ? partyKey(options.payer) : self;
    const payee = options.payee ? partyKey(options.payee) : options.payer ? self : (friends[0] ? idOf(friends[0].friendUser) || idOf(friends[0]._id) : "");
    setSettlementDefaults({ group: options.group ? idOf(options.group._id || options.group) : "", suggested: amount });
    setSettlementForm({ payer, payee, amount: amount ? String(amount) : "", paymentMethod: "UPI", referenceNumber: "", notes: "", date: today() });
    setSettlementOpen(true);
  };

  const settlementPeople = useMemo(() => {
    if (settlementDefaults.group) {
      const group = groups.find((g) => idOf(g._id) === settlementDefaults.group);
      if (group?.members?.length) return group.members.map((member) => ({
        key: idOf(member.user) || idOf(member._id) || member.name,
        user: idOf(member.user) || null, name: member.name, email: member.email || "",
      }));
    }
    return [
      { key: currentUserId || "currentUser", user: currentUserId || null, name: `${user?.fullName || "You"} (You)`, email: user?.email || "" },
      ...friends.map((f) => ({ key: idOf(f.friendUser) || idOf(f._id) || f.name, user: idOf(f.friendUser) || null, name: f.name, email: f.email || "" })),
    ];
  }, [currentUserId, friends, groups, settlementDefaults.group, user?.email, user?.fullName]);

  const saveSettlement = async () => {
    const payer = settlementPeople.find((p) => p.key === settlementForm?.payer);
    const payee = settlementPeople.find((p) => p.key === settlementForm?.payee);
    const amount = Number(settlementForm?.amount);
    if (!amount || amount <= 0) return toast.error("Enter a settlement amount greater than zero");
    if (!payer || !payee || payer.key === payee.key) return toast.error("Choose different payer and payee");
    setSavingSettlement(true);
    try {
      await client.post(API_PATHS.SPLIT.SETTLEMENTS.CREATE, {
        group: settlementDefaults.group || null,
        payer: { user: payer.user || null, name: cleanName(payer.name), email: payer.email },
        payee: { user: payee.user || null, name: cleanName(payee.name), email: payee.email },
        amount,
        paymentMethod: settlementForm.paymentMethod,
        referenceNumber: settlementForm.referenceNumber,
        notes: settlementForm.notes,
        date: settlementForm.date,
      });
      toast.success("Payment recorded");
      setSettlementOpen(false);
      await load();
      if (selectedGroupId) await fetchGroupDetail(selectedGroupId);
    } catch (error) {
      toast.error(errorText(error, "Could not record payment"));
    } finally {
      setSavingSettlement(false);
    }
  };

  const addFriend = async (payload) => {
    try {
      await client.post(API_PATHS.SPLIT.FRIENDS.ADD, payload);
      toast.success("Friend added");
      setFriendOpen(false);
      setFriendQuery("");
      setFriendForm({ name: "", email: "", phone: "" });
      await load();
    } catch (error) {
      toast.error(errorText(error, "Could not add friend"));
    }
  };

  const addMember = async () => {
    if (!memberForm.name.trim() && !memberForm.email.trim()) return toast.error("Enter a name or email");
    try {
      await client.post(API_PATHS.SPLIT.GROUPS.ADD_MEMBER(selectedGroupId), {
        name: memberForm.name.trim() || memberForm.email.trim().split("@")[0],
        email: memberForm.email.trim().toLowerCase(),
      });
      setMemberOpen(false);
      setMemberForm({ name: "", email: "" });
      toast.success("Member added");
      await fetchGroupDetail();
      await load();
    } catch (error) {
      toast.error(errorText(error, "Could not add member"));
    }
  };

  const confirmAction = async () => {
    if (!confirmTarget) return;
    setConfirmLoading(true);
    try {
      const { type, item } = confirmTarget;
      if (type === "expense") await client.delete(API_PATHS.SPLIT.EXPENSES.DELETE(item._id));
      if (type === "group") await client.delete(API_PATHS.SPLIT.GROUPS.DELETE(item._id));
      if (type === "friend") await client.delete(API_PATHS.SPLIT.FRIENDS.DELETE(item._id));
      if (type === "settlement") await client.delete(API_PATHS.SPLIT.SETTLEMENTS.DELETE(item._id));
      if (type === "member") await client.delete(API_PATHS.SPLIT.GROUPS.REMOVE_MEMBER(selectedGroupId, item._id));
      toast.success(type === "expense" ? "Expense deleted" : type === "group" ? "Group deleted" : type === "friend" ? "Friend removed" : type === "settlement" ? "Payment deleted" : "Member removed");
      setConfirmTarget(null);
      if (type === "group") { setSelectedGroupId(null); setGroupData(null); }
      if (type === "friend") setFriendDetail(null);
      await load();
      if (selectedGroupId && type !== "group") await fetchGroupDetail(selectedGroupId);
    } catch (error) {
      toast.error(errorText(error, "Could not complete this action"));
    } finally {
      setConfirmLoading(false);
    }
  };

  const loadFriendDetail = async (friend) => {
    try {
      const response = await client.get(API_PATHS.SPLIT.FRIENDS.GET_ONE(friend._id));
      setFriendDetail(response.data?.data || null);
    } catch (error) {
      toast.error(errorText(error, "Could not load friend details"));
    }
  };

  const filteredExpenses = useMemo(() => expenses.filter((expense) => {
    const query = search.trim().toLowerCase();
    const categoryMatch = categoryFilter === "All" || expense.category === categoryFilter;
    const searchMatch = !query || [expense.title, expense.category, ...(expense.paidBy || []).map(personName)].some((value) => String(value || "").toLowerCase().includes(query));
    return categoryMatch && searchMatch;
  }), [categoryFilter, expenses, search]);

  const topBarActions = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
      <Button title="Add expense" icon="add" onPress={() => openNewExpense()} style={{ width: 140 }} />
      <Button title="Settle up" icon="cash-outline" onPress={() => openSettlement()} style={{ width: 140 }} />
      <Button title="New group" icon="people-outline" onPress={() => openGroupForm()} style={{ width: 140 }} />
      <Button title="Add friend" icon="person-add-outline" onPress={() => { setFriendMode("search"); setFriendOpen(true); }} style={{ width: 140 }} />
    </ScrollView>
  );

  const renderExpenseList = (list) => list.length ? list.map((expense) => (
    <ExpenseCard key={expense._id} expense={expense} onPress={() => setFriendDetail({ expense })} onEdit={() => openEditExpense(expense)} onDelete={() => setConfirmTarget({ type: "expense", item: expense })} />
  )) : <EmptyState emoji="🧾" title="No shared expenses yet" message="Add an expense to start tracking who paid and what everyone owes." actionLabel="Add expense" onAction={() => openNewExpense(selectedGroupId)} />;

  const renderGroupDetail = () => {
    if (groupLoading || !groupData) return <Loading text="Loading group details..." />;
    const { group, expenses: groupExpenses = [], settlements: groupSettlements = [], simplifiedDebts = [], detailedDebts = [] } = groupData;
    const isCreator = idOf(group.creator) === currentUserId;
    const memberIsSelf = (member) => idOf(member.user) === currentUserId || member.email?.toLowerCase() === currentUserEmail;
    return (
      <>
        <Header title={`${group.icon || "👥"} ${group.name}`} subtitle={`${group.category || "General"}${group.description ? ` · ${group.description}` : ""}`} onBack={() => { setSelectedGroupId(null); setGroupData(null); setActiveTab("dashboard"); }} />
        <View style={{ flexDirection: "row", gap: 9, marginBottom: 12 }}>
          <StatTile icon="wallet-outline" label="Your balance" value={inr(group.userBalance)} tint={group.userBalance > 0 ? colors.success : group.userBalance < 0 ? colors.danger : colors.primary} />
          <StatTile icon="receipt-outline" label="Group spending" value={inr(group.totalSpent)} tint={colors.primary} />
          <StatTile icon="people-outline" label="Members" value={String(group.members?.length || 0)} tint="#f97316" />
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          <Button title="Add expense" icon="add" onPress={() => openNewExpense(group._id)} style={{ flex: 1 }} />
          <Button title="Settle up" icon="cash-outline" onPress={() => openSettlement({ group })} style={{ flex: 1 }} />
        </View>
        <View style={{ flexDirection: "row", gap: 5, marginBottom: 14 }}>
          {["expenses", "members", "settlements", "debts"].map((tab) => <Chip key={tab} label={tab[0].toUpperCase() + tab.slice(1)} selected={activeTab === `group-${tab}`} onPress={() => setActiveTab(`group-${tab}`)} />)}
        </View>
        {activeTab === "group-expenses" && (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <SectionTitle title={`Expenses (${groupExpenses.length})`} />
              <View style={{ flexDirection: "row" }}>
                <IconButton name="create-outline" onPress={() => openGroupForm(group)} color={colors.primary} />
                {isCreator ? <IconButton name="trash-outline" onPress={() => setConfirmTarget({ type: "group", item: group })} color={colors.danger} /> : null}
              </View>
            </View>
            {renderExpenseList(groupExpenses)}
          </>
        )}
        {activeTab === "group-members" && (
          <>
            <SectionTitle title={`Members (${group.members?.length || 0})`} action="Add member" onAction={() => setMemberOpen(true)} />
            {group.members?.map((member) => (
              <Card key={idOf(member._id) || partyKey(member)} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: "700" }}>{personName(member)}{memberIsSelf(member) ? " (You)" : ""}</Text>
                    <Text style={{ color: colors.sub, fontSize: 12, marginTop: 2 }}>{member.email || member.role || "Member"}</Text>
                  </View>
                  <Text style={{ color: Number(member.balance) >= 0 ? colors.success : colors.danger, fontWeight: "800" }}>{inr(member.balance)}</Text>
                  {!memberIsSelf(member) && <IconButton name="person-remove-outline" onPress={() => setConfirmTarget({ type: "member", item: member })} color={colors.danger} />}
                </View>
              </Card>
            ))}
          </>
        )}
        {activeTab === "group-settlements" && (
          <>
            <SectionTitle title={`Settlements (${groupSettlements.length})`} />
            {groupSettlements.length ? groupSettlements.map((settlement) => (
              <Card key={settlement._id} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: "700" }}>{personName(settlement.payer)} paid {personName(settlement.payee)}</Text>
                    <Text style={{ color: colors.sub, fontSize: 12, marginTop: 3 }}>{settlement.paymentMethod || "Payment"} · {shortDate(settlement.date)}</Text>
                  </View>
                  <Text style={{ color: colors.success, fontWeight: "800" }}>{inr(settlement.amount)}</Text>
                  <IconButton name="trash-outline" onPress={() => setConfirmTarget({ type: "settlement", item: settlement })} color={colors.danger} />
                </View>
              </Card>
            )) : <EmptyState emoji="🤝" title="No settlements yet" message="Payments recorded for this group will show here." />}
          </>
        )}
        {(activeTab === "group-debts" || activeTab === "group-ledger") && (
          <>
            <SectionTitle title="Settle group balances" />
            <ChipRow>
              <Chip label={`Simplified · ${simplifiedDebts.length}`} selected={activeTab === "group-debts"} onPress={() => setActiveTab("group-debts")} />
              <Chip label={`Full ledger · ${detailedDebts.length}`} selected={activeTab === "group-ledger"} onPress={() => setActiveTab("group-ledger")} />
            </ChipRow>
            {(activeTab === "group-ledger" ? detailedDebts : simplifiedDebts).length ? (activeTab === "group-ledger" ? detailedDebts : simplifiedDebts).map((debt, index) => (
              <Card key={`${debt.from}-${debt.to}-${index}`} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ flex: 1, color: colors.text, fontWeight: "600" }}>{debt.fromMember?.name || debt.from} owes {debt.toMember?.name || debt.to}</Text>
                  <Text style={{ color: colors.danger, fontWeight: "800" }}>{inr(debt.amount)}</Text>
                  <IconButton name="cash-outline" onPress={() => openSettlement({ payer: debt.fromMember || { name: debt.from }, payee: debt.toMember || { name: debt.to }, amount: debt.amount, group })} color={colors.primary} />
                </View>
              </Card>
            )) : <EmptyState emoji="🎉" title="All settled up" message="There are no outstanding balances in this group." />}
          </>
        )}
      </>
    );
  };

  if (loading) return <Screen><Header title="Split Expenses" subtitle="Share bills and settle up" onBack={() => navigation.goBack()} /><Loading text="Loading shared expenses..." /></Screen>;

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} bottomPad={40}>
        {selectedGroupId ? renderGroupDetail() : (
          <>
            <Header title="Split Expenses" subtitle="Share bills, track balances, and settle debts" onBack={() => navigation.goBack()} />
            {topBarActions}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingBottom: 14 }}>
              {TABS.map(([key, label, icon]) => (
                <Pressable key={key} onPress={() => { setActiveTab(key); setSelectedGroupId(null); }} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: activeTab === key ? colors.primary : colors.card, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: activeTab === key ? colors.primary : colors.border }}>
                  <Ionicons name={icon} size={16} color={activeTab === key ? "#fff" : colors.sub} />
                  <Text style={{ color: activeTab === key ? "#fff" : colors.sub, fontWeight: "700", fontSize: 12 }}>{label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 15 }}>
              <StatTile icon="wallet-outline" label="Net balance" value={inr(summary.netBalance)} tint={(summary.netBalance || 0) >= 0 ? colors.success : colors.danger} />
              <StatTile icon="trending-down" label="You owe" value={inr(summary.youOwe)} tint={colors.danger} />
              <StatTile icon="trending-up" label="Owed to you" value={inr(summary.youAreOwed)} tint={colors.success} />
            </View>

            {activeTab === "dashboard" && (
              <>
                <SectionTitle title={`Your groups (${groups.length})`} action="View all" onAction={() => setActiveTab("groups")} />
                {groups.length ? groups.slice(0, 3).map((group) => (
                  <Card key={group._id} onPress={() => openGroupDetails(group._id)} style={{ marginBottom: 9 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <Text style={{ fontSize: 27 }}>{group.icon || "👥"}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 15, fontWeight: "800" }}>{group.name}</Text>
                        <Text style={{ color: colors.sub, fontSize: 12, marginTop: 3 }}>{group.members?.length || 0} members · {group.expensesCount || 0} expenses</Text>
                      </View>
                      <Text style={{ color: group.userBalance > 0 ? colors.success : group.userBalance < 0 ? colors.danger : colors.sub, fontWeight: "800" }}>{inr(group.userBalance)}</Text>
                    </View>
                  </Card>
                )) : <EmptyState emoji="👥" title="No groups yet" message="Create a group for trips, home expenses, or outings." actionLabel="Create group" onAction={() => openGroupForm()} />}
                <SectionTitle title="Balances with friends" action="View all" onAction={() => setActiveTab("friends")} />
                {friends.length ? friends.slice(0, 4).map((friend) => (
                  <Card key={friend._id} onPress={() => loadFriendDetail(friend)} style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: "700" }}>{friend.name}</Text>
                        <Text style={{ color: colors.sub, fontSize: 12, marginTop: 3 }}>{friend.email || "Friend"}</Text>
                      </View>
                      <Text style={{ color: friend.balance > 0 ? colors.success : friend.balance < 0 ? colors.danger : colors.sub, fontWeight: "800" }}>{friend.balance > 0 ? `Owes you ${inr(friend.balance)}` : friend.balance < 0 ? `You owe ${inr(-friend.balance)}` : "Settled"}</Text>
                    </View>
                  </Card>
                )) : <EmptyState emoji="🫂" title="Add your friends" message="Track personal shared expenses and settle up any time." actionLabel="Add friend" onAction={() => { setFriendMode("search"); setFriendOpen(true); }} />}
                <SectionTitle title="Recent shared expenses" action="View all" onAction={() => setActiveTab("expenses")} />
                {expenses.length ? renderExpenseList(expenses.slice(0, 5)) : <EmptyState emoji="🧾" title="No shared expenses yet" message="Your recent shared bills will appear here." actionLabel="Add expense" onAction={() => openNewExpense()} />}
              </>
            )}

            {activeTab === "groups" && (
              <>
                <SectionTitle title={`Groups (${groups.length})`} action="Create group" onAction={() => openGroupForm()} />
                {groups.length ? groups.map((group) => (
                  <Card key={group._id} onPress={() => openGroupDetails(group._id)} style={{ marginBottom: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <Text style={{ fontSize: 30 }}>{group.icon || "👥"}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>{group.name}</Text>
                        <Text style={{ color: colors.sub, fontSize: 12, marginTop: 3 }}>{group.category || "General"} · {group.members?.length || 0} members · {inr(group.totalSpent)} spent</Text>
                      </View>
                      <Text style={{ color: group.userBalance > 0 ? colors.success : group.userBalance < 0 ? colors.danger : colors.sub, fontWeight: "800" }}>{inr(group.userBalance)}</Text>
                    </View>
                  </Card>
                )) : <EmptyState emoji="👥" title="No groups yet" message="Groups make it easy to organize trips, flat sharing, and events." actionLabel="Create group" onAction={() => openGroupForm()} />}
              </>
            )}

            {activeTab === "friends" && (
              <>
                <SectionTitle title={`Friends (${friends.length})`} action="Add friend" onAction={() => { setFriendMode("search"); setFriendOpen(true); }} />
                {friends.length ? friends.map((friend) => (
                  <Card key={friend._id} style={{ marginBottom: 9 }}>
                    <Pressable onPress={() => loadFriendDetail(friend)} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={{ width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft }}><Text style={{ color: colors.primary, fontWeight: "800" }}>{(friend.name || "?").slice(0, 1).toUpperCase()}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: "800" }}>{friend.name}</Text>
                        <Text style={{ color: colors.sub, fontSize: 12, marginTop: 2 }}>{friend.email || "Added contact"}</Text>
                      </View>
                      <Text style={{ color: friend.balance > 0 ? colors.success : friend.balance < 0 ? colors.danger : colors.sub, fontWeight: "800" }}>{inr(friend.balance)}</Text>
                    </Pressable>
                    <View style={{ flexDirection: "row", justifyContent: "flex-end", borderTopWidth: 1, borderTopColor: colors.border, marginTop: 10, paddingTop: 4 }}>
                      <Button title="Settle up" icon="cash-outline" variant="soft" onPress={() => openSettlement({ payer: friend.balance > 0 ? friendParty(friend) : null, payee: friend.balance < 0 ? friendParty(friend) : null, amount: Math.abs(friend.balance || 0) })} />
                      <IconButton name="trash-outline" onPress={() => setConfirmTarget({ type: "friend", item: friend })} color={colors.danger} />
                    </View>
                  </Card>
                )) : <EmptyState emoji="🫂" title="No friends added" message="Add a friend by finding their MoneyMint account or entering their details." actionLabel="Add friend" onAction={() => { setFriendMode("search"); setFriendOpen(true); }} />}
              </>
            )}

            {activeTab === "expenses" && (
              <>
                <Input label="Search expenses" placeholder="Title, category, or payer" value={search} onChangeText={setSearch} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingBottom: 14 }}>
                  {["All", ...EXPENSE_CATEGORIES].map((category) => <Chip key={category} label={category} selected={categoryFilter === category} onPress={() => setCategoryFilter(category)} />)}
                </ScrollView>
                <SectionTitle title={`${filteredExpenses.length} shared expense${filteredExpenses.length === 1 ? "" : "s"}`} />
                {renderExpenseList(filteredExpenses)}
              </>
            )}

            {activeTab === "settlements" && (
              <>
                <SectionTitle title={`Settlement history (${settlements.length})`} action="Record payment" onAction={() => openSettlement()} />
                {settlements.length ? settlements.map((settlement) => (
                  <Card key={settlement._id} style={{ marginBottom: 9 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.successSoft, alignItems: "center", justifyContent: "center" }}><Ionicons name="checkmark-done-outline" size={21} color={colors.success} /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: "700" }}>{personName(settlement.payer)} paid {personName(settlement.payee)}</Text>
                        <Text style={{ color: colors.sub, fontSize: 12, marginTop: 3 }}>{settlement.group?.name ? `${settlement.group.name} · ` : ""}{settlement.paymentMethod || "Payment"} · {shortDate(settlement.date)}</Text>
                      </View>
                      <Text style={{ color: colors.success, fontWeight: "800" }}>{inr(settlement.amount)}</Text>
                      <IconButton name="trash-outline" onPress={() => setConfirmTarget({ type: "settlement", item: settlement })} color={colors.danger} />
                    </View>
                  </Card>
                )) : <EmptyState emoji="🤝" title="No payments recorded" message="Settlements with friends and groups will appear here." actionLabel="Record payment" onAction={() => openSettlement()} />}
              </>
            )}

            {activeTab === "analytics" && (
              analyticsLoading ? <Loading text="Computing shared spending analytics..." /> : !analytics || !analytics.totalExpensesCount ? (
                <EmptyState emoji="📊" title="No shared expense data" message="Log shared expenses with friends or in groups to see spending analytics." />
              ) : (
                <>
                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                    <StatTile icon="receipt-outline" label="Shared spending" value={inr(analytics.totalSharedSpent)} tint={colors.primary} />
                    <StatTile icon="layers-outline" label="Expenses" value={String(analytics.totalExpensesCount)} tint="#10b981" />
                  </View>
                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                    <StatTile icon="pricetag-outline" label="Top category" value={analytics.categoryDistribution?.reduce((top, item) => !top || item.amount > top.amount ? item : top, null)?.category || "None"} tint="#10b981" />
                    <StatTile icon="people-outline" label="Most active group" value={analytics.groupSpending?.reduce((top, item) => !top || item.totalSpent > top.totalSpent ? item : top, null)?.name || "None"} tint="#f97316" />
                  </View>
                  <Card style={{ marginBottom: 12 }}>
                    <SectionTitle title="Category distribution" />
                    {(analytics.categoryDistribution || []).map((category) => {
                      const pct = analytics.totalSharedSpent ? category.amount / analytics.totalSharedSpent : 0;
                      return <View key={category.category} style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}><Text style={{ color: colors.text, fontWeight: "600" }}>{category.category}</Text><Text style={{ color: colors.sub }}>{inr(category.amount)}</Text></View>
                        <View style={{ height: 7, backgroundColor: colors.track, borderRadius: 5, overflow: "hidden" }}><View style={{ width: `${Math.min(100, pct * 100)}%`, height: "100%", backgroundColor: colors.primary }} /></View>
                      </View>;
                    })}
                  </Card>
                  <Card style={{ marginBottom: 12 }}>
                    <SectionTitle title="Monthly shared spending" />
                    {(analytics.monthlyTrend || []).map((month) => <View key={month.month} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border }}><Text style={{ color: colors.text }}>{month.month}</Text><Text style={{ color: colors.primary, fontWeight: "800" }}>{inr(month.amount)}</Text></View>)}
                  </Card>
                  <Card>
                    <SectionTitle title="Group-wise spending & contribution" />
                    {(analytics.groupSpending || []).map((group) => <View key={group.name} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <Text style={{ color: colors.text, fontWeight: "800", marginBottom: 5 }}>{group.name}</Text>
                      <Text style={{ color: colors.sub, fontSize: 12 }}>Spent {inr(group.totalSpent)} · You paid {inr(group.userPaid)} · Your share {inr(group.userShare)}</Text>
                      <Text style={{ color: group.userPaid - group.userShare >= 0 ? colors.success : colors.danger, fontWeight: "700", marginTop: 4 }}>Net impact {inr(group.userPaid - group.userShare)}</Text>
                    </View>)}
                  </Card>
                </>
              )
            )}

            {activeTab === "activity" && (
              <>
                <SectionTitle title="Recent activity" />
                {activities.length ? activities.map((activity) => (
                  <Card key={activity._id} style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}><Ionicons name="pulse-outline" size={19} color={colors.primary} /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: "700" }}>{activity.title || "Split expense activity"}</Text>
                        <Text style={{ color: colors.sub, fontSize: 12, lineHeight: 18, marginTop: 3 }}>{activity.description || ""}</Text>
                        <Text style={{ color: colors.sub, fontSize: 11, marginTop: 5 }}>{activity.group?.name ? `${activity.group.name} · ` : ""}{shortDate(activity.createdAt)}</Text>
                      </View>
                      {activity.amount ? <Text style={{ color: colors.primary, fontWeight: "800" }}>{inr(activity.amount)}</Text> : null}
                    </View>
                  </Card>
                )) : <EmptyState emoji="🔔" title="No activity yet" message="Changes to shared expenses, groups, and payments will show up here." />}
              </>
            )}
          </>
        )}
      </Screen>

      <Sheet visible={expenseOpen} onClose={() => setExpenseOpen(false)} title={editingExpense ? "Edit shared expense" : "Add shared expense"}>
        <Input label="Expense title *" placeholder="e.g. Dinner, hotel, groceries" value={expenseForm?.title || ""} onChangeText={(value) => setExpenseForm((p) => ({ ...p, title: value }))} />
        <Input label="Amount (₹) *" placeholder="0.00" keyboardType="decimal-pad" value={expenseForm?.amount || ""} onChangeText={(value) => setExpenseForm((p) => ({ ...p, amount: value }))} />
        <Text style={{ color: colors.text, fontWeight: "700", marginBottom: 7 }}>Category</Text>
        <ChipRow>{EXPENSE_CATEGORIES.map((category) => <Chip key={category} label={category} selected={expenseForm?.category === category} onPress={() => setExpenseForm((p) => ({ ...p, category }))} />)}</ChipRow>
        <DateField label="Date" value={expenseForm?.date || today()} onChange={(value) => setExpenseForm((p) => ({ ...p, date: value }))} />
        <Text style={{ color: colors.text, fontWeight: "700", marginBottom: 7 }}>Group (optional)</Text>
        <ChipRow>
          <Chip label="No group" selected={!expenseForm?.group} onPress={() => {
            setExpenseForm((p) => ({ ...p, group: "" }));
            setSelectedKeys([currentUserId || "currentUser"]);
            setSinglePayer(currentUserId || "currentUser");
            setMultiplePayers(false);
            setPayerAmounts({});
            setItems((previous) => previous.map((item) => ({ ...item, assignedTo: [] })));
          }} />
          {groups.map((group) => <Chip key={group._id} label={`${group.icon || "👥"} ${group.name}`} selected={String(expenseForm?.group) === idOf(group._id)} onPress={() => {
            const keys = [currentUserId || "currentUser"];
            group.members?.forEach((m) => {
              const uid = idOf(m.user), key = uid || idOf(m._id) || m.name;
              if (!((uid && uid === currentUserId) || (m.email && m.email.toLowerCase() === currentUserEmail))) keys.push(key);
            });
            setExpenseForm((p) => ({ ...p, group: idOf(group._id) }));
            setSelectedKeys(keys);
            setSinglePayer(currentUserId || "currentUser");
            setMultiplePayers(false);
            setPayerAmounts({});
            setItems((previous) => previous.map((item) => ({ ...item, assignedTo: [] })));
          }} />)}
        </ChipRow>

        <SectionTitle title="Who paid?" />
        <ChoiceRow label="One payer" selected={!multiplePayers} onPress={() => setMultiplePayers(false)} />
        {!multiplePayers ? (
          <ChipRow>{availableMembers.map((person) => <Chip key={person.key} label={person.name} selected={singlePayer === person.key} onPress={() => setSinglePayer(person.key)} />)}</ChipRow>
        ) : null}
        <ChoiceRow label="Multiple payers" selected={multiplePayers} onPress={() => setMultiplePayers(true)} detail="Enter how much each person paid" />
        {multiplePayers ? availableMembers.map((person) => (
          <Input key={person.key} label={person.name} placeholder="0.00" keyboardType="decimal-pad" value={payerAmounts[person.key] || ""} onChangeText={(value) => setPayerAmounts((p) => ({ ...p, [person.key]: value }))} />
        )) : null}

        <SectionTitle title={`Split between (${selectedMembers.length})`} />
        {availableMembers.map((person) => <ChoiceRow key={person.key} label={person.name} selected={selectedKeys.includes(person.key)} onPress={() => toggleParticipant(person.key)} />)}
        <SectionTitle title="Split method" />
        <ChipRow>{SPLIT_METHODS.map(([method, label]) => <Chip key={method} label={label} selected={splitMethod === method} onPress={() => setSplitMethod(method)} />)}</ChipRow>
        {splitMethod === "exact" && selectedMembers.map((person) => <Input key={person.key} label={`${person.name}'s share · ${inr(exactShares[person.key])}`} placeholder="0.00" keyboardType="decimal-pad" value={exactShares[person.key] || ""} onChangeText={(value) => setExactShares((p) => ({ ...p, [person.key]: value }))} />)}
        {splitMethod === "percentage" && selectedMembers.map((person) => <Input key={person.key} label={`${person.name}'s percentage · ${inr(amountValue * (Number(percentages[person.key]) || 0) / 100)}`} placeholder="0" keyboardType="decimal-pad" value={percentages[person.key] || ""} onChangeText={(value) => setPercentages((p) => ({ ...p, [person.key]: value }))} />)}
        {splitMethod === "shares" && selectedMembers.map((person) => <Input key={person.key} label={`${person.name}'s shares`} placeholder="1" keyboardType="number-pad" value={ratios[person.key] || "1"} onChangeText={(value) => setRatios((p) => ({ ...p, [person.key]: value }))} />)}
        {splitMethod === "itemized" && (
          <>
            <SectionTitle title="Items" action="Add item" onAction={() => setItems((prev) => [...prev, { name: `Item ${prev.length + 1}`, price: "", assignedTo: [] }])} />
            {items.map((item, index) => <Card key={`item-${index}`} style={{ marginBottom: 9 }}>
              <Input label="Item name" value={item.name} onChangeText={(value) => setItems((prev) => prev.map((row, i) => i === index ? { ...row, name: value } : row))} />
              <Input label="Price (₹)" keyboardType="decimal-pad" value={item.price} onChangeText={(value) => setItems((prev) => prev.map((row, i) => i === index ? { ...row, price: value } : row))} />
              <Text style={{ color: colors.sub, fontSize: 12, marginBottom: 5 }}>Shared by</Text>
              <ChipRow>{selectedMembers.map((person) => <Chip key={person.key} label={person.name} selected={item.assignedTo.includes(person.key)} onPress={() => setItems((prev) => prev.map((row, i) => {
                if (i !== index) return row;
                return { ...row, assignedTo: row.assignedTo.includes(person.key) ? row.assignedTo.filter((key) => key !== person.key) : [...row.assignedTo, person.key] };
              }))} />)}</ChipRow>
              {items.length > 1 ? <Button title="Remove item" icon="trash-outline" variant="danger" onPress={() => setItems((prev) => prev.filter((_, i) => i !== index))} /> : null}
            </Card>)}
            <View style={{ flexDirection: "row", gap: 10 }}><View style={{ flex: 1 }}><Input label="Tax (₹)" keyboardType="decimal-pad" value={tax} onChangeText={setTax} /></View><View style={{ flex: 1 }}><Input label="Tip (₹)" keyboardType="decimal-pad" value={tip} onChangeText={setTip} /></View></View>
          </>
        )}
        {selectedMembers.length > 0 ? <Card style={{ marginBottom: 12, backgroundColor: colors.primarySoft }}>
          <Text style={{ color: colors.primary, fontWeight: "800", marginBottom: 7 }}>Share preview</Text>
          {selectedMembers.map((person, index) => <View key={person.key} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}><Text style={{ color: colors.text }}>{person.name}</Text><Text style={{ color: colors.primary, fontWeight: "700" }}>{inr(participantShares[index])}</Text></View>)}
        </Card> : null}
        <Input label="Notes (optional)" placeholder="Add a note" value={expenseForm?.notes || ""} onChangeText={(value) => setExpenseForm((p) => ({ ...p, notes: value }))} />
        <Button title={editingExpense ? "Save changes" : "Add expense"} onPress={saveExpense} loading={savingExpense} />
      </Sheet>

      <Sheet visible={groupOpen} onClose={() => setGroupOpen(false)} title={editingGroup ? "Edit group" : "Create group"}>
        <Input label="Group name *" placeholder="e.g. Goa trip, Flat 402" value={groupForm.name} onChangeText={(value) => setGroupForm((p) => ({ ...p, name: value }))} />
        <Input label="Description" placeholder="What is this group for?" value={groupForm.description} onChangeText={(value) => setGroupForm((p) => ({ ...p, description: value }))} />
        <Text style={{ color: colors.text, fontWeight: "700", marginBottom: 7 }}>Category</Text>
        <ChipRow>{GROUP_CATEGORIES.map((category) => <Chip key={category.id} label={`${category.icon} ${category.id}`} selected={groupForm.category === category.id} onPress={() => setGroupForm((p) => ({ ...p, category: category.id }))} />)}</ChipRow>
        <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <View style={{ flex: 1 }}><Text style={{ color: colors.text, fontWeight: "700" }}>Simplify group debts</Text><Text style={{ color: colors.sub, fontSize: 12, marginTop: 3 }}>Reduce the number of payments needed to settle up.</Text></View>
          <Switch value={groupForm.simplifyDebts} onValueChange={(value) => setGroupForm((p) => ({ ...p, simplifyDebts: value }))} trackColor={{ true: colors.primary }} />
        </Card>
        {!editingGroup ? <>
          <SectionTitle title="Add existing friends" />
          {friends.map((friend) => {
            const key = idOf(friend.friendUser) || idOf(friend._id);
            return <ChoiceRow key={key} label={friend.name} detail={friend.email} selected={groupFriendKeys.includes(key)} onPress={() => setGroupFriendKeys((prev) => prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key])} />;
          })}
          <SectionTitle title="Invite someone by name or email" />
          <Input label="Name" value={newMemberName} onChangeText={setNewMemberName} placeholder="Friend's name" />
          <Input label="Email" value={newMemberEmail} onChangeText={setNewMemberEmail} placeholder="friend@example.com" autoCapitalize="none" keyboardType="email-address" />
          <Button
            title="Add another invite"
            icon="person-add-outline"
            variant="soft"
            disabled={!newMemberName.trim() && !newMemberEmail.trim()}
            onPress={() => {
              if (!newMemberName.trim() && !newMemberEmail.trim()) return;
              setGroupCustomMembers((members) => [...members, {
                name: newMemberName.trim() || newMemberEmail.trim().split("@")[0],
                email: newMemberEmail.trim().toLowerCase(),
              }]);
              setNewMemberName("");
              setNewMemberEmail("");
            }}
          />
          {groupCustomMembers.map((member, index) => (
            <ChoiceRow
              key={`${member.email}-${index}`}
              label={member.name}
              detail={member.email || "No email"}
              selected
              onPress={() => setGroupCustomMembers((members) => members.filter((_, i) => i !== index))}
            />
          ))}
        </> : null}
        <Button title={editingGroup ? "Save group" : "Create group"} onPress={saveGroup} />
      </Sheet>

      <Sheet visible={friendOpen} onClose={() => setFriendOpen(false)} title="Add a friend">
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 15 }}>
          <Chip label="Find registered user" selected={friendMode === "search"} onPress={() => setFriendMode("search")} />
          <Chip label="Add by name/email" selected={friendMode === "manual"} onPress={() => setFriendMode("manual")} />
        </View>
        {friendMode === "search" ? <>
          <Input label="Search by name or email" placeholder="Enter at least 2 characters" value={friendQuery} onChangeText={setFriendQuery} autoCapitalize="none" />
          {friendSearching ? <Loading text="Searching users..." /> : friendResults.length ? friendResults.map((result) => <Card key={result._id} style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontWeight: "700" }}>{result.fullName}</Text><Text style={{ color: colors.sub, fontSize: 12 }}>{result.email}</Text></View><Button title="Add" icon="person-add-outline" onPress={() => addFriend({ friendUserId: result._id, name: result.fullName, email: result.email })} /></View>
          </Card>) : friendQuery.length >= 2 ? <EmptyState emoji="🔎" title="No registered users found" message="Try another search or add this person manually." actionLabel="Add manually" onAction={() => { setFriendForm({ name: friendQuery.includes("@") ? "" : friendQuery, email: friendQuery.includes("@") ? friendQuery : "", phone: "" }); setFriendMode("manual"); }} /> : <Text style={{ color: colors.sub, textAlign: "center", marginVertical: 18 }}>Search MoneyMint users by name or email.</Text>}
        </> : <>
          <Input label="Name" placeholder="Friend's name" value={friendForm.name} onChangeText={(value) => setFriendForm((p) => ({ ...p, name: value }))} />
          <Input label="Email" placeholder="friend@example.com" value={friendForm.email} onChangeText={(value) => setFriendForm((p) => ({ ...p, email: value }))} autoCapitalize="none" keyboardType="email-address" />
          <Input label="Phone (optional)" placeholder="Phone number" value={friendForm.phone} onChangeText={(value) => setFriendForm((p) => ({ ...p, phone: value }))} keyboardType="phone-pad" />
          <Button title="Add friend" icon="person-add-outline" onPress={() => {
            if (!friendForm.name.trim() && !friendForm.email.trim()) return toast.error("Enter a name or email");
            addFriend({ name: friendForm.name.trim() || friendForm.email.split("@")[0], email: friendForm.email.trim().toLowerCase(), phone: friendForm.phone.trim() });
          }} />
        </>}
      </Sheet>

      <Sheet visible={settlementOpen} onClose={() => setSettlementOpen(false)} title="Settle up payment">
        <Text style={{ color: colors.sub, fontSize: 13, marginBottom: 6 }}>Who paid?</Text>
        <ChipRow>{settlementPeople.map((person) => <Chip key={person.key} label={person.name} selected={settlementForm?.payer === person.key} onPress={() => setSettlementForm((p) => ({ ...p, payer: person.key }))} />)}</ChipRow>
        <Text style={{ color: colors.sub, fontSize: 13, marginBottom: 6 }}>Who received?</Text>
        <ChipRow>{settlementPeople.map((person) => <Chip key={person.key} label={person.name} selected={settlementForm?.payee === person.key} onPress={() => setSettlementForm((p) => ({ ...p, payee: person.key }))} />)}</ChipRow>
        <Input label={`Amount (₹)${settlementDefaults.suggested ? ` · suggested ${inr(settlementDefaults.suggested)}` : ""}`} placeholder="0.00" keyboardType="decimal-pad" value={settlementForm?.amount || ""} onChangeText={(value) => setSettlementForm((p) => ({ ...p, amount: value }))} />
        <Text style={{ color: colors.text, fontWeight: "700", marginBottom: 7 }}>Payment method</Text>
        <ChipRow>{PAYMENT_METHODS.map((method) => <Chip key={method} label={method} selected={settlementForm?.paymentMethod === method} onPress={() => setSettlementForm((p) => ({ ...p, paymentMethod: method }))} />)}</ChipRow>
        <DateField label="Date" value={settlementForm?.date || today()} onChange={(value) => setSettlementForm((p) => ({ ...p, date: value }))} />
        <Input label="Reference number (optional)" value={settlementForm?.referenceNumber || ""} onChangeText={(value) => setSettlementForm((p) => ({ ...p, referenceNumber: value }))} />
        <Input label="Notes (optional)" value={settlementForm?.notes || ""} onChangeText={(value) => setSettlementForm((p) => ({ ...p, notes: value }))} />
        <Button title="Record payment" onPress={saveSettlement} loading={savingSettlement} />
      </Sheet>

      <Sheet visible={memberOpen} onClose={() => setMemberOpen(false)} title="Add group member">
        <Input label="Name" value={memberForm.name} onChangeText={(value) => setMemberForm((p) => ({ ...p, name: value }))} placeholder="Member name" />
        <Input label="Email" value={memberForm.email} onChangeText={(value) => setMemberForm((p) => ({ ...p, email: value }))} placeholder="member@example.com" autoCapitalize="none" keyboardType="email-address" />
        <Button title="Add member" onPress={addMember} />
      </Sheet>

      <Sheet visible={!!friendDetail} onClose={() => setFriendDetail(null)} title={friendDetail?.expense ? friendDetail.expense.title : friendDetail?.friend?.name || "Friend details"}>
        {friendDetail?.expense ? <>
          <Text style={{ color: colors.sub }}>{friendDetail.expense.category} · {shortDate(friendDetail.expense.date)}</Text>
          <SectionTitle title="Expense total" /><Text style={{ color: colors.primary, fontSize: 24, fontWeight: "800", marginBottom: 12 }}>{inr(friendDetail.expense.amount)}</Text>
          <SectionTitle title="Paid by" />{friendDetail.expense.paidBy?.map((payer, i) => <Text key={i} style={{ color: colors.text, marginBottom: 5 }}>{personName(payer)} · {inr(payer.amount)}</Text>)}
          <SectionTitle title="Participants" />{friendDetail.expense.participants?.map((participant, i) => <Text key={i} style={{ color: colors.text, marginBottom: 5 }}>{personName(participant)} · share {inr(participant.shareAmount)}</Text>)}
          {friendDetail.expense.notes ? <Text style={{ color: colors.sub, marginTop: 10 }}>{friendDetail.expense.notes}</Text> : null}
          <View style={{ marginTop: 16 }}><Button title="Edit expense" icon="create-outline" onPress={() => { const expense = friendDetail.expense; setFriendDetail(null); openEditExpense(expense); }} /></View>
        </> : friendDetail?.friend ? <>
          <Text style={{ color: colors.sub }}>{friendDetail.friend.email || "Friend"}</Text>
          <Card style={{ marginVertical: 14 }}><Text style={{ color: colors.sub }}>Current balance</Text><Text style={{ color: friendDetail.friend.balance >= 0 ? colors.success : colors.danger, fontWeight: "800", fontSize: 22, marginTop: 4 }}>{inr(friendDetail.friend.balance)}</Text></Card>
          <Button title="Settle up" icon="cash-outline" variant="soft" onPress={() => { const f = friendDetail.friend; setFriendDetail(null); openSettlement({ payer: f.balance > 0 ? friendParty(f) : null, payee: f.balance < 0 ? friendParty(f) : null, amount: Math.abs(f.balance || 0) }); }} />
          <SectionTitle title={`Shared expenses (${friendDetail.expenses?.length || 0})`} />
          {friendDetail.expenses?.map((expense) => <View key={expense._id} style={{ paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border }}><Text style={{ color: colors.text, fontWeight: "700" }}>{expense.title}</Text><Text style={{ color: colors.sub, fontSize: 12 }}>{shortDate(expense.date)} · {inr(expense.amount)}</Text></View>)}
          <SectionTitle title={`Settlements (${friendDetail.settlements?.length || 0})`} />
          {friendDetail.settlements?.map((payment) => <Text key={payment._id} style={{ color: colors.text, paddingVertical: 7 }}>{personName(payment.payer)} paid {personName(payment.payee)} · {inr(payment.amount)}</Text>)}
        </> : null}
      </Sheet>

      <ConfirmSheet
        visible={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={confirmAction}
        loading={confirmLoading}
        title={confirmTarget?.type === "group" ? "Delete this group?" : confirmTarget?.type === "friend" ? "Remove this friend?" : confirmTarget?.type === "member" ? "Remove this member?" : confirmTarget?.type === "settlement" ? "Delete this payment?" : "Delete this expense?"}
        message={confirmTarget?.type === "group" ? "The group and its history will be hidden for all members." : confirmTarget?.type === "member" ? "Members with an unsettled balance cannot be removed." : "This action cannot be undone."}
        confirmText={confirmTarget?.type === "member" ? "Remove" : "Delete"}
      />
    </View>
  );
}
