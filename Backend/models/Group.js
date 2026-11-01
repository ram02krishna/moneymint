const mongoose = require("mongoose");

const GroupMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },
    role: {
      type: String,
      enum: ["admin", "member"],
      default: "member",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

const GroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      enum: [
        "Trip",
        "Home",
        "Couple",
        "Roommates",
        "Office",
        "Friends",
        "Project",
        "Other",
      ],
      default: "Other",
    },
    icon: {
      type: String,
      default: "👥",
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [GroupMemberSchema],
    simplifyDebts: {
      type: Boolean,
      default: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

GroupSchema.index({ creator: 1 });
GroupSchema.index({ "members.user": 1 });
GroupSchema.index({ "members.email": 1 });

module.exports = mongoose.model("Group", GroupSchema);

