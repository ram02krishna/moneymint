export const inr = (n) => {
  const num = Number(n) || 0;
  return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};

export const pad = (n) => String(n).padStart(2, "0");

// yyyy-mm-dd in LOCAL time (what the backend + date inputs expect)
export const toDateString = (value) => {
  let d = value ? new Date(value) : new Date();
  if (isNaN(d.getTime())) d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const parseDateString = (s) => {
  if (!s) return new Date();
  const [y, m, d] = String(s).slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

export const monthLabel = (d) =>
  d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

export const shortDate = (value) =>
  new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export const capitalize = (s = "") => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

export const progressTone = (pct, colors) =>
  pct >= 100 ? colors.danger : pct >= 75 ? colors.warn : colors.success;

// small emoji per category so lists feel alive without image URLs
const EMOJI = [
  [/food|dining|restaurant|grocer|swiggy|zomato/i, "🍔"],
  [/transport|fuel|petrol|uber|ola|cab|metro|bus/i, "🚌"],
  [/shop|cloth|amazon|flipkart/i, "🛍️"],
  [/rent|home|house|emi/i, "🏠"],
  [/bill|electric|water|internet|recharge|phone/i, "💡"],
  [/entertain|movie|netflix|game/i, "🎬"],
  [/health|medic|doctor|pharm/i, "💊"],
  [/educat|course|book|school|fee/i, "🎓"],
  [/travel|trip|flight|hotel/i, "✈️"],
  [/salary|wage|job/i, "💼"],
  [/freelance|business|client/i, "💻"],
  [/invest|stock|mutual|interest|dividend/i, "📈"],
  [/gift|bonus/i, "🎁"],
];
export const emojiFor = (text = "", type) => {
  for (const [re, e] of EMOJI) if (re.test(text)) return e;
  return type === "income" ? "💰" : "🧾";
};
