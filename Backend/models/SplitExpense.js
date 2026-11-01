const mongoose = require("mongoose");

const PayerSchema = new mongoose.Schema(
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
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: true },
);

const ParticipantSchema = new mongoose.Schema(
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
    shareAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    percentage: {
      type: Number,
      default: null,
    },
    shares: {
      type: Number,
      default: null,
    },
  },
  { _id: true },
);

const LineItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    assignedTo: [
      {
        type: String, // member user ID or name
      },
    ],
  },
  { _id: true },
);

const SplitExpenseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    currency: {
      type: String,
      default: "INR",
    },
    category: {
      type: String,
      default: "General",
    },
    date: {
      type: Date,
      default: Date.now,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },
    paidBy: {
      type: [PayerSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: "At least one payer is required",
      },
    },
    splitMethod: {
      type: String,
      enum: ["equal", "exact", "percentage", "shares", "itemized"],
      default: "equal",
    },
    participants: {
      type: [ParticipantSchema],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: "At least one participant is required",
      },
    },
    itemDetails: [LineItemSchema],
    tax: {
      type: Number,
      default: 0,
    },
    tip: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    receiptUrl: {
      type: String,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

SplitExpenseSchema.index({ group: 1, date: -1 });
SplitExpenseSchema.index({ createdBy: 1, date: -1 });
SplitExpenseSchema.index({ "paidBy.user": 1 });
SplitExpenseSchema.index({ "participants.user": 1 });

module.exports = mongoose.model("SplitExpense", SplitExpenseSchema);

