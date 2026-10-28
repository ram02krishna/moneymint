import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../theme";
import { Badge, Button, Card, DateField, EmptyState, Fab, Header, IconButton, Input, Loading, ProgressBar, Screen, Segmented, Sheet, StatTile } from "../components/ui";
import { useToast } from "../context/ToastContext";
import client, { getErrorMessage } from "../api/client";
import { API_PATHS } from "../api/paths";
import { inr, shortDate, toDateString } from "../utils/format";

const ICONS = ["🎯", "🏠", "🚗", "✈️", "💻", "📱", "🎓", "💍", "🏖️", "🛡️", "🎁", "💰"];
const DAY = 86400000;

export default function GoalsScreen({ navigation, route }) {
  const { colors } = useTheme();
  const toast = useToast();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", icon: "🎯", targetAmount: "", deadline: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [target, setTarget] = useState(null); // goal being topped up
  const [mode, setMode] = useState("deposit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [amtError, setAmtError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await client.get(API_PATHS.GOALS.ROOT);
      setGoals(res.data.data.goals || []);
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not load goals"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const stats = useMemo(() => ({
    saved: goals.reduce((s, g) => s + g.savedAmount, 0),
    target: goals.reduce((s, g) => s + g.targetAmount, 0),
    done: goals.filter((g) => g.savedAmount >= g.targetAmount).length,
  }), [goals]);

  const openNew = () => { setEditing(null); setForm({ title: "", icon: "🎯", targetAmount: "", deadline: "" }); setErrors({}); setFormOpen(true); };
  const openEdit = (g) => { setEditing(g); setForm({ title: g.title, icon: g.icon || "🎯", targetAmount: String(g.targetAmount), deadline: g.deadline ? toDateString(g.deadline) : "" }); setErrors({}); setFormOpen(true); };

  const saveGoal = async () => {
    const e = {};
    if (!form.title.trim()) e.title = "Give your goal a name";
    if (!form.targetAmount || Number(form.targetAmount) < 1) e.targetAmount = "Target must be at least ₹1";
    setErrors(e);
    if (Object.keys(e).length) return;
    const payload = { title: form.title.trim(), icon: form.icon, targetAmount: Number(form.targetAmount) };
    if (form.deadline) payload.deadline = form.deadline;
    setSaving(true);
    try {
      if (editing) {
        const res = await client.put(`${API_PATHS.GOALS.ROOT}/${editing._id}`, payload);
        setGoals((p) => p.map((g) => (g._id === editing._id ? res.data.data.goal : g)));
        toast.success("Goal updated");
      } else {
        const res = await client.post(API_PATHS.GOALS.ROOT, payload);
        setGoals((p) => [res.data.data.goal, ...p]);
        toast.success("Goal created — let's start saving!");
      }
      setFormOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save goal"));
    } finally {
      setSaving(false);
    }
  };

  const removeGoal = (g) =>
    Alert.alert("Delete goal?", `"${g.title}" and its history will be removed.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          try {
            await client.delete(`${API_PATHS.GOALS.ROOT}/${g._id}`);
            setGoals((p) => p.filter((x) => x._id !== g._id));
            toast.success("Goal deleted");
          } catch (error) { toast.error(getErrorMessage(error, "Could not delete")); }
        } },
    ]);

  const openTopUp = (g) => { setTarget(g); setMode("deposit"); setAmount(""); setNote(""); setAmtError(""); };

  const contribute = async () => {
    const v = Number(amount);
    if (!v || v <= 0) return setAmtError("Enter an amount greater than 0");
    if (mode === "withdraw" && v > target.savedAmount) return setAmtError(`You only have ${inr(target.savedAmount)} saved`);
    setSaving(true);
    try {
      const body = { amount: mode === "withdraw" ? -v : v };
      if (note.trim()) body.note = note.trim();
      const res = await client.post(API_PATHS.GOALS.CONTRIBUTE(target._id), body);
      const updated = res.data.data.goal;
      setGoals((p) => p.map((g) => (g._id === updated._id ? updated : g)));
      toast.success(body.amount > 0 && updated.savedAmount >= updated.targetAmount ? `🎉 Goal reached: ${updated.title}!` : body.amount > 0 ? "Money added" : "Withdrawal recorded");
      setTarget(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update goal"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} bottomPad={110}>
        <Header
          title="Savings goals"
          subtitle="Save towards the things that matter"
          onBack={() => {
            if (route?.params?.fromHome) navigation.navigate("Home");
            else if (navigation.canGoBack()) navigation.goBack();
            else navigation.navigate("MoreMain");
          }}
        />
        {loading ? <Loading /> : (
          <>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
              <StatTile icon="cash" label="Saved" value={inr(stats.saved)} tint="#10b981" />
              <StatTile icon="flag" label="Target" value={inr(stats.target)} tint="#8b5cf6" />
              <StatTile icon="trophy" label="Reached" value={`${stats.done}/${goals.length}`} tint="#f97316" />
            </View>
            {goals.length === 0 ? (
              <EmptyState emoji="🎯" title="No goals yet" message="Planning a trip, a laptop or an emergency fund? Create a goal and track every rupee." actionLabel="Create goal" onAction={openNew} />
            ) : goals.map((g) => {
              const pct = (g.savedAmount / g.targetAmount) * 100;
              const done = g.savedAmount >= g.targetAmount;
              const remaining = Math.max(0, g.targetAmount - g.savedAmount);
              const daysLeft = g.deadline ? Math.ceil((new Date(g.deadline) - new Date()) / DAY) : null;
              const perMonth = daysLeft && daysLeft > 0 && !done ? remaining / Math.max(1, daysLeft / 30) : null;
              return (
                <Card key={g._id} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 50, height: 50, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 26 }}>{g.icon || "🎯"}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 17, fontWeight: "800", color: colors.text }} numberOfLines={1}>{g.title}</Text>
                      <View style={{ marginTop: 5, alignSelf: "flex-start" }}>
                        {done ? <Badge label="Goal reached 🎉" tone="green" /> : daysLeft === null ? <Badge label="No deadline" /> : daysLeft <= 0 ? <Badge label="Past target date" tone="red" /> : <Badge label={`${daysLeft}d left`} tone="purple" />}
                      </View>
                    </View>
                    <IconButton name="create-outline" onPress={() => openEdit(g)} />
                    <IconButton name="trash-outline" onPress={() => removeGoal(g)} color={colors.danger} />
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 16, marginBottom: 8 }}>
                    <Text style={{ color: colors.sub, fontSize: 13 }}>
                      <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>{inr(g.savedAmount)}</Text> of {inr(g.targetAmount)}
                    </Text>
                    <Text style={{ color: colors.primary, fontWeight: "800" }}>{Math.min(100, Math.round(pct))}%</Text>
                  </View>
                  <ProgressBar percent={pct} color={done ? colors.success : colors.primary} />
                  {g.deadline ? <Text style={{ color: colors.sub, fontSize: 12, marginTop: 10 }}>Target date: {shortDate(g.deadline)}</Text> : null}
                  {perMonth !== null ? <Text style={{ color: colors.text, fontSize: 12, fontWeight: "600", marginTop: 4 }}>Save ~{inr(Math.ceil(perMonth))}/month to stay on track</Text> : null}
                  <Button title="Add / withdraw money" variant="soft" icon="cash-outline" onPress={() => openTopUp(g)} style={{ marginTop: 14 }} />
                </Card>
              );
            })}
          </>
        )}
      </Screen>
      <Fab onPress={openNew} />

      <Sheet visible={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit goal" : "New savings goal"}>
        <Text style={{ color: colors.text, fontWeight: "600", fontSize: 13, marginBottom: 8 }}>Pick an icon</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {ICONS.map((ic) => (
            <Pressable key={ic} onPress={() => setForm((p) => ({ ...p, icon: ic }))} style={{ width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: form.icon === ic ? colors.primary : colors.border, backgroundColor: form.icon === ic ? colors.primarySoft : "transparent" }}>
              <Text style={{ fontSize: 22 }}>{ic}</Text>
            </Pressable>
          ))}
        </View>
        <Input label="Goal name" value={form.title} onChangeText={(v) => setForm((p) => ({ ...p, title: v }))} placeholder="e.g. Emergency fund" maxLength={80} error={errors.title} />
        <Input label="Target amount (₹)" value={form.targetAmount} onChangeText={(v) => setForm((p) => ({ ...p, targetAmount: v.replace(/[^0-9.]/g, "") }))} keyboardType="decimal-pad" error={errors.targetAmount} />
        <DateField label="Target date (optional)" value={form.deadline} onChange={(v) => setForm((p) => ({ ...p, deadline: v }))} minimumDate={new Date()} />
        <Button title={editing ? "Update goal" : "Create goal"} onPress={saveGoal} loading={saving} />
      </Sheet>

      <Sheet visible={!!target} onClose={() => setTarget(null)} title="Update savings">
        {target && (
          <>
            <Text style={{ color: colors.sub, marginBottom: 14 }}>{target.icon} {target.title} · {inr(target.savedAmount)} saved · {inr(Math.max(0, target.targetAmount - target.savedAmount))} to go</Text>
            <Segmented value={mode} onChange={(m) => { setMode(m); setAmtError(""); }} options={[{ value: "deposit", label: "Add money", color: colors.success }, { value: "withdraw", label: "Withdraw", color: colors.danger }]} />
            <Input label="Amount (₹)" value={amount} onChangeText={(v) => { setAmount(v.replace(/[^0-9.]/g, "")); setAmtError(""); }} keyboardType="decimal-pad" error={amtError} autoFocus />
            <Input label="Note (optional)" value={note} onChangeText={setNote} maxLength={200} placeholder="e.g. Diwali bonus" />
            <Button title={mode === "deposit" ? "Add to goal" : "Withdraw"} onPress={contribute} loading={saving} />
          </>
        )}
      </Sheet>
    </View>
  );
}
