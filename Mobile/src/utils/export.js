import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import client from "../api/client";
import { inr, shortDate } from "./format";

const share = async (uri, mimeType, dialogTitle) => {
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing is not available on this device");
  await Sharing.shareAsync(uri, { mimeType, dialogTitle });
};

// Downloads the .xlsx the backend generates (same endpoints as the web app) and opens the share sheet
export const downloadExcel = async (path, fileName) => {
  const res = await client.get(path, { responseType: "arraybuffer" });
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  await file.write(new Uint8Array(res.data));
  await share(file.uri, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
};

const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Builds a PDF statement from the given rows (same columns as the web PDF export)
export const exportPdf = async (title, rows) => {
  const income = rows.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
  const expense = rows.filter((r) => r.type !== "income").reduce((s, r) => s + r.amount, 0);
  const body = rows
    .map(
      (r) => `<tr><td>${shortDate(r.date)}</td><td>${esc(r.title)}</td><td>${esc(r.category || r.source)}</td>
      <td style="text-align:right;color:${r.type === "income" ? "#059669" : "#dc2626"}">${r.type === "income" ? "+" : "-"}${inr(r.amount)}</td></tr>`,
    )
    .join("");
  const html = `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>body{font-family:sans-serif;padding:24px;color:#111}h1{color:#7c3aed;margin:0 0 4px}
  table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}
  th{background:#7c3aed;color:#fff;text-align:left;padding:8px}td{padding:8px;border-bottom:1px solid #e5e7eb}
  .sum{margin-top:8px;font-size:13px;color:#444}</style></head><body>
  <h1>${esc(title)}</h1><div class="sum">Generated ${new Date().toLocaleDateString("en-IN")} · ${rows.length} transactions</div>
  <div class="sum">Income ${inr(income)} · Expense ${inr(expense)} · Net ${inr(income - expense)}</div>
  <table><tr><th>Date</th><th>Description</th><th>Category / Source</th><th style="text-align:right">Amount</th></tr>${body}</table>
  </body></html>`;
  const { uri } = await Print.printToFileAsync({ html });
  await share(uri, "application/pdf", title);
};
