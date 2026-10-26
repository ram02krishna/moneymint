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
    <div className="card">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <LuTarget />
          </span>
          <h5 className="text-lg font-semibold text-gray-900 dark:text-white">Savings goals</h5>
        </div>
        <button className="card-btn" onClick={() => navigate("/goals")}>
          View all <LuArrowRight />
        </button>
      </div>

      {goals === null ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-24" />
          ))}
        </div>
      ) : inProgress.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
          {goals.length === 0
            ? "No goals yet — create one to start saving towards something."
            : "All your goals are complete. Time to set a new one!"}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {inProgress.map((g) => {
            const pct = (g.savedAmount / g.targetAmount) * 100;
            return (
              <button
                key={g._id}
                onClick={() => navigate("/goals")}
                className="text-left p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{g.icon || "🎯"}</span>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                    {g.title}
                  </p>
                </div>
                <ProgressBar percent={pct} barClass="bg-purple-500" height="h-2" />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  ₹{addThousandsSeparator(g.savedAmount)} of ₹{addThousandsSeparator(g.targetAmount)} · {Math.round(pct)}%
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GoalsSnapshot;
