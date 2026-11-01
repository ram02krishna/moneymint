const mongoose = require("mongoose");

const ContributionSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    note: { type: String, maxlength: 200 },
    date: { type: Date, default: Date.now },
  },
  { _id: true },
);

const GoalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true, maxlength: 255 },
    icon: { type: String, default: "🎯" },
    targetAmount: { type: Number, required: true, min: 1 },
    savedAmount: { type: Number, default: 0, min: 0 },
    deadline: { type: Date, default: null },
    contributions: [ContributionSchema],
  },
  { timestamps: true },
);

GoalSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Goal", GoalSchema);
