const mongoose = require("mongoose");

const ExpenseSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    icon: { type: String },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    date: { type: Date, default: Date.now },
    description: { type: String },
    notes: { type: String },
  },
  { timestamps: true },
);

ExpenseSchema.index({ user: 1, date: -1 });
ExpenseSchema.index({ user: 1 });
ExpenseSchema.index({ date: -1 });

module.exports = mongoose.model("Expense", ExpenseSchema);
