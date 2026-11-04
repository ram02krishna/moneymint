export const CATEGORIES = [
  { id: "Food & Dining", name: "Food & Dining", icon: "🍔" },
  { id: "Transportation", name: "Transportation", icon: "🚕" },
  { id: "Accommodation", name: "Accommodation", icon: "🏨" },
  { id: "Entertainment", name: "Entertainment", icon: "🎟️" },
  { id: "Groceries", name: "Groceries", icon: "🛒" },
  { id: "Utilities", name: "Utilities", icon: "💡" },
  { id: "Shopping", name: "Shopping", icon: "🛍️" },
  { id: "Travel", name: "Travel", icon: "✈️" },
  { id: "General", name: "General", icon: "🧾" },
  { id: "Other", name: "Other", icon: "📦" },
];

export const GROUP_CATEGORIES = [
  { id: "Trip", name: "Trip / Vacation", icon: "✈️" },
  { id: "Home", name: "Home / Flat", icon: "🏠" },
  { id: "Roommates", name: "Roommates", icon: "🛋️" },
  { id: "Couple", name: "Couple", icon: "💑" },
  { id: "Office", name: "Office / Work", icon: "🏢" },
  { id: "Friends", name: "Friends / Outing", icon: "🍻" },
  { id: "Project", name: "Project / Event", icon: "🎯" },
  { id: "Other", name: "Other", icon: "👥" },
];

export const PAYMENT_METHODS = [
  { id: "UPI", name: "UPI (Google Pay, PhonePe, Paytm)", icon: "📱" },
  { id: "Cash", name: "Cash", icon: "💵" },
  { id: "Bank Transfer", name: "Bank Transfer (NEFT/IMPS)", icon: "🏦" },
  { id: "PayPal", name: "PayPal", icon: "🌐" },
  { id: "Card", name: "Debit / Credit Card", icon: "💳" },
  { id: "Other", name: "Other", icon: "🧾" },
];

export const SPLIT_METHODS = [
  {
    id: "equal",
    label: "Equally",
    symbol: "=",
    description: "Split equally among selected participants",
  },
  {
    id: "exact",
    label: "Exact Amounts",
    symbol: "123",
    description: "Specify the exact amount each person owes",
  },
  {
    id: "percentage",
    label: "Percentages",
    symbol: "%",
    description: "Specify the percentage share for each person",
  },
  {
    id: "shares",
    label: "Shares / Ratios",
    symbol: "⚖️",
    description: "Specify portions (e.g. 1 share, 2 shares)",
  },
  {
    id: "itemized",
    label: "Itemized",
    symbol: "📋",
    description: "Assign individual line items plus tax & tip",
  },
];

/**
 * Client-side preview of share calculations
 */
export const previewShares = ({
  amount,
  splitMethod = "equal",
  participants = [],
  itemDetails = [],
  tax = 0,
  tip = 0,
}) => {
  const numAmount = Number(amount || 0);
  const n = participants.length;
  if (n === 0 || numAmount <= 0) {
    return participants.map((p) => ({ ...p, shareAmount: 0 }));
  }

  const totalCents = Math.round(numAmount * 100);

  if (splitMethod === "equal") {
    const baseCents = Math.floor(totalCents / n);
    let remainder = totalCents - baseCents * n;
    return participants.map((p) => {
      let cents = baseCents;
      if (remainder > 0) {
        cents += 1;
        remainder -= 1;
      }
      return { ...p, shareAmount: cents / 100 };
    });
  }

  if (splitMethod === "exact") {
    return participants.map((p) => ({
      ...p,
      shareAmount: Number(p.shareAmount || 0),
    }));
  }

  if (splitMethod === "percentage") {
    let allocatedCents = 0;
    let maxIdx = 0;
    let maxPct = -1;

    const res = participants.map((p, idx) => {
      const pct = Number(p.percentage || 0);
      if (pct > maxPct) {
        maxPct = pct;
        maxIdx = idx;
      }
      const cents = Math.round((totalCents * pct) / 100);
      allocatedCents += cents;
      return { ...p, shareAmount: cents / 100 };
    });

    const diff = totalCents - allocatedCents;
    if (diff !== 0 && res[maxIdx]) {
      res[maxIdx].shareAmount = Math.round((res[maxIdx].shareAmount * 100) + diff) / 100;
    }
    return res;
  }

  if (splitMethod === "shares") {
    const totalShares = participants.reduce(
      (sum, p) => sum + Number(p.shares || 1),
      0,
    );
    if (totalShares <= 0) return participants.map((p) => ({ ...p, shareAmount: 0 }));

    let allocatedCents = 0;
    let maxIdx = 0;
    let maxS = -1;

    const res = participants.map((p, idx) => {
      const s = Number(p.shares || 1);
      if (s > maxS) {
        maxS = s;
        maxIdx = idx;
      }
      const cents = Math.round((totalCents * s) / totalShares);
      allocatedCents += cents;
      return { ...p, shareAmount: cents / 100 };
    });

    const diff = totalCents - allocatedCents;
    if (diff !== 0 && res[maxIdx]) {
      res[maxIdx].shareAmount = Math.round((res[maxIdx].shareAmount * 100) + diff) / 100;
    }
    return res;
  }

  if (splitMethod === "itemized") {
    const subtotalMap = {};
    participants.forEach((p) => {
      const key = p.user || p.id || p.name;
      subtotalMap[key] = 0;
    });

    (itemDetails || []).forEach((item) => {
      const itemPriceCents = Math.round(Number(item.price || 0) * 100);
      const assigned = item.assignedTo || [];
      if (assigned.length === 0) return;

      const base = Math.floor(itemPriceCents / assigned.length);
      let rem = itemPriceCents - base * assigned.length;

      assigned.forEach((targetKey) => {
        let cents = base;
        if (rem > 0) {
          cents += 1;
          rem -= 1;
        }
        if (subtotalMap[targetKey] !== undefined) {
          subtotalMap[targetKey] += cents;
        }
      });
    });

    const totalSubCents = Object.values(subtotalMap).reduce((a, b) => a + b, 0);
    const extraCents = Math.round((Number(tax || 0) + Number(tip || 0)) * 100);

    let allocatedCents = 0;
    let maxIdx = 0;
    let maxSub = -1;

    const res = participants.map((p, idx) => {
      const key = p.user || p.id || p.name;
      const userSub = subtotalMap[key] || 0;
      if (userSub > maxSub) {
        maxSub = userSub;
        maxIdx = idx;
      }

      let extraShare = 0;
      if (totalSubCents > 0 && extraCents > 0) {
        extraShare = Math.round((userSub / totalSubCents) * extraCents);
      }
      const totalUserCents = userSub + extraShare;
      allocatedCents += totalUserCents;
      return { ...p, shareAmount: totalUserCents / 100 };
    });

    const diff = totalCents - allocatedCents;
    if (diff !== 0 && res[maxIdx]) {
      res[maxIdx].shareAmount = Math.round((res[maxIdx].shareAmount * 100) + diff) / 100;
    }
    return res;
  }

  return participants;
};
