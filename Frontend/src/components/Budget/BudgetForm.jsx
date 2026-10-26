import React, { useState } from "react";
import { LuRepeat } from "react-icons/lu";
import { toInputDate } from "../../utils/helper";

const DEFAULT_CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Rent",
  "Bills",
  "Entertainment",
  "Health",
  "Education",
  "Travel",
  "Other",
];

const monthRange = () => {
  const now = new Date();
  return {
    startDate: toInputDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: toInputDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
};

const next30Range = () => {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 29);
  return { startDate: toInputDate(now), endDate: toInputDate(end) };
};

const BudgetForm = ({ onSave, onCancel, editingData = null, categories = [] }) => {
  const [form, setForm] = useState(() =>
    editingData
      ? {
          category: editingData.category || "",
          amount: editingData.amount ?? "",
          startDate: toInputDate(editingData.startDate),
          endDate: toInputDate(editingData.endDate),
          isRecurring: !!editingData.isRecurring,
          recurrenceType: editingData.recurrenceType || "monthly",
        }
      : {
          category: "",
          amount: "",
          ...monthRange(),
          isRecurring: false,
          recurrenceType: "monthly",
        },
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const suggestions = Array.from(
    new Set([...categories, ...DEFAULT_CATEGORIES].map((c) => c.trim())),
  );

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.category.trim()) e.category = "Category is required";
    if (!form.amount || Number(form.amount) <= 0)
      e.amount = "Enter an amount greater than 0";
    if (!form.startDate) e.startDate = "Start date is required";
    if (!form.endDate) e.endDate = "End date is required";
    if (form.startDate && form.endDate && form.startDate > form.endDate)
      e.endDate = "End date must be on or after the start date";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        category: form.category.trim(),
        amount: Number(form.amount),
        startDate: form.startDate,
        endDate: form.endDate,
        isRecurring: form.isRecurring,
      };
      if (form.isRecurring) payload.recurrenceType = form.recurrenceType;
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <label className="field-label" htmlFor="b-category">
        Category
      </label>
      <input
        id="b-category"
        list="budget-categories"
        className="input-box"
        placeholder="e.g. Food"
        value={form.category}
        onChange={(e) => set("category", e.target.value)}
      />
      <datalist id="budget-categories">
        {suggestions.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      {errors.category && <p className="field-error">{errors.category}</p>}

      <label className="field-label" htmlFor="b-amount">
        Budget amount (₹)
      </label>
      <input
        id="b-amount"
        type="number"
        min="0"
        step="any"
        className="input-box"
        placeholder="5000"
        value={form.amount}
        onChange={(e) => set("amount", e.target.value)}
      />
      {errors.amount && <p className="field-error">{errors.amount}</p>}

      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="field-label mr-1">Period</span>
        <button
          type="button"
          className="card-btn"
          onClick={() => setForm((p) => ({ ...p, ...monthRange() }))}
        >
          This month
        </button>
        <button
          type="button"
          className="card-btn"
          onClick={() => setForm((p) => ({ ...p, ...next30Range() }))}
        >
          Next 30 days
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <div>
          <label className="field-label" htmlFor="b-start">
            Start date
          </label>
          <input
            id="b-start"
            type="date"
            className="input-box"
            value={form.startDate}
            onChange={(e) => set("startDate", e.target.value)}
          />
          {errors.startDate && <p className="field-error">{errors.startDate}</p>}
        </div>
        <div>
          <label className="field-label" htmlFor="b-end">
            End date
          </label>
          <input
            id="b-end"
            type="date"
            className="input-box"
            value={form.endDate}
            onChange={(e) => set("endDate", e.target.value)}
          />
          {errors.endDate && <p className="field-error">{errors.endDate}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700">
        <label className="flex items-center gap-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 accent-purple-600"
            checked={form.isRecurring}
            onChange={(e) => set("isRecurring", e.target.checked)}
          />
          <LuRepeat className="text-purple-500" /> Recurring budget
        </label>
        {form.isRecurring && (
          <select
            className="text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 px-3 py-2 outline-none focus:border-purple-500"
            value={form.recurrenceType}
            onChange={(e) => set("recurrenceType", e.target.value)}
            aria-label="Recurrence"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="annually">Annually</option>
          </select>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" className="card-btn !px-5 !py-3" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="btn-primary !w-auto !my-0 disabled:opacity-60"
        >
          {saving ? "Saving..." : editingData ? "Update budget" : "Create budget"}
        </button>
      </div>
    </form>
  );
};

export default BudgetForm;
