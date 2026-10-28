import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Button, Card, Chip, ChipRow, EmptyState, Header, Input, Loading, Screen, SectionTitle, Sheet } from "../components/ui";
import client, { getErrorMessage } from "../api/client";
import { API_PATHS } from "../api/paths";
import { inr, shortDate } from "../utils/format";

const money = (n) => inr(Number(n) || 0);
const splitModes = [{ label: "Equal", value: "equal" }, { label: "Exact", value: "exact" }, { label: "%", value: "percentage" }, { label: "Shares", value: "shares" }];
const makeValues = (members = []) => Object.fromEntries(members.map((member) => [member.userId, { amount: "", percentage: String(100 / Math.max(members.length, 1)), shares: "1" }]));

export default function SplitsScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const myId = String(user?._id || user?.id || "");
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [friendOpen, setFriendOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [settlementForm, setSettlementForm] = useState(null);
  const [groupForm, setGroupForm] = useState({ name: "", description: "", memberEmails: "" });
  const [friendEmail, setFriendEmail] = useState("");
  const [expenseForm, setExpenseForm] = useState({ title: "", amount: "", category: "General", note: "", paidByUserId: "", splitType: "equal" });
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [participantValues, setParticipantValues] = useState({});

  const refreshGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get(API_PATHS.SPLITS.GROUPS);
      const next = res.data?.data?.groups || [];
      setGroups(next);
      setSelectedGroupId((current) => current && next.some((group) => group._id === current) ? current : next[0]?._id || "");
      setError("");
    } catch (e) { setError(getErrorMessage(e, "Could not load groups")); }
    finally { setLoading(false); }
  }, []);

  const refreshDetail = useCallback(async (groupId) => {
    if (!groupId) { setDetail(null); return; }
    setDetailLoading(true);
    try {
      const res = await client.get(API_PATHS.SPLITS.GROUP(groupId));
      const next = res.data?.data;
      setDetail(next);
      const members = next?.group?.members || [];
      setSelectedParticipants(members.map((member) => member.userId));
      setParticipantValues(makeValues(members));
      setExpenseForm({ title: "", amount: "", category: "General", note: "", paidByUserId: members.some((member) => member.userId === myId) ? myId : members[0]?.userId || "", splitType: "equal" });
      setError("");
    } catch (e) { setError(getErrorMessage(e, "Could not load group ledger")); }
    finally { setDetailLoading(false); }
  }, [myId]);

  useFocusEffect(useCallback(() => { refreshGroups(); }, [refreshGroups]));
  useEffect(() => { refreshDetail(selectedGroupId); }, [selectedGroupId, refreshDetail]);

  const currentBalance = useMemo(() => (detail?.balances || []).find((item) => item.userId === myId)?.balance || 0, [detail, myId]);
  const memberName = (id) => detail?.group?.members?.find((m) => m.userId === id)?.fullName || "Member";

  const createGroup = async () => {
    if (groupForm.name.trim().length < 2) { setError("Group name must be at least 2 characters."); return; }
    setSaving(true); setError("");
    try {
      const memberEmails = groupForm.memberEmails.split(/[\n,;]+/).map((email) => email.trim().toLowerCase()).filter(Boolean);
      const res = await client.post(API_PATHS.SPLITS.GROUPS, { ...groupForm, memberEmails });
      const id = res.data?.data?.group?._id;
      setGroupForm({ name: "", description: "", memberEmails: "" }); setCreateOpen(false); toast.success("Group created");
      await refreshGroups(); if (id) setSelectedGroupId(id);
    } catch (e) { setError(getErrorMessage(e, "Could not create group")); }
    finally { setSaving(false); }
  };

  const addFriend = async () => {
    if (!detail?.group?._id) return;
    setSaving(true); setError("");
    try {
      await client.post(API_PATHS.SPLITS.ADD_MEMBER(detail.group._id), { email: friendEmail.trim().toLowerCase() });
      setFriendEmail(""); setFriendOpen(false); toast.success("Friend added to group");
      await refreshDetail(detail.group._id); await refreshGroups();
    } catch (e) { setError(getErrorMessage(e, "Could not add friend")); }
    finally { setSaving(false); }
  };

  const changeSplitMode = (mode) => {
    setExpenseForm((old) => ({ ...old, splitType: mode }));
    setParticipantValues((old) => Object.fromEntries(selectedParticipants.map((id) => [id, { ...(old[id] || {}), amount: selectedParticipants.length ? (Number(expenseForm.amount || 0) / selectedParticipants.length).toFixed(2) : "0", percentage: String(100 / Math.max(selectedParticipants.length, 1)), shares: old[id]?.shares || "1" }])));
  };

  const toggleParticipant = (id) => {
    const next = selectedParticipants.includes(id) ? selectedParticipants.filter((item) => item !== id) : [...selectedParticipants, id];
    setSelectedParticipants(next);
    setParticipantValues((old) => {
      const updated = { ...old, [id]: old[id] || { amount: "", percentage: String(100 / Math.max(next.length, 1)), shares: "1" } };
      if (expenseForm.splitType === "percentage" && next.length) next.forEach((memberId) => { updated[memberId] = { ...(updated[memberId] || {}), percentage: String(100 / next.length) }; });
      return updated;
    });
  };

  const saveExpense = async () => {
    if (!detail?.group?._id) return;
    if (!expenseForm.title.trim() || !Number.isFinite(Number(expenseForm.amount)) || Number(expenseForm.amount) <= 0) { setError("Enter a description and valid amount."); return; }
    if (!selectedParticipants.length) { setError("Choose at least one participant."); return; }
    const participants = selectedParticipants.map((userId) => ({ userId, ...(expenseForm.splitType === "exact" ? { amount: Number(participantValues[userId]?.amount) } : {}), ...(expenseForm.splitType === "percentage" ? { percentage: Number(participantValues[userId]?.percentage) } : {}), ...(expenseForm.splitType === "shares" ? { shares: Number(participantValues[userId]?.shares) } : {}) }));
    setSaving(true); setError("");
    try {
      await client.post(API_PATHS.SPLITS.ADD_EXPENSE(detail.group._id), { ...expenseForm, amount: Number(expenseForm.amount), participants });
      setExpenseOpen(false); toast.success("Shared expense saved");
      await refreshDetail(detail.group._id); await refreshGroups();
    } catch (e) { setError(getErrorMessage(e, "Could not save shared expense")); }
    finally { setSaving(false); }
  };

  const saveSettlement = async () => {
    if (!settlementForm || !detail?.group?._id) return;
    if (!Number.isFinite(Number(settlementForm.amount)) || Number(settlementForm.amount) <= 0) { setError("Enter a valid payment amount."); return; }
    setSaving(true); setError("");
    try {
      await client.post(API_PATHS.SPLITS.SETTLE(detail.group._id), { ...settlementForm, amount: Number(settlementForm.amount) });
      setSettlementForm(null); toast.success("Settlement recorded");
      await refreshDetail(detail.group._id); await refreshGroups();
    } catch (e) { setError(getErrorMessage(e, "Could not save settlement")); }
    finally { setSaving(false); }
  };

  const setValue = (key, value) => setExpenseForm((old) => ({ ...old, [key]: value }));
  const setPersonValue = (id, key, value) => setParticipantValues((old) => ({ ...old, [id]: { ...(old[id] || {}), [key]: value } }));

  return (
    <Screen>
      <Header title="Split expenses" subtitle="Shared bills, group balances and settlements" onBack={() => navigation.goBack()} right={<Pressable onPress={() => setCreateOpen(true)} style={{ padding: 10, borderRadius: 12, backgroundColor: colors.primarySoft }}><Ionicons name="add" size={23} color={colors.primary} /></Pressable>} />
      {error ? <Pressable onPress={() => setError("")} style={{ backgroundColor: colors.dangerSoft, padding: 12, borderRadius: 12, marginBottom: 12 }}><Text style={{ color: colors.danger, fontSize: 13 }}>{error}  ·  Tap to dismiss</Text></Pressable> : null}

      <SectionTitle title="Your groups" action="New group" onAction={() => setCreateOpen(true)} />
      {loading ? <Loading text="Loading your groups…" /> : groups.length === 0 ? <EmptyState emoji="👥" title="No groups yet" message="Create a group for trips, home expenses or dinners, and start splitting bills." actionLabel="Create a group" onAction={() => setCreateOpen(true)} /> : (
        <View style={{ gap: 10, marginBottom: 20 }}>
          {groups.map((group) => {
            const selected = group._id === selectedGroupId;
            return <Card key={group._id} onPress={() => setSelectedGroupId(group._id)} style={{ borderColor: selected ? colors.primary : colors.border, borderWidth: selected ? 2 : 1, padding: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}><Ionicons name="people-outline" size={22} color={colors.primary} /></View>
                <View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>{group.name}</Text><Text style={{ color: colors.sub, fontSize: 12, marginTop: 3 }}>{group.members.length} members</Text><Text style={{ color: Number(group.myBalance) > 0 ? colors.success : Number(group.myBalance) < 0 ? colors.danger : colors.sub, fontWeight: "700", marginTop: 5, fontSize: 13 }}>{Number(group.myBalance) > 0 ? `${money(group.myBalance)} owed to you` : Number(group.myBalance) < 0 ? `${money(Math.abs(group.myBalance))} you owe` : "All settled"}</Text></View>
                <Ionicons name={selected ? "chevron-down" : "chevron-forward"} size={18} color={colors.sub} />
              </View>
            </Card>;
          })}
        </View>
      )}

      {selectedGroupId && (detailLoading || !detail ? <Loading text="Loading group ledger…" /> : <>
        <Card style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <View style={{ flex: 1 }}><Text style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>{detail.group.name}</Text><Text style={{ color: colors.sub, fontSize: 12, marginTop: 3 }}>{detail.group.description || "Shared spending"} · {detail.group.members.length} members</Text></View>
            <Pressable onPress={() => setFriendOpen(true)} style={{ backgroundColor: colors.primarySoft, padding: 10, borderRadius: 12 }}><Ionicons name="person-add-outline" size={20} color={colors.primary} /></Pressable>
          </View>
          <View style={{ backgroundColor: colors.track, borderRadius: 14, padding: 14, marginTop: 14 }}><Text style={{ color: colors.sub, fontSize: 12, fontWeight: "700" }}>YOUR NET BALANCE</Text><Text style={{ fontSize: 26, color: currentBalance > 0 ? colors.success : currentBalance < 0 ? colors.danger : colors.text, fontWeight: "900", marginTop: 3 }}>{money(Math.abs(currentBalance))}</Text><Text style={{ color: colors.sub, fontSize: 12, marginTop: 2 }}>{currentBalance > 0 ? "Others owe you" : currentBalance < 0 ? "You owe the group" : "You are settled up"}</Text></View>
          <View style={{ flexDirection: "row", gap: 9, marginTop: 12 }}><View style={{ flex: 1, borderWidth: 1, borderColor: colors.border, padding: 12, borderRadius: 12 }}><Text style={{ color: colors.sub, fontSize: 11 }}>Bills</Text><Text style={{ color: colors.text, fontWeight: "800", fontSize: 17 }}>{detail.expenses.length}</Text></View><View style={{ flex: 1, borderWidth: 1, borderColor: colors.border, padding: 12, borderRadius: 12 }}><Text style={{ color: colors.sub, fontSize: 11 }}>Settlements</Text><Text style={{ color: colors.text, fontWeight: "800", fontSize: 17 }}>{detail.settlements.length}</Text></View></View>
          <View style={{ marginTop: 14 }}><Button title="Add shared expense" icon="add-circle-outline" onPress={() => setExpenseOpen(true)} /></View>
        </Card>

        <SectionTitle title="Balances by person" />
        <Card style={{ marginBottom: 16 }}>
          {detail.balances.map((balance, index) => <View key={balance.userId} style={{ paddingVertical: 10, borderBottomWidth: index === detail.balances.length - 1 ? 0 : 1, borderBottomColor: colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>{balance.fullName}{balance.userId === myId ? " (you)" : ""}</Text><Text style={{ color: colors.sub, fontSize: 11, marginTop: 2 }}>{balance.balance > 0 ? "Should receive" : balance.balance < 0 ? "Should pay" : "Settled up"}</Text></View><Text style={{ color: balance.balance > 0 ? colors.success : balance.balance < 0 ? colors.danger : colors.sub, fontWeight: "800" }}>{balance.balance > 0 ? "+" : balance.balance < 0 ? "−" : ""}{money(Math.abs(balance.balance))}</Text></View>)}
        </Card>

        <SectionTitle title="Settle up" />
        <Card style={{ marginBottom: 16 }}>
          {detail.suggestedDebts.length === 0 ? <Text style={{ color: colors.success, fontWeight: "600", textAlign: "center", paddingVertical: 12 }}>Everyone is settled up!</Text> : detail.suggestedDebts.map((debt, index) => <View key={`${debt.fromUserId}-${debt.toUserId}-${index}`} style={{ borderBottomWidth: index === detail.suggestedDebts.length - 1 ? 0 : 1, borderBottomColor: colors.border, paddingVertical: 12 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}><Text style={{ flex: 1, color: colors.text, fontWeight: "700", fontSize: 13 }}>{debt.fromName} → {debt.toName}</Text><Text style={{ color: colors.text, fontWeight: "900" }}>{money(debt.amount)}</Text></View><Button title="Record full or partial payment" variant="soft" onPress={() => setSettlementForm({ fromUserId: debt.fromUserId, toUserId: debt.toUserId, amount: String(debt.amount), note: "" })} style={{ marginTop: 10 }} /></View>)}
        </Card>

        <SectionTitle title="Transaction history" />
        {detail.history.length === 0 ? <EmptyState emoji="🧾" title="No activity yet" message="Record your first shared expense to build this group's history." actionLabel="Add shared bill" onAction={() => setExpenseOpen(true)} /> : <Card style={{ gap: 0 }}>{detail.history.map((item, index) => <View key={`${item.type}-${item._id}`} style={{ flexDirection: "row", alignItems: "flex-start", gap: 11, paddingVertical: 12, borderBottomWidth: index === detail.history.length - 1 ? 0 : 1, borderBottomColor: colors.border }}><View style={{ width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: item.type === "settlement" ? colors.successSoft : colors.primarySoft }}><Ionicons name={item.type === "settlement" ? "swap-horizontal" : "receipt-outline"} size={18} color={item.type === "settlement" ? colors.success : colors.primary} /></View><View style={{ flex: 1 }}><Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>{item.type === "settlement" ? `${item.fromName} paid ${item.toName}` : item.title}</Text><Text style={{ color: colors.sub, fontSize: 11, marginTop: 3 }}>{shortDate(item.date)}{item.type === "expense" ? ` · paid by ${item.paidByName}` : " · settlement"}</Text>{item.type === "expense" ? <Text style={{ color: colors.sub, fontSize: 11, marginTop: 4 }}>{item.participants.map((p) => `${p.fullName}: ${money(p.amount)}`).join(" · ")}</Text> : null}{item.note ? <Text style={{ color: colors.sub, fontSize: 12, marginTop: 4 }}>{item.note}</Text> : null}</View><Text style={{ color: item.type === "settlement" ? colors.success : colors.text, fontWeight: "900", fontSize: 13 }}>{item.type === "settlement" ? "− " : ""}{money(item.amount)}</Text></View>)}</Card>}
      </>)}

      <Sheet visible={createOpen} onClose={() => setCreateOpen(false)} title="Create group">
        <Input label="Group name" value={groupForm.name} onChangeText={(v) => setGroupForm((old) => ({ ...old, name: v }))} placeholder="Weekend trip" error={error && groupForm.name.trim().length < 2 ? error : undefined} />
        <Input label="Description (optional)" value={groupForm.description} onChangeText={(v) => setGroupForm((old) => ({ ...old, description: v }))} placeholder="Trip, household or dinner" />
        <Input label="Friend account emails" value={groupForm.memberEmails} onChangeText={(v) => setGroupForm((old) => ({ ...old, memberEmails: v }))} placeholder="Email addresses separated by commas" autoCapitalize="none" keyboardType="email-address" />
        <Text style={{ color: colors.sub, fontSize: 12, marginBottom: 12 }}>Everyone added must already have a MoneyMint account. You can add more members later.</Text>
        <Button title="Create group" onPress={createGroup} loading={saving} />
      </Sheet>

      <Sheet visible={friendOpen} onClose={() => setFriendOpen(false)} title="Add a friend">
        <Input label="MoneyMint account email" value={friendEmail} onChangeText={setFriendEmail} autoCapitalize="none" keyboardType="email-address" placeholder="friend@example.com" />
        <Button title="Add to this group" onPress={addFriend} loading={saving} />
      </Sheet>

      <Sheet visible={expenseOpen} onClose={() => setExpenseOpen(false)} title="Shared expense">
        <Input label="Description" value={expenseForm.title} onChangeText={(v) => setValue("title", v)} placeholder="Dinner, taxi, groceries" />
        <Input label="Total amount (₹)" value={expenseForm.amount} onChangeText={(v) => setValue("amount", v.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" placeholder="0.00" />
        <Input label="Category" value={expenseForm.category} onChangeText={(v) => setValue("category", v)} placeholder="General" />
        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13, marginBottom: 8 }}>Who paid?</Text>
        <ChipRow>{detail?.group?.members?.map((member) => <Chip key={member.userId} label={member.userId === myId ? "You" : member.fullName} selected={expenseForm.paidByUserId === member.userId} onPress={() => setValue("paidByUserId", member.userId)} />)}</ChipRow>
        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13, marginBottom: 8 }}>Split method</Text>
        <ChipRow>{splitModes.map((mode) => <Chip key={mode.value} label={mode.label} selected={expenseForm.splitType === mode.value} onPress={() => changeSplitMode(mode.value)} />)}</ChipRow>
        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13, marginBottom: 8 }}>Who participated?</Text>
        <ChipRow>{detail?.group?.members?.map((member) => <Chip key={member.userId} label={member.userId === myId ? "You" : member.fullName} selected={selectedParticipants.includes(member.userId)} onPress={() => toggleParticipant(member.userId)} />)}</ChipRow>
        {expenseForm.splitType !== "equal" ? selectedParticipants.map((id) => { const member = detail.group.members.find((m) => m.userId === id); const fieldKey = expenseForm.splitType === "exact" ? "amount" : expenseForm.splitType === "percentage" ? "percentage" : "shares"; const label = expenseForm.splitType === "exact" ? `${member?.fullName} share (₹)` : expenseForm.splitType === "percentage" ? `${member?.fullName} (%)` : `${member?.fullName} shares`; return <Input key={id} label={label} value={participantValues[id]?.[fieldKey] || ""} onChangeText={(v) => setPersonValue(id, fieldKey, v.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" />; }) : null}
        <Input label="Note (optional)" value={expenseForm.note} onChangeText={(v) => setValue("note", v)} placeholder="Optional detail" />
        <Button title="Save shared bill" onPress={saveExpense} loading={saving} disabled={!selectedParticipants.length} />
      </Sheet>

      <Sheet visible={!!settlementForm} onClose={() => setSettlementForm(null)} title="Record settlement">
        <Text style={{ color: colors.text, fontWeight: "700", marginBottom: 12 }}>{settlementForm ? `${memberName(settlementForm.fromUserId)} pays ${memberName(settlementForm.toUserId)}` : ""}</Text>
        <Input label="Amount paid (₹)" value={settlementForm?.amount || ""} onChangeText={(v) => setSettlementForm((old) => old ? ({ ...old, amount: v.replace(/[^0-9.]/g, "") }) : old)} keyboardType="decimal-pad" />
        <Input label="Note (optional)" value={settlementForm?.note || ""} onChangeText={(v) => setSettlementForm((old) => old ? ({ ...old, note: v }) : old)} placeholder="UPI, cash, partial payment" />
        <Text style={{ color: colors.sub, fontSize: 12, marginBottom: 12 }}>The amount can be a full payment or any partial amount up to the outstanding balance.</Text>
        <Button title="Confirm settlement" onPress={saveSettlement} loading={saving} />
      </Sheet>
    </Screen>
  );
}
