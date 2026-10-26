import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuPiggyBank, LuArrowRight, LuTriangleAlert } from "react-icons/lu";
import ProgressBar from "../ui/ProgressBar";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import {
  addThousandsSeparator,
  capitalize,
  getProgressTone,
} from "../../utils/helper";

// Shows the most-used active budgets on the dashboard
const BudgetSnapshot = () => {
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await axiosInstance.get(API_PATHS.BUDGET.GET_REPORT);
        if (cancelled) return;
        const now = new Date();
        const active = (res.data?.data?.report || [])
          .filter((b) => {
            const end = new Date(b.endDate);
            end.setHours(23, 59, 59, 999);
            return now >= new Date(b.startDate) && now <= end;
          })
          .map((b) => ({ ...b, pct: b.budgetAmount ? (b.actualSpent / b.budgetAmount) * 100 : 0 }))
          .sort((a, b) => b.pct - a.pct);
        setBudgets(active);
      } catch {
        if (!cancelled) setBudgets([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const alerts = (budgets || []).filter((b) => b.pct >= 100).length;

  return (
    <div className="card flex flex-col h-full">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <LuPiggyBank />
          </span>
          <div>
            <h5 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
              Budget tracker
            </h5>
            <p className="text-xs text-gray-500 dark:text-gray-400">Active budgets</p>
          </div>
        </div>
        <button className="card-btn" onClick={() => navigate("/budgets")}>
          Manage <LuArrowRight />
        </button>
      </div>

      {budgets === null ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-10 w-full" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-[260px]">
            No active budgets. Set a limit for a category and we&apos;ll track it for you.
          </p>
          <button
            className="add-btn add-btn-fill"
            onClick={() => navigate("/budgets", { state: { openAdd: true } })}
          >
            Create a budget
          </button>
        </div>
      ) : (
        <>
          {alerts > 0 && (
            <div className="flex items-center gap-2 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 mb-4">
              <LuTriangleAlert />
              {alerts} budget{alerts > 1 ? "s are" : " is"} over the limit
            </div>
          )}
          <div className="space-y-5">
            {budgets.slice(0, 4).map((b) => (
              <div key={b._id}>
                <div className="flex items-center justify-between mb-1.5 text-sm">
                  <span className="font-semibold text-gray-800 dark:text-gray-100 truncate pr-3">
                    {capitalize(b.category)}
                  </span>
                  <span className={`text-xs font-bold ${getProgressTone(b.pct).text}`}>
                    ₹{addThousandsSeparator(b.actualSpent)} / ₹{addThousandsSeparator(b.budgetAmount)}
                  </span>
                </div>
                <ProgressBar percent={b.pct} height="h-2" />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default BudgetSnapshot;
