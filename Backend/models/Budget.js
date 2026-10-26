const mongoose = require("mongoose");

const BudgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurrenceType: {
      type: String,
      enum: ["monthly", "annually", "weekly", "daily", null],
      default: null,
    },
  },
  { timestamps: true },
);

BudgetSchema.index({ user: 1, startDate: 1, endDate: 1 });
BudgetSchema.index({ user: 1, category: 1, startDate: 1 });

module.exports = mongoose.model("Budget", BudgetSchema);
