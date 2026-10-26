import React, { useState } from "react";
import { toInputDate } from "../../utils/helper";

const ICONS = ["🎯", "🏠", "🚗", "✈️", "💻", "📱", "🎓", "💍", "🏖️", "🛡️", "🎁", "💰"];

const GoalForm = ({ onSave, onCancel, editingData = null }) => {
  const [form, setForm] = useState(() => ({
    title: editingData?.title || "",
    icon: editingData?.icon || "🎯",
    targetAmount: editingData?.targetAmount ?? "",
    deadline: editingData?.deadline ? toInputDate(editingData.deadline) : "",
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Give your goal a name";
    if (!form.targetAmount || Number(form.targetAmount) < 1)
      e.targetAmount = "Target must be at least ₹1";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        icon: form.icon,
        targetAmount: Number(form.targetAmount),
      };
      if (form.deadline) payload.deadline = form.deadline;
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <p className="field-label mb-2">Pick an icon</p>
      <div className="flex flex-wrap gap-2 mb-5">
        {ICONS.map((ic) => (
          <button
            type="button"
            key={ic}
            onClick={() => set("icon", ic)}
            aria-label={`Icon ${ic}`}
            aria-pressed={form.icon === ic}
            className={`w-11 h-11 text-xl rounded-xl border transition-all cursor-pointer ${
              form.icon === ic
                ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30 scale-110 shadow-md"
                : "border-gray-200 dark:border-gray-600 hover:border-purple-300"
            }`}
          >
            {ic}
          </button>
        ))}
      </div>

      <label className="field-label" htmlFor="g-title">
        Goal name
      </label>
      <input
        id="g-title"
        className="input-box"
        placeholder="e.g. Emergency fund"
        maxLength={80}
        value={form.title}
        onChange={(e) => set("title", e.target.value)}
      />
      {errors.title && <p className="field-error">{errors.title}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <div>
          <label className="field-label" htmlFor="g-target">
            Target amount (₹)
          </label>
          <input
            id="g-target"
            type="number"
            min="1"
            step="any"
            className="input-box"
            placeholder="100000"
            value={form.targetAmount}
            onChange={(e) => set("targetAmount", e.target.value)}
          />
          {errors.targetAmount && (
            <p className="field-error">{errors.targetAmount}</p>
          )}
        </div>
        <div>
          <label className="field-label" htmlFor="g-deadline">
            Target date <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <input
            id="g-deadline"
            type="date"
            className="input-box"
            min={toInputDate()}
            value={form.deadline}
            onChange={(e) => set("deadline", e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-2">
        <button type="button" className="card-btn !px-5 !py-3" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="btn-primary !w-auto !my-0 disabled:opacity-60"
        >
          {saving ? "Saving..." : editingData ? "Update goal" : "Create goal"}
        </button>
      </div>
    </form>
  );
};

export default GoalForm;
