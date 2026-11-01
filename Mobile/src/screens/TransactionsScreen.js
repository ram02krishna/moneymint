import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme";
import { Button, Chip, EmptyState, Fab, Header, IconButton, Loading, MonthSwitcher, Screen, Sheet } from "../components/ui";
import TransactionRow from "../components/TransactionRow";
import { useToast } from "../context/ToastContext";
import client, { getErrorMessage } from "../api/client";
import { API_PATHS } from "../api/paths";
import { downloadExcel, exportPdf } from "../utils/export";
import { inr, monthKey, monthLabel, pad } from "../utils/format";

const LIMIT = 20;

export default function TransactionsScreen({ navigation, route }) {
  const { colors } = useTheme();
  const toast = useToast();
  const [month, setMonth] = useState(new Date());
  const [filter, setFilter] = useState("all"); // all | income | expense
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState(""); // debounced
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState({ income: 0, expense: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState("");
  const page = useRef(1);
  const totalPages = useRef(1);
  const requestId = useRef(0);

  // open with a preset filter, e.g. from the More tab (Income / Expenses)
  useEffect(() => {
    const f = route.params?.filter;
    if (f && f !== filter) {
      setLoading(true);
      setFilter(f);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.filter, route.params?.stamp]);

  // debounce search typing
  const lastSearch = useRef("");
  useEffect(() => {
    const t = setTimeout(() => {
      const q = query.trim();
      if (q !== lastSearch.current) {
        lastSearch.current = q;
        setLoading(true);
        setSearch(q);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const fetchPage = useCallback(
    async (p) => {
      const y = month.getFullYear();
      const m = month.getMonth();
      const start = `${y}-${pad(m + 1)}-01`;
      const end = `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`;
      const q = search ? `&search=${encodeURIComponent(search)}` : "";
      const range = `startDate=${start}&endDate=${end}${q}`;

      if (filter === "all" && !search) {
        const res = await client.get(`${API_PATHS.TRANSACTIONS}?month=${monthKey(month)}&page=${p}&limit=${LIMIT}`);
        return { rows: res.data.data.transactions, pages: res.data.pagination?.totalPages || 1 };
      }
      if (filter === "all") {
        // search across both income and expenses, merged by date
        const [i, e] = await Promise.all([
          client.get(`${API_PATHS.INCOME}?${range}&page=1&limit=50`),
          client.get(`${API_PATHS.EXPENSE}?${range}&page=1&limit=50`),
        ]);
        const rows = [
          ...i.data.data.incomes.map((r) => ({ ...r, type: "income" })),
          ...e.data.data.expenses.map((r) => ({ ...r, type: "expense" })),
        ].sort((a, b) => new Date(b.date) - new Date(a.date));
        return { rows, pages: 1 };
      }
      const base = filter === "income" ? API_PATHS.INCOME : API_PATHS.EXPENSE;
      const res = await client.get(`${base}?${range}&page=${p}&limit=${LIMIT}`);
      const list = filter === "income" ? res.data.data.incomes : res.data.data.expenses;
      return { rows: list.map((r) => ({ ...r, type: filter })), pages: res.data.pagination?.totalPages || 1 };
    },
    [month, filter, search],
  );

  const loadFirst = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const [{ rows, pages }, sum] = await Promise.all([
        fetchPage(1),
        client.get(`${API_PATHS.DASHBOARD.GET_MONTHLY_SUMMARY}?month=${monthKey(month)}`).catch(() => null),
      ]);
      if (id !== requestId.current) return;
      page.current = 1;
      totalPages.current = pages;
      setItems(rows);
      if (sum) setTotals({ income: sum.data.data.totalIncome || 0, expense: sum.data.data.totalExpense || 0 });
    } catch (e) {
      if (id === requestId.current) toast.error(getErrorMessage(e, "Could not load transactions"));
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [fetchPage, month, toast]);

  useFocusEffect(useCallback(() => { loadFirst(); }, [loadFirst]));

  const loadMore = async () => {
    if (loadingMore || loading || page.current >= totalPages.current) return;
    setLoadingMore(true);
    try {
      const next = page.current + 1;
      const { rows } = await fetchPage(next);
      page.current = next;
      setItems((prev) => [...prev, ...rows]);
    } catch (e) {
      toast.error(getErrorMessage(e, "Could not load more"));
    } finally {
      setLoadingMore(false);
    }
  };

  const runExport = async (kind) => {
    setExporting(kind);
    try {
      if (kind === "excel") {
        if (filter === "income") await downloadExcel(API_PATHS.DOWNLOAD.INCOME, "income_data.xlsx");
        else if (filter === "expense") await downloadExcel(API_PATHS.DOWNLOAD.EXPENSE, "expense_data.xlsx");
        else await downloadExcel(`${API_PATHS.DOWNLOAD.TRANSACTIONS}?month=${monthKey(month)}`, `transactions_${monthKey(month)}.xlsx`);
      } else {
        const title = `${filter === "income" ? "Income" : filter === "expense" ? "Expense" : "Transactions"} - ${monthLabel(month)}`;
        await exportPdf(title, items);
      }
      setExportOpen(false);
    } catch (e) {
      toast.error(getErrorMessage(e, "Export failed"));
    } finally {
      setExporting("");
    }
  };

  const heading = filter === "income" ? "Income" : filter === "expense" ? "Expenses" : "Transactions";

  return (
    <Screen scroll={false}>
      <FlatList
        data={items}
        keyExtractor={(i) => `${i.type}-${i._id}`}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        refreshing={refreshing}
        onRefresh={() => { setRefreshing(true); loadFirst(); }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <>
            <Header
              title={heading}
              subtitle="Tap an item to edit or delete it"
              right={<IconButton name="download-outline" color={colors.primary} size={24} onPress={() => setExportOpen(true)} />}
            />
            <MonthSwitcher month={month} onChange={(m) => { setLoading(true); setMonth(m); }} />
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              {[["all", "All"], ["income", "Income"], ["expense", "Expense"]].map(([v, l]) => (
                <Chip key={v} label={l} selected={filter === v} onPress={() => { setLoading(true); setFilter(v); }} />
              ))}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 12, marginBottom: 12 }}>
              <Ionicons name="search" size={18} color={colors.sub} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search title, category or source"
                placeholderTextColor={colors.sub}
                style={{ flex: 1, color: colors.text, paddingVertical: 11, fontSize: 14 }}
                returnKeyType="search"
              />
              {query ? <Ionicons name="close-circle" size={18} color={colors.sub} onPress={() => setQuery("")} /> : null}
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
              {filter !== "expense" && <Text style={{ color: colors.success, fontWeight: "700", fontSize: 13 }}>Income {inr(totals.income)}</Text>}
              {filter !== "income" && <Text style={{ color: colors.danger, fontWeight: "700", fontSize: 13 }}>Expense {inr(totals.expense)}</Text>}
              {filter === "all" && <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}>Net {inr(totals.income - totals.expense)}</Text>}
            </View>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <Loading />
          ) : (
            <EmptyState emoji="🧾" title="Nothing here" message={search ? `No results for "${search}" this month.` : "No transactions for this month and filter."} actionLabel="Add transaction" onAction={() => navigation.navigate("AddTransaction", { type: filter === "income" ? "income" : "expense" })} />
          )
        }
        renderItem={({ item, index }) => (
          <View
            style={{
              backgroundColor: colors.card,
              paddingHorizontal: 14,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: colors.border,
              borderTopWidth: index === 0 ? 1 : 0,
              borderBottomWidth: index === items.length - 1 ? 1 : 0,
              borderTopLeftRadius: index === 0 ? 18 : 0,
              borderTopRightRadius: index === 0 ? 18 : 0,
              borderBottomLeftRadius: index === items.length - 1 ? 18 : 0,
              borderBottomRightRadius: index === items.length - 1 ? 18 : 0,
            }}
          >
            <TransactionRow item={item} onPress={() => navigation.navigate("AddTransaction", { item })} />
          </View>
        )}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginTop: 16 }} color={colors.primary} /> : null}
      />
      <Fab onPress={() => navigation.navigate("AddTransaction", { type: filter === "income" ? "income" : "expense" })} />

      <Sheet visible={exportOpen} onClose={() => setExportOpen(false)} title="Export">
        <Text style={{ color: colors.sub, marginBottom: 16, lineHeight: 20 }}>
          Excel downloads {filter === "all" ? `all transactions for ${monthLabel(month)}` : `all your ${filter} records`}. PDF exports the {items.length} item(s) currently shown.
        </Text>
        <Button title="Excel (.xlsx)" icon="grid-outline" onPress={() => runExport("excel")} loading={exporting === "excel"} disabled={!!exporting} />
        <Button title="PDF statement" icon="document-text-outline" variant="ghost" onPress={() => runExport("pdf")} loading={exporting === "pdf"} disabled={!!exporting || items.length === 0} style={{ marginTop: 10 }} />
      </Sheet>
    </Screen>
  );
}
