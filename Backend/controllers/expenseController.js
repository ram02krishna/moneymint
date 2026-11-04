const Expense = require("../models/Expense");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { validateObjectId } = require("../utils/queryValidator");
const { parsePagination } = require("../utils/pagination");
const { parseDayRange } = require("../utils/dateRange");
const { searchRegex } = require("../utils/escapeRegex");
const { sendWorkbook, DATE_FORMAT } = require("../utils/excel");

const toAmount = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) throw new AppError("Amount must be a number", 400);
  return amount;
};

const pickFields = ({ title, icon, amount, category, date, description }) => ({
  title,
  icon,
  amount: toAmount(amount),
  category,
  date,
  description,
});

exports.addExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.create({ user: req.user.id, ...pickFields(req.body) });
  res.status(201).json({ status: "success", data: { expense } });
});

exports.getAllExpenses = asyncHandler(async (req, res) => {
  const { page, limit, startDate, endDate, search } = req.query;
  const query = { user: req.user.id };

  const range = parseDayRange(startDate, endDate);
  if (range) query.date = range;

  if (search) {
    const pattern = searchRegex(search);
    query.$or = [{ title: pattern }, { category: pattern }];
  }

  // no pagination params -> everything (used by exports and charts)
  if (!page && !limit) {
    const expenses = await Expense.find(query).sort({ date: -1 }).lean();
    return res.status(200).json({ status: "success", results: expenses.length, data: { expenses } });
  }

  const pageInfo = parsePagination(req.query);
  const [expenses, total] = await Promise.all([
    Expense.find(query).sort({ date: -1 }).skip(pageInfo.skip).limit(pageInfo.limit).lean(),
    Expense.countDocuments(query),
  ]);

  res.status(200).json({
    status: "success",
    results: expenses.length,
    pagination: {
      total,
      page: pageInfo.page,
      limit: pageInfo.limit,
      totalPages: Math.ceil(total / pageInfo.limit),
    },
    data: { expenses },
  });
});

exports.deleteExpense = asyncHandler(async (req, res, next) => {
  const deleted = await Expense.findOneAndDelete({
    _id: validateObjectId(req.params.id, "Expense ID"),
    user: req.user.id,
  });
  if (!deleted) return next(new AppError("Could not find expense to delete", 404));
  res.status(204).end();
});

exports.updateExpense = asyncHandler(async (req, res, next) => {
  const expense = await Expense.findOneAndUpdate(
    { _id: validateObjectId(req.params.id, "Expense ID"), user: req.user.id },
    pickFields(req.body),
    { new: true, runValidators: true },
  );
  if (!expense) return next(new AppError("Could not find expense to update", 404));
  res.status(200).json({ status: "success", data: { expense } });
});

exports.downloadExpenseExcel = asyncHandler(async (req, res, next) => {
  const expenses = await Expense.find({ user: req.user.id }).sort({ date: -1 }).lean();
  if (expenses.length === 0) return next(new AppError("No expenses to download", 404));

  await sendWorkbook(res, {
    sheetName: "Expenses",
    filename: "expenses.xlsx",
    columns: [
      { header: "Date", key: "date", width: 14, style: { numFmt: DATE_FORMAT } },
      { header: "Title", key: "title", width: 28 },
      { header: "Category", key: "category", width: 22 },
      { header: "Description", key: "description", width: 32 },
      { header: "Amount", key: "amount", width: 14 },
    ],
    rows: expenses,
  });
});
