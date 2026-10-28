const mongoose = require("mongoose");
const ExpenseGroup = require("../models/ExpenseGroup");
const SharedExpense = require("../models/SharedExpense");
const Settlement = require("../models/Settlement");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { validateObjectId } = require("../utils/queryValidator");
const { toCents, fromCents, normalizeParticipants, buildBalances, getGroupLedger } = require("../services/splitLedger");

const userSelect = "fullName email profileImageUrl";
const populatedGroupQuery = (query) => query.populate("members.user", userSelect).populate("createdBy", userSelect);
const memberId = (member) => String(member.user?._id || member.user);
const isMember = (group, userId) => group.members.some((member) => memberId(member) === String(userId));
const shapeGroup = (group) => ({
  _id: String(group._id),
  name: group.name,
  description: group.description || "",
  createdBy: group.createdBy && { userId: String(group.createdBy._id || group.createdBy), fullName: group.createdBy.fullName, email: group.createdBy.email },
  members: group.members.map((member) => {
    const user = member.user || {};
    return { userId: String(user._id || user), fullName: user.fullName || "Former member", email: user.email || "", profileImageUrl: user.profileImageUrl || null, addedAt: member.addedAt };
  }),
  createdAt: group.createdAt,
  updatedAt: group.updatedAt,
});
const getGroupOrFail = async (id, userId) => {
  const groupId = validateObjectId(id, "Group ID");
  const group = await populatedGroupQuery(ExpenseGroup.findById(groupId));
  if (!group) throw new AppError("Group not found", 404);
  if (!isMember(group, userId)) throw new AppError("You are not a member of this group", 403);
  return group;
};
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const ensureObjectId = (id, label) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError(`${label} is invalid`, 400);
  return String(id);
};

exports.searchFriend = asyncHandler(async (req, res, next) => {
  const email = normalizeEmail(req.query.email);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return next(new AppError("Enter a valid account email", 400));
  if (email === normalizeEmail((await User.findById(req.user.id).select("email"))?.email)) return next(new AppError("You are already in your own contacts", 400));
  const user = await User.findOne({ email: new RegExp(`^${escapeRegex(email)}$`, "i") }).select(userSelect).lean();
  if (!user) return next(new AppError("No MoneyMint account found for that email", 404));
  res.status(200).json({ status: "success", data: { friend: { userId: String(user._id), fullName: user.fullName, email: user.email, profileImageUrl: user.profileImageUrl || null } } });
});

exports.listGroups = asyncHandler(async (req, res) => {
  const groups = await populatedGroupQuery(
    ExpenseGroup.find({ "members.user": req.user.id }).sort({ updatedAt: -1 })
  );

  if (!groups.length) {
    return res.status(200).json({ status: "success", results: 0, data: { groups: [] } });
  }

  const groupIds = groups.map((g) => g._id);
  const [allExpenses, allSettlements] = await Promise.all([
    SharedExpense.find({ group: { $in: groupIds } })
      .select("group amount paidBy participants.user participants.amount")
      .lean(),
    Settlement.find({ group: { $in: groupIds } })
      .select("group amount from to")
      .lean(),
  ]);

  const expensesByGroup = new Map();
  allExpenses.forEach((exp) => {
    const gid = String(exp.group);
    if (!expensesByGroup.has(gid)) expensesByGroup.set(gid, []);
    expensesByGroup.get(gid).push(exp);
  });

  const settlementsByGroup = new Map();
  allSettlements.forEach((stl) => {
    const gid = String(stl.group);
    if (!settlementsByGroup.has(gid)) settlementsByGroup.set(gid, []);
    settlementsByGroup.get(gid).push(stl);
  });

  const currentUserId = String(req.user.id);
  const results = groups.map((group) => {
    const shaped = shapeGroup(group);
    const gid = String(group._id);
    const groupExpenses = expensesByGroup.get(gid) || [];
    const groupSettlements = settlementsByGroup.get(gid) || [];
    const balances = buildBalances(group.members, groupExpenses, groupSettlements);
    const myBalanceItem = balances.find((item) => item.userId === currentUserId);
    const myBalance = myBalanceItem?.balance || 0;
    return {
      ...shaped,
      myBalance,
      balanceLabel: myBalance > 0 ? "owed to you" : myBalance < 0 ? "you owe" : "settled",
    };
  });

  res.status(200).json({ status: "success", results: results.length, data: { groups: results } });
});

exports.createGroup = asyncHandler(async (req, res, next) => {
  const name = String(req.body.name || "").trim();
  const description = String(req.body.description || "").trim();
  if (name.length < 2 || name.length > 80) return next(new AppError("Group name must be between 2 and 80 characters", 400));
  if (description.length > 300) return next(new AppError("Group description must be 300 characters or fewer", 400));
  const currentUser = await User.findById(req.user.id).select(userSelect);
  if (!currentUser) return next(new AppError("User not found", 404));
  const emails = Array.isArray(req.body.memberEmails) ? req.body.memberEmails.map(normalizeEmail).filter(Boolean) : [];
  const uniqueEmails = [...new Set(emails)].filter((email) => email !== normalizeEmail(currentUser.email));
  let users = [];
  if (uniqueEmails.length) {
    users = await User.find({ $or: uniqueEmails.map((email) => ({ email: new RegExp(`^${escapeRegex(email)}$`, "i") })) }).select(userSelect);
    const foundEmails = new Set(users.map((user) => normalizeEmail(user.email)));
    const missing = uniqueEmails.filter((email) => !foundEmails.has(email));
    if (missing.length) return next(new AppError(`No MoneyMint account found for: ${missing.join(", ")}`, 400));
  }
  const members = [currentUser, ...users].map((user) => ({ user: user._id, addedAt: new Date() }));
  const group = await ExpenseGroup.create({ name, description, createdBy: req.user.id, members });
  const populated = await populatedGroupQuery(ExpenseGroup.findById(group._id));
  res.status(201).json({ status: "success", data: { group: shapeGroup(populated) } });
});

exports.getGroup = asyncHandler(async (req, res) => {
  const group = await getGroupOrFail(req.params.id, req.user.id);
  const ledger = await getGroupLedger(group._id, group.members);
  res.status(200).json({
    status: "success",
    data: {
      group: shapeGroup(group),
      expenses: ledger.expenses,
      settlements: ledger.settlements,
      balances: ledger.balances.map(({ balanceCents, ...balance }) => balance),
      suggestedDebts: ledger.suggestedDebts,
      history: ledger.history,
    },
  });
});

exports.addMember = asyncHandler(async (req, res, next) => {
  const group = await getGroupOrFail(req.params.id, req.user.id);
  const email = normalizeEmail(req.body.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return next(new AppError("Enter a valid account email", 400));
  const user = await User.findOne({ email: new RegExp(`^${escapeRegex(email)}$`, "i") }).select(userSelect);
  if (!user) return next(new AppError("No MoneyMint account found for that email", 404));
  if (isMember(group, user._id)) return next(new AppError("That person is already in this group", 400));
  group.members.push({ user: user._id, addedAt: new Date() });
  await group.save();
  const populated = await populatedGroupQuery(ExpenseGroup.findById(group._id));
  res.status(200).json({ status: "success", data: { group: shapeGroup(populated) } });
});

exports.createExpense = asyncHandler(async (req, res, next) => {
  const group = await getGroupOrFail(req.params.id, req.user.id);
  const title = String(req.body.title || "").trim();
  const amountCents = toCents(req.body.amount);
  const splitType = String(req.body.splitType || "equal");
  const paidById = ensureObjectId(req.body.paidByUserId, "Payer");
  if (title.length < 2 || title.length > 120) return next(new AppError("Expense title must be between 2 and 120 characters", 400));
  if (!Number.isFinite(amountCents) || amountCents <= 0) return next(new AppError("Expense amount must be greater than zero", 400));
  const memberById = new Map(group.members.map((member) => [memberId(member), member]));
  if (!memberById.has(paidById)) return next(new AppError("The payer must belong to this group", 400));
  let participants;
  try {
    participants = normalizeParticipants({ amountCents, splitType, participants: req.body.participants, memberById });
  } catch (error) {
    return next(new AppError(error.message, 400));
  }
  const payer = memberById.get(paidById).user;
  const date = req.body.date ? new Date(req.body.date) : new Date();
  if (Number.isNaN(date.getTime())) return next(new AppError("Enter a valid expense date", 400));
  const expense = await SharedExpense.create({
    group: group._id,
    createdBy: req.user.id,
    title,
    amount: fromCents(amountCents),
    category: String(req.body.category || "General").trim().slice(0, 60) || "General",
    date,
    note: String(req.body.note || "").trim().slice(0, 500),
    paidBy: payer._id || payer,
    paidByName: payer.fullName,
    splitType,
    participants,
  });
  res.status(201).json({ status: "success", data: { expense } });
});

exports.createSettlement = asyncHandler(async (req, res, next) => {
  const group = await getGroupOrFail(req.params.id, req.user.id);
  const fromUserId = ensureObjectId(req.body.fromUserId, "Payer");
  const toUserId = ensureObjectId(req.body.toUserId, "Payee");
  if (fromUserId === toUserId) return next(new AppError("A settlement must be between two different members", 400));
  const members = new Map(group.members.map((member) => [memberId(member), member]));
  if (!members.has(fromUserId) || !members.has(toUserId)) return next(new AppError("Both people must belong to this group", 400));
  const amountCents = toCents(req.body.amount);
  if (!Number.isFinite(amountCents) || amountCents <= 0) return next(new AppError("Settlement amount must be greater than zero", 400));
  const ledger = await getGroupLedger(group._id, group.members);
  const balances = new Map(ledger.balances.map((item) => [item.userId, item.balanceCents]));
  const fromBalance = balances.get(fromUserId) || 0;
  const toBalance = balances.get(toUserId) || 0;
  if (fromBalance >= 0 || toBalance <= 0) return next(new AppError("Choose a member who owes money and a member who is owed money", 400));
  if (amountCents > Math.min(-fromBalance, toBalance)) return next(new AppError(`Settlement cannot exceed the outstanding amount of ₹${fromCents(Math.min(-fromBalance, toBalance)).toFixed(2)}`, 400));
  const settlementDate = req.body.date ? new Date(req.body.date) : new Date();
  if (Number.isNaN(settlementDate.getTime())) return next(new AppError("Enter a valid settlement date", 400));
  const settlement = await Settlement.create({
    group: group._id,
    from: members.get(fromUserId).user._id || members.get(fromUserId).user,
    fromName: members.get(fromUserId).user.fullName,
    to: members.get(toUserId).user._id || members.get(toUserId).user,
    toName: members.get(toUserId).user.fullName,
    amount: fromCents(amountCents),
    note: String(req.body.note || "").trim().slice(0, 300),
    date: settlementDate,
    createdBy: req.user.id,
  });
  res.status(201).json({ status: "success", data: { settlement } });
});

exports.deleteGroup = asyncHandler(async (req, res) => {
  const group = await getGroupOrFail(req.params.id, req.user.id);

  // Cascade delete group and all associated transactions
  await Promise.all([
    SharedExpense.deleteMany({ group: group._id }),
    Settlement.deleteMany({ group: group._id }),
    ExpenseGroup.findByIdAndDelete(group._id),
  ]);

  res.status(200).json({
    status: "success",
    message: "Group deleted successfully",
    data: null,
  });
});
