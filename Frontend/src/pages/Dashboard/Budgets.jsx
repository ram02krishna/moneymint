import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  LuPlus,
  LuPencil,
  LuTrash2,
  LuRepeat,
  LuPiggyBank,
  LuWallet,
  LuTrendingDown,
  LuCalendarDays,
} from "react-icons/lu";
import DashboardLayout from "../../components/layouts/DashboardLayout";
import Modal from "../../components/layouts/Modal";
import InfoCard from "../../components/Cards/InfoCard";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import ProgressBar from "../../components/ui/ProgressBar";
import LoadingSpinner from "../../components/LoadingSpinner";
import BudgetForm from "../../components/Budget/BudgetForm";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPath";
import { useToast } from "../../hooks/useToast";
import {
  addThousandsSeparator,
  capitalize,
  formatShortDate,
  getErrorMessage,
  getProgressTone,
} from "../../utils/helper";

const DAY = 24 * 60 * 60 * 1000;

// where a budget sits in time relative to today
const getPhase = (b) => {
  const now = new Date();
  const start = new Date(b.startDate);
  const end = new Date(b.endDate);
  end.setHours(23, 59, 59, 999);
  if (now < start) return "upcoming";
  if (now > end) return "ended";
  return "active";
};

const daysLeft = (b) => {
  const end = new Date(b.endDate);
  end.setHours(23, 59, 59, 999);
  return Math.max(0, Math.ceil((end - new Date()) / DAY));
};

const TABS = [
  { id: "active", label: "Active" },
  { id: "upcoming", label: "Upcoming" },
  { id: "ended", label: "Ended" },
  { id: "all", label: "All" },
];

const Budgets = () => {
  const toast = useToast();
  const location = useLocation();
  const [report, setReport] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("active");
  const [modalOpen, setModalOpen] = useState(() => !!location.state?.openAdd);
  const [editing, setEditing] = useState(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await axiosInstance.get(API_PATHS.BUDGET.GET_REPORT);
        if (cancelled) return;
        const data = res.data?.data;
        setReport(data?.report || []);
        setExpenseCategories(
          Array.from(new Set((data?.expenseDistribution || []).map((d) => d.category))),
        );
      } catch (error) {
        if (!cancelled) toast.error(getErrorMessage(error, "Could not load budgets"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, toast]);

  const enriched = useMemo(
    () =>
      report.map((b) => {
        const pct = b.budgetAmount > 0 ? (b.actualSpent / b.budgetAmount) * 100 : 0;
        return { ...b, pct, phase: getPhase(b) };
      }),
    [report],
  );

  const counts = useMemo(() => {
    const c = { active: 0, upcoming: 0, ended: 0, all: enriched.length };
    enriched.forEach((b) => (c[b.phase] += 1));
    return c;
  }, [enriched]);

  const visible = useMemo(
    () => (tab === "all" ? enriched : enriched.filter((b) => b.phase === tab)),
    [enriched, tab],
  );

  const totals = useMemo(() => {
    const budget = visible.reduce((s, b) => s + b.budgetAmount, 0);
    const spent = visible.reduce((s, b) => s + b.actualSpent, 0);
    return { budget, spent, remaining: budget - spent };
  }, [visible]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSave = async (payload) => {
    try {
      if (editing) {
        await axiosInstance.put(API_PATHS.BUDGET.UPDATE_BUDGET(editing._id), payload);
        toast.success("Budget updated");
      } else {
        await axiosInstance.post(API_PATHS.BUDGET.ADD_BUDGET, payload);
        toast.success("Budget created");
      }
      closeModal();
      setReloadKey((k) => k + 1);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save budget"));
    }
  };

  const handleDelete = async (b) => {
    if (!window.confirm(`Delete the ${b.category} budget?`)) return;
    try {
      await axiosInstance.delete(API_PATHS.BUDGET.DELETE_BUDGET(b._id));
      setReport((prev) => prev.filter((x) => x._id !== b._id));
      toast.success("Budget deleted");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not delete budget"));
    }
  };

  return (
    <DashboardLayout activeMenu="Budgets">
      <div className="w-full max-w-[1400px] mx-auto">
        <PageHeader
          title="Budgets"
          subtitle="Set spending limits per category and track them against your real expenses."
        >
          <button className="add-btn add-btn-fill" onClick={openCreate}>
            <LuPlus className="text-lg" /> New budget
          </button>
        </PageHeader>

        {loading ? (
          <div className="py-24 flex justify-center">
            <LoadingSpinner text="Loading budgets..." />
          </div>
        ) : (
          <>
            <div className="stagger-children flex md:grid md:grid-cols-3 gap-6 mb-8 overflow-x-auto md:overflow-x-visible pb-4 md:pb-0 no-scrollbar snap-x snap-mandatory">
              <InfoCard
                icon={<LuWallet />}
                label="Total budgeted"
                value={`₹${addThousandsSeparator(totals.budget)}`}
                color="bg-purple-500"
                hint={`${visible.length} budget${visible.length === 1 ? "" : "s"} in view`}
              />
              <InfoCard
                icon={<LuTrendingDown />}
                label="Spent so far"
                value={`₹${addThousandsSeparator(totals.spent)}`}
                color="bg-red-500"
              />
              <InfoCard
                icon={<LuPiggyBank />}
                label={totals.remaining >= 0 ? "Remaining" : "Over budget by"}
                value={`₹${addThousandsSeparator(Math.abs(totals.remaining))}`}
                color={totals.remaining >= 0 ? "bg-green-500" : "bg-orange-500"}
              />
            </div>

            <div className="inline-flex flex-wrap gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 border border-transparent dark:border-gray-700 mb-6">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`tab-pill ${tab === t.id ? "tab-pill-active" : ""}`}
                >
                  {t.label}
                  <span className="ml-1.5 text-xs opacity-60">{counts[t.id]}</span>
                </button>
              ))}
            </div>

            {visible.length === 0 ? (
              <EmptyState
                icon={<LuPiggyBank />}
                title={
                  counts.all === 0 ? "No budgets yet" : `No ${tab} budgets`
                }
                message={
                  counts.all === 0
                    ? "Create your first budget to see how your spending compares to your plan."
                    : "Try another tab, or create a new budget for this period."
                }
                action={
                  <button className="add-btn add-btn-fill" onClick={openCreate}>
                    <LuPlus className="text-lg" /> New budget
                  </button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {visible.map((b) => {
                  const tone = getProgressTone(b.pct);
                  const over = b.actualSpent > b.budgetAmount;
                  return (
                    <div key={b._id} className="card group flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                            {capitalize(b.category)}
                          </h3>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {b.phase === "active" && (
                              <span className="badge badge-green">Active</span>
                            )}
                            {b.phase === "upcoming" && (
                              <span className="badge badge-purple">Upcoming</span>
                            )}
                            {b.phase === "ended" && (
                              <span className="badge badge-gray">Ended</span>
                            )}
                            {over && <span className="badge badge-red">Over budget</span>}
                            {!over && b.pct >= 75 && b.phase === "active" && (
                              <span className="badge badge-amber">Near limit</span>
                            )}
                            {b.isRecurring && (
                              <span className="badge badge-purple">
                                <LuRepeat /> {capitalize(b.recurrenceType)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <button
                            className="icon-btn"
                            onClick={() => openEdit(b)}
                            aria-label={`Edit ${b.category} budget`}
                          >
                            <LuPencil />
                          </button>
                          <button
                            className="icon-btn icon-btn-danger"
                            onClick={() => handleDelete(b)}
                            aria-label={`Delete ${b.category} budget`}
                          >
                            <LuTrash2 />
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-baseline justify-between mb-2">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            <span className="text-xl font-extrabold text-gray-900 dark:text-white">
                              ₹{addThousandsSeparator(b.actualSpent)}
                            </span>{" "}
                            of ₹{addThousandsSeparator(b.budgetAmount)}
                          </p>
                          <span className={`text-sm font-bold ${tone.text}`}>
                            {Math.round(b.pct)}%
                          </span>
                        </div>
                        <ProgressBar percent={b.pct} />
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <span className="flex items-center gap-1.5">
                          <LuCalendarDays />
                          {formatShortDate(b.startDate)} – {formatShortDate(b.endDate)}
                        </span>
                        <span className={`font-semibold ${over ? "text-red-500" : "text-gray-700 dark:text-gray-200"}`}>
                          {over
                            ? `₹${addThousandsSeparator(Math.abs(b.remaining))} over`
                            : b.phase === "active"
                              ? `₹${addThousandsSeparator(b.remaining)} left · ${daysLeft(b)}d`
                              : `₹${addThousandsSeparator(b.remaining)} left`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        <Modal
          isOpen={modalOpen}
          onClose={closeModal}
          title={editing ? "Edit budget" : "New budget"}
        >
          <BudgetForm
            key={editing?._id || "new"}
            editingData={editing}
            categories={expenseCategories}
            onSave={handleSave}
            onCancel={closeModal}
          />
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default Budgets;
