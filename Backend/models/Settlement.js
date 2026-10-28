const mongoose = require("mongoose");

const SettlementSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: "ExpenseGroup", required: true, index: true },
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fromName: { type: String, required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    toName: { type: String, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    note: { type: String, trim: true, maxlength: 300, default: "" },
    date: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

SettlementSchema.index({ group: 1, date: -1 });
module.exports = mongoose.model("Settlement", SettlementSchema);
