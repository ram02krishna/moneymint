import React, { useCallback, useMemo, useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme";
import { Card, EmptyState, Header, Loading, MonthSwitcher, Screen, SectionTitle, StatTile } from "../components/ui";
import { BarChart, DonutChart, Legend, LineChart } from "../components/charts";
import client from "../api/client";
import { API_PATHS } from "../api/paths";
import { capitalize, inr, monthKey, monthLabel } from "../utils/format";

const Metric = ({ label, value, sub, tone }) => {
  const { colors } = useTheme();
  return (
    <Card style={{ flex: 1, minWidth: "46%", padding: 14 }}>
      <Text style={{ color: colors.sub, fontSize: 11, fontWeight: "700", letterSpacing: 0.5 }}>{label.toUpperCase()}</Text>
      <Text style={{ color: tone || colors.text, fontSize: 19, fontWeight: "800", marginTop: 6 }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? <Text style={{ color: colors.sub, fontSize: 12, marginTop: 3 }}>{sub}</Text> : null}
    </Card>
  );
};

const Change = ({ label, cur, prev, goodWhenUp }) => {
  const { colors } = useTheme();
  if (prev == null || cur == null) return null;
  const diff = cur - prev;
  const pct = prev > 0 ? ((diff / prev) * 100).toFixed(1) : null;
  const up = diff >= 0;
  const good = goodWhenUp ? up : !up;
  const tone = diff === 0 ? colors.sub : good ? colors.success : colors.danger;
  return (
    <Card style={{ flex: 1, minWidth: "46%", padding: 14 }}>
      <Text style={{ color: colors.sub, fontSize: 11, fontWeight: "700", letterSpacing: 0.5 }}>{label.toUpperCase()}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
        <Ionicons name={up ? "trending-up" : "trending-down"} size={20} color={tone} />
        <Text style={{ color: tone, fontSize: 19, fontWeight: "800" }}>{pct !== null ? `${Math.abs(pct)}%` : inr(Math.abs(diff))}</Text>
      </View>
      <Text style={{ color: colors.sub, fontSize: 12, marginTop: 3 }}>
        {inr(Math.abs(diff))} {up ? "more" : "less"} than last month
      </Text>
    </Card>
  );
};

export default function AnalyticsScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const chartW = width - 32 - 32; // screen padding + card padding
  const [month, setMonth] = useState(new Date());
  const [data, setData] = useState(null);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const key = monthKey(month);
    const [s, t] = await Promise.allSettled([
      client.get(`${API_PATHS.DASHBOARD.GET_MONTHLY_SUMMARY}?month=${key}`),
      client.get(`${API_PATHS.DASHBOARD.GET_TREND_SUMMARY}?month=${key}`),
    ]);
    if (s.status === "fulfilled") {
      setData(s.value.data.data);
      setFailed(false);
    } else setFailed(true);
    if (t.status === "fulfilled") setTrend(t.value.data.data || []);
    setLoading(false);
    setRefreshing(false);
  }, [month]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const expenseData = useMemo(() => (data?.expenseByCategory || []).map((i) => ({ name: capitalize(i._id || "Other"), value: i.totalAmount })), [data]);
  const incomeData = useMemo(() => (data?.incomeBySource || []).map((i) => ({ name: capitalize(i._id || "Other"), value: i.totalAmount })), [data]);

  const metrics = useMemo(() => {
    if (!trend.length) return null;
    const n = trend.length;
    const sum = (k) => trend.reduce((s, m) => s + m[k], 0);
    const topSpend = trend.reduce((a, b) => (a.expense > b.expense ? a : b));
    const topIncome = trend.reduce((a, b) => (a.income > b.income ? a : b));
    return { avgIncome: sum("income") / n, avgExpense: sum("expense") / n, avgSavings: sum("savings") / n, topSpend, topIncome, cur: trend[n - 1], prev: trend[n - 2] };
  }, [trend]);

  const labels = trend.map((t) => t.monthDisplay);

  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} bottomPad={32}>
      <Header title="Monthly analytics" subtitle="Where your money came from and where it went" />
      <MonthSwitcher month={month} onChange={(m) => { setLoading(true); setMonth(m); }} />

      {loading && !data ? (
        <Loading text="Crunching your numbers..." />
      ) : failed && !data ? (
        <EmptyState emoji="📡" title="Failed to load monthly data" message="Check your connection and pull down to retry." />
      ) : (
        <>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatTile icon="arrow-down-circle" label="Income" value={inr(data?.totalIncome ?? 0)} tint="#f97316" />
            <StatTile icon="arrow-up-circle" label="Expense" value={inr(data?.totalExpense ?? 0)} tint="#ef4444" />
            <StatTile icon="wallet" label="Savings" value={inr(data?.totalSavings ?? 0)} tint="#8b5cf6" />
          </View>

          <SectionTitle title="Category breakdown" />
          <Card style={{ marginBottom: 12 }}>
            <Text style={{ color: colors.text, fontWeight: "700", marginBottom: 14 }}>Expenses by category · {monthLabel(month)}</Text>
            {expenseData.length ? (
              <>
                <DonutChart data={expenseData} centerLabel="Total expense" centerValue={inr(data?.totalExpense ?? 0)} />
                <Legend data={expenseData} />
              </>
            ) : (
              <Text style={{ color: colors.sub, textAlign: "center", paddingVertical: 30 }}>No expense data available</Text>
            )}
          </Card>
          <Card>
            <Text style={{ color: colors.text, fontWeight: "700", marginBottom: 14 }}>Income by source · {monthLabel(month)}</Text>
            {incomeData.length ? (
              <>
                <DonutChart data={incomeData} centerLabel="Total income" centerValue={inr(data?.totalIncome ?? 0)} />
                <Legend data={incomeData} />
              </>
            ) : (
              <Text style={{ color: colors.sub, textAlign: "center", paddingVertical: 30 }}>No income data available</Text>
            )}
          </Card>

          {metrics && (
            <>
              <SectionTitle title="12-month trends" />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                <Metric label="Avg income" value={inr(Math.round(metrics.avgIncome))} tone={colors.success} />
                <Metric label="Avg expense" value={inr(Math.round(metrics.avgExpense))} tone={colors.danger} />
                <Metric label="Avg savings" value={inr(Math.round(metrics.avgSavings))} tone={metrics.avgSavings >= 0 ? colors.primary : colors.danger} />
                <Metric label="Highest spend" value={metrics.topSpend.monthDisplay} sub={inr(metrics.topSpend.expense)} tone="#f97316" />
                <Metric label="Highest income" value={metrics.topIncome.monthDisplay} sub={inr(metrics.topIncome.income)} />
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                <Change label="Expense vs last month" cur={metrics.cur?.expense} prev={metrics.prev?.expense} goodWhenUp={false} />
                <Change label="Income vs last month" cur={metrics.cur?.income} prev={metrics.prev?.income} goodWhenUp />
              </View>

              <Card style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
                  <Text style={{ color: colors.text, fontWeight: "700" }}>Income vs expense</Text>
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <Text style={{ color: colors.success, fontSize: 12, fontWeight: "700" }}>● Income</Text>
                    <Text style={{ color: colors.danger, fontSize: 12, fontWeight: "700" }}>● Expense</Text>
                  </View>
                </View>
                <LineChart
                  width={chartW}
                  labels={labels}
                  series={[
                    { name: "Income", color: "#10b981", values: trend.map((t) => t.income) },
                    { name: "Expense", color: "#ef4444", values: trend.map((t) => t.expense) },
                  ]}
                  formatValue={(v) => inr(v)}
                />
              </Card>

              <Card style={{ marginBottom: 12 }}>
                <Text style={{ color: colors.text, fontWeight: "700", marginBottom: 12 }}>Monthly savings</Text>
                <BarChart
                  width={chartW}
                  labels={labels}
                  values={trend.map((t) => t.savings)}
                  color="#875CF5"
                  formatValue={(v) => inr(v)}
                  valueLabel="Savings"
                />
              </Card>

              <Card>
                <Text style={{ color: colors.text, fontWeight: "700", marginBottom: 12 }}>Transactions per month</Text>
                <BarChart
                  width={chartW}
                  labels={labels}
                  values={trend.map((t) => t.transactions)}
                  color="#3B82F6"
                  formatValue={(v) => `${v} transaction${v === 1 ? "" : "s"}`}
                  valueLabel="Transactions"
                />
              </Card>
            </>
          )}
        </>
      )}
    </Screen>
  );
}
