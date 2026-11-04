const ExcelJS = require("exceljs");

// Streams a one-sheet workbook as a download. Every export in the app goes through
// here so headers, widths and date formats are identical.
const sendWorkbook = async (res, { sheetName, filename, columns, rows }) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = columns;
  sheet.getRow(1).font = { bold: true };
  rows.forEach((row) => sheet.addRow(row));

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

  await workbook.xlsx.write(res);
  res.end();
};

const DATE_FORMAT = "dd/mm/yyyy";

module.exports = { sendWorkbook, DATE_FORMAT };
