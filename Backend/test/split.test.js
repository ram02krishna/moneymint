const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateShares, toCents } = require("../utils/splitCalculations");
const {
  sameParty,
  isGroupMember,
  canAccessExpense,
  canAccessSettlement,
  pairwiseBalanceCents,
} = require("../utils/splitAccess");

const sum = (rows) => rows.reduce((a, r) => a + toCents(r.shareAmount), 0);

test("equal split always adds up to the total, to the paisa", () => {
  const people = [{ name: "A" }, { name: "B" }, { name: "C" }];
  const out = calculateShares({ amount: 100, participants: people });
  assert.equal(sum(out), 10000);
});

test("itemized: non-registered people are matched by key, not dropped", () => {
  const participants = [
    { user: "u1", name: "Ram", key: "u1" },
    { name: "Sita", key: "friend-doc-77" }, // no user id, client key is a document id
  ];
  const out = calculateShares({
    amount: 300,
    splitMethod: "itemized",
    participants,
    itemDetails: [
      { name: "Pizza", price: 200, assignedTo: ["friend-doc-77"] },
      { name: "Soda", price: 100, assignedTo: ["u1"] },
    ],
  });
  assert.equal(out[0].shareAmount, 100);
  assert.equal(out[1].shareAmount, 200);
});

test("itemized: names match case-insensitively", () => {
  const out = calculateShares({
    amount: 50,
    splitMethod: "itemized",
    participants: [{ name: "Rahul" }, { name: "Priya" }],
    itemDetails: [{ name: "Tea", price: 50, assignedTo: ["RAHUL"] }],
  });
  assert.deepEqual(out.map((p) => p.shareAmount), [50, 0]);
});

test("itemized: unknown assignee, unassigned item and mismatched total are rejected", () => {
  const base = { splitMethod: "itemized", participants: [{ name: "A" }, { name: "B" }] };
  assert.throws(() => calculateShares({ ...base, amount: 10, itemDetails: [{ name: "x", price: 10, assignedTo: ["ghost"] }] }), /not part of/);
  assert.throws(() => calculateShares({ ...base, amount: 10, itemDetails: [{ name: "x", price: 10, assignedTo: [] }] }), /Assign/);
  assert.throws(() => calculateShares({ ...base, amount: 500, itemDetails: [{ name: "x", price: 10, assignedTo: ["A"] }] }), /add up/);
});

test("itemized: tax and tip are shared proportionally and rounding is reconciled", () => {
  const out = calculateShares({
    amount: 133.33,
    splitMethod: "itemized",
    participants: [{ name: "A" }, { name: "B" }, { name: "C" }],
    itemDetails: [{ name: "x", price: 100, assignedTo: ["A", "B", "C"] }],
    tax: 20,
    tip: 13.33,
  });
  assert.equal(sum(out), 13333);
});

// ---- access rules ----
const me = { id: "1", email: "me@x.com" };
const stranger = { id: "9", email: "bad@x.com" };
const group = { creator: "1", members: [{ user: "2", email: "b@x.com" }, { user: null, email: "guest@x.com" }] };

test("group membership: creator, member by id, member by email; strangers excluded", () => {
  assert.ok(isGroupMember(group, me));
  assert.ok(isGroupMember(group, { id: "2" }));
  assert.ok(isGroupMember(group, { id: "7", email: "GUEST@x.com".toLowerCase() }));
  assert.ok(!isGroupMember(group, stranger));
});

test("a stranger can't access someone else's expense or settlement", () => {
  const expense = { createdBy: "1", paidBy: [{ user: "1" }], participants: [{ user: "2" }], group: null };
  assert.ok(canAccessExpense(expense, me));
  assert.ok(canAccessExpense(expense, { id: "2" }));
  assert.ok(!canAccessExpense(expense, stranger));
  assert.ok(canAccessExpense({ ...expense, createdBy: "5", paidBy: [], participants: [] }, { id: "2" }, group));

  const settlement = { createdBy: "1", payer: { user: "1" }, payee: { user: "2" } };
  assert.ok(canAccessSettlement(settlement, { id: "2" }));
  assert.ok(!canAccessSettlement(settlement, stranger));
});

// ---- equivalence with the original inline implementation ----
const legacyBalance = (expenses, settlements, uIdStr, userEmail, frUserId, frEmail) => {
  const mine = (p) => (p.user && String(p.user) === uIdStr) || (userEmail && p.email && p.email.toLowerCase() === userEmail);
  const theirs = (p) => (frUserId && p.user && String(p.user) === frUserId) || (frEmail && p.email && p.email.toLowerCase() === frEmail);
  const tot = (list, f, field) => (list || []).filter(f).reduce((s, p) => s + toCents(p[field]), 0);
  let bal = 0;
  expenses.forEach((exp) => {
    const userPaid = tot(exp.paidBy, mine, "amount");
    const friendPaid = tot(exp.paidBy, theirs, "amount");
    const userShare = tot(exp.participants, mine, "shareAmount");
    const friendShare = tot(exp.participants, theirs, "shareAmount");
    if (userPaid > 0 && friendShare > 0) {
      const t = toCents(exp.amount);
      if (t > 0) bal += Math.round(friendShare * (userPaid / t));
    }
    if (friendPaid > 0 && userShare > 0) {
      const t = toCents(exp.amount);
      if (t > 0) bal -= Math.round(userShare * (friendPaid / t));
    }
  });
  settlements.forEach((s) => {
    if (mine(s.payer) && theirs(s.payee)) bal += toCents(s.amount);
    if (theirs(s.payer) && mine(s.payee)) bal -= toCents(s.amount);
  });
  return bal;
};

test("pairwiseBalanceCents matches the original implementation on random data", () => {
  let seed = 42;
  const rnd = (n) => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) % n);
  const people = [
    { user: "1", email: "me@x.com" },
    { user: "2", email: "f@x.com" },
    { user: null, email: "f@x.com" },
    { user: "3", email: "" },
  ];
  const pick = () => people[rnd(people.length)];

  for (let run = 0; run < 300; run++) {
    const expenses = Array.from({ length: rnd(6) }, () => {
      const amount = (rnd(50000) + 1) / 100;
      return {
        amount,
        paidBy: [{ ...pick(), amount: amount / 2 }, { ...pick(), amount: amount / 2 }],
        participants: [{ ...pick(), shareAmount: amount / 3 }, { ...pick(), shareAmount: amount / 3 }],
      };
    });
    const settlements = Array.from({ length: rnd(4) }, () => ({ payer: pick(), payee: pick(), amount: rnd(5000) / 100 + 1 }));

    const expected = legacyBalance(expenses, settlements, "1", "me@x.com", "2", "f@x.com");
    const actual = pairwiseBalanceCents({ expenses, settlements, me: { id: "1", email: "me@x.com" }, friend: { id: "2", email: "f@x.com" } });
    assert.equal(actual, expected);
  }
});

test("sameParty handles populated user objects and missing data", () => {
  assert.ok(sameParty({ user: { _id: "1" } }, { id: "1" }));
  assert.ok(!sameParty(null, { id: "1" }));
  assert.ok(!sameParty({ user: null, email: "" }, { id: "1", email: "" }));
});

test("a name-only contact is matched by name; one with an id or email is never matched by name", () => {
  const me = { id: "1", email: "me@x.com" };
  const nameOnly = { name: "Sita" };
  const expenses = [{ amount: 100, paidBy: [{ user: "1", amount: 100 }], participants: [{ name: "sita", shareAmount: 40 }, { user: "1", shareAmount: 60 }] }];
  const settlements = [{ payer: { name: "Sita" }, payee: { user: "1" }, amount: 15 }];

  assert.equal(pairwiseBalanceCents({ expenses, settlements: [], me, friend: nameOnly }), 4000);
  assert.equal(pairwiseBalanceCents({ expenses, settlements, me, friend: nameOnly }), 2500);
  // same display name but a different registered person: must not match
  assert.equal(pairwiseBalanceCents({ expenses, settlements: [], me, friend: { id: "9", name: "Sita" } }), 0);
});
