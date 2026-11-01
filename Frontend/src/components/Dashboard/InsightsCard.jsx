import React, { memo, useMemo } from "react";
import {
  LuSparkles,
  LuPiggyBank,
  LuShoppingBag,
  LuCalendarDays,
  LuReceipt,
} from "react-icons/lu";
import ProgressBar from "../ui/ProgressBar";
import {
  addThousandsSeparator,
  capitalize,
  getProgressTone,
} from "../../utils/helper";

const TONES = {
  good: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  warn: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  bad: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  info: "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
};

const InsightsCard = ({ transactions = [], totalIncome = 0, totalExpense = 0, month }) => {
  const insights = useMemo(() => {
    const list = [];
    const expenses = transactions.filter((t) => t.type !== "income");

    // savings rate
    let rate = null;
    if (totalIncome > 0) {
      rate = ((totalIncome - totalExpense) / totalIncome) * 100;
      if (rate >= 20) {
        list.push({
          tone: "good",
          icon: <LuPiggyBank />,
          title: "Healthy savings rate",
          text: `You kept ${Math.round(rate)}% of your income this month.`,
        });
      } else if (rate >= 0) {
        list.push({
          tone: "warn",
          icon: <LuPiggyBank />,
          title: "Room to save more",
          text: `You're saving ${Math.round(rate)}% of income. Aim for 20% or more.`,
        });
      } else {
        list.push({
          tone: "bad",
          icon: <LuPiggyBank />,
          title: "Spending exceeds income",
          text: `You've spent ₹${addThousandsSeparator(Math.round(totalExpense - totalIncome))} more than you earned.`,
        });
      }
    }

    // biggest category
    const byCat = {};
    expenses.forEach((t) => {
      const k = (t.category || "Other").trim();
      byCat[k] = (byCat[k] || 0) + (t.amount || 0);
    });
    const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
    if (top && totalExpense > 0) {
      list.push({
        tone: "info",
        icon: <LuShoppingBag />,
        title: `${capitalize(top[0])} leads your spending`,
        text: `₹${addThousandsSeparator(top[1])} — ${Math.round((top[1] / totalExpense) * 100)}% of all expenses.`,
      });
    }

    // daily average + projection for the current month
    if (totalExpense > 0) {
      const now = new Date();
      const m = month || now;
      const daysInMonth = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
      const isCurrent = m.getMonth() === now.getMonth() && m.getFullYear() === now.getFullYear();
      const elapsed = isCurrent ? Math.max(1, now.getDate()) : daysInMonth;
      const avg = totalExpense / elapsed;
      list.push({
        tone: "info",
        icon: <LuCalendarDays />,
        title: `About ₹${addThousandsSeparator(Math.round(avg))} per day`,
        text: isCurrent
          ? `At this pace you'll spend ~₹${addThousandsSeparator(Math.round(avg * daysInMonth))} by month end.`
          : "Average daily spend for this month.",
      });
    }

    // biggest single expense
    const biggest = [...expenses].sort((a, b) => (b.amount || 0) - (a.amount || 0))[0];
    if (biggest && biggest.amount > 0) {
      list.push({
        tone: "info",
        icon: <LuReceipt />,
        title: "Largest expense",
        text: `${biggest.title || capitalize(biggest.category || "Expense")} — ₹${addThousandsSeparator(biggest.amount)}.`,
      });
    }

    return { list, rate };
  }, [transactions, totalIncome, totalExpense, month]);

  const rate = insights.rate;
  const tone = rate === null ? null : getProgressTone(rate < 0 ? 100 : 100 - Math.min(100, rate * 2.5));

  return (
    <div className="card flex flex-col h-full">
      <div className="flex items-center gap-2.5 mb-5">
        <span className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
          <LuSparkles />
        </span>
        <div>
          <h5 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
            Smart insights
          </h5>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Based on this month&apos;s activity
          </p>
        </div>
      </div>

      {rate !== null && (
        <div className="mb-5">
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Savings rate</span>
            <span className={`text-lg font-extrabold ${tone.text}`}>{Math.round(rate)}%</span>
          </div>
          <ProgressBar
            percent={Math.max(0, rate)}
            barClass={rate >= 20 ? "bg-emerald-500" : rate >= 0 ? "bg-amber-500" : "bg-red-500"}
          />
        </div>
      )}

      {insights.list.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
          Add some income and expenses to unlock personalised insights.
        </p>
      ) : (
        <ul className="space-y-3">
          {insights.list.map((i, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <span className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${TONES[i.tone]}`}>
                {i.icon}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{i.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{i.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default memo(InsightsCard);
