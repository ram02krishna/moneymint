const AppError = require("./AppError");

// "2026-11" -> { start, end } covering that calendar month in UTC.
// Dates are stored as UTC midnight (the clients send YYYY-MM-DD), so UTC bounds
// keep month filters consistent no matter which timezone the server runs in.
const parseMonth = (month, label = "month") => {
  const match = /^(\d{4})-(\d{1,2})$/.exec(String(month || "").trim());
  const year = match ? Number(match[1]) : NaN;
  const monthNum = match ? Number(match[2]) : NaN;

  if (!match || monthNum < 1 || monthNum > 12) {
    throw new AppError(`Invalid ${label}. Use the format YYYY-MM`, 400);
  }

  return {
    year,
    month: monthNum,
    start: new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999)),
  };
};

// Inclusive day range from optional YYYY-MM-DD style strings.
const parseDayRange = (startDate, endDate) => {
  const range = {};

  if (startDate) {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) throw new AppError("Invalid startDate", 400);
    start.setUTCHours(0, 0, 0, 0);
    range.$gte = start;
  }

  if (endDate) {
    const end = new Date(endDate);
    if (isNaN(end.getTime())) throw new AppError("Invalid endDate", 400);
    end.setUTCHours(23, 59, 59, 999);
    range.$lte = end;
  }

  return Object.keys(range).length ? range : null;
};

module.exports = { parseMonth, parseDayRange };
