import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme";
import { useAuth } from "../context/AuthContext";
import { Badge, Card, EmptyState, Loading, MonthSwitcher, ProgressBar, Screen, SectionTitle, StatTile } from "../components/ui";
import TransactionRow from "../components/TransactionRow";
import { DonutChart, Legend, LineChart } from "../components/charts";
import client from "../api/client";
import { API_PATHS } from "../api/paths";
import { capitalize, inr, monthKey, monthLabel, progressTone } from "../utils/format";

export default function DashboardScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const chartW = width - 64;
  const [month, setMonth] = useState(new Date());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [summary, setSummary] = useState(null);
  const [annualOverview, setAnnualOverview] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);

  const loadAnnual = useCallback(async (yr) => {
    try {
      const res = await client.get(`${API_PATHS.DASHBOARD.GET_TREND_SUMMARY}?year=${yr}&calendarYear=true`);
      if (res.data?.data) {
        setAnnualOverview(res.data.data);
      }
    } catch (err) {
      console.error("Error loading annual financial overview:", err);
    }
  }, []);

  useEffect(() => {
    loadAnnual(selectedYear);
  }, [selectedYear, loadAnnual]);

  const load = useCallback(async () => {
    try {
      const [s, b, g] = await Promise.allSettled([
        client.get(`${API_PATHS.DASHBOARD.GET_MONTHLY_SUMMARY}?month=${monthKey(month)}`),
        client.get(API_PATHS.BUDGET.REPORT),
        client.get(API_PATHS.GOALS.ROOT),
      ]);
      loadAnnual(selectedYear);
      if (s.status === "fulfilled") {
        setSummary(s.value.data.data);
        setFailed(false);
      } else setFailed(true);

      if (b.status === "fulfilled") {
        const now = new Date();
        setBudgets(
          (b.value.data.data.report || [])
            .filter((x) => {
              const end = new Date(x.endDate);
              end.setHours(23, 59, 59, 999);
              return now >= new Date(x.startDate) && now <= end;
            })
            .map((x) => ({ ...x, pct: x.budgetAmount ? (x.actualSpent / x.budgetAmount) * 100 : 0 }))
            .sort((x, y) => y.pct - x.pct),
        );
      }
      if (g.status === "fulfilled") setGoals(g.value.data.data.goals || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [month]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const income = summary?.totalIncome || 0;
  const expense = summary?.totalExpense || 0;
  const savings = summary?.totalSavings ?? income - expense;
  const tx = summary?.monthlyTransactions || [];

  // same insight logic as the web dashboard
  const insights = useMemo(() => {
    const out = [];
    if (income > 0) {
      const rate = ((income - expense) / income) * 100;
      out.push(
        rate >= 20
          ? { icon: "happy-outline", tone: colors.success, title: "Healthy savings rate", text: `You kept ${Math.round(rate)}% of your income.` }
          : rate >= 0
            ? { icon: "alert-circle-outline", tone: colors.warn, title: "Room to save more", text: `You're saving ${Math.round(rate)}%. Aim for 20%+.` }
            : { icon: "warning-outline", tone: colors.danger, title: "Spending exceeds income", text: `${inr(expense - income)} more than you earned.` },
      );
    }
    const top = (summary?.expenseByCategory || [])[0];
    if (top && expense > 0)
      out.push({
        icon: "bag-handle-outline",
        tone: colors.primary,
        title: `${capitalize(top._id)} leads your spending`,
        text: `${inr(top.totalAmount)} — ${Math.round((top.totalAmount / expense) * 100)}% of expenses.`,
      });
    if (expense > 0) {
      const now = new Date();
      const dim = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
      const isCurrent = month.getMonth() === now.getMonth() && month.getFullYear() === now.getFullYear();
      const avg = expense / (isCurrent ? Math.max(1, now.getDate()) : dim);
      out.push({
        icon: "calendar-outline",
        tone: colors.primary,
        title: `About ${inr(Math.round(avg))} per day`,
        text: isCurrent ? `At this pace: ~${inr(Math.round(avg * dim))} by month end.` : "Average daily spend this month.",
      });
    }
    return out;
  }, [summary, income, expense, month, colors]);

  const incomeData = useMemo(() => {
    const map = {};
    if (summary?.incomeBySource?.length) {
      summary.incomeBySource.forEach((i) => {
        const k = capitalize(i._id || "Other");
        map[k] = (map[k] || 0) + (i.totalAmount || 0);
      });
    } else {
      (tx || [])
        .filter((t) => t.type === "income")
        .forEach((t) => {
          const k = capitalize(t.source || t.category || "Other");
          map[k] = (map[k] || 0) + (t.amount || 0);
        });
    }
    const list = Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);

    if (list.length <= 5) return list;
    const top = list.slice(0, 5);
    const otherVal = list.slice(5).reduce((s, x) => s + x.value, 0);
    if (otherVal > 0) top.push({ name: "Other", value: otherVal });
    return top;
  }, [summary, tx]);

  const expenseData = useMemo(() => {
    const map = {};
    if (summary?.expenseByCategory?.length) {
      summary.expenseByCategory.forEach((i) => {
        const k = capitalize(i._id || "Other");
        map[k] = (map[k] || 0) + (i.totalAmount || 0);
      });
    } else {
      (tx || [])
        .filter((t) => t.type === "expense")
        .forEach((t) => {
          const k = capitalize(t.category || "Other");
          map[k] = (map[k] || 0) + (t.amount || 0);
        });
    }
    const list = Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);

    if (list.length <= 5) return list;
    const top = list.slice(0, 5);
    const otherVal = list.slice(5).reduce((s, x) => s + x.value, 0);
    if (otherVal > 0) top.push({ name: "Other", value: otherVal });
    return top;
  }, [summary, tx]);

  const annualMonths = useMemo(() => annualOverview?.months || [], [annualOverview]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.fullName?.split(" ")[0] || "there";

  return (
    <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} bottomPad={32}>
      {/* hero */}
      <View style={{ backgroundColor: colors.primary, borderRadius: 26, padding: 20, marginBottom: 16, overflow: "hidden" }}>
        <View style={{ position: "absolute", right: -40, top: -50, width: 170, height: 170, borderRadius: 85, backgroundColor: "rgba(255,255,255,0.12)" }} />
        <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>{monthLabel(month)}</Text>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800", marginTop: 2 }}>
          {greeting}, {firstName} 👋
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.85)", marginTop: 6, fontSize: 13, lineHeight: 19 }}>
          {income || expense ? `Earned ${inr(income)} · Spent ${inr(expense)}` : "Add your first income or expense to get started."}
        </Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
          <Pressable onPress={() => navigation.navigate("AddTransaction", { type: "expense" })} style={{ flex: 1, backgroundColor: "#fff", paddingVertical: 10, borderRadius: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 5 }}>
            <Ionicons name="remove-circle" size={17} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>Expense</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("AddTransaction", { type: "income" })} style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.2)", paddingVertical: 10, borderRadius: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 5 }}>
            <Ionicons name="add-circle" size={17} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Income</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("Budgets")} style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.2)", paddingVertical: 10, borderRadius: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 5 }}>
            <Ionicons name="pie-chart" size={17} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Budgets</Text>
          </Pressable>
        </View>
      </View>

      <MonthSwitcher month={month} onChange={(m) => { setLoading(true); setMonth(m); }} />

      {loading && !summary ? (
        <Loading text="Loading your dashboard..." />
      ) : failed && !summary ? (
        <EmptyState emoji="📡" title="Can't load data" message="Check your internet and that the API URL is correct, then pull down to retry." />
      ) : (
        <>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
            <StatTile icon="arrow-down-circle" label="Income" value={inr(income)} tint="#10b981" />
            <StatTile icon="arrow-up-circle" label="Expense" value={inr(expense)} tint="#ef4444" />
            <StatTile icon="wallet" label="Savings" value={inr(savings)} tint="#8b5cf6" />
          </View>

          {insights.length > 0 && (
            <>
              <SectionTitle title="Smart insights" />
              <Card style={{ gap: 14 }}>
                {insights.map((i, idx) => (
                  <View key={idx} style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
                    <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: i.tone + "22", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name={i.icon} size={19} color={i.tone} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>{i.title}</Text>
                      <Text style={{ color: colors.sub, fontSize: 12.5, marginTop: 2, lineHeight: 18 }}>{i.text}</Text>
                    </View>
                  </View>
                ))}
              </Card>
            </>
          )}

          <SectionTitle title="Budgets" action="Manage" onAction={() => navigation.navigate("Budgets")} />
          {budgets.length === 0 ? (
            <Card><Text style={{ color: colors.sub }}>No active budgets. Create one in the Budgets tab to track spending limits.</Text></Card>
          ) : (
            <Card style={{ gap: 14 }}>
              {budgets.slice(0, 3).map((b) => (
                <View key={b._id}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                    <Text style={{ color: colors.text, fontWeight: "600" }}>{capitalize(b.category)}</Text>
                    <Text style={{ color: progressTone(b.pct, colors), fontWeight: "700", fontSize: 12 }}>
                      {inr(b.actualSpent)} / {inr(b.budgetAmount)}
                    </Text>
                  </View>
                  <ProgressBar percent={b.pct} color={progressTone(b.pct, colors)} />
                </View>
              ))}
            </Card>
          )}

          <SectionTitle title="Savings goals" action="View all" onAction={() => navigation.navigate("More", { screen: "Goals", params: { fromHome: true } })} />
          {goals.filter((g) => g.savedAmount < g.targetAmount).length === 0 ? (
            <Card><Text style={{ color: colors.sub }}>{goals.length ? "All goals reached 🎉" : "No goals yet. Set one in the Goals tab."}</Text></Card>
          ) : (
            <Card style={{ gap: 14 }}>
              {goals.filter((g) => g.savedAmount < g.targetAmount).slice(0, 3).map((g) => {
                const pct = (g.savedAmount / g.targetAmount) * 100;
                return (
                  <View key={g._id}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                      <Text style={{ color: colors.text, fontWeight: "600" }}>{g.icon || "🎯"} {g.title}</Text>
                      <Text style={{ color: colors.sub, fontSize: 12 }}>{Math.round(pct)}%</Text>
                    </View>
                    <ProgressBar percent={pct} color={colors.primary} />
                  </View>
                );
              })}
            </Card>
          )}

          {/* Annual Financial overview: Jan to Dec */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 22, marginBottom: 10 }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>Financial overview</Text>
              <Text style={{ fontSize: 12, color: colors.sub, marginTop: 2 }}>Jan – Dec {selectedYear} trajectory</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 4, paddingVertical: 2 }}>
              <Pressable onPress={() => setSelectedYear((y) => y - 1)} hitSlop={10} style={{ padding: 4 }}>
                <Ionicons name="chevron-back" size={16} color={colors.text} />
              </Pressable>
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text, marginHorizontal: 6 }}>{selectedYear}</Text>
              <Pressable onPress={() => setSelectedYear((y) => y + 1)} hitSlop={10} style={{ padding: 4 }}>
                <Ionicons name="chevron-forward" size={16} color={colors.text} />
              </Pressable>
            </View>
          </View>

          <Card style={{ padding: 14 }}>
            {/* 3 Annual KPI badges */}
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
              <View style={{ flex: 1, backgroundColor: "#10b98118", padding: 10, borderRadius: 12, borderWidth: 1, borderColor: "#10b98133" }}>
                <Text style={{ color: "#10b981", fontSize: 10, fontWeight: "700", textTransform: "uppercase" }}>Earned</Text>
                <Text style={{ color: "#10b981", fontSize: 13.5, fontWeight: "800", marginTop: 2 }} numberOfLines={1}>
                  {inr(annualOverview?.annualIncome || 0)}
                </Text>
              </View>
              <View style={{ flex: 1, backgroundColor: "#ef444418", padding: 10, borderRadius: 12, borderWidth: 1, borderColor: "#ef444433" }}>
                <Text style={{ color: "#ef4444", fontSize: 10, fontWeight: "700", textTransform: "uppercase" }}>Spent</Text>
                <Text style={{ color: "#ef4444", fontSize: 13.5, fontWeight: "800", marginTop: 2 }} numberOfLines={1}>
                  {inr(annualOverview?.annualExpense || 0)}
                </Text>
              </View>
              <View style={{ flex: 1, backgroundColor: "#8b5cf618", padding: 10, borderRadius: 12, borderWidth: 1, borderColor: "#8b5cf633" }}>
                <Text style={{ color: "#8b5cf6", fontSize: 10, fontWeight: "700", textTransform: "uppercase" }}>Saved</Text>
                <Text style={{ color: (annualOverview?.annualSavings || 0) >= 0 ? "#8b5cf6" : "#ef4444", fontSize: 13.5, fontWeight: "800", marginTop: 2 }} numberOfLines={1}>
                  {inr(annualOverview?.annualSavings || 0)}
                </Text>
              </View>
            </View>

            {annualMonths.length > 0 ? (
              <LineChart
                width={chartW}
                height={205}
                labels={annualMonths.map((m) => m.monthDisplay)}
                series={[
                  { name: "Income", color: "#10b981", values: annualMonths.map((m) => m.income) },
                  { name: "Expense", color: "#ef4444", values: annualMonths.map((m) => m.expense) },
                  { name: "Net Saved", color: "#8b5cf6", values: annualMonths.map((m) => m.savings) },
                ]}
                formatValue={(v) => inr(v)}
              />
            ) : (
              <Text style={{ color: colors.sub, textAlign: "center", paddingVertical: 20 }}>
                Loading {selectedYear} trajectory...
              </Text>
            )}
          </Card>

          <SectionTitle title="Income overview" />
          <Card>
            {incomeData.length === 0 ? (
              <Text style={{ color: colors.sub, textAlign: "center", paddingVertical: 14 }}>
                No income recorded this month
              </Text>
            ) : (
              <>
                <DonutChart
                  data={incomeData}
                  centerLabel="Total income"
                  centerValue={inr(income)}
                />
                <Legend data={incomeData} />
              </>
            )}
          </Card>

          <SectionTitle title="Expense overview" />
          <Card>
            {expenseData.length === 0 ? (
              <Text style={{ color: colors.sub, textAlign: "center", paddingVertical: 14 }}>
                No expenses recorded this month
              </Text>
            ) : (
              <>
                <DonutChart
                  data={expenseData}
                  centerLabel="Total expense"
                  centerValue={inr(expense)}
                />
                <Legend data={expenseData} />
              </>
            )}
          </Card>

          <SectionTitle title="Recent transactions" action="See all" onAction={() => navigation.navigate("Transactions")} />
          {tx.length === 0 ? (
            <EmptyState emoji="🧾" title="No transactions this month" message="Tap Expense or Income above to add your first one." />
          ) : (
            <Card style={{ paddingVertical: 6 }}>
              {tx.slice(0, 5).map((t) => (
                <TransactionRow key={t._id} item={t} onPress={() => navigation.navigate("AddTransaction", { item: t })} />
              ))}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}
