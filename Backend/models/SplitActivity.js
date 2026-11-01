const mongoose = require("mongoose");

const SplitActivitySchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "expense_added",
        "expense_updated",
        "expense_deleted",
        "settlement_added",
        "settlement_deleted",
        "group_created",
        "group_updated",
        "group_deleted",
        "member_added",
        "member_removed",
        "friend_added",
        "friend_removed",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    amount: {
      type: Number,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

SplitActivitySchema.index({ user: 1, createdAt: -1 });
SplitActivitySchema.index({ group: 1, createdAt: -1 });

module.exports = mongoose.model("SplitActivity", SplitActivitySchema);

