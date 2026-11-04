const { toCents, fromCents } = require("./splitCalculations");

// `me` / `friend` look like { id: "<userId>", email: "lowercase@email", name } (id/email may be missing).
// A contact with neither an id nor an email (a plain name in someone's friend list) can only be matched by name.
const idOf = (ref) => (ref ? String(ref._id || ref) : null);

// Does this payer / participant / member / settlement party refer to that person?
const sameParty = (entity, person) => {
  if (!entity || !person) return false;
  if (person.id && entity.user && idOf(entity.user) === String(person.id)) return true;
  if (person.email && entity.email && entity.email.toLowerCase() === person.email) return true;
  if (!person.id && !person.email && person.name && entity.name) {
    return entity.name.trim().toLowerCase() === person.name.trim().toLowerCase();
  }
  return false;
};

const isGroupMember = (group, me) =>
  !!group && (idOf(group.creator) === me.id || (group.members || []).some((m) => sameParty(m, me)));

const involvesPerson = (parties, person) => (parties || []).some((p) => sameParty(p, person));

// Who may view/edit/delete an expense: people on it, its creator, or members of its group.
const canAccessExpense = (expense, me, group = null) =>
  idOf(expense.createdBy) === me.id ||
  involvesPerson(expense.paidBy, me) ||
  involvesPerson(expense.participants, me) ||
  isGroupMember(group, me);

const canAccessSettlement = (settlement, me, group = null) =>
  idOf(settlement.createdBy) === me.id ||
  sameParty(settlement.payer, me) ||
  sameParty(settlement.payee, me) ||
  isGroupMember(group, me);

const sumCents = (parties, person, field) =>
  (parties || []).filter((p) => sameParty(p, person)).reduce((sum, p) => sum + toCents(p[field]), 0);

// Net money between two people across all given expenses/settlements, in cents.
// Positive: `friend` owes `me`. Negative: `me` owes `friend`.
const pairwiseBalanceCents = ({ expenses = [], settlements = [], me, friend }) => {
  let balance = 0;

  expenses.forEach((exp) => {
    const total = toCents(exp.amount);
    if (total <= 0) return;

    const mePaid = sumCents(exp.paidBy, me, "amount");
    const friendPaid = sumCents(exp.paidBy, friend, "amount");
    const meShare = sumCents(exp.participants, me, "shareAmount");
    const friendShare = sumCents(exp.participants, friend, "shareAmount");

    if (mePaid > 0 && friendShare > 0) balance += Math.round(friendShare * (mePaid / total));
    if (friendPaid > 0 && meShare > 0) balance -= Math.round(meShare * (friendPaid / total));
  });

  settlements.forEach((s) => {
    const cents = toCents(s.amount);
    if (sameParty(s.payer, me) && sameParty(s.payee, friend)) balance += cents;
    if (sameParty(s.payer, friend) && sameParty(s.payee, me)) balance -= cents;
  });

  return balance;
};

const pairwiseBalance = (args) => fromCents(pairwiseBalanceCents(args));

module.exports = {
  sameParty,
  isGroupMember,
  canAccessExpense,
  canAccessSettlement,
  pairwiseBalanceCents,
  pairwiseBalance,
};
