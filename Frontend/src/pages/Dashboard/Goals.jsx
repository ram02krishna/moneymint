import React, { useEffect, useMemo, useState } from "react";
import {
  LuPlus,
  LuPencil,
  LuTrash2,
  LuTarget,
  LuBanknote,
  LuFlag,
  LuTrophy,
  LuCalendarClock,
  LuHandCoins,
} from "react-icons/lu";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import Modal from "../../components/layouts/Modal";
import InfoCard from "../../components/Cards/InfoCard";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import ProgressBar from "../../components/ui/ProgressBar";
import LoadingSpinner from "../../components/LoadingSpinner";
import GoalForm from "../../components/Goals/GoalForm";
import ContributeForm from "../../components/Goals/ContributeForm";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import { useToast } from "../../hooks/useToast";
import {
  addThousandsSeparator,
  formatShortDate,
  getErrorMessage,
} from "../../utils/helper";

const DAY = 24 * 60 * 60 * 1000;

const Goals = () => {
  const toast = useToast();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [contributing, setContributing] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await axiosInstance.get(API_PATHS.GOALS.GET_ALL_GOALS);
        if (!cancelled) setGoals(res.data?.data?.goals || []);
      } catch (error) {
        if (!cancelled) toast.error(getErrorMessage(error, "Could not load goals"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const stats = useMemo(() => {
    const saved = goals.reduce((s, g) => s + g.savedAmount, 0);
    const target = goals.reduce((s, g) => s + g.targetAmount, 0);
    const done = goals.filter((g) => g.savedAmount >= g.targetAmount).length;
    return { saved, target, done };
  }, [goals]);

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const handleSaveGoal = async (payload) => {
    try {
      if (editing) {
        const res = await axiosInstance.put(
          API_PATHS.GOALS.UPDATE_GOAL(editing._id),
          payload,
        );
        const updated = res.data.data.goal;
        setGoals((prev) => prev.map((g) => (g._id === updated._id ? updated : g)));
        toast.success("Goal updated");
      } else {
        const res = await axiosInstance.post(API_PATHS.GOALS.ADD_GOAL, payload);
        setGoals((prev) => [res.data.data.goal, ...prev]);
        toast.success("Goal created — let's start saving!");
      }
      closeForm();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save goal"));
    }
  };

  const handleContribute = async (payload) => {
    try {
      const res = await axiosInstance.post(
        API_PATHS.GOALS.CONTRIBUTE(contributing._id),
        payload,
      );
      const updated = res.data.data.goal;
      setGoals((prev) => prev.map((g) => (g._id === updated._id ? updated : g)));
      if (payload.amount > 0 && updated.savedAmount >= updated.targetAmount) {
        toast.success(`🎉 Goal reached: ${updated.title}!`);
      } else {
        toast.success(payload.amount > 0 ? "Money added" : "Withdrawal recorded");
      }
      setContributing(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update goal"));
    }
  };

  const handleDelete = async (goal) => {
    if (!window.confirm(`Delete the goal "${goal.title}"?`)) return;
    try {
      await axiosInstance.delete(API_PATHS.GOALS.DELETE_GOAL(goal._id));
      setGoals((prev) => prev.filter((g) => g._id !== goal._id));
      toast.success("Goal deleted");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not delete goal"));
    }
  };

  return (
    <DashboardLayout activeMenu="Goals">
      <div className="w-full max-w-[1400px] mx-auto">
        <PageHeader
          title="Savings goals"
          subtitle="Save towards the things that matter and watch your progress grow."
        >
          <button
            className="add-btn add-btn-fill"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <LuPlus className="text-lg" /> New goal
          </button>
        </PageHeader>

        {loading ? (
          <div className="py-24 flex justify-center">
            <LoadingSpinner text="Loading goals..." />
          </div>
        ) : (
          <>
            <div className="stagger-children flex md:grid md:grid-cols-3 gap-6 mb-8 overflow-x-auto md:overflow-x-visible pb-4 md:pb-0 no-scrollbar snap-x snap-mandatory">
              <InfoCard
                icon={<LuBanknote />}
                label="Total saved"
                value={`₹${addThousandsSeparator(stats.saved)}`}
                color="bg-green-500"
              />
              <InfoCard
                icon={<LuFlag />}
                label="Total target"
                value={`₹${addThousandsSeparator(stats.target)}`}
                color="bg-purple-500"
                hint={`${goals.length} goal${goals.length === 1 ? "" : "s"}`}
              />
              <InfoCard
                icon={<LuTrophy />}
                label="Goals reached"
                value={`${stats.done} / ${goals.length}`}
                color="bg-orange-500"
              />
            </div>

            {goals.length === 0 ? (
              <EmptyState
                icon={<LuTarget />}
                title="No goals yet"
                message="Planning a trip, a new laptop or an emergency fund? Create a goal and track every rupee towards it."
                action={
                  <button
                    className="add-btn add-btn-fill"
                    onClick={() => setFormOpen(true)}
                  >
                    <LuPlus className="text-lg" /> Create your first goal
                  </button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {goals.map((g) => {
                  const pct = (g.savedAmount / g.targetAmount) * 100;
                  const done = g.savedAmount >= g.targetAmount;
                  const remaining = Math.max(0, g.targetAmount - g.savedAmount);
                  let daysLeft = null;
                  let perMonth = null;
                  if (g.deadline) {
                    daysLeft = Math.ceil((new Date(g.deadline) - new Date()) / DAY);
                    if (!done && daysLeft > 0) {
                      perMonth = remaining / Math.max(1, daysLeft / 30);
                    }
                  }
                  const last = g.contributions?.[g.contributions.length - 1];

                  return (
                    <div key={g._id} className="card group flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 shrink-0 rounded-2xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-2xl">
                            {g.icon || "🎯"}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                              {g.title}
                            </h3>
                            <div className="mt-1">
                              {done ? (
                                <span className="badge badge-green">Goal reached 🎉</span>
                              ) : daysLeft !== null && daysLeft <= 0 ? (
                                <span className="badge badge-red">Past target date</span>
                              ) : daysLeft !== null ? (
                                <span className="badge badge-purple">
                                  <LuCalendarClock /> {daysLeft}d left
                                </span>
                              ) : (
                                <span className="badge badge-gray">No deadline</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <button
                            className="icon-btn"
                            aria-label={`Edit ${g.title}`}
                            onClick={() => {
                              setEditing(g);
                              setFormOpen(true);
                            }}
                          >
                            <LuPencil />
                          </button>
                          <button
                            className="icon-btn icon-btn-danger"
                            aria-label={`Delete ${g.title}`}
                            onClick={() => handleDelete(g)}
                          >
                            <LuTrash2 />
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-baseline justify-between mb-2">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <span className="text-xl font-extrabold text-gray-900 dark:text-white">
                              ₹{addThousandsSeparator(g.savedAmount)}
                            </span>{" "}
                            of ₹{addThousandsSeparator(g.targetAmount)}
                          </p>
                          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                            {Math.min(100, Math.round(pct))}%
                          </span>
                        </div>
                        <ProgressBar
                          percent={pct}
                          barClass={done ? "bg-emerald-500" : "bg-purple-500"}
                        />
                      </div>

                      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 min-h-[2.5rem]">
                        {g.deadline && (
                          <p>Target date: {formatShortDate(g.deadline)}</p>
                        )}
                        {perMonth !== null && (
                          <p className="font-medium text-gray-700 dark:text-gray-200">
                            Save ~₹{addThousandsSeparator(Math.ceil(perMonth))}/month to stay on track
                          </p>
                        )}
                        {last && !g.deadline && (
                          <p>
                            Last: {last.amount > 0 ? "+" : "−"}₹
                            {addThousandsSeparator(Math.abs(last.amount))} on{" "}
                            {formatShortDate(last.date)}
                          </p>
                        )}
                      </div>

                      <button
                        className="card-btn justify-center !py-2.5 mt-auto"
                        onClick={() => setContributing(g)}
                      >
                        <LuHandCoins className="text-base" /> Add / withdraw money
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        <Modal
          isOpen={formOpen}
          onClose={closeForm}
          title={editing ? "Edit goal" : "New savings goal"}
        >
          <GoalForm
            key={editing?._id || "new"}
            editingData={editing}
            onSave={handleSaveGoal}
            onCancel={closeForm}
          />
        </Modal>

        <Modal
          isOpen={!!contributing}
          onClose={() => setContributing(null)}
          title="Update savings"
        >
          {contributing && (
            <ContributeForm
              goal={contributing}
              onSave={handleContribute}
              onCancel={() => setContributing(null)}
            />
          )}
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default Goals;
