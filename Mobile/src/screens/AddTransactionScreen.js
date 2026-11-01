import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme";
import { Button, Chip, ChipRow, ConfirmSheet, DateField, Input, Screen, Segmented } from "../components/ui";
import { useToast } from "../context/ToastContext";
import client, { getErrorMessage } from "../api/client";
import { API_PATHS } from "../api/paths";
import { toDateString } from "../utils/format";

const EXPENSE_CATS = ["Food", "Transport", "Shopping", "Rent", "Bills", "Entertainment", "Health", "Education", "Travel", "Other"];
const INCOME_CATS = ["Salary", "Freelance", "Business", "Investment", "Gift", "Other"];

export default function AddTransactionScreen({ navigation, route }) {
  const { colors } = useTheme();
  const toast = useToast();
  const item = route.params?.item || null;
  const editing = !!item;

  const [type, setType] = useState(item?.type || route.params?.type || "expense");
  const [form, setForm] = useState({
    title: item?.title || "",
    amount: item?.amount != null ? String(item.amount) : "",
    category: item?.category || "",
    source: item?.source || "",
    date: toDateString(item?.date),
    note: (item?.type === "income" ? item?.note : item?.description) || "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: "" }));
  };

  const isIncome = type === "income";
  const endpoint = isIncome ? API_PATHS.INCOME : API_PATHS.EXPENSE;

  const save = async () => {
    const e = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (!form.amount || Number(form.amount) <= 0) e.amount = "Enter an amount greater than 0";
    if (!form.category.trim()) e.category = "Category is required";
    if (isIncome && !form.source.trim()) e.source = "Income source is required";
    setErrors(e);
    if (Object.keys(e).length) return;

    const payload = {
      title: form.title.trim(),
      amount: Number(form.amount),
      category: form.category.trim(),
      date: form.date,
      ...(isIncome ? { source: form.source.trim(), ...(form.note.trim() && { note: form.note.trim() }) } : form.note.trim() ? { description: form.note.trim() } : {}),
    };

    setSaving(true);
    try {
      if (editing) await client.put(`${endpoint}/${item._id}`, payload);
      else await client.post(endpoint, payload);
      toast.success(editing ? "Transaction updated" : isIncome ? "Income added" : "Expense added");
      navigation.goBack();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save transaction"));
      setSaving(false);
    }
  };

  const remove = () => setDeleteConfirmOpen(true);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await client.delete(`${endpoint}/${item._id}`);
      toast.success("Transaction deleted successfully");
      setDeleteConfirmOpen(false);
      navigation.goBack();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not delete"));
      setDeleting(false);
    }
  };

  const cats = isIncome ? INCOME_CATS : EXPENSE_CATS;

  return (
    <Screen bottomPad={40}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text }}>{editing ? "Edit transaction" : "Add transaction"}</Text>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="close" size={26} color={colors.sub} />
        </Pressable>
      </View>

      {!editing && (
        <Segmented
          value={type}
          onChange={setType}
          options={[
            { value: "expense", label: "Expense", color: colors.danger },
            { value: "income", label: "Income", color: colors.success },
          ]}
        />
      )}

      <Input label="Title" value={form.title} onChangeText={(v) => set("title", v)} placeholder={isIncome ? "e.g. October salary" : "e.g. Lunch with team"} error={errors.title} />
      <Input label="Amount (₹)" value={form.amount} onChangeText={(v) => set("amount", v.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" placeholder="0" error={errors.amount} />
      {isIncome && <Input label="Source" value={form.source} onChangeText={(v) => set("source", v)} placeholder="e.g. Company, Client" error={errors.source} />}

      <Input label="Category" value={form.category} onChangeText={(v) => set("category", v)} placeholder="Pick one below or type your own" error={errors.category} style={{ marginBottom: 0 }} />
      <View style={{ marginTop: 10 }}>
        <ChipRow>
          {cats.map((c) => (
            <Chip key={c} label={c} selected={form.category.trim().toLowerCase() === c.toLowerCase()} onPress={() => set("category", c)} />
          ))}
        </ChipRow>
      </View>

      <DateField label="Date" value={form.date} onChange={(v) => set("date", v)} />
      <Input label={isIncome ? "Note (optional)" : "Description (optional)"} value={form.note} onChangeText={(v) => set("note", v)} multiline style={{ minHeight: 60, textAlignVertical: "top" }} />

      <Button title={editing ? "Save changes" : isIncome ? "Add income" : "Add expense"} onPress={save} loading={saving} />
      {editing && <Button title="Delete" variant="danger" icon="trash-outline" onPress={remove} style={{ marginTop: 10 }} />}

      <ConfirmSheet
        visible={deleteConfirmOpen}
        onClose={() => !deleting && setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title={`Delete "${item?.title}"?`}
        message="This transaction will be permanently removed from your history and charts. This action cannot be undone."
        confirmText="Delete transaction"
        loading={deleting}
      />
    </Screen>
  );
}
