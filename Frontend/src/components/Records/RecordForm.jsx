import { useState } from "react";
import { LuIndianRupee } from "react-icons/lu";
import ModernDatePicker from "../Inputs/ModernDatePicker";
import { toInputDate } from "../../utils/helper";

const emptyForm = () => ({
  title: "",
  source: "",
  category: "",
  amount: "",
  date: toInputDate(),
  detail: "",
  icon: "",
});

const fromRecord = (config, record) => ({
  title: record.title || "",
  source: record.source || "",
  category: record.category || "",
  amount: record.amount ?? "",
  date: toInputDate(record.date),
  detail: record[config.detailField] || "",
  icon: record.icon || "",
});

/**
 * Add / edit form for an income or an expense record (see RECORD_TYPES for what differs).
 * onSave receives the payload and may throw to keep the dialog open.
 */
const RecordForm = ({ config, onSave, onCancel, editingData = null }) => {
  const [form, setForm] = useState(() => (editingData ? fromRecord(config, editingData) : emptyForm()));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = `${config.label} title is required`;
    if (config.hasSource && !form.source.trim()) next.source = "Source is required";
    if (config.hasSource && !form.category.trim()) next.category = "Category is required";
    if (!form.amount || Number(form.amount) <= 0) next.amount = "Please enter a valid amount";
    if (!form.date) next.date = "Date is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    const payload = {
      _id: editingData?._id,
      title: form.title.trim(),
      category: form.category.trim(),
      amount: Number(form.amount),
      date: form.date,
      icon: form.icon,
      [config.detailField]: form.detail.trim(),
      ...(config.hasSource && { source: form.source.trim() }),
    };

    setSaving(true);
    try {
      await onSave(payload);
    } catch {
      // the page already showed an error toast; keep the dialog open so nothing typed is lost
    } finally {
      setSaving(false);
    }
  };

  const fieldId = (name) => `${config.type}-${name}`;

  return (
    <form onSubmit={submit} noValidate>
      <div className={`grid grid-cols-1 gap-x-4 ${config.hasSource ? "md:grid-cols-2" : ""}`}>
        <div>
          <label className="field-label" htmlFor={fieldId("title")}>
            {config.titleLabel}
          </label>
          <input
            id={fieldId("title")}
            className="input-box"
            placeholder={config.titlePlaceholder}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
          {errors.title && <p className="field-error">{errors.title}</p>}
        </div>

        {config.hasSource && (
          <div>
            <label className="field-label" htmlFor={fieldId("source")}>
              Source
            </label>
            <input
              id={fieldId("source")}
              className="input-box"
              placeholder="e.g., Company, Client"
              value={form.source}
              onChange={(e) => set("source", e.target.value)}
            />
            {errors.source && <p className="field-error">{errors.source}</p>}
          </div>
        )}
      </div>

      <label className="field-label" htmlFor={fieldId("category")}>
        Category
      </label>
      <input
        id={fieldId("category")}
        className="input-box !mb-2"
        placeholder={`e.g., ${config.categories.slice(0, 2).join(", ")}`}
        value={form.category}
        onChange={(e) => set("category", e.target.value)}
      />
      <div className="flex flex-wrap gap-1.5 mb-4">
        {config.categories.map((cat) => {
          const selected = form.category.trim().toLowerCase() === cat.toLowerCase();
          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                set("category", cat);
                if (config.hasSource && !form.source) set("source", cat);
              }}
              aria-pressed={selected}
              className={`px-3 py-1 text-xs rounded-lg border transition-colors cursor-pointer ${
                selected
                  ? "bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-700 dark:text-purple-300 font-semibold"
                  : "bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>
      {errors.category && <p className="field-error">{errors.category}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
        <div>
          <label className="field-label" htmlFor={fieldId("amount")}>
            Amount
          </label>
          <div className="relative">
            <LuIndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 mt-0.5 text-gray-400 pointer-events-none" aria-hidden="true" />
            <input
              id={fieldId("amount")}
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="input-box !pl-9"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
            />
          </div>
          {errors.amount && <p className="field-error">{errors.amount}</p>}
        </div>

        <div className="mt-2 md:mt-0">
          <ModernDatePicker label="Date" value={form.date} onChange={(e) => set("date", e.target.value)} error={errors.date} />
        </div>
      </div>

      <label className="field-label mt-4 block" htmlFor={fieldId("detail")}>
        {config.detailLabel} <span className="font-normal text-gray-400">(optional)</span>
      </label>
      <textarea
        id={fieldId("detail")}
        rows={3}
        className="input-box resize-none"
        placeholder={`Add a ${config.detailLabel.toLowerCase()} about this ${config.singular}`}
        value={form.detail}
        onChange={(e) => set("detail", e.target.value)}
      />

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary !w-auto !my-0" disabled={saving}>
          {saving ? "Saving..." : editingData ? `Update ${config.label}` : `Add ${config.label}`}
        </button>
      </div>
    </form>
  );
};

export default RecordForm;
