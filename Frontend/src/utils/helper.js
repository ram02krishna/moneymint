// check email format
export let validateEmail = (email) => {
  let regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// get name initials
export let getInitials = (name) => {
  if (!name) return "";

  let words = name.split(" ");
  let initials = "";

  for (let i = 0; i < Math.min(words.length, 2); i++) {
    initials += words[i][0];
  }

  return initials.toUpperCase();
};

// add commas to numbers with proper Indian currency formatting
export let addThousandsSeparator = (num) => {
  if (num == null || isNaN(num) || num === "") return "0";
  const n = Number(num);
  if (isNaN(n)) return String(num);
  if (Number.isInteger(n)) {
    return n.toLocaleString("en-IN");
  }
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export let prepareExpenseLineChartData = (data = []) => {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  let sortedData = [...data].sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  );

  let dayMap = {};
  for (let i = 0; i < sortedData.length; i++) {
    let item = sortedData[i];
    if (!item) continue;
    let d = new Date(item.date);
    if (isNaN(d.getTime())) continue;

    let dayKey = d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });

    if (!dayMap[dayKey]) {
      dayMap[dayKey] = 0;
    }
    dayMap[dayKey] += item.amount || 0;
  }

  let chartData = [];
  for (let dateStr in dayMap) {
    chartData.push({
      month: dateStr,
      amount: dayMap[dateStr],
    });
  }

  return chartData;
};

export let prepareIncomeBarChartData = (data = []) => {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  let sortedData = [...data].sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  );

  let dayMap = {};
  for (let i = 0; i < sortedData.length; i++) {
    let item = sortedData[i];
    if (!item) continue;
    let d = new Date(item.date);
    if (isNaN(d.getTime())) continue;

    let dayKey = d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });

    if (!dayMap[dayKey]) {
      dayMap[dayKey] = 0;
    }
    dayMap[dayKey] += item.amount || 0;
  }

  let chartData = [];
  for (let dateStr in dayMap) {
    chartData.push({
      month: dateStr,
      amount: dayMap[dateStr],
    });
  }

  return chartData;
};

export const CHART_COLORS = [
  "#875CF5",
  "#FA2C37",
  "#FF6900",
  "#4ADE80",
  "#3B82F6",
  "#ec4899",
  "#06b6d4",
  "#f59e0b",
  "#6366f1",
  "#14b8a6",
  "#a855f7",
  "#0ea5e9",
];

// pull a readable message out of an axios error
export const getErrorMessage = (error, fallback = "Something went wrong") => {
  let data = error?.response?.data;
  if (data?.errors?.length) return data.errors[0].msg || fallback;
  return data?.message || fallback;
};

// yyyy-mm-dd for <input type="date"> (local time, not UTC)
export const toInputDate = (value) => {
  let d = value ? new Date(value) : new Date();
  if (isNaN(d.getTime())) d = new Date();
  let y = d.getFullYear();
  let m = String(d.getMonth() + 1).padStart(2, "0");
  let day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const formatShortDate = (value) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const capitalize = (str = "") =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : "";

// progress colours: <75% green, 75-99% amber, >=100% red
export const getProgressTone = (pct) => {
  if (pct >= 100) return { bar: "bg-red-500", text: "text-red-500" };
  if (pct >= 75) return { bar: "bg-amber-500", text: "text-amber-500" };
  return { bar: "bg-emerald-500", text: "text-emerald-500" };
};

// Dynamic emoji per category/title matching mobile app
const EMOJI = [
  [/salary|wage|job|payroll|stipend/i, "💼"],
  [/freelance|business|client|project/i, "💻"],
  [/invest|stock|mutual|interest|dividend|crypto/i, "📈"],
  [/gift|bonus|cashback|reward/i, "🎁"],
  [/food|dining|restaurant|grocer|swiggy|zomato|cafe|coffee|lunch|dinner|snack/i, "🍔"],
  [/transport|fuel|petrol|diesel|uber|ola|taxi|\b(bus|cab|metro|auto)\b/i, "🚌"],
  [/shop|cloth|amazon|flipkart|myntra|store|mall/i, "🛍️"],
  [/rent|home|house|flat|room|pg|emi/i, "🏠"],
  [/bill|electric|water|gas|internet|wifi|recharge|phone|utility/i, "💡"],
  [/entertain|movie|netflix|prime|hotstar|game|cinema/i, "🎬"],
  [/health|medic|doctor|pharm|hospital|gym|fitness/i, "💊"],
  [/educat|course|book|school|college|fee|tuition/i, "🎓"],
  [/travel|trip|flight|hotel|vacation|tour/i, "✈️"],
];

export const emojiFor = (text = "", type = "expense") => {
  for (const [re, e] of EMOJI) {
    if (re.test(text)) return e;
  }
  return type === "income" ? "💰" : "🧾";
};
