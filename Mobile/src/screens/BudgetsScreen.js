import React, { useCallback, useMemo, useState } from "react";
import { Switch, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../theme";
import { Badge, Button, Card, Chip, ChipRow, ConfirmSheet, DateField, EmptyState, Fab, Header, IconButton, Input, Loading, ProgressBar, Screen, Sheet, StatTile } from "../components/ui";
import { useToast } from "../context/ToastContext";
import client, { getErrorMessage } from "../api/client";
import { API_PATHS } from "../api/paths";
import { capitalize, inr, progressTone, shortDate, toDateString } from "../utils/format";

const DAY = 86400000;
const CATS = ["Food", "Transport", "Shopping", "Rent", "Bills", "Entertainment", "Health", "Education", "Travel", "Other"];
const TABS = [["active", "Active"], ["upcoming", "Upcoming"], ["ended", "Ended"], ["all", "All"]];

const phaseOf = (b) => {
  const now = new Date();
  const end = new Date(b.endDate);
  end.setHours(23, 59, 59, 999);
  return now < new Date(b.startDate) ? "upcoming" : now > end ? "ended" : "active";
};
const monthRange = () => {
  const n = new Date();
  return { startDate: toDateString(new Date(n.getFullYear(), n.getMonth(), 1)), endDate: toDateString(new Date(n.getFullYear(), n.getMonth() + 1, 0)) };
};
const next30 = () => {
  const s = new Date();
  const e = new Date();
  e.setDate(e.getDate() + 29);
  return { startDate: toDateString(s), endDate: toDateString(e) };
};
const emptyForm = () => ({ category: "", amount: "", ...monthRange(), isRecurring: false, recurrenceType: "monthly" });

export default function BudgetsScreen() {
  const { colors } = useTheme();
  const toast = useToast();
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("active");
  const [sheet, setSheet] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await client.get(API_PATHS.BUDGET.REPORT);
      setReport(res.data.data.report || []);
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not load budgets"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const list = useMemo(
    () => report.map((b) => ({ ...b, phase: phaseOf(b), pct: b.budgetAmount ? (b.actualSpent / b.budgetAmount) * 100 : 0 })),
    [report],
  );
  const visible = tab === "all" ? list : list.filter((b) => b.phase === tab);
  const totals = visible.reduce((t, b) => ({ budget: t.budget + b.budgetAmount, spent: t.spent + b.actualSpent }), { budget: 0, spent: 0 });

  const openNew = () => { setEditing(null); setForm(emptyForm()); setErrors({}); setSheet(true); };
  const openEdit = (b) => {
    setEditing(b);
    setForm({ category: b.category, amount: String(b.amount), startDate: toDateString(b.startDate), endDate: toDateString(b.endDate), isRecurring: !!b.isRecurring, recurrenceType: b.recurrenceType || "monthly" });
    setErrors({});
    setSheet(true);
  };
  const set = (k, v) => { setForm((p) => ({ ...p, [k]: v })); if (errors[k]) setErrors((p) => ({ ...p, [k]: "" })); };

  const save = async () => {
    const e = {};
    if (!form.category.trim()) e.category = "Category is required";
    if (!form.amount || Number(form.amount) <= 0) e.amount = "Enter an amount greater than 0";
    if (form.startDate > form.endDate) e.endDate = "End date must be on or after start date";
    setErrors(e);
    if (Object.keys(e).length) return;
    const payload = { category: form.category.trim(), amount: Number(form.amount), startDate: form.startDate, endDate: form.endDate, isRecurring: form.isRecurring };
    if (form.isRecurring) payload.recurrenceType = form.recurrenceType;
    setSaving(true);
    try {
      if (editing) await client.put(`${API_PATHS.BUDGET.ROOT}/${editing._id}`, payload);
      else await client.post(API_PATHS.BUDGET.ROOT, payload);
      toast.success(editing ? "Budget updated" : "Budget created");
      setSheet(false);
      load();
    } catch (error) {
      // e.g. "Total budget cannot be more than total income"
      toast.error(getErrorMessage(error, "Could not save budget"));
    } finally {
      setSaving(false);
    }
  };

  const remove = (b) => setDeleteTarget(b);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await client.delete(`${API_PATHS.BUDGET.ROOT}/${deleteTarget._id}`);
      setReport((p) => p.filter((x) => x._id !== deleteTarget._id));
      toast.success("Budget deleted successfully");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not delete"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} bottomPad={110}>
        <Header title="Budgets" subtitle="Spending limits vs. your real expenses" />
        {loading ? <Loading /> : (
          <>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
              <StatTile icon="wallet" label="Budgeted" value={inr(totals.budget)} tint="#8b5cf6" />
              <StatTile icon="trending-down" label="Spent" value={inr(totals.spent)} tint="#ef4444" />
              <StatTile icon="cash" label={totals.budget - totals.spent >= 0 ? "Left" : "Over"} value={inr(Math.abs(totals.budget - totals.spent))} tint={totals.budget - totals.spent >= 0 ? "#10b981" : "#f97316"} />
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
              {TABS.map(([v, l]) => <Chip key={v} label={l} selected={tab === v} onPress={() => setTab(v)} />)}
            </View>
            {visible.length === 0 ? (
              <EmptyState emoji="🐷" title={list.length ? `No ${tab} budgets` : "No budgets yet"} message="Create a budget to see how your spending compares to your plan." actionLabel="New budget" onAction={openNew} />
            ) : visible.map((b) => {
              const over = b.actualSpent > b.budgetAmount;
              const tone = progressTone(b.pct, colors);
              const left = Math.max(0, Math.ceil((new Date(b.endDate).setHours(23, 59, 59, 999) - Date.now()) / DAY));
              return (
                <Card key={b._id} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>{capitalize(b.category)}</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                        <Badge label={capitalize(b.phase)} tone={b.phase === "active" ? "green" : b.phase === "upcoming" ? "purple" : "gray"} />
                        {over && <Badge label="Over budget" tone="red" />}
                        {!over && b.pct >= 75 && b.phase === "active" && <Badge label="Near limit" tone="amber" />}
                        {b.isRecurring && <Badge label={`↻ ${capitalize(b.recurrenceType)}`} tone="purple" />}
                      </View>
                    </View>
                    <View style={{ flexDirection: "row" }}>
                      <IconButton name="create-outline" onPress={() => openEdit(b)} />
                      <IconButton name="trash-outline" onPress={() => remove(b)} color={colors.danger} />
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 14, marginBottom: 8 }}>
                    <Text style={{ color: colors.sub, fontSize: 13 }}>
                      <Text style={{ color: colors.text, fontSize: 20, fontWeight: "800" }}>{inr(b.actualSpent)}</Text> of {inr(b.budgetAmount)}
                    </Text>
                    <Text style={{ color: tone, fontWeight: "800" }}>{Math.round(b.pct)}%</Text>
                  </View>
                  <ProgressBar percent={b.pct} color={tone} />
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
                    <Text style={{ color: colors.sub, fontSize: 12 }}>{shortDate(b.startDate)} – {shortDate(b.endDate)}</Text>
                    <Text style={{ color: over ? colors.danger : colors.text, fontSize: 12, fontWeight: "700" }}>
                      {over ? `${inr(Math.abs(b.remaining))} over` : b.phase === "active" ? `${inr(b.remaining)} left · ${left}d` : `${inr(b.remaining)} left`}
                    </Text>
                  </View>
                </Card>
              );
            })}
          </>
        )}
      </Screen>
      <Fab onPress={openNew} />

      <Sheet visible={sheet} onClose={() => setSheet(false)} title={editing ? "Edit budget" : "New budget"}>
        <Input label="Category" value={form.category} onChangeText={(v) => set("category", v)} placeholder="e.g. Food" error={errors.category} style={{ marginBottom: 0 }} />
        <View style={{ marginTop: 10 }}>
          <ChipRow>{CATS.map((c) => <Chip key={c} label={c} selected={form.category.trim().toLowerCase() === c.toLowerCase()} onPress={() => set("category", c)} />)}</ChipRow>
        </View>
        <Input label="Budget amount (₹)" value={form.amount} onChangeText={(v) => set("amount", v.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" error={errors.amount} />
        <ChipRow>
          <Chip label="This month" onPress={() => setForm((p) => ({ ...p, ...monthRange() }))} />
          <Chip label="Next 30 days" onPress={() => setForm((p) => ({ ...p, ...next30() }))} />
        </ChipRow>
        <DateField label="Start date" value={form.startDate} onChange={(v) => set("startDate", v)} />
        <DateField label="End date" value={form.endDate} onChange={(v) => set("endDate", v)} error={errors.endDate} />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <Text style={{ color: colors.text, fontWeight: "600" }}>Recurring budget</Text>
          <Switch value={form.isRecurring} onValueChange={(v) => set("isRecurring", v)} trackColor={{ true: colors.primary }} />
        </View>
        {form.isRecurring && (
          <ChipRow>{["daily", "weekly", "monthly", "annually"].map((r) => <Chip key={r} label={capitalize(r)} selected={form.recurrenceType === r} onPress={() => set("recurrenceType", r)} />)}</ChipRow>
        )}
        <Button title={editing ? "Update budget" : "Create budget"} onPress={save} loading={saving} />
      </Sheet>

      <ConfirmSheet
        visible={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={`Delete "${deleteTarget ? capitalize(deleteTarget.category) : ""}" budget?`}
        message="This budget limit and all its progress records will be permanently removed. This action cannot be undone."
        confirmText="Delete budget"
        loading={deleting}
      />
    </View>
  );
}
