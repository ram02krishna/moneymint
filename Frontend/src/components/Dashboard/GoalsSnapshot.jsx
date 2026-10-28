import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LuTarget, LuArrowRight } from "react-icons/lu";
import ProgressBar from "../ui/ProgressBar";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import { addThousandsSeparator } from "../../utils/helper";

// Compact view of in-progress savings goals for the dashboard
const GoalsSnapshot = () => {
  const navigate = useNavigate();
  const [goals, setGoals] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await axiosInstance.get(API_PATHS.GOALS.GET_ALL_GOALS);
        if (!cancelled) setGoals(res.data?.data?.goals || []);
      } catch {
        if (!cancelled) setGoals([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const inProgress = (goals || []).filter((g) => g.savedAmount < g.targetAmount).slice(0, 3);

  return (
    <div className="card flex flex-col h-full">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <LuTarget />
          </span>
          <div>
            <h5 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">Savings goals</h5>
            <p className="text-xs text-gray-500 dark:text-gray-400">Goals in progress</p>
          </div>
        </div>
        <button className="card-btn" onClick={() => navigate("/goals")}>
          View all <LuArrowRight />
        </button>
      </div>

      {goals === null ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-10 w-full" />
          ))}
        </div>
      ) : inProgress.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-[260px]">
            {goals.length === 0
              ? "No goals yet — set a target and start saving towards it."
              : "All your goals are reached! Set a new goal to keep saving."}
          </p>
          <button className="add-btn add-btn-fill" onClick={() => navigate("/goals")}>
            Create a goal
          </button>
        </div>
      ) : (
        <div className="space-y-5 flex-1">
          {inProgress.map((g) => {
            const pct = (g.savedAmount / g.targetAmount) * 100;
            return (
              <div key={g._id} className="cursor-pointer group" onClick={() => navigate("/goals")}>
                <div className="flex items-center justify-between mb-1.5 text-sm">
                  <span className="font-semibold text-gray-800 dark:text-gray-100 truncate pr-3 flex items-center gap-2">
                    <span className="text-base">{g.icon || "🎯"}</span>
                    <span className="truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{g.title}</span>
                  </span>
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400 shrink-0">
                    ₹{addThousandsSeparator(g.savedAmount)} / ₹{addThousandsSeparator(g.targetAmount)} · {Math.round(pct)}%
                  </span>
                </div>
                <ProgressBar percent={pct} barClass="bg-purple-500" height="h-2" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GoalsSnapshot;
