const mongoose = require("mongoose");

const SettlementPartySchema = new mongoose.Schema(
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
  },
  { _id: false },
);

const SettlementSchema = new mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },
    payer: {
      type: SettlementPartySchema,
      required: true,
    },
    payee: {
      type: SettlementPartySchema,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Bank Transfer", "PayPal", "Card", "Other"],
      default: "Cash",
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

SettlementSchema.index({ group: 1, date: -1 });
SettlementSchema.index({ "payer.user": 1 });
SettlementSchema.index({ "payee.user": 1 });
SettlementSchema.index({ createdBy: 1 });

module.exports = mongoose.model("Settlement", SettlementSchema);

