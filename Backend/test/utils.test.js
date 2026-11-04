const test = require("node:test");
const assert = require("node:assert/strict");
const { parseMonth, parseDayRange } = require("../utils/dateRange");
const { parsePagination } = require("../utils/pagination");
const { searchRegex } = require("../utils/escapeRegex");
const { corsOptions, isAllowedOrigin } = require("../config/cors");
const { validationResult } = require("express-validator");
const { validateIncome, validateBudget } = require("../middleware/validationMiddleware");

test("parseMonth covers the whole UTC month and rejects bad input", () => {
  const { start, end } = parseMonth("2026-02");
  assert.equal(start.toISOString(), "2026-02-01T00:00:00.000Z");
  assert.equal(end.toISOString(), "2026-02-28T23:59:59.999Z");
  for (const bad of [undefined, "", "2026", "2026-13", "abc-de", "2026-00"]) {
    assert.throws(() => parseMonth(bad), /Invalid month/);
  }
});

test("parseDayRange is inclusive and validates", () => {
  const r = parseDayRange("2026-01-05", "2026-01-06");
  assert.equal(r.$gte.toISOString(), "2026-01-05T00:00:00.000Z");
  assert.equal(r.$lte.toISOString(), "2026-01-06T23:59:59.999Z");
  assert.equal(parseDayRange(), null);
  assert.throws(() => parseDayRange("nope"), /Invalid startDate/);
});

test("pagination is clamped and never NaN", () => {
  assert.deepEqual(parsePagination({ page: "abc", limit: "0" }), { page: 1, limit: 10, skip: 0 });
  assert.equal(parsePagination({ page: "-3", limit: "-5" }).page, 1);
  assert.equal(parsePagination({ limit: "-5" }).limit, 1);
  assert.equal(parsePagination({ limit: "100000" }).limit, 100);
  assert.equal(parsePagination({ page: "3", limit: "20" }).skip, 40);
});

test("search text is treated literally (no regex crash)", () => {
  assert.doesNotThrow(() => searchRegex("(["));
  assert.ok(searchRegex("a.b").test("A.B"));
  assert.ok(!searchRegex("a.b").test("axb"));
});

test("CORS allows known + vercel origins only", () => {
  assert.ok(isAllowedOrigin("http://localhost:5173"));
  assert.ok(isAllowedOrigin("https://my-app.vercel.app"));
  assert.ok(!isAllowedOrigin("https://evil-localhost.com"));
  assert.ok(!isAllowedOrigin("https://vercel.app.evil.com"));
  assert.ok(!isAllowedOrigin("not a url"));
  assert.equal(typeof corsOptions.origin, "function");
});

const run = async (chain, data) => {
  const req = { body: data };
  for (const v of chain) await v.run(req);
  return { req, errors: validationResult(req) };
};

test("text is stored as typed (no HTML-entity corruption)", async () => {
  const { req, errors } = await run(validateIncome, {
    title: "McDonald's & Co",
    amount: 10,
    source: "Rent/Utilities",
    category: "Food & Dining",
  });
  assert.ok(errors.isEmpty());
  assert.equal(req.body.title, "McDonald's & Co");
  assert.equal(req.body.source, "Rent/Utilities");
  assert.equal(req.body.category, "Food & Dining");
});

test("budget end date must not precede start date", async () => {
  const { errors } = await run(validateBudget, { category: "x", amount: 1, startDate: "2026-02-02", endDate: "2026-02-01" });
  assert.ok(!errors.isEmpty());
});
