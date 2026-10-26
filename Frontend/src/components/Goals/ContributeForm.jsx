import React, { useState } from "react";
import { addThousandsSeparator } from "../../utils/helper";

const ContributeForm = ({ goal, onSave, onCancel }) => {
  const [mode, setMode] = useState("deposit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);

  const submit = async (ev) => {
    ev.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) return setError("Enter an amount greater than 0");
    if (mode === "withdraw" && value > goal.savedAmount)
      return setError(`You only have ₹${addThousandsSeparator(goal.savedAmount)} saved`);

    setSaving(true);
    try {
      const payload = { amount: mode === "withdraw" ? -value : value };
      if (note.trim()) payload.note = note.trim();
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl bg-purple-50 dark:bg-purple-900/20">
        <span className="text-3xl">{goal.icon}</span>
        <div className="min-w-0">
          <p className="font-bold text-gray-900 dark:text-white truncate">{goal.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            ₹{addThousandsSeparator(goal.savedAmount)} saved · ₹
            {addThousandsSeparator(remaining)} to go
          </p>
        </div>
      </div>

      <div className="inline-flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-700 mb-4">
        {[
          ["deposit", "Add money"],
          ["withdraw", "Withdraw"],
        ].map(([id, label]) => (
          <button
            type="button"
            key={id}
            onClick={() => {
              setMode(id);
              setError("");
            }}
            className={`tab-pill ${mode === id ? "tab-pill-active" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="field-label" htmlFor="c-amount">
        Amount (₹)
      </label>
      <input
        id="c-amount"
        type="number"
        min="0"
        step="any"
        autoFocus
        className="input-box"
        value={amount}
        onChange={(e) => {
          setAmount(e.target.value);
          setError("");
        }}
      />
      {mode === "deposit" && remaining > 0 && (
        <div className="flex gap-2 -mt-2 mb-4">
          <button
            type="button"
            className="card-btn"
            onClick={() => setAmount(String(remaining))}
          >
            Fill remaining
          </button>
        </div>
      )}
      {error && <p className="field-error">{error}</p>}

      <label className="field-label" htmlFor="c-note">
        Note <span className="font-normal text-gray-400">(optional)</span>
      </label>
      <input
        id="c-note"
        className="input-box"
        maxLength={200}
        placeholder="e.g. Diwali bonus"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <div className="flex justify-end gap-3 mt-2">
        <button type="button" className="card-btn !px-5 !py-3" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="btn-primary !w-auto !my-0 disabled:opacity-60"
        >
          {saving ? "Saving..." : mode === "deposit" ? "Add to goal" : "Withdraw"}
        </button>
      </div>
    </form>
  );
};

export default ContributeForm;
