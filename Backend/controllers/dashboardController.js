const Income = require("../models/Income");
const Expense = require("../models/Expense");
const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { parseMonth } = require("../utils/dateRange");
const { parsePagination } = require("../utils/pagination");

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthKey = (year, month) => `${year}-${String(month).padStart(2, "0")}`;

// getting dashboard summary
exports.getDashboardSummary = asyncHandler(async (req, res) => {
  let uId = req.user.id;
  let today = new Date();
  let pastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  // get stats for income and expense
  let [incomeStats, expenseStats] = await Promise.all([
    Income.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(uId) } },
      {
        $facet: {
          incomeLast30Days: [
            { $match: { date: { $gte: pastMonth, $lte: today } } },
            { $sort: { date: -1 } },
          ],
          last5Incomes: [
            { $sort: { date: -1 } },
            { $limit: 5 },
            { $addFields: { type: "income" } },
          ],
          totalIncome: [{ $group: { _id: null, total: { $sum: "$amount" } } }],
          totalIncomeLast30Days: [
            { $match: { date: { $gte: pastMonth, $lte: today } } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ],
        },
      },
    ]),
    Expense.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(uId) } },
      {
        $facet: {
          expenseLast30Days: [
            { $match: { date: { $gte: pastMonth, $lte: today } } },
            { $sort: { date: -1 } },
          ],
          last5Expenses: [
            { $sort: { date: -1 } },
            { $limit: 5 },
            { $addFields: { type: "expense" } },
          ],
          totalExpense: [{ $group: { _id: null, total: { $sum: "$amount" } } }],
          totalExpenseLast30Days: [
            { $match: { date: { $gte: pastMonth, $lte: today } } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ],
        },
      },
    ]),
  ]);

  let incData = incomeStats[0];
  let expData = expenseStats[0];

  let last5Transactions = [
    ...(incData.last5Incomes || []),
    ...(expData.last5Expenses || []),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  let totalInc = incData.totalIncome[0]?.total || 0;
  let totalExp = expData.totalExpense[0]?.total || 0;
  let totalIncLast30 = incData.totalIncomeLast30Days[0]?.total || 0;
  let totalExpLast30 = expData.totalExpenseLast30Days[0]?.total || 0;
  let myBalance = totalInc - totalExp;

  res.status(200).json({
    status: "success",
    data: {
      incomeLast30Days: incData.incomeLast30Days,
      totalIncomeLast30Days: totalIncLast30,
      expenseLast30Days: expData.expenseLast30Days,
      totalExpenseLast30Days: totalExpLast30,
      last5Transactions: last5Transactions,
      balance: myBalance,
      totalIncome: totalInc,
      totalExpense: totalExp,
    },
  });
});

// get summary for a specific month
exports.getMonthlyDashboardSummary = asyncHandler(async (req, res) => {
  let uId = req.user.id;
  let { month } = req.query;
  const { start: startDate, end: endDate } = parseMonth(month);

  let [incomeStats, expenseStats] = await Promise.all([
    Income.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(uId),
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $facet: {
          monthlyIncomes: [
            { $sort: { date: -1 } },
            { $addFields: { type: "income" } },
          ],
          totalIncome: [
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ],
          incomeBySource: [
            { $group: { _id: "$source", totalAmount: { $sum: "$amount" } } },
            { $sort: { totalAmount: -1 } },
          ],
        },
      },
    ]),
    Expense.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(uId),
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $facet: {
          monthlyExpenses: [
            { $sort: { date: -1 } },
            { $addFields: { type: "expense" } },
          ],
          totalExpense: [
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ],
          expenseByCategory: [
            { $group: { _id: "$category", totalAmount: { $sum: "$amount" } } },
            { $sort: { totalAmount: -1 } },
          ],
        },
      },
    ]),
  ]);

  let incData = incomeStats[0];
  let expData = expenseStats[0];

  let totalInc = incData.totalIncome[0]?.total || 0;
  let totalExp = expData.totalExpense[0]?.total || 0;
  let savings = totalInc - totalExp;
  let totalCount =
    (incData.monthlyIncomes?.length || 0) +
    (expData.monthlyExpenses?.length || 0);

  let allTransactions = [
    ...(incData.monthlyIncomes || []),
    ...(expData.monthlyExpenses || []),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  res.status(200).json({
    status: "success",
    data: {
      month: month,
      totalIncome: totalInc,
      totalExpense: totalExp,
      totalSavings: savings,
      transactionCount: totalCount,
      monthlyTransactions: allTransactions,
      incomeBySource: incData.incomeBySource || [],
      expenseByCategory: expData.expenseByCategory || [],
    },
  });
});

// get only monthly expenses with pages
exports.getMonthlyExpenses = asyncHandler(async (req, res) => {
  let uId = req.user.id;
  const { start: startDate, end: endDate } = parseMonth(req.query.month);
  const { page: pageNo, limit: limitVal, skip: skipVal } = parsePagination(req.query, { defaultLimit: 20 });

  let [myExpenses, totalCount] = await Promise.all([
    Expense.find({
      user: uId,
      date: { $gte: startDate, $lte: endDate },
    })
      .sort({ date: -1 })
      .skip(skipVal)
      .limit(limitVal)
      .lean(),
    Expense.countDocuments({
      user: uId,
      date: { $gte: startDate, $lte: endDate },
    }),
  ]);

  res.status(200).json({
    status: "success",
    results: myExpenses.length,
    totalCount: totalCount,
    totalPages: Math.ceil(totalCount / limitVal),
    currentPage: pageNo,
    data: {
      expenses: myExpenses,
    },
  });
});

// get monthly income with pages
exports.getMonthlyIncome = asyncHandler(async (req, res) => {
  let uId = req.user.id;
  const { start: startDate, end: endDate } = parseMonth(req.query.month);
  const { page: pageNo, limit: limitVal, skip: skipVal } = parsePagination(req.query, { defaultLimit: 20 });

  let [myIncomes, totalCount] = await Promise.all([
    Income.find({
      user: uId,
      date: { $gte: startDate, $lte: endDate },
    })
      .sort({ date: -1 })
      .skip(skipVal)
      .limit(limitVal)
      .lean(),
    Income.countDocuments({
      user: uId,
      date: { $gte: startDate, $lte: endDate },
    }),
  ]);

  res.status(200).json({
    status: "success",
    results: myIncomes.length,
    totalCount: totalCount,
    totalPages: Math.ceil(totalCount / limitVal),
    currentPage: pageNo,
    data: {
      incomes: myIncomes,
    },
  });
});

// get trend data for the last 12 months or full calendar year (Jan to Dec)
exports.getTrendSummary = asyncHandler(async (req, res, next) => {
  let uId = req.user.id;
  let { month, year } = req.query;

  let isCalendarYear = !!year || req.query.calendarYear === "true";
  let monthList = [];
  let startDate, endDate, targetYear;

  if (isCalendarYear) {
    targetYear = year ? parseInt(year, 10) : month ? parseMonth(month).year : new Date().getUTCFullYear();
    if (!Number.isInteger(targetYear) || targetYear < 1970 || targetYear > 2200) {
      return next(new AppError("Invalid year", 400));
    }
    startDate = new Date(Date.UTC(targetYear, 0, 1));
    endDate = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59, 999));

    for (let m = 1; m <= 12; m++) {
      monthList.push({ key: monthKey(targetYear, m), monthDisplay: MONTH_NAMES[m - 1] });
    }
  } else {
    const now = new Date();
    const anchor = parseMonth(month || monthKey(now.getUTCFullYear(), now.getUTCMonth() + 1));
    startDate = new Date(Date.UTC(anchor.year, anchor.month - 12, 1));
    endDate = anchor.end;

    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(anchor.year, anchor.month - 1 - i, 1));
      monthList.push({
        key: monthKey(d.getUTCFullYear(), d.getUTCMonth() + 1),
        monthDisplay: `${MONTH_NAMES[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`,
      });
    }
  }

  let [incomeStats, expenseStats] = await Promise.all([
    Income.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(uId),
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
          },
          totalIncome: { $sum: "$amount" },
          transactionCount: { $sum: 1 },
        },
      },
    ]),
    Expense.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(uId),
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
          },
          totalExpense: { $sum: "$amount" },
          transactionCount: { $sum: 1 },
        },
      },
    ]),
  ]);

  let incomeMap = {};
  for (let i = 0; i < incomeStats.length; i++) {
    let item = incomeStats[i];
    let key = `${item._id.year}-${String(item._id.month).padStart(2, "0")}`;
    incomeMap[key] = item;
  }

  let expenseMap = {};
  for (let i = 0; i < expenseStats.length; i++) {
    let item = expenseStats[i];
    let key = `${item._id.year}-${String(item._id.month).padStart(2, "0")}`;
    expenseMap[key] = item;
  }

  let trendData = [];
  let annualIncome = 0;
  let annualExpense = 0;
  let annualSavings = 0;

  for (let item of monthList) {
    let key = item.key;
    let inc = incomeMap[key]?.totalIncome || 0;
    let exp = expenseMap[key]?.totalExpense || 0;
    let incCount = incomeMap[key]?.transactionCount || 0;
    let expCount = expenseMap[key]?.transactionCount || 0;
    let sav = inc - exp;

    annualIncome += inc;
    annualExpense += exp;
    annualSavings += sav;

    trendData.push({
      month: key,
      monthDisplay: item.monthDisplay,
      income: inc,
      expense: exp,
      savings: sav,
      transactions: incCount + expCount,
    });
  }

  if (isCalendarYear) {
    res.status(200).json({
      status: "success",
      data: {
        year: targetYear,
        months: trendData,
        annualIncome,
        annualExpense,
        annualSavings,
      },
    });
  } else {
    res.status(200).json({
      status: "success",
      data: trendData,
      annualIncome,
      annualExpense,
      annualSavings,
    });
  }
});
