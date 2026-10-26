const mongoose = require("mongoose");
const Income = require("../models/Income");
const Expense = require("../models/Expense");
const asyncHandler = require("../utils/asyncHandler");
const ExcelJS = require("exceljs");

// get all my transactions
exports.getAllTransactions = asyncHandler(async (req, res, next) => {
  let pageNo = parseInt(req.query.page) || 1;
  let limitVal = parseInt(req.query.limit) || 10;
  let skipVal = (pageNo - 1) * limitVal;

  let myMatchQuery = { user: new mongoose.Types.ObjectId(req.user.id) };
  let expenseQuery = { user: new mongoose.Types.ObjectId(req.user.id) };

  let month = req.query.month;
  if (month) {
    let parts = month.split("-");
    let year = parts[0];
    let monthNum = parts[1];

    if (year && monthNum && !isNaN(year) && !isNaN(monthNum)) {
      let startDate = new Date(year, monthNum - 1, 1);
      let endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);
      myMatchQuery.date = { $gte: startDate, $lte: endDate }; //gte -> greater than or equal to , lte -> less than equal to
      expenseQuery.date = { $gte: startDate, $lte: endDate };
    }
  }

  let myPipeline = [
    { $match: myMatchQuery },
    { $addFields: { type: "income" } },
    {
      $unionWith: {
        coll: "expenses",
        pipeline: [
          { $match: expenseQuery },
          { $addFields: { type: "expense" } },
        ],
      },
    },
    { $sort: { date: -1 } },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [{ $skip: skipVal }, { $limit: limitVal }],
      },
    },
  ];

  let result = await Income.aggregate(myPipeline);

  let allTransactions = result[0].data;
  let totalCount = result[0].metadata[0] ? result[0].metadata[0].total : 0;
  let totalPages = Math.ceil(totalCount / limitVal);

  res.status(200).json({
    status: "success",
    results: allTransactions.length,
    pagination: {
      total: totalCount,
      page: pageNo,
      limit: limitVal,
      totalPages: totalPages,
    },
    data: {
      transactions: allTransactions,
    },
  });
});

// download all transactions in excel format
exports.downloadTransactionsExcel = asyncHandler(async (req, res, next) => {
  let incomeQ = { user: req.user.id };
  let expenseQ = { user: req.user.id };

  let month = req.query.month;
  if (month) {
    let parts = month.split("-");
    let year = parts[0];
    let monthNum = parts[1];

    if (year && monthNum && !isNaN(year) && !isNaN(monthNum)) {
      let startDate = new Date(year, monthNum - 1, 1);
      let endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);
      incomeQ.date = { $gte: startDate, $lte: endDate };
      expenseQ.date = { $gte: startDate, $lte: endDate };
    }
  }

  let myIncomes = await Income.find(incomeQ).lean();
  let myExpenses = await Expense.find(expenseQ).lean();

  let allTransactions = [];
  for (let i = 0; i < myIncomes.length; i++) {
    allTransactions.push(myIncomes[i]);
  }
  for (let i = 0; i < myExpenses.length; i++) {
    allTransactions.push(myExpenses[i]);
  }

  allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  let wb = new ExcelJS.Workbook();
  let ws = wb.addWorksheet("Transactions");

  ws.columns = [
    { header: "Date", key: "date", width: 15 },
    { header: "Type", key: "type", width: 10 },
    { header: "Category/Source", key: "categorySource", width: 25 },
    { header: "Description", key: "description", width: 30 },
    { header: "Amount", key: "amount", width: 15 },
  ];

  for (let i = 0; i < allTransactions.length; i++) {
    let t = allTransactions[i];
    let type = t.source ? "Income" : "Expense";
    let catSource = t.source || t.category;
    ws.addRow({
      date: new Date(t.date).toLocaleDateString(),
      type: type,
      categorySource: catSource,
      description: t.description,
      amount: t.amount,
    });
  }

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=" + "transactions.xlsx",
  );

  await wb.xlsx.write(res);
  res.end();
});
