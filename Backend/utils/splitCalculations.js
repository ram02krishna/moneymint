/**
 * Financial calculation and debt simplification utilities for Split Expenses
 */

// Round to 2 decimal places to prevent IEEE-754 float drift
const round2 = (num) => {
  if (num == null || isNaN(num)) return 0;
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
};

// Convert to integer cents
const toCents = (num) => Math.round(Number(num || 0) * 100);

// Convert integer cents back to dollars/rupees
const fromCents = (cents) => round2(cents / 100);

/**
 * Calculates accurate shares for participants based on the split method.
 * Guaranteed: sum of participant shareAmounts strictly equals total amount (to the exact cent/paisa).
 */
const calculateShares = ({
  amount,
  splitMethod = "equal",
  participants = [],
  itemDetails = [],
  tax = 0,
  tip = 0,
}) => {
  const totalCents = toCents(amount);
  const n = participants.length;

  if (n === 0) {
    throw new Error("At least one participant is required");
  }

  if (totalCents <= 0) {
    throw new Error("Total amount must be greater than zero");
  }

  const result = participants.map((p) => ({
    user: p.user || null,
    name: p.name,
    email: p.email || "",
    shareAmount: 0,
    percentage: p.percentage ?? null,
    shares: p.shares ?? null,
  }));

  if (splitMethod === "equal") {
    const baseCents = Math.floor(totalCents / n);
    let remainder = totalCents - baseCents * n;

    for (let i = 0; i < n; i++) {
      let shareCents = baseCents;
      if (remainder > 0) {
        shareCents += 1;
        remainder -= 1;
      }
      result[i].shareAmount = fromCents(shareCents);
    }
  } else if (splitMethod === "exact") {
    let sumCents = 0;
    for (let i = 0; i < n; i++) {
      const shareCents = toCents(participants[i].shareAmount || 0);
      sumCents += shareCents;
      result[i].shareAmount = fromCents(shareCents);
    }

    if (sumCents !== totalCents) {
      const diff = fromCents(totalCents - sumCents);
      throw new Error(
        `The sum of exact shares (₹${fromCents(sumCents)}) does not match total amount (₹${fromCents(totalCents)}). Difference: ₹${Math.abs(diff)}`,
      );
    }
  } else if (splitMethod === "percentage") {
    let totalPct = 0;
    for (let i = 0; i < n; i++) {
      totalPct += Number(participants[i].percentage || 0);
    }

    if (Math.abs(totalPct - 100) > 0.05) {
      throw new Error(
        `Total percentage must equal 100%. Current sum is ${round2(totalPct)}%`,
      );
    }

    let allocatedCents = 0;
    let maxIdx = 0;
    let maxPct = -1;

    for (let i = 0; i < n; i++) {
      const pct = Number(participants[i].percentage || 0);
      if (pct > maxPct) {
        maxPct = pct;
        maxIdx = i;
      }
      const shareCents = Math.round((totalCents * pct) / 100);
      allocatedCents += shareCents;
      result[i].shareAmount = fromCents(shareCents);
      result[i].percentage = pct;
    }

    // Distribute remainder cent difference to largest share
    const diff = totalCents - allocatedCents;
    if (diff !== 0) {
      const currentCents = toCents(result[maxIdx].shareAmount);
      result[maxIdx].shareAmount = fromCents(currentCents + diff);
    }
  } else if (splitMethod === "shares") {
    let totalShares = 0;
    for (let i = 0; i < n; i++) {
      const s = Number(participants[i].shares || 0);
      if (s <= 0) throw new Error("Each participant must have at least 1 share");
      totalShares += s;
    }

    let allocatedCents = 0;
    let maxIdx = 0;
    let maxShares = -1;

    for (let i = 0; i < n; i++) {
      const s = Number(participants[i].shares || 0);
      if (s > maxShares) {
        maxShares = s;
        maxIdx = i;
      }
      const shareCents = Math.round((totalCents * s) / totalShares);
      allocatedCents += shareCents;
      result[i].shareAmount = fromCents(shareCents);
      result[i].shares = s;
    }

    const diff = totalCents - allocatedCents;
    if (diff !== 0) {
      const currentCents = toCents(result[maxIdx].shareAmount);
      result[maxIdx].shareAmount = fromCents(currentCents + diff);
    }
  } else if (splitMethod === "itemized") {
    // Participant identifier helper
    const getParticipantKey = (p) =>
      p.user ? String(p.user) : p.name.trim().toLowerCase();

    const subtotalMap = {};
    participants.forEach((p) => {
      subtotalMap[getParticipantKey(p)] = 0;
    });

    // Sum line items per assigned participant
    (itemDetails || []).forEach((item) => {
      const priceCents = toCents(item.price);
      const assigned = item.assignedTo || [];
      if (assigned.length === 0) return;

      const baseCents = Math.floor(priceCents / assigned.length);
      let remainder = priceCents - baseCents * assigned.length;

      assigned.forEach((target) => {
        let amt = baseCents;
        if (remainder > 0) {
          amt += 1;
          remainder -= 1;
        }
        if (subtotalMap[target] !== undefined) {
          subtotalMap[target] += amt;
        }
      });
    });

    const totalSubtotalCents = Object.values(subtotalMap).reduce(
      (a, b) => a + b,
      0,
    );
    const taxCents = toCents(tax);
    const tipCents = toCents(tip);
    const extraCents = taxCents + tipCents;

    let allocatedCents = 0;
    let maxIdx = 0;
    let maxSubtotal = -1;

    for (let i = 0; i < n; i++) {
      const key = getParticipantKey(participants[i]);
      const userSubtotalCents = subtotalMap[key] || 0;
      if (userSubtotalCents > maxSubtotal) {
        maxSubtotal = userSubtotalCents;
        maxIdx = i;
      }

      let extraShareCents = 0;
      if (totalSubtotalCents > 0 && extraCents > 0) {
        extraShareCents = Math.round(
          (userSubtotalCents / totalSubtotalCents) * extraCents,
        );
      }

      const totalUserCents = userSubtotalCents + extraShareCents;
      allocatedCents += totalUserCents;
      result[i].shareAmount = fromCents(totalUserCents);
    }

    // Reconcile any 1-cent rounding difference with total amount
    const diff = totalCents - allocatedCents;
    if (diff !== 0) {
      const currentCents = toCents(result[maxIdx].shareAmount);
      result[maxIdx].shareAmount = fromCents(currentCents + diff);
    }
  }

  return result;
};

/**
 * Standard identifier for a person in split calculations
 */
const personId = (entity) => {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  if (entity.user) return String(entity.user._id || entity.user);
  if (entity._id) return String(entity._id);
  return entity.name ? entity.name.trim().toLowerCase() : "";
};

/**
 * Calculate net balances for each person across a set of expenses and settlements.
 *
 * For each person:
 * netBalance = totalAmountPaid - totalShareConsumed + settlementsReceived - settlementsPaid
 *
 * If netBalance > 0: Person is owed money (creditor)
 * If netBalance < 0: Person owes money (debtor)
 * Sum of all netBalances in a closed group is always 0.
 */
const calculateNetBalances = ({ members = [], expenses = [], settlements = [] }) => {
  const netBalances = {};
  const memberMap = {};

  members.forEach((m) => {
    const id = personId(m);
    netBalances[id] = 0;
    memberMap[id] = {
      id,
      user: m.user || null,
      name: m.name || "Member",
      email: m.email || "",
    };
  });

  // Process expenses
  expenses.forEach((exp) => {
    // Record amounts paid
    (exp.paidBy || []).forEach((p) => {
      const id = personId(p);
      if (netBalances[id] === undefined) {
        netBalances[id] = 0;
        memberMap[id] = { id, user: p.user || null, name: p.name, email: p.email || "" };
      }
      netBalances[id] += toCents(p.amount);
    });

    // Record shares consumed
    (exp.participants || []).forEach((p) => {
      const id = personId(p);
      if (netBalances[id] === undefined) {
        netBalances[id] = 0;
        memberMap[id] = { id, user: p.user || null, name: p.name, email: p.email || "" };
      }
      netBalances[id] -= toCents(p.shareAmount);
    });
  });

  // Process settlements
  settlements.forEach((s) => {
    const payerId = personId(s.payer);
    const payeeId = personId(s.payee);
    const amountCents = toCents(s.amount);

    if (netBalances[payerId] === undefined) {
      netBalances[payerId] = 0;
      memberMap[payerId] = {
        id: payerId,
        user: s.payer.user || null,
        name: s.payer.name,
        email: s.payer.email || "",
      };
    }
    if (netBalances[payeeId] === undefined) {
      netBalances[payeeId] = 0;
      memberMap[payeeId] = {
        id: payeeId,
        user: s.payee.user || null,
        name: s.payee.name,
        email: s.payee.email || "",
      };
    }

    // Payer paid, so their net balance increases (they owe less or are owed more)
    netBalances[payerId] += amountCents;
    // Payee received, so their net balance decreases (they are owed less)
    netBalances[payeeId] -= amountCents;
  });

  const formatted = {};
  Object.keys(netBalances).forEach((id) => {
    formatted[id] = fromCents(netBalances[id]);
  });

  return { netBalances: formatted, memberMap };
};

/**
 * Splitwise Debt Simplification Algorithm
 *
 * Reduces N pairwise debts to at most N-1 transactions using greedy credit/debt matching.
 * Given net balances for each person, pairs the person who owes the most with
 * the person who is owed the most until all balances are zero.
 */
const simplifyDebts = (netBalances, memberMap = {}) => {
  const creditors = []; // { id, amountCents }
  const debtors = []; // { id, amountCents }

  Object.entries(netBalances).forEach(([id, amt]) => {
    const cents = toCents(amt);
    if (cents > 0) {
      creditors.push({ id, amountCents: cents });
    } else if (cents < 0) {
      debtors.push({ id, amountCents: -cents });
    }
  });

  // Sort descending by amount
  creditors.sort((a, b) => b.amountCents - a.amountCents);
  debtors.sort((a, b) => b.amountCents - a.amountCents);

  const transactions = [];

  let cIdx = 0;
  let dIdx = 0;

  while (cIdx < creditors.length && dIdx < debtors.length) {
    const creditor = creditors[cIdx];
    const debtor = debtors[dIdx];

    const settledCents = Math.min(creditor.amountCents, debtor.amountCents);

    if (settledCents > 0) {
      transactions.push({
        from: debtor.id,
        fromMember: memberMap[debtor.id] || { id: debtor.id, name: debtor.id },
        to: creditor.id,
        toMember: memberMap[creditor.id] || { id: creditor.id, name: creditor.id },
        amount: fromCents(settledCents),
      });
    }

    creditor.amountCents -= settledCents;
    debtor.amountCents -= settledCents;

    if (creditor.amountCents <= 0) cIdx++;
    if (debtor.amountCents <= 0) dIdx++;
  }

  return transactions;
};

/**
 * Pairwise detailed ledger (non-simplified debts):
 * Directly tracks who owes who from each expense and settlement.
 */
const calculateDetailedDebts = (expenses = [], settlements = [], memberMap = {}) => {
  // Directed graph: debtMatrix[debtorId][creditorId] = cents
  const debtMatrix = {};

  const ensureEntry = (u1, u2) => {
    if (!debtMatrix[u1]) debtMatrix[u1] = {};
    if (!debtMatrix[u1][u2]) debtMatrix[u1][u2] = 0;
    if (!debtMatrix[u2]) debtMatrix[u2] = {};
    if (!debtMatrix[u2][u1]) debtMatrix[u2][u1] = 0;
  };

  expenses.forEach((exp) => {
    const payers = exp.paidBy || [];
    const participants = exp.participants || [];

    if (payers.length === 1) {
      const payerId = personId(payers[0]);
      participants.forEach((p) => {
        const participantId = personId(p);
        if (participantId !== payerId) {
          ensureEntry(participantId, payerId);
          debtMatrix[participantId][payerId] += toCents(p.shareAmount);
        }
      });
    } else {
      // Multiple payers: each person's net contribution to this expense
      const netCentsMap = {};
      payers.forEach((p) => {
        const id = personId(p);
        netCentsMap[id] = (netCentsMap[id] || 0) + toCents(p.amount);
      });
      participants.forEach((p) => {
        const id = personId(p);
        netCentsMap[id] = (netCentsMap[id] || 0) - toCents(p.shareAmount);
      });

      // Splitwise style greedy matching within single expense
      const localCreditors = [];
      const localDebtors = [];
      Object.entries(netCentsMap).forEach(([id, amt]) => {
        if (amt > 0) localCreditors.push({ id, cents: amt });
        else if (amt < 0) localDebtors.push({ id, cents: -amt });
      });

      localCreditors.sort((a, b) => b.cents - a.cents);
      localDebtors.sort((a, b) => b.cents - a.cents);

      let cI = 0;
      let dI = 0;
      while (cI < localCreditors.length && dI < localDebtors.length) {
        const settle = Math.min(localCreditors[cI].cents, localDebtors[dI].cents);
        const from = localDebtors[dI].id;
        const to = localCreditors[cI].id;
        ensureEntry(from, to);
        debtMatrix[from][to] += settle;

        localCreditors[cI].cents -= settle;
        localDebtors[dI].cents -= settle;
        if (localCreditors[cI].cents <= 0) cI++;
        if (localDebtors[dI].cents <= 0) dI++;
      }
    }
  });

  // Apply settlements
  settlements.forEach((s) => {
    const from = personId(s.payer);
    const to = personId(s.payee);
    ensureEntry(from, to);
    // Payer paying payee reduces debtMatrix[from][to]
    debtMatrix[from][to] -= toCents(s.amount);
  });

  // Consolidate bilateral debts (if A owes B 100 and B owes A 40 -> A owes B 60)
  const results = [];
  const processedPairs = new Set();

  Object.keys(debtMatrix).forEach((u1) => {
    Object.keys(debtMatrix[u1]).forEach((u2) => {
      const pairKey = [u1, u2].sort().join("::");
      if (processedPairs.has(pairKey)) return;
      processedPairs.add(pairKey);

      const u1OwesU2 = debtMatrix[u1]?.[u2] || 0;
      const u2OwesU1 = debtMatrix[u2]?.[u1] || 0;
      const net = u1OwesU2 - u2OwesU1;

      if (net > 0) {
        results.push({
          from: u1,
          fromMember: memberMap[u1] || { id: u1, name: u1 },
          to: u2,
          toMember: memberMap[u2] || { id: u2, name: u2 },
          amount: fromCents(net),
        });
      } else if (net < 0) {
        results.push({
          from: u2,
          fromMember: memberMap[u2] || { id: u2, name: u2 },
          to: u1,
          toMember: memberMap[u1] || { id: u1, name: u1 },
          amount: fromCents(-net),
        });
      }
    });
  });

  return results;
};

module.exports = {
  round2,
  toCents,
  fromCents,
  personId,
  calculateShares,
  calculateNetBalances,
  simplifyDebts,
  calculateDetailedDebts,
};

