const mongoose = require("mongoose");
const Income = require("../models/Income");
const Expense = require("../models/Expense");
const asyncHandler = require("../utils/asyncHandler");
const { parseMonth } = require("../utils/dateRange");
const { parsePagination } = require("../utils/pagination");
const { sendWorkbook, DATE_FORMAT } = require("../utils/excel");

// get all my transactions (income + expenses merged, newest first)
exports.getAllTransactions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const userMatch = { user: new mongoose.Types.ObjectId(req.user.id) };
  if (req.query.month) {
    const { start, end } = parseMonth(req.query.month);
    userMatch.date = { $gte: start, $lte: end };
  }

  const [result] = await Income.aggregate([
    { $match: userMatch },
    { $addFields: { type: "income" } },
    {
      $unionWith: {
        coll: Expense.collection.name,
        pipeline: [{ $match: userMatch }, { $addFields: { type: "expense" } }],
      },
    },
    { $sort: { date: -1 } },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skip }, { $limit: limit }],
      },
    },
  ]);

  const total = result.metadata[0]?.total || 0;

  res.status(200).json({
    status: "success",
    results: result.data.length,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    data: { transactions: result.data },
  });
});

// download transactions (optionally just one month) as Excel
exports.downloadTransactionsExcel = asyncHandler(async (req, res) => {
  const query = { user: req.user.id };
  if (req.query.month) {
    const { start, end } = parseMonth(req.query.month);
    query.date = { $gte: start, $lte: end };
  }

  const [incomes, expenses] = await Promise.all([
    Income.find(query).lean(),
    Expense.find(query).lean(),
  ]);

  const rows = [
    ...incomes.map((t) => ({ date: t.date, type: "Income", title: t.title, categorySource: t.source, description: t.note, amount: t.amount })),
    ...expenses.map((t) => ({ date: t.date, type: "Expense", title: t.title, categorySource: t.category, description: t.description, amount: t.amount })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  await sendWorkbook(res, {
    sheetName: "Transactions",
    filename: "transactions.xlsx",
    columns: [
      { header: "Date", key: "date", width: 14, style: { numFmt: DATE_FORMAT } },
      { header: "Type", key: "type", width: 10 },
      { header: "Title", key: "title", width: 28 },
      { header: "Category/Source", key: "categorySource", width: 24 },
      { header: "Description", key: "description", width: 32 },
      { header: "Amount", key: "amount", width: 14 },
    ],
    rows,
  });
});
