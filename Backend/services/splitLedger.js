const SharedExpense = require("../models/SharedExpense");
const Settlement = require("../models/Settlement");

const toCents = (value) => Math.round(Number(value || 0) * 100);
const fromCents = (value) => Number((value / 100).toFixed(2));
const idOf = (value) => String(value?._id || value?.user?._id || value?.user || value);

// Largest-remainder allocation guarantees that participant amounts sum to the
// exact total in cents, including uneven splits such as ₹100 / 3 people.
const allocateCents = (totalCents, weights) => {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (!weights.length || totalWeight <= 0) throw new Error("At least one participant with a positive split is required");
  const allocations = weights.map((weight, index) => {
    const raw = (totalCents * weight) / totalWeight;
    return { index, cents: Math.floor(raw), remainder: raw - Math.floor(raw) };
  });
  let remainder = totalCents - allocations.reduce((sum, item) => sum + item.cents, 0);
  allocations.sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let i = 0; i < remainder; i += 1) allocations[i % allocations.length].cents += 1;
  allocations.sort((a, b) => a.index - b.index);
  return allocations.map((item) => item.cents);
};

const normalizeParticipants = ({ amountCents, splitType, participants, memberById }) => {
  if (!Array.isArray(participants) || participants.length === 0) throw new Error("Select at least one participant");
  const seen = new Set();
  const selected = participants.map((entry) => {
    const userId = String(entry.userId || entry.user || "");
    if (!userId || seen.has(userId)) throw new Error("Participants must be unique group members");
    seen.add(userId);
    const member = memberById.get(userId);
    if (!member) throw new Error("Every participant must belong to this group");
    return { entry, userId, member };
  });

  let cents;
  if (splitType === "exact") {
    cents = selected.map(({ entry }) => toCents(entry.amount));
    if (cents.some((value) => !Number.isFinite(value) || value < 0)) throw new Error("Exact split amounts must be zero or more");
    if (cents.reduce((sum, value) => sum + value, 0) !== amountCents) throw new Error("Exact split amounts must add up to the expense total");
  } else {
    let weights;
    if (splitType === "equal") weights = selected.map(() => 1);
    else if (splitType === "percentage") {
      weights = selected.map(({ entry }) => Number(entry.percentage));
      if (weights.some((v) => !Number.isFinite(v) || v < 0)) throw new Error("Percentages must be zero or more");
      const sum = weights.reduce((total, value) => total + value, 0);
      if (Math.abs(sum - 100) > 0.05) throw new Error("Participant percentages must add up to 100%");
    } else if (splitType === "shares") {
      weights = selected.map(({ entry }) => Number(entry.shares));
      if (weights.some((v) => !Number.isFinite(v) || v < 0)) throw new Error("Shares must be zero or more");
    } else throw new Error("Unsupported split type");
    cents = allocateCents(amountCents, weights);
  }

  return selected.map(({ entry, member }, index) => ({
    user: member.user._id || member.user,
    fullName: member.user.fullName,
    email: member.user.email,
    amount: fromCents(cents[index]),
    ...(splitType === "percentage" ? { percentage: Number(entry.percentage) } : {}),
    ...(splitType === "shares" ? { shares: Number(entry.shares) } : {}),
  }));
};

const buildBalances = (members, expenses, settlements) => {
  const balances = new Map();
  members.forEach((member) => {
    const user = member.user || member;
    const id = idOf(user);
    balances.set(id, { userId: id, fullName: user.fullName, email: user.email, balanceCents: 0 });
  });

  expenses.forEach((expense) => {
    const paidBy = idOf(expense.paidBy);
    if (balances.has(paidBy)) balances.get(paidBy).balanceCents += toCents(expense.amount);
    expense.participants.forEach((participant) => {
      const id = idOf(participant.user);
      if (balances.has(id)) balances.get(id).balanceCents -= toCents(participant.amount);
    });
  });

  // A settlement transfers value from a debtor to a creditor: it reduces both
  // parties' outstanding net positions without changing historical expenses.
  settlements.forEach((settlement) => {
    const from = idOf(settlement.from);
    const to = idOf(settlement.to);
    const amount = toCents(settlement.amount);
    if (balances.has(from)) balances.get(from).balanceCents += amount;
    if (balances.has(to)) balances.get(to).balanceCents -= amount;
  });

  return [...balances.values()].map(({ balanceCents, ...member }) => ({
    ...member,
    balance: fromCents(balanceCents),
    balanceCents,
  }));
};

const simplifyDebts = (balances) => {
  const debtors = balances.filter((item) => item.balanceCents < 0).map((item) => ({ ...item, remaining: -item.balanceCents }));
  const creditors = balances.filter((item) => item.balanceCents > 0).map((item) => ({ ...item, remaining: item.balanceCents }));
  const debts = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const cents = Math.min(debtors[i].remaining, creditors[j].remaining);
    if (cents > 0) debts.push({ fromUserId: debtors[i].userId, fromName: debtors[i].fullName, toUserId: creditors[j].userId, toName: creditors[j].fullName, amount: fromCents(cents) });
    debtors[i].remaining -= cents;
    creditors[j].remaining -= cents;
    if (debtors[i].remaining === 0) i += 1;
    if (creditors[j].remaining === 0) j += 1;
  }
  return debts;
};

const getGroupLedger = async (groupId, members) => {
  const [expenses, settlements] = await Promise.all([
    SharedExpense.find({ group: groupId }).sort({ date: -1, createdAt: -1 }).lean(),
    Settlement.find({ group: groupId }).sort({ date: -1, createdAt: -1 }).lean(),
  ]);
  const balances = buildBalances(members, expenses, settlements);
  const history = [
    ...expenses.map((expense) => ({ type: "expense", _id: String(expense._id), title: expense.title, amount: expense.amount, date: expense.date, createdAt: expense.createdAt, paidBy: String(expense.paidBy), paidByName: expense.paidByName, recordedByUserId: String(expense.createdBy), category: expense.category, splitType: expense.splitType, participants: expense.participants.map((p) => ({ userId: String(p.user), fullName: p.fullName, amount: p.amount })), note: expense.note })),
    ...settlements.map((settlement) => ({ type: "settlement", _id: String(settlement._id), amount: settlement.amount, date: settlement.date, createdAt: settlement.createdAt, fromUserId: String(settlement.from), fromName: settlement.fromName, toUserId: String(settlement.to), toName: settlement.toName, recordedByUserId: String(settlement.createdBy), note: settlement.note })),
  ].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  return { expenses, settlements, balances, suggestedDebts: simplifyDebts(balances), history };
};

module.exports = { toCents, fromCents, allocateCents, normalizeParticipants, buildBalances, getGroupLedger, simplifyDebts };
