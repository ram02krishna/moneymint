const Income = require("../models/Income");
const ExcelJS = require("exceljs");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { validateObjectId } = require("../utils/queryValidator");

// add new income function
exports.addIncome = asyncHandler(async (req, res, next) => {
  let { title, icon, amount, source, category, date, note } = req.body;

  let myAmt = Number(amount);
  if (isNaN(myAmt)) {
    return next(new AppError("Amount must be a number", 400));
  }

  // create the income in db
  let newIncome = await Income.create({
    user: req.user.id,
    title: title,
    icon: icon,
    amount: myAmt,
    source: source,
    category: category,
    date: date,
    note: note,
  });

  res.status(201).json({
    status: "success",
    data: {
      income: newIncome,
    },
  });
});

// get all incomes for the user
exports.getAllIncome = asyncHandler(async (req, res, next) => {
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

  if (search) {
    let searchWord = new RegExp(search, "i");
    myQuery.$or = [
      { title: searchWord },
      { category: searchWord },
      { source: searchWord },
    ];
  }

  if (!page && !limit) {
    let allIncomes = await Income.find(myQuery).sort({ date: -1 }).lean();
    return res.status(200).json({
      status: "success",
      results: allIncomes.length,
      data: { incomes: allIncomes },
    });
  }

  // pagination code
  let pageNo = parseInt(page) || 1;
  let limitVal = parseInt(limit) || 10;
  let skipVal = (pageNo - 1) * limitVal;

  let [finalIncomes, totalCount] = await Promise.all([
    Income.find(myQuery)
      .sort({ date: -1 })
      .skip(skipVal)
      .limit(limitVal)
      .lean(),
    Income.countDocuments(myQuery),
  ]);

  res.status(200).json({
    status: "success",
    results: finalIncomes.length,
    pagination: {
      total: totalCount,
      page: pageNo,
      limit: limitVal,
      totalPages: Math.ceil(totalCount / limitVal),
    },
    data: { incomes: finalIncomes },
  });
});

// delete an income
exports.deleteIncome = asyncHandler(async (req, res, next) => {
  let incId = validateObjectId(req.params.id, "Income ID");
  let uId = validateObjectId(req.user.id, "User ID");

  let deletedInc = await Income.findOneAndDelete({
    _id: incId,
    user: uId,
  });

  if (!deletedInc) {
    return next(new AppError("Could not find income to delete", 404));
  }

  res.status(204).json({
    status: "success",
    data: null,
  });
});

// update an income
exports.updateIncome = asyncHandler(async (req, res, next) => {
  let { title, icon, amount, source, category, date, note } = req.body;

  let myAmt = Number(amount);
  if (isNaN(myAmt)) {
    return next(new AppError("Amount must be a number", 400));
  }

  let incId = validateObjectId(req.params.id, "Income ID");
  let uId = validateObjectId(req.user.id, "User ID");

  let updatedInc = await Income.findOneAndUpdate(
    { _id: incId, user: uId },
    {
      title: title,
      icon: icon,
      amount: myAmt,
      source: source,
      category: category,
      date: date,
      note: note,
    },
    { new: true, runValidators: true },
  );

  if (!updatedInc) {
    return next(new AppError("Could not find income to update", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      income: updatedInc,
    },
  });
});

// download incomes in excel format
exports.downloadIncomeExcel = asyncHandler(async (req, res, next) => {
  let myIncomes = await Income.find({ user: req.user.id }).lean();
  if (myIncomes.length === 0) {
    return next(new AppError("No incomes to download", 404));
  }

  let wb = new ExcelJS.Workbook();
  let ws = wb.addWorksheet("Incomes");

  let cleanData = [];
  for (let i = 0; i < myIncomes.length; i++) {
    let item = myIncomes[i];
    cleanData.push({
      title: item.title,
      amount: item.amount,
      source: item.source,
      category: item.category,
      date: item.date,
      note: item.note,
    });
  }

  if (cleanData.length > 0) {
    let myHeaders = Object.keys(cleanData[0]);
    ws.addRow(myHeaders);
    for (let j = 0; j < cleanData.length; j++) {
      ws.addRow(Object.values(cleanData[j]));
    }
  }

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", "attachment; filename=incomes.xlsx");

  await wb.xlsx.write(res);
  res.end();
});
