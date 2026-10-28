const test = require("node:test");
const assert = require("node:assert/strict");
const { allocateCents, normalizeParticipants, buildBalances, simplifyDebts, toCents } = require("../services/splitLedger");

const member = (id, fullName = id) => ({ user: { _id: id, fullName, email: `${id}@example.com` } });

test("equal allocation distributes rounding cents exactly", () => {
  const amounts = allocateCents(10000, [1, 1, 1]);
  assert.deepEqual(amounts, [3334, 3333, 3333]);
  assert.equal(amounts.reduce((sum, amount) => sum + amount, 0), 10000);
});

test("percentage split calculates exact cent amounts", () => {
  const members = new Map([["a", member("a", "Alex")], ["b", member("b", "Blair")]]);
  const participants = normalizeParticipants({ amountCents: 12345, splitType: "percentage", memberById: members, participants: [{ userId: "a", percentage: 60 }, { userId: "b", percentage: 40 }] });
  assert.deepEqual(participants.map((p) => p.amount), [74.07, 49.38]);
  assert.equal(participants.reduce((sum, p) => sum + toCents(p.amount), 0), 12345);
});

test("rounded percentage inputs can be off by a few hundredths", () => {
  const members = new Map([["a", member("a")], ["b", member("b")], ["c", member("c")]]);
  const participants = normalizeParticipants({ amountCents: 10000, splitType: "percentage", memberById: members, participants: [{ userId: "a", percentage: 33.33 }, { userId: "b", percentage: 33.33 }, { userId: "c", percentage: 33.33 }] });
  assert.equal(participants.reduce((sum, p) => sum + toCents(p.amount), 0), 10000);
});

test("exact split rejects a mismatch against the expense total", () => {
  const members = new Map([["a", member("a")], ["b", member("b")]]);
  assert.throws(() => normalizeParticipants({ amountCents: 10000, splitType: "exact", memberById: members, participants: [{ userId: "a", amount: 20 }, { userId: "b", amount: 30 }] }), /add up to the expense total/);
});

test("balances reduce correctly after a partial settlement", () => {
  const members = [member("a", "Alex"), member("b", "Blair")];
  const expenses = [{ amount: 100, paidBy: "a", participants: [{ user: "a", amount: 50 }, { user: "b", amount: 50 }] }];
  const settlements = [{ from: "b", to: "a", amount: 20 }];
  const balances = buildBalances(members, expenses, settlements);
  assert.deepEqual(balances.map((balance) => [balance.userId, balance.balance]), [["a", 30], ["b", -30]]);
  assert.deepEqual(simplifyDebts(balances).map((debt) => [debt.fromUserId, debt.toUserId, debt.amount]), [["b", "a", 30]]);
});
