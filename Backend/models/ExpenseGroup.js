const mongoose = require("mongoose");

const GroupMemberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ExpenseGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 300, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: { type: [GroupMemberSchema], validate: [(v) => v.length >= 1, "A group must have at least one member"] },
  },
  { timestamps: true },
);

ExpenseGroupSchema.index({ "members.user": 1, updatedAt: -1 });
module.exports = mongoose.model("ExpenseGroup", ExpenseGroupSchema);
