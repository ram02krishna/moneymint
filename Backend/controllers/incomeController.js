const Income = require("../models/Income");
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

const pickFields = ({ title, icon, amount, source, category, date, note }) => ({
  title,
  icon,
  amount: toAmount(amount),
  source,
  category,
  date,
  note,
});

exports.addIncome = asyncHandler(async (req, res) => {
  const income = await Income.create({ user: req.user.id, ...pickFields(req.body) });
  res.status(201).json({ status: "success", data: { income } });
});

exports.getAllIncome = asyncHandler(async (req, res) => {
  const { page, limit, startDate, endDate, search } = req.query;
  const query = { user: req.user.id };

  const range = parseDayRange(startDate, endDate);
  if (range) query.date = range;

  if (search) {
    const pattern = searchRegex(search);
    query.$or = [{ title: pattern }, { category: pattern }, { source: pattern }];
  }

  if (!page && !limit) {
    const incomes = await Income.find(query).sort({ date: -1 }).lean();
    return res.status(200).json({ status: "success", results: incomes.length, data: { incomes } });
  }

  const pageInfo = parsePagination(req.query);
  const [incomes, total] = await Promise.all([
    Income.find(query).sort({ date: -1 }).skip(pageInfo.skip).limit(pageInfo.limit).lean(),
    Income.countDocuments(query),
  ]);

  res.status(200).json({
    status: "success",
    results: incomes.length,
    pagination: {
      total,
      page: pageInfo.page,
      limit: pageInfo.limit,
      totalPages: Math.ceil(total / pageInfo.limit),
    },
    data: { incomes },
  });
});

exports.deleteIncome = asyncHandler(async (req, res, next) => {
  const deleted = await Income.findOneAndDelete({
    _id: validateObjectId(req.params.id, "Income ID"),
    user: req.user.id,
  });
  if (!deleted) return next(new AppError("Could not find income to delete", 404));
  res.status(204).end();
});

exports.updateIncome = asyncHandler(async (req, res, next) => {
  const income = await Income.findOneAndUpdate(
    { _id: validateObjectId(req.params.id, "Income ID"), user: req.user.id },
    pickFields(req.body),
    { new: true, runValidators: true },
  );
  if (!income) return next(new AppError("Could not find income to update", 404));
  res.status(200).json({ status: "success", data: { income } });
});

exports.downloadIncomeExcel = asyncHandler(async (req, res, next) => {
  const incomes = await Income.find({ user: req.user.id }).sort({ date: -1 }).lean();
  if (incomes.length === 0) return next(new AppError("No incomes to download", 404));

  await sendWorkbook(res, {
    sheetName: "Income",
    filename: "incomes.xlsx",
    columns: [
      { header: "Date", key: "date", width: 14, style: { numFmt: DATE_FORMAT } },
      { header: "Title", key: "title", width: 28 },
      { header: "Source", key: "source", width: 22 },
      { header: "Category", key: "category", width: 22 },
      { header: "Note", key: "note", width: 32 },
      { header: "Amount", key: "amount", width: 14 },
    ],
    rows: incomes,
  });
});
