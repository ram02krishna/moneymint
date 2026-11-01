import React from "react";
import {
  LuReceipt,
  LuCalendar,
  LuLayers,
  LuUsers,
  LuFileText,
  LuPencil,
  LuTrash2,
  LuCircleCheck,
} from "react-icons/lu";
import Modal from "../layouts/Modal";
import { formatCurrency, emojiFor } from "../../utils/splitHelper";

const ExpenseDetailModal = ({
  isOpen,
  onClose,
  expense,
  onEdit,
  onDelete,
}) => {
  if (!expense) return null;

  const formattedDate = expense.date
    ? new Date(expense.date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Expense Details">
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="p-5 rounded-2xl bg-linear-to-r from-purple-500/10 via-purple-500/5 to-transparent border border-purple-100 dark:border-purple-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-3xl shadow-sm">
              {emojiFor(expense.title)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {expense.title}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <LuCalendar className="text-purple-600" />
                  {formattedDate}
                </span>
                <span>•</span>
                <span className="badge badge-purple">{expense.category || "General"}</span>
                {expense.group && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300">
                      <LuUsers className="text-purple-600" />
                      {expense.group.name || "Group"}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
              Total Amount
            </p>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">
              {formatCurrency(expense.amount)}
            </p>
          </div>
        </div>

        {/* Paid By Section */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Paid by
          </h4>
          <div className="space-y-1.5">
            {(expense.paidBy || []).map((p, idx) => (
              <div
                key={idx}
                className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">
                    ✓
                  </span>
                  <div>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {p.name}
                    </span>
                    {p.email && (
                      <span className="text-xs text-gray-400 block">{p.email}</span>
                    )}
                  </div>
                </div>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(p.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Participants Breakdown Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Split Breakdown ({expense.participants?.length || 0} people)
            </h4>
            <span className="badge badge-purple text-[11px] capitalize">
              Split {expense.splitMethod}
            </span>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {(expense.participants || []).map((p, idx) => (
              <div
                key={idx}
                className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-between text-sm"
              >
                <div>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {p.name}
                  </span>
                  {p.percentage != null && (
                    <span className="text-xs text-gray-400 ml-2">({p.percentage}%)</span>
                  )}
                  {p.shares != null && (
                    <span className="text-xs text-gray-400 ml-2">({p.shares} shares)</span>
                  )}
                </div>
                <span className="font-bold text-gray-900 dark:text-white">
                  {formatCurrency(p.shareAmount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Itemized Line Items if present */}
        {expense.itemDetails && expense.itemDetails.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Itemized Items
            </h4>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-2 text-xs">
              {expense.itemDetails.map((it, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-200 dark:border-gray-700 last:border-0">
                  <div>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {it.name}
                    </span>
                    {it.assignedTo && it.assignedTo.length > 0 && (
                      <span className="text-gray-400 ml-2">
                        ({it.assignedTo.join(", ")})
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {formatCurrency(it.price)}
                  </span>
                </div>
              ))}
              {(expense.tax > 0 || expense.tip > 0) && (
                <div className="pt-2 flex justify-between text-gray-500">
                  <span>Tax: {formatCurrency(expense.tax || 0)}</span>
                  <span>Tip: {formatCurrency(expense.tip || 0)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {expense.notes && (
          <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700 flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300">
            <LuFileText className="text-purple-600 mt-0.5 text-sm shrink-0" />
            <p className="italic">{expense.notes}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(expense);
              }}
              className="card-btn flex items-center gap-1.5"
            >
              <LuPencil className="text-sm" /> Edit
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete expense "${expense.title}"?`)) {
                  onDelete(expense._id);
                  onClose();
                }
              }}
              className="card-btn hover:text-red-600 hover:border-red-200 flex items-center gap-1.5"
            >
              <LuTrash2 className="text-sm" /> Delete
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-secondary py-2 px-6"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ExpenseDetailModal;
