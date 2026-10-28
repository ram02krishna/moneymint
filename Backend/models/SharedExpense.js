const mongoose = require("mongoose");

const SplitParticipantSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    percentage: { type: Number, min: 0 },
    shares: { type: Number, min: 0 },
  },
  { _id: false },
);

const SharedExpenseSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: "ExpenseGroup", required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    amount: { type: Number, required: true, min: 0.01 },
    category: { type: String, trim: true, default: "General", maxlength: 60 },
    date: { type: Date, default: Date.now },
    note: { type: String, trim: true, maxlength: 500, default: "" },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    paidByName: { type: String, required: true },
    splitType: { type: String, enum: ["equal", "exact", "percentage", "shares"], required: true },
    participants: { type: [SplitParticipantSchema], validate: [(v) => v.length > 0, "At least one participant is required"] },
  },
  { timestamps: true },
);

SharedExpenseSchema.index({ group: 1, date: -1 });
SharedExpenseSchema.index({ createdBy: 1, date: -1 });
module.exports = mongoose.model("SharedExpense", SharedExpenseSchema);
