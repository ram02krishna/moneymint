import React, { useState } from "react";
import { motion } from "framer-motion";
import { LuIndianRupee, LuTag, LuFileText } from "react-icons/lu";
import EmojiPickerPopup from "../layouts/EmojiPickerPopup";
import ModernDatePicker from "../Inputs/ModernDatePicker";

const getTodayDateString = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatDateForInput = (dateVal) => {
  if (!dateVal) return getTodayDateString();
  if (typeof dateVal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
    return dateVal;
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return getTodayDateString();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const AddExpenseForm = ({ onAddExpense, closeModal, editingData = null }) => {
  const [expense, setExpense] = useState({
    title: "",
    category: "",
    amount: "",
    date: getTodayDateString(),
    description: "",
    icon: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  React.useEffect(() => {
    if (editingData) {
      setExpense({
        title: editingData.title || "",
        category: editingData.category || "",
        amount: editingData.amount || "",
        date: formatDateForInput(editingData.date),
        description: editingData.description || "",
        icon: editingData.icon || "",
      });
    } else {
      setExpense({
        title: "",
        category: "",
        amount: "",
        date: getTodayDateString(),
        description: "",
        icon: "",
      });
    }
  }, [editingData]);

  const handleChange = (key, value) => {
    setExpense((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!expense.title.trim()) newErrors.title = "Expense title is required";
    if (!expense.amount || parseFloat(expense.amount) <= 0)
      newErrors.amount = "Please enter a valid amount";
    if (!expense.date) newErrors.date = "Date is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Pass updated data including ID if editing
      await onAddExpense?.({ ...expense, _id: editingData?._id });

      if (!editingData) {
        setExpense({
          title: "",
          category: "",
          amount: "",
          date: getTodayDateString(),
          description: "",
          icon: "",
        });
      }

      setErrors({});
    } catch (error) {
      console.error("Error adding expense:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setExpense({
      title: "",
      category: "",
      amount: "",
      date: getTodayDateString(),
      description: "",
      icon: "",
    });
    setErrors({});

    if (closeModal) {
      closeModal();
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
          {/* TITLE + CATEGORY */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Expense Title */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Expense Title <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <LuTag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />

                <input
                  type="text"
                  placeholder="e.g., Grocery Shopping"
                  value={expense.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  className={`
                    w-full pl-10 pr-4 py-2.5 rounded-xl
                    bg-gray-100 dark:bg-gray-800
                    text-gray-900 dark:text-gray-100
                    placeholder-gray-400 dark:placeholder-gray-500
                    border
                    ${
                      errors.title
                        ? "border-red-400"
                        : "border-gray-300 dark:border-gray-700"
                    }
                    focus:outline-none focus:ring-2
                    focus:ring-red-300 dark:focus:ring-red-800
                  `}
                />
              </div>

              {errors.title && (
                <p className="text-xs text-red-500">{errors.title}</p>
              )}
            </div>

            {/* Category + Emoji */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Category
              </label>

              <div className="flex gap-3">
                <div className="relative flex-1">
                  <LuFileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />

                  <input
                    type="text"
                    placeholder="e.g., Food, Travel"
                    value={expense.category}
                    onChange={(e) => handleChange("category", e.target.value)}
                    className="
                      w-full pl-10 pr-4 py-2.5 rounded-xl
                      bg-gray-100 dark:bg-gray-800
                      text-gray-900 dark:text-gray-100
                      placeholder-gray-400 dark:placeholder-gray-500
                      border border-gray-300 dark:border-gray-700
                      focus:outline-none focus:ring-2
                      focus:ring-red-300 dark:focus:ring-red-800
                    "
                  />
                </div>

                <EmojiPickerPopup
                  icon={expense.icon}
                  onSelect={(icon) => handleChange("icon", icon)}
                />
              </div>
            </div>
          </div>

          {/* AMOUNT + DATE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Amount */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                Amount <span className="text-red-500">*</span>
              </label>

              <div className="relative">
                <LuIndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />

                <input
                  type="number"
                  placeholder="0.00"
                  value={expense.amount}
                  onChange={(e) => handleChange("amount", e.target.value)}
                  className={`
                    w-full pl-10 pr-4 py-2.5 rounded-xl
                    bg-gray-100 dark:bg-gray-800
                    text-gray-900 dark:text-gray-100
                    placeholder-gray-400 dark:placeholder-gray-500
                    border
                    ${
                      errors.amount
                        ? "border-red-400"
                        : "border-gray-300 dark:border-gray-700"
                    }
                    focus:outline-none focus:ring-2
                    focus:ring-red-300 dark:focus:ring-red-800
                  `}
                  min="0"
                  step="0.01"
                />
              </div>

              {errors.amount && (
                <p className="text-xs text-red-500">{errors.amount}</p>
              )}
            </div>

            {/* DATE PICKER */}
            <ModernDatePicker
              label="Date"
              value={expense.date}
              onChange={(e) => handleChange("date", e.target.value)}
              error={errors.date}
              colorTheme="red"
              inputClassName="py-2.5 h-11"
            />
          </div>

          {/* DESCRIPTION */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Description
            </label>

            <textarea
              rows={3}
              placeholder="Add notes about this expense (optional)"
              value={expense.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className="
                w-full px-4 py-3 rounded-xl
                bg-gray-100 dark:bg-gray-800
                text-gray-900 dark:text-gray-100
                placeholder-gray-400 dark:placeholder-gray-500
                border border-gray-300 dark:border-gray-700
                focus:outline-none focus:ring-2
                focus:ring-red-300 dark:focus:ring-red-800
                resize-none
              "
            />
          </div>

          {/* BUTTONS */}
          <div className="flex justify-end space-x-3">
            {/* Cancel */}
            <button
              type="button"
              onClick={handleCancel}
              className="
                py-3 px-6 rounded-xl font-semibold
                bg-gray-100 dark:bg-gray-700
                text-gray-700 dark:text-gray-300
                shadow-lg shadow-gray-200 dark:shadow-gray-900/30
                transition-all
              "
            >
              Cancel
            </button>

            {/* Add Expense (RED) */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="
                py-3 px-6 rounded-xl font-semibold text-white
                bg-gradient-to-r from-red-500 to-red-600
                hover:from-red-600 hover:to-red-700
                shadow-lg shadow-red-200 dark:shadow-red-900/40
                transition-all
                disabled:opacity-50
              "
            >
              {isSubmitting
                ? "Saving..."
                : editingData
                  ? "Update Expense"
                  : "Add Expense"}
            </button>
          </div>
        </form>
    </div>
  );
};

export default AddExpenseForm;
