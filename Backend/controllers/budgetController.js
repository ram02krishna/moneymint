const Budget = require("../models/Budget");
const Income = require("../models/Income");
const Expense = require("../models/Expense");
const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { validateObjectId } = require("../utils/queryValidator");

const ALLOWED_FIELDS = ["category", "amount", "startDate", "endDate", "isRecurring", "recurrenceType"];

const sumFor = async (Model, match) => {
  const [row] = await Model.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: "$amount" } } }]);
  return row ? row.total : 0;
};

// Total of all budgets must stay within total income (the rule the app has always applied).
const assertWithinIncome = async (userId, amount, excludeId) => {
  const user = new mongoose.Types.ObjectId(userId);
  const budgetMatch = { user };
  if (excludeId) budgetMatch._id = { $ne: new mongoose.Types.ObjectId(excludeId) };

  const [totalIncome, otherBudgets] = await Promise.all([sumFor(Income, { user }), sumFor(Budget, budgetMatch)]);
  const total = otherBudgets + amount;

  if (total > totalIncome) {
    throw new AppError(`Total budget (${total}) cannot be more than total income (${totalIncome})`, 400);
  }
};

// create a budget
exports.createBudget = asyncHandler(async (req, res) => {
  const { category, startDate, endDate, isRecurring, recurrenceType } = req.body;
  const amount = Number(req.body.amount);

  await assertWithinIncome(req.user.id, amount);

  const budget = await Budget.create({
    user: req.user.id,
    category,
    amount,
    startDate,
    endDate,
    isRecurring: !!isRecurring,
    recurrenceType: isRecurring ? recurrenceType : null,
  });

  res.status(201).json({ status: "success", data: { budget } });
});

// get all budgets
exports.getBudgets = asyncHandler(async (req, res) => {
  let allBudgets = await Budget.find({ user: req.user.id }).sort({
    startDate: -1,
  });
  res.status(200).json({
    status: "success",
    results: allBudgets.length,
    data: {
      budgets: allBudgets,
    },
  });
});

// get one budget
exports.getBudget = asyncHandler(async (req, res, next) => {
  let bId = validateObjectId(req.params.id, "Budget ID");
  let uId = validateObjectId(req.user.id, "User ID");

  let myBudget = await Budget.findOne({ _id: bId, user: uId });

  if (!myBudget) {
    return next(new AppError("Cannot find budget", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      budget: myBudget,
    },
  });
});

// update budget (only whitelisted fields; the owner can never be changed)
exports.updateBudget = asyncHandler(async (req, res, next) => {
  const bId = validateObjectId(req.params.id, "Budget ID");
  const uId = validateObjectId(req.user.id, "User ID");

  const update = {};
  ALLOWED_FIELDS.forEach((field) => {
    if (req.body[field] !== undefined) update[field] = req.body[field];
  });
  if (!update.isRecurring) update.recurrenceType = null;

  if (update.amount !== undefined) {
    update.amount = Number(update.amount);
    await assertWithinIncome(req.user.id, update.amount, bId);
  }

  const budget = await Budget.findOneAndUpdate({ _id: bId, user: uId }, update, {
    new: true,
    runValidators: true,
  });
  if (!budget) return next(new AppError("Cannot find budget to update", 404));

  res.status(200).json({ status: "success", data: { budget } });
});

// delete budget
exports.deleteBudget = asyncHandler(async (req, res, next) => {
  const deleted = await Budget.findOneAndDelete({
    _id: validateObjectId(req.params.id, "Budget ID"),
    user: validateObjectId(req.user.id, "User ID"),
  });
  if (!deleted) return next(new AppError("Cannot find budget to delete", 404));
  res.status(204).end();
});

// compare budget and actual expenses
exports.getBudgetVsActual = asyncHandler(async (req, res) => {
  let uId = new mongoose.Types.ObjectId(req.user.id);
  let { startDate, endDate } = req.query;

  let myBudgets = await Budget.find({ user: uId })
    .sort({ startDate: -1 })
    .lean();

  if (!myBudgets || myBudgets.length === 0) {
    return res.status(200).json({
      status: "success",
      results: 0,
      data: { report: [], totalExpenses: 0, expenseDistribution: [] },
    });
  }

  let minDate = startDate ? new Date(startDate) : new Date(8640000000000000);
  if (startDate) {
    minDate.setHours(0, 0, 0, 0);
  } else {
    for (let i = 0; i < myBudgets.length; i++) {
      let bDate = new Date(myBudgets[i].startDate);
      if (bDate < minDate) minDate = bDate;
    }
  }

  let maxDate = endDate ? new Date(endDate) : new Date(-8640000000000000);
  if (!endDate) {
    for (let i = 0; i < myBudgets.length; i++) {
      let bDate = new Date(myBudgets[i].endDate);
      if (bDate > maxDate) maxDate = bDate;
    }
  }
  maxDate.setHours(23, 59, 59, 999);

  let myExpenses = await Expense.find({
    user: uId,
    date: { $gte: minDate, $lte: maxDate },
  })
    .select("amount category title date")
    .lean();

  let totalExp = 0;
  for (let i = 0; i < myExpenses.length; i++) {
    totalExp += myExpenses[i].amount;
  }

  let expDistMap = {};
  for (let i = 0; i < myExpenses.length; i++) {
    let curr = myExpenses[i];
    let title = (curr.title || curr.category || "Uncategorized").trim();
    let cat = (curr.category || "Uncategorized").trim();
    let key = `${title}|||${cat}`;
    if (!expDistMap[key]) expDistMap[key] = 0;
    expDistMap[key] += curr.amount;
  }

  let expDist = [];
  for (let key in expDistMap) {
    let parts = key.split("|||");
    let title = parts[0];
    let category = parts[1];
    let label =
      title.toLowerCase() === category.toLowerCase()
        ? title
        : `${title} (${category})`;
    expDist.push({
      label: label,
      category: category,
      amount: expDistMap[key],
    });
  }

  let myReport = [];
  for (let i = 0; i < myBudgets.length; i++) {
    let b = myBudgets[i];
    let bCat = (b.category || "").trim().toLowerCase();
    let bStart = new Date(b.startDate);
    let bEnd = new Date(b.endDate);
    bEnd.setHours(23, 59, 59, 999);

    let actualSpent = 0;
    for (let j = 0; j < myExpenses.length; j++) {
      let exp = myExpenses[j];
      let expCat = (exp.category || "").trim().toLowerCase();
      let expDate = new Date(exp.date);
      if (expCat === bCat && expDate >= bStart && expDate <= bEnd) {
        actualSpent += exp.amount;
      }
    }

    let myStatus = actualSpent > b.amount ? "overspent" : "within_budget";
    myReport.push({
      ...b,
      budgetAmount: b.amount,
      actualSpent: actualSpent,
      remaining: b.amount - actualSpent,
      status: myStatus,
    });
  }

  res.status(200).json({
    status: "success",
    results: myReport.length,
    data: {
      report: myReport,
      totalExpenses: totalExp,
      expenseDistribution: expDist,
    },
  });
});
