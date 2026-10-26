const Expense = require("../models/Expense");
const ExcelJS = require("exceljs");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { validateObjectId } = require("../utils/queryValidator");

// add new expense function
exports.addExpense = asyncHandler(async (req, res, next) => {
  let { title, icon, amount, category, date, description } = req.body;

  // checking if amount is number
  let myAmt = Number(amount);
  if (isNaN(myAmt)) {
    return next(new AppError("Amount must be a number", 400));
  }

  // create the expense in db
  let newExp = await Expense.create({
    user: req.user.id,
    title: title,
    icon: icon,
    amount: myAmt,
    category: category,
    date: date,
    description: description,
  });

  res.status(201).json({
    status: "success",
    data: {
      expense: newExp,
    },
  });
});

// get all expenses for the user
exports.getAllExpenses = asyncHandler(async (req, res, next) => {
  let page = req.query.page;
  let limit = req.query.limit;
  let startDate = req.query.startDate;
  let endDate = req.query.endDate;
  let search = req.query.search;

  let myQuery = { user: req.user.id };

  // filter by date
  if (startDate || endDate) {
    myQuery.date = {};
    if (startDate) {
      let start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      myQuery.date.$gte = start;
    }
    if (endDate) {
      let end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      myQuery.date.$lte = end;
    }
  }

  // filter by search term
  if (search) {
    let searchWord = new RegExp(search, "i");
    myQuery.$or = [{ title: searchWord }, { category: searchWord }];
  }

  if (!page && !limit) {
    let allExpenses = await Expense.find(myQuery).sort({ date: -1 }).lean();
    return res.status(200).json({
      status: "success",
      results: allExpenses.length,
      data: { expenses: allExpenses },
    });
  }

  // pagination code
  let pageNo = parseInt(page) || 1;
  let limitVal = parseInt(limit) || 10;
  let skipVal = (pageNo - 1) * limitVal;

  let [finalExpenses, totalCount] = await Promise.all([
    Expense.find(myQuery)
      .sort({ date: -1 })
      .skip(skipVal)
      .limit(limitVal)
      .lean(),
    Expense.countDocuments(myQuery),
  ]);

  res.status(200).json({
    status: "success",
    results: finalExpenses.length,
    pagination: {
      total: totalCount,
      page: pageNo,
      limit: limitVal,
      totalPages: Math.ceil(totalCount / limitVal),
    },
    data: { expenses: finalExpenses },
  });
});

// delete an expense
exports.deleteExpense = asyncHandler(async (req, res, next) => {
  let expId = validateObjectId(req.params.id, "Expense ID");
  let uId = validateObjectId(req.user.id, "User ID");

  let deletedExp = await Expense.findOneAndDelete({
    _id: expId,
    user: uId,
  });

  if (!deletedExp) {
    return next(new AppError("Could not find expense to delete", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// update an expense
exports.updateExpense = asyncHandler(async (req, res, next) => {
  let { title, icon, amount, category, date, description } = req.body;

  let myAmt = Number(amount);
  if (isNaN(myAmt)) {
    return next(new AppError("Amount must be a number", 400));
  }

  let expId = validateObjectId(req.params.id, "Expense ID");
  let uId = validateObjectId(req.user.id, "User ID");

  let updatedExp = await Expense.findOneAndUpdate(
    { _id: expId, user: uId },
    {
      title: title,
      icon: icon,
      amount: myAmt,
      category: category,
      date: date,
      description: description,
    },
    { new: true, runValidators: true },
  );

  if (!updatedExp) {
    return next(new AppError("Could not find expense to update", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      expense: updatedExp,
    },
  });
});

// download expenses in excel format
exports.downloadExpenseExcel = asyncHandler(async (req, res, next) => {
  let myExpenses = await Expense.find({ user: req.user.id }).lean();
  if (myExpenses.length === 0) {
    return next(new AppError("No expenses to download", 404));
  }

  let wb = new ExcelJS.Workbook();
  let ws = wb.addWorksheet("Expenses");

  let cleanData = [];
  for (let i = 0; i < myExpenses.length; i++) {
    let item = myExpenses[i];
    cleanData.push({
      title: item.title,
      amount: item.amount,
      category: item.category,
      date: item.date,
      description: item.description,
    });
  }

  if (cleanData.length > 0) {
    let myHeaders = Object.keys(cleanData[0]);
    ws.addRow(myHeaders); //worksheet
    for (let j = 0; j < cleanData.length; j++) {
      ws.addRow(Object.values(cleanData[j]));
    }
  }

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", "attachment; filename=expenses.xlsx");

  await wb.xlsx.write(res);
  res.end();
});
