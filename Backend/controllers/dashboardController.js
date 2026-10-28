const Income = require("../models/Income");
const Expense = require("../models/Expense");
const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

// getting dashboard summary
exports.getDashboardSummary = asyncHandler(async (req, res, next) => {
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

// get expenses by category for last 30 days
exports.getDashboardExpenseSummary = asyncHandler(async (req, res, next) => {
  let pastMonth = new Date();
  pastMonth.setDate(pastMonth.getDate() - 30);
  let uId = req.user.id;

  let mySummary = await Expense.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(uId),
        date: { $gte: pastMonth },
      },
    },
    {
      $group: {
        _id: "$category",
        totalAmount: { $sum: "$amount" },
      },
    },
    {
      $sort: { totalAmount: -1 },
    },
  ]);

  res.status(200).json({
    status: "success",
    results: mySummary.length,
    data: {
      summary: mySummary,
    },
  });
});

// get summary for a specific month
exports.getMonthlyDashboardSummary = asyncHandler(async (req, res, next) => {
  let uId = req.user.id;
  let { month } = req.query;

  if (!month) {
    return next(new AppError("Need a month parameter", 400));
  }

  let [year, monthNum] = month.split("-");
  if (!year || !monthNum || isNaN(year) || isNaN(monthNum)) {
    return next(new AppError("Wrong month format", 400));
  }

  let startDate = new Date(year, monthNum - 1, 1);
  let endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

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
exports.getMonthlyExpenses = asyncHandler(async (req, res, next) => {
  let uId = req.user.id;
  let { month, page = 1, limit = 20 } = req.query;

  if (!month) {
    return next(new AppError("Need month parameter", 400));
  }

  let [year, monthNum] = month.split("-");
  if (!year || !monthNum || isNaN(year) || isNaN(monthNum)) {
    return next(new AppError("Wrong month format", 400));
  }

  let startDate = new Date(year, monthNum - 1, 1);
  let endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);
  let pageNo = Math.max(1, parseInt(page));
  let limitVal = Math.max(1, parseInt(limit));
  let skipVal = (pageNo - 1) * limitVal;

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
exports.getMonthlyIncome = asyncHandler(async (req, res, next) => {
  let uId = req.user.id;
  let { month, page = 1, limit = 20 } = req.query;

  if (!month) {
    return next(new AppError("Need month parameter", 400));
  }

  let [year, monthNum] = month.split("-");
  if (!year || !monthNum || isNaN(year) || isNaN(monthNum)) {
    return next(new AppError("Wrong format", 400));
  }

  let startDate = new Date(year, monthNum - 1, 1);
  let endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);
  let pageNo = Math.max(1, parseInt(page));
  let limitVal = Math.max(1, parseInt(limit));
  let skipVal = (pageNo - 1) * limitVal;

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
  let targetYear = year
    ? parseInt(year)
    : month
      ? parseInt(month.split("-")[0])
      : new Date().getFullYear();

  let startDate, endDate;
  let monthList = [];

  if (isCalendarYear) {
    startDate = new Date(targetYear, 0, 1, 0, 0, 0, 0);
    endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999);

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    for (let m = 0; m < 12; m++) {
      let key = `${targetYear}-${String(m + 1).padStart(2, "0")}`;
      monthList.push({
        key,
        monthDisplay: monthNames[m],
        monthIndex: m,
      });
    }
  } else {
    if (!month) {
      let now = new Date();
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }
    let [yearStr, monthNum] = month.split("-");
    if (!yearStr || !monthNum || isNaN(yearStr) || isNaN(monthNum)) {
      return next(new AppError("Wrong format", 400));
    }

    let yr = parseInt(yearStr);
    let mn = parseInt(monthNum);
    let currentDate = new Date(yr, mn - 1, 1);
    startDate = new Date(currentDate);
    startDate.setMonth(startDate.getMonth() - 11);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    endDate = new Date(yr, mn, 0, 23, 59, 59, 999);

    for (let i = 11; i >= 0; i--) {
      let d = new Date(currentDate);
      d.setMonth(d.getMonth() - i);
      let y = d.getFullYear();
      let m = String(d.getMonth() + 1).padStart(2, "0");
      let key = `${y}-${m}`;
      monthList.push({
        key,
        monthDisplay: d.toLocaleString("default", {
          month: "short",
          year: "2-digit",
        }),
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
