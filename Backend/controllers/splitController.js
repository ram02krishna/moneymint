const Group = require("../models/Group");
const Friend = require("../models/Friend");
const SplitExpense = require("../models/SplitExpense");
const Settlement = require("../models/Settlement");
const SplitActivity = require("../models/SplitActivity");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { validateObjectId } = require("../utils/queryValidator");
const { parsePagination } = require("../utils/pagination");
const { searchRegex } = require("../utils/escapeRegex");
const {
  round2,
  toCents,
  fromCents,
  personId,
  calculateShares,
  calculateNetBalances,
  simplifyDebts,
  calculateDetailedDebts,
} = require("../utils/splitCalculations");
const {
  sameParty,
  isGroupMember,
  canAccessExpense,
  canAccessSettlement,
  pairwiseBalance,
} = require("../utils/splitAccess");

/**
 * The signed-in person as { id, email, user } (email lowercased).
 */
const loadMe = async (userId) => {
  const user = await User.findById(userId).lean();
  if (!user) throw new AppError("User not found", 404);
  return { id: String(user._id), email: user.email?.toLowerCase(), user };
};

const memberOfGroup = (userId, userEmail) => ({
  $or: [
    { creator: userId },
    { "members.user": userId },
    ...(userEmail ? [{ "members.email": userEmail }] : []),
  ],
});

// Groups the user belongs to that are still active
const getUserGroups = (userId, userEmail) =>
  Group.find({ ...memberOfGroup(userId, userEmail), isArchived: false }).lean();

/**
 * Mongo filter for "everything this user is involved in": things they created, are named on,
 * or that belong to one of their groups. Deleted (archived) groups are excluded so their
 * leftover expenses can't keep inflating balances nobody can see or settle any more.
 */
const userScopeFilter = async (partyFields, userId, userEmail) => {
  const [groups, archived] = await Promise.all([
    getUserGroups(userId, userEmail),
    Group.find({ ...memberOfGroup(userId, userEmail), isArchived: true }).select("_id").lean(),
  ]);

  return {
    $and: [
      {
        $or: [
          { createdBy: userId },
          ...partyFields.map((field) => ({ [`${field}.user`]: userId })),
          ...(userEmail ? partyFields.map((field) => ({ [`${field}.email`]: userEmail })) : []),
          { group: { $in: groups.map((g) => g._id) } },
        ],
      },
      { group: { $nin: archived.map((g) => g._id) } },
    ],
  };
};

const getUserExpenses = async (userId, userEmail) =>
  SplitExpense.find(await userScopeFilter(["paidBy", "participants"], userId, userEmail))
    .sort({ date: -1, createdAt: -1 })
    .lean();

const getUserSettlements = async (userId, userEmail) =>
  Settlement.find(await userScopeFilter(["payer", "payee"], userId, userEmail))
    .sort({ date: -1, createdAt: -1 })
    .lean();

// Loads a group and makes sure the caller belongs to it.
const requireGroupMember = async (groupId, me, { lean = false } = {}) => {
  const query = Group.findById(validateObjectId(groupId, "Group ID"));
  const group = await (lean ? query.lean() : query);
  if (!group || group.isArchived) throw new AppError("Group not found", 404);
  if (!isGroupMember(group, me)) throw new AppError("You do not have access to this group", 403);
  return group;
};

// A member needs a display name even when only an email is known.
const displayName = (name, email) => (name && String(name).trim()) || (email ? email.split("@")[0] : "");

// ==========================================
// 1. DASHBOARD OVERVIEW
// ==========================================
/**
 * Adds the caller's balance and totals to a group (shared by the dashboard and the group list).
 */
const enrichGroup = (grp, allExpenses, allSettlements, me) => {
  const sameGroup = (item) => item.group && String(item.group) === String(grp._id);
  const grpExpenses = allExpenses.filter(sameGroup);
  const grpSettlements = allSettlements.filter(sameGroup);

  const { netBalances } = calculateNetBalances({
    members: grp.members,
    expenses: grpExpenses,
    settlements: grpSettlements,
  });

  const memberEntry = grp.members.find((m) => sameParty(m, me));
  const userBalance = memberEntry ? netBalances[personId(memberEntry)] || 0 : 0;
  const totalSpent = grpExpenses.reduce((acc, exp) => acc + (exp.amount || 0), 0);

  return {
    ...grp,
    userBalance: round2(userBalance),
    totalSpent: round2(totalSpent),
    expensesCount: grpExpenses.length,
  };
};

const friendRef = (friend) => ({
  id: friend.friendUser ? idString(friend.friendUser) : null,
  email: friend.email ? friend.email.toLowerCase() : null,
  name: friend.name || null,
});

const idString = (ref) => String(ref._id || ref);

exports.getSplitDashboard = asyncHandler(async (req, res) => {
  const me = await loadMe(req.user.id);

  const [groups, friends, allExpenses, allSettlements] = await Promise.all([
    getUserGroups(me.id, me.email),
    Friend.find({ user: me.id }).lean(),
    getUserExpenses(me.id, me.email),
    getUserSettlements(me.id, me.email),
  ]);

  // Overall net balance: (paid - consumed) + (settlements paid - settlements received)
  let netBalanceCents = 0;
  allExpenses.forEach((exp) => {
    (exp.paidBy || []).forEach((p) => {
      if (sameParty(p, me)) netBalanceCents += toCents(p.amount);
    });
    (exp.participants || []).forEach((p) => {
      if (sameParty(p, me)) netBalanceCents -= toCents(p.shareAmount);
    });
  });
  allSettlements.forEach((s) => {
    if (sameParty(s.payer, me)) netBalanceCents += toCents(s.amount);
    if (sameParty(s.payee, me)) netBalanceCents -= toCents(s.amount);
  });

  const enrichedGroups = groups.map((grp) => enrichGroup(grp, allExpenses, allSettlements, me));

  const enrichedFriends = friends.map((fr) => ({
    ...fr,
    balance: pairwiseBalance({ expenses: allExpenses, settlements: allSettlements, me, friend: friendRef(fr) }),
  }));

  let youOweCents = 0;
  let youAreOwedCents = 0;
  enrichedFriends.forEach((fr) => {
    if (fr.balance > 0) youAreOwedCents += toCents(fr.balance);
    else if (fr.balance < 0) youOweCents += toCents(-fr.balance);
  });

  res.status(200).json({
    status: "success",
    data: {
      summary: {
        netBalance: fromCents(netBalanceCents),
        youOwe: fromCents(youOweCents),
        youAreOwed: fromCents(youAreOwedCents),
        groupsCount: groups.length,
        friendsCount: friends.length,
        expensesCount: allExpenses.length,
      },
      groups: enrichedGroups,
      friends: enrichedFriends,
      recentExpenses: allExpenses.slice(0, 10),
      recentSettlements: allSettlements.slice(0, 5),
    },
  });
});

// ==========================================
// 2. GROUPS MANAGEMENT
// ==========================================
exports.createGroup = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { user: currentUser } = await loadMe(userId);

  const { name, description, category, icon, members = [], simplifyDebts } = req.body;

  if (typeof name !== "string" || !name.trim()) {
    throw new AppError("Group name is required", 400);
  }
  if (!Array.isArray(members)) throw new AppError("Members must be a list", 400);

  // Creator is always the first member & admin
  const formattedMembers = [
    {
      user: userId,
      name: currentUser.fullName,
      email: currentUser.email?.toLowerCase(),
      role: "admin",
      joinedAt: new Date(),
    },
  ];

  // Resolve additional members
  for (const m of members) {
    if (!m.name && !m.email) continue;
    const email = m.email ? m.email.trim().toLowerCase() : "";
    let matchedUser = null;

    if (m.user) {
      matchedUser = await User.findById(m.user).lean();
    } else if (email) {
      matchedUser = await User.findOne({ email }).lean();
    }

    // Skip if already in members
    const exists = formattedMembers.some(
      (em) =>
        (matchedUser && String(em.user) === String(matchedUser._id)) ||
        (email && em.email === email),
    );
    if (exists) continue;

    formattedMembers.push({
      user: matchedUser ? matchedUser._id : null,
      name: matchedUser ? matchedUser.fullName : displayName(m.name, email),
      email: email,
      role: "member",
      joinedAt: new Date(),
    });
  }

  const group = await Group.create({
    name: name.trim(),
    description: description ? description.trim() : "",
    category: category || "Other",
    icon: icon || "👥",
    creator: userId,
    members: formattedMembers,
    simplifyDebts: simplifyDebts !== undefined ? !!simplifyDebts : true,
  });

  await SplitActivity.create({
    group: group._id,
    user: userId,
    type: "group_created",
    title: "Created group",
    description: `Created group "${group.name}" with ${group.members.length} members`,
    metadata: { groupId: group._id, groupName: group.name },
  });

  res.status(201).json({
    status: "success",
    data: { group },
  });
});

exports.getGroups = asyncHandler(async (req, res) => {
  const me = await loadMe(req.user.id);

  const groups = await getUserGroups(me.id, me.email);
  const groupIds = groups.map((g) => g._id);

  const [allExpenses, allSettlements] = await Promise.all([
    SplitExpense.find({ group: { $in: groupIds } }).lean(),
    Settlement.find({ group: { $in: groupIds } }).lean(),
  ]);

  const enriched = groups.map((grp) => enrichGroup(grp, allExpenses, allSettlements, me));

  res.status(200).json({
    status: "success",
    results: enriched.length,
    data: { groups: enriched },
  });
});

exports.getGroupById = asyncHandler(async (req, res) => {
  const me = await loadMe(req.user.id);
  const groupId = validateObjectId(req.params.id, "Group ID");

  const group = await Group.findById(groupId)
    .populate("creator", "fullName email profileImageUrl")
    .lean();

  if (!group || group.isArchived) throw new AppError("Group not found", 404);
  if (!isGroupMember(group, me)) throw new AppError("You do not have access to this group", 403);

  const [expenses, settlements] = await Promise.all([
    SplitExpense.find({ group: groupId }).sort({ date: -1, createdAt: -1 }).lean(),
    Settlement.find({ group: groupId }).sort({ date: -1, createdAt: -1 }).lean(),
  ]);

  const { netBalances, memberMap } = calculateNetBalances({
    members: group.members,
    expenses,
    settlements,
  });

  const simplifiedDebts = simplifyDebts(netBalances, memberMap);
  const detailedDebts = calculateDetailedDebts(expenses, settlements, memberMap);

  // Enrich members with their individual balance and spending stats
  const enrichedMembers = group.members.map((m) => {
    const mId = personId(m);
    let totalPaid = 0;
    let totalShare = 0;

    expenses.forEach((exp) => {
      (exp.paidBy || []).forEach((p) => {
        if (personId(p) === mId) totalPaid += p.amount;
      });
      (exp.participants || []).forEach((p) => {
        if (personId(p) === mId) totalShare += p.shareAmount;
      });
    });

    return {
      ...m,
      balance: round2(netBalances[mId] || 0),
      totalPaid: round2(totalPaid),
      totalShare: round2(totalShare),
    };
  });

  const totalSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const userMember = group.members.find((m) => sameParty(m, me));
  const userBalance = userMember ? netBalances[personId(userMember)] || 0 : 0;

  res.status(200).json({
    status: "success",
    data: {
      group: {
        ...group,
        members: enrichedMembers,
        totalSpent: round2(totalSpent),
        userBalance: round2(userBalance),
      },
      expenses,
      settlements,
      simplifiedDebts,
      detailedDebts,
    },
  });
});

exports.updateGroup = asyncHandler(async (req, res) => {
  const groupId = validateObjectId(req.params.id, "Group ID");
  const userId = req.user.id;

  const group = await Group.findById(groupId);
  if (!group || group.isArchived) throw new AppError("Group not found", 404);

  // Check admin rights (creator or role admin)
  const isAuthorized =
    String(group.creator) === String(userId) ||
    group.members.some((m) => m.user && String(m.user) === String(userId) && m.role === "admin");
  if (!isAuthorized) {
    throw new AppError("Only group admins can update group details", 403);
  }

  const { name, description, category, icon, simplifyDebts } = req.body;
  if (typeof name === "string" && name.trim()) group.name = name.trim();
  if (typeof description === "string") group.description = description.trim();
  if (category) group.category = category;
  if (icon) group.icon = icon;
  if (simplifyDebts !== undefined) group.simplifyDebts = !!simplifyDebts;

  await group.save();

  await SplitActivity.create({
    group: group._id,
    user: userId,
    type: "group_updated",
    title: "Updated group details",
    description: `Updated details for group "${group.name}"`,
  });

  res.status(200).json({
    status: "success",
    data: { group },
  });
});

exports.deleteGroup = asyncHandler(async (req, res) => {
  const groupId = validateObjectId(req.params.id, "Group ID");
  const userId = req.user.id;

  const group = await Group.findById(groupId);
  if (!group) throw new AppError("Group not found", 404);

  if (String(group.creator) !== String(userId)) {
    throw new AppError("Only the group creator can delete this group", 403);
  }

  // Soft delete / archive
  group.isArchived = true;
  await group.save();

  await SplitActivity.create({
    group: group._id,
    user: userId,
    type: "group_deleted",
    title: "Deleted group",
    description: `Group "${group.name}" was deleted`,
  });

  res.status(200).json({
    status: "success",
    message: "Group deleted successfully",
  });
});

exports.addGroupMember = asyncHandler(async (req, res) => {
  const me = await loadMe(req.user.id);
  const { name, email, userId: memberUserId } = req.body;

  if (!name && !email) {
    throw new AppError("Member name or email is required", 400);
  }

  // only people already in the group may add others
  const group = await requireGroupMember(req.params.id, me);

  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  let targetUser = null;

  if (memberUserId) {
    targetUser = await User.findById(validateObjectId(memberUserId, "User ID")).lean();
  } else if (cleanEmail) {
    targetUser = await User.findOne({ email: cleanEmail }).lean();
  }

  const alreadyMember = group.members.some(
    (m) =>
      (targetUser && m.user && String(m.user) === String(targetUser._id)) ||
      (cleanEmail && m.email && m.email.toLowerCase() === cleanEmail),
  );
  if (alreadyMember) {
    throw new AppError("User is already a member of this group", 400);
  }

  const memberName = targetUser ? targetUser.fullName : displayName(name, cleanEmail);
  group.members.push({
    user: targetUser ? targetUser._id : null,
    name: memberName,
    email: cleanEmail,
    role: "member",
    joinedAt: new Date(),
  });

  await group.save();

  await SplitActivity.create({
    group: group._id,
    user: me.id,
    type: "member_added",
    title: "Added member",
    description: `Added "${memberName}" to the group`,
  });

  res.status(200).json({ status: "success", data: { group } });
});

exports.removeGroupMember = asyncHandler(async (req, res) => {
  const me = await loadMe(req.user.id);
  const group = await requireGroupMember(req.params.id, me);

  const targetMember = group.members.id(req.params.memberId);
  if (!targetMember) throw new AppError("Member not found in group", 404);

  // admins/creator can remove anyone; everyone else can only remove themselves
  const isAdmin =
    String(group.creator) === me.id ||
    group.members.some((m) => sameParty(m, me) && m.role === "admin");
  if (!isAdmin && !sameParty(targetMember, me)) {
    throw new AppError("Only group admins can remove other members", 403);
  }
  if (targetMember.user && String(targetMember.user) === String(group.creator)) {
    throw new AppError("The group creator cannot be removed", 400);
  }

  // Check if member has unsettled balance in group
  const [expenses, settlements] = await Promise.all([
    SplitExpense.find({ group: group._id }).lean(),
    Settlement.find({ group: group._id }).lean(),
  ]);

  const { netBalances } = calculateNetBalances({
    members: group.members,
    expenses,
    settlements,
  });

  const memberBalance = netBalances[personId(targetMember)] || 0;
  if (Math.abs(memberBalance) > 0.01) {
    throw new AppError(
      `Cannot remove member with non-zero balance (Current balance: ₹${memberBalance}). Please settle up first.`,
      400,
    );
  }

  const memberName = targetMember.name;
  group.members.pull({ _id: targetMember._id });
  await group.save();

  await SplitActivity.create({
    group: group._id,
    user: me.id,
    type: "member_removed",
    title: "Removed member",
    description: `Removed "${memberName}" from the group`,
  });

  res.status(200).json({ status: "success", data: { group } });
});

// ==========================================
// 3. FRIENDS MANAGEMENT
// ==========================================
exports.getFriends = asyncHandler(async (req, res) => {
  const me = await loadMe(req.user.id);

  const [friends, allExpenses, allSettlements] = await Promise.all([
    Friend.find({ user: me.id }).populate("friendUser", "fullName email profileImageUrl").lean(),
    getUserExpenses(me.id, me.email),
    getUserSettlements(me.id, me.email),
  ]);

  const enriched = friends.map((fr) => ({
    ...fr,
    balance: pairwiseBalance({ expenses: allExpenses, settlements: allSettlements, me, friend: friendRef(fr) }),
  }));

  res.status(200).json({ status: "success", results: enriched.length, data: { friends: enriched } });
});

exports.addFriend = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { name, email, phone, friendUserId } = req.body;

  if (!name && !email) {
    throw new AppError("Friend name or email is required", 400);
  }

  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  let matchedUser = null;

  if (friendUserId) {
    matchedUser = await User.findById(validateObjectId(friendUserId, "User ID")).lean();
  } else if (cleanEmail) {
    matchedUser = await User.findOne({ email: cleanEmail }).lean();
  }

  if (matchedUser && String(matchedUser._id) === String(userId)) {
    throw new AppError("You cannot add yourself as a friend", 400);
  }

  // Check if already friends
  const existingFriend = await Friend.findOne({
    user: userId,
    $or: [
      ...(matchedUser ? [{ friendUser: matchedUser._id }] : []),
      ...(cleanEmail ? [{ email: cleanEmail }] : []),
    ],
  });

  if (existingFriend) {
    throw new AppError("This friend has already been added", 400);
  }

  const friendName = matchedUser ? matchedUser.fullName : displayName(name, cleanEmail);

  const newFriend = await Friend.create({
    user: userId,
    friendUser: matchedUser ? matchedUser._id : null,
    name: friendName,
    email: cleanEmail,
    phone: typeof phone === "string" ? phone.trim() : "",
    status: "accepted",
    invitedBy: userId,
  });

  // Create reciprocal friendship if registered user
  if (matchedUser) {
    const reciprocal = await Friend.findOne({
      user: matchedUser._id,
      friendUser: userId,
    });
    if (!reciprocal) {
      const currentUser = await User.findById(userId).lean();
      await Friend.create({
        user: matchedUser._id,
        friendUser: userId,
        name: currentUser.fullName,
        email: currentUser.email?.toLowerCase(),
        status: "accepted",
        invitedBy: userId,
      });
    }
  }

  await SplitActivity.create({
    user: userId,
    type: "friend_added",
    title: "Added friend",
    description: `Added "${friendName}" as a friend`,
  });

  res.status(201).json({
    status: "success",
    data: { friend: newFriend },
  });
});

exports.searchUsers = asyncHandler(async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const userId = req.user.id;

  if (!query || query.length < 2) {
    return res.status(200).json({ status: "success", data: { users: [] } });
  }

  const safeRegex = searchRegex(query);

  const users = await User.find({
    _id: { $ne: userId },
    $or: [{ fullName: safeRegex }, { email: safeRegex }],
  })
    .select("fullName email profileImageUrl")
    .limit(10)
    .lean();

  res.status(200).json({
    status: "success",
    data: { users },
  });
});

exports.getFriendDetail = asyncHandler(async (req, res) => {
  const friendId = validateObjectId(req.params.id, "Friend ID");
  const me = await loadMe(req.user.id);

  const friend = await Friend.findOne({ _id: friendId, user: me.id })
    .populate("friendUser", "fullName email profileImageUrl")
    .lean();
  if (!friend) throw new AppError("Friend not found", 404);

  const ref = friendRef(friend);
  const friendName = friend.name ? friend.name.trim().toLowerCase() : null;

  const [allExpenses, allSettlements] = await Promise.all([
    getUserExpenses(me.id, me.email),
    getUserSettlements(me.id, me.email),
  ]);

  // Contacts that were never invited have no id/email to match on, so fall back to their name
  const isFriend = (p) => sameParty(p, ref) || (friendName && p.name && p.name.trim().toLowerCase() === friendName);
  const involves = (parties, test) => (parties || []).some(test);

  const sharedExpenses = allExpenses.filter(
    (exp) =>
      (involves(exp.paidBy, (p) => sameParty(p, me)) || involves(exp.participants, (p) => sameParty(p, me))) &&
      (involves(exp.paidBy, isFriend) || involves(exp.participants, isFriend)),
  );

  const sharedSettlements = allSettlements.filter(
    (s) =>
      (sameParty(s.payer, me) && sameParty(s.payee, ref)) ||
      (sameParty(s.payer, ref) && sameParty(s.payee, me)),
  );

  res.status(200).json({
    status: "success",
    data: {
      friend: {
        ...friend,
        balance: pairwiseBalance({ expenses: sharedExpenses, settlements: sharedSettlements, me, friend: ref }),
      },
      expenses: sharedExpenses,
      settlements: sharedSettlements,
    },
  });
});

exports.deleteFriend = asyncHandler(async (req, res) => {
  const friendId = validateObjectId(req.params.id, "Friend ID");
  const userId = req.user.id;

  const friend = await Friend.findOne({ _id: friendId, user: userId });
  if (!friend) throw new AppError("Friend not found", 404);

  await Friend.findByIdAndDelete(friendId);

  await SplitActivity.create({
    user: userId,
    type: "friend_removed",
    title: "Removed friend",
    description: `Removed "${friend.name}" from your friends list`,
  });

  res.status(200).json({
    status: "success",
    message: "Friend removed successfully",
  });
});

// ==========================================
// 4. SHARED EXPENSES
// ==========================================
const MAX_LIST_LIMIT = 100;

const cleanParty = (p) => ({
  user: p.user || null,
  name: displayName(p.name, p.email),
  email: typeof p.email === "string" ? p.email.toLowerCase() : "",
});

const buildPaidBy = (paidBy, totalAmount) => {
  if (!Array.isArray(paidBy) || paidBy.length === 0) {
    throw new AppError("At least one payer is required", 400);
  }
  const totalPaidCents = paidBy.reduce((sum, p) => sum + toCents(p.amount), 0);
  if (totalPaidCents !== toCents(totalAmount)) {
    throw new AppError(
      `Total paid (₹${fromCents(totalPaidCents)}) must equal total expense amount (₹${round2(totalAmount)})`,
      400,
    );
  }
  return paidBy.map((p) => ({ ...cleanParty(p), amount: round2(p.amount) }));
};

const nonNegative = (value, label) => {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n < 0) throw new AppError(`${label} must be zero or more`, 400);
  return n;
};

const sharesOrThrow = (args) => {
  try {
    return calculateShares(args);
  } catch (err) {
    throw new AppError(err.message, 400);
  }
};

exports.createSplitExpense = asyncHandler(async (req, res) => {
  const me = await loadMe(req.user.id);

  const {
    title,
    amount,
    currency = "INR",
    category = "General",
    date,
    group = null,
    paidBy = [],
    splitMethod = "equal",
    participants = [],
    itemDetails = [],
    tax = 0,
    tip = 0,
    notes = "",
  } = req.body;

  if (typeof title !== "string" || !title.trim()) {
    throw new AppError("Expense title is required", 400);
  }

  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    throw new AppError("Amount must be a positive number", 400);
  }

  const payers = buildPaidBy(paidBy, numAmount);

  if (!Array.isArray(participants) || participants.length === 0) {
    throw new AppError("At least one participant is required", 400);
  }

  const taxAmount = nonNegative(tax, "Tax");
  const tipAmount = nonNegative(tip, "Tip");
  const calculatedParticipants = sharesOrThrow({
    amount: numAmount,
    splitMethod,
    participants,
    itemDetails,
    tax: taxAmount,
    tip: tipAmount,
  });

  // group expenses can only be added by people in that group
  const targetGroup = group ? await requireGroupMember(group, me, { lean: true }) : null;

  const newExpense = await SplitExpense.create({
    title: title.trim(),
    amount: round2(numAmount),
    currency,
    category,
    date: date ? new Date(date) : new Date(),
    group: targetGroup ? targetGroup._id : null,
    paidBy: payers,
    splitMethod,
    participants: calculatedParticipants,
    itemDetails: itemDetails || [],
    tax: round2(taxAmount),
    tip: round2(tipAmount),
    notes: typeof notes === "string" ? notes.trim() : "",
    createdBy: me.id,
  });

  await SplitActivity.create({
    group: newExpense.group,
    user: me.id,
    type: "expense_added",
    title: "Added expense",
    description: `Added "${newExpense.title}" for ₹${newExpense.amount}${targetGroup ? ` in "${targetGroup.name}"` : ""}`,
    amount: newExpense.amount,
    metadata: { expenseId: newExpense._id },
  });

  res.status(201).json({ status: "success", data: { expense: newExpense } });
});

exports.getSplitExpenses = asyncHandler(async (req, res) => {
  const me = await loadMe(req.user.id);
  const { groupId, category, search } = req.query;
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: MAX_LIST_LIMIT });

  const clauses = [];

  if (groupId) {
    const group = await requireGroupMember(groupId, me, { lean: true });
    clauses.push({ group: group._id });
  } else {
    clauses.push(await userScopeFilter(["paidBy", "participants"], me.id, me.email));
  }

  if (category && category !== "All") clauses.push({ category });

  if (search && search.trim()) {
    const pattern = searchRegex(search);
    clauses.push({
      $or: [{ title: pattern }, { notes: pattern }, { "paidBy.name": pattern }, { "participants.name": pattern }],
    });
  }

  const filter = { $and: clauses };

  const [expenses, total] = await Promise.all([
    SplitExpense.find(filter)
      .populate("group", "name category icon")
      .populate("createdBy", "fullName email")
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    SplitExpense.countDocuments(filter),
  ]);

  res.status(200).json({ status: "success", results: expenses.length, total, page, data: { expenses } });
});

// loads an expense and makes sure the caller is allowed to touch it
const loadAccessibleExpense = async (expenseId, me) => {
  const expense = await SplitExpense.findById(validateObjectId(expenseId, "Expense ID"));
  if (!expense) throw new AppError("Expense not found", 404);

  const group = expense.group ? await Group.findById(expense.group).lean() : null;
  if (!canAccessExpense(expense, me, group)) {
    throw new AppError("You do not have access to this expense", 403);
  }
  return expense;
};

exports.updateSplitExpense = asyncHandler(async (req, res) => {
  const me = await loadMe(req.user.id);
  const expense = await loadAccessibleExpense(req.params.id, me);

  const { title, amount, category, date, paidBy, splitMethod, participants, itemDetails, tax, tip, notes } = req.body;

  const numAmount = amount !== undefined ? Number(amount) : expense.amount;
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    throw new AppError("Amount must be a positive number", 400);
  }

  const currentSplitMethod = splitMethod || expense.splitMethod;
  const currentItemDetails = itemDetails !== undefined ? itemDetails : expense.itemDetails;
  const currentTax = tax !== undefined ? nonNegative(tax, "Tax") : expense.tax;
  const currentTip = tip !== undefined ? nonNegative(tip, "Tip") : expense.tip;

  const calculatedParticipants = sharesOrThrow({
    amount: numAmount,
    splitMethod: currentSplitMethod,
    participants: participants || expense.participants,
    itemDetails: currentItemDetails,
    tax: currentTax,
    tip: currentTip,
  });

  // The payers must always add up to the amount, otherwise balances stop adding up to zero.
  let nextPaidBy;
  if (Array.isArray(paidBy) && paidBy.length > 0) {
    nextPaidBy = buildPaidBy(paidBy, numAmount);
  } else if (toCents(numAmount) === toCents(expense.amount)) {
    nextPaidBy = expense.paidBy;
  } else if (expense.paidBy.length === 1) {
    nextPaidBy = [{ ...expense.paidBy[0].toObject(), amount: round2(numAmount) }];
  } else {
    throw new AppError("The amount changed, so please say how much each person paid", 400);
  }

  if (typeof title === "string" && title.trim()) expense.title = title.trim();
  expense.amount = round2(numAmount);
  if (category) expense.category = category;
  if (date) expense.date = new Date(date);
  expense.paidBy = nextPaidBy;
  expense.splitMethod = currentSplitMethod;
  expense.participants = calculatedParticipants;
  expense.itemDetails = currentItemDetails;
  expense.tax = round2(currentTax);
  expense.tip = round2(currentTip);
  if (typeof notes === "string") expense.notes = notes.trim();
  expense.updatedBy = me.id;

  await expense.save();

  await SplitActivity.create({
    group: expense.group || null,
    user: me.id,
    type: "expense_updated",
    title: "Updated expense",
    description: `Updated "${expense.title}" (₹${expense.amount})`,
    amount: expense.amount,
  });

  res.status(200).json({ status: "success", data: { expense } });
});

exports.deleteSplitExpense = asyncHandler(async (req, res) => {
  const me = await loadMe(req.user.id);
  const expense = await loadAccessibleExpense(req.params.id, me);
  const { title, amount, group } = expense;

  await expense.deleteOne();

  await SplitActivity.create({
    group: group || null,
    user: me.id,
    type: "expense_deleted",
    title: "Deleted expense",
    description: `Deleted "${title}" (₹${amount})`,
    amount,
  });

  res.status(200).json({ status: "success", message: "Expense deleted successfully" });
});

// ==========================================
// 5. SETTLEMENTS ("SETTLE UP")
// ==========================================
exports.createSettlement = asyncHandler(async (req, res) => {
  const me = await loadMe(req.user.id);

  const {
    group = null,
    payer,
    payee,
    amount,
    date,
    paymentMethod = "Cash",
    referenceNumber = "",
    notes = "",
  } = req.body;

  if (!payer || (!payer.user && !payer.name)) {
    throw new AppError("Payer information is required", 400);
  }
  if (!payee || (!payee.user && !payee.name)) {
    throw new AppError("Payee information is required", 400);
  }

  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    throw new AppError("Settlement amount must be greater than zero", 400);
  }

  // Inside a group any member can record a payment; outside one you must be a party to it.
  const targetGroup = group ? await requireGroupMember(group, me, { lean: true }) : null;
  if (!targetGroup && !sameParty(payer, me) && !sameParty(payee, me)) {
    throw new AppError("You can only record payments you made or received", 403);
  }

  const settlement = await Settlement.create({
    group: targetGroup ? targetGroup._id : null,
    payer: cleanParty(payer),
    payee: cleanParty(payee),
    amount: round2(numAmount),
    date: date ? new Date(date) : new Date(),
    paymentMethod,
    referenceNumber: typeof referenceNumber === "string" ? referenceNumber.trim() : "",
    notes: typeof notes === "string" ? notes.trim() : "",
    createdBy: me.id,
  });

  await SplitActivity.create({
    group: settlement.group,
    user: me.id,
    type: "settlement_added",
    title: "Recorded payment",
    description: `${settlement.payer.name} paid ${settlement.payee.name} ₹${settlement.amount} via ${paymentMethod}${
      targetGroup ? ` in "${targetGroup.name}"` : ""
    }`,
    amount: settlement.amount,
    metadata: { settlementId: settlement._id },
  });

  res.status(201).json({ status: "success", data: { settlement } });
});

exports.getSettlements = asyncHandler(async (req, res) => {
  const me = await loadMe(req.user.id);
  const { groupId } = req.query;

  let filter;
  if (groupId) {
    const group = await requireGroupMember(groupId, me, { lean: true });
    filter = { group: group._id };
  } else {
    filter = await userScopeFilter(["payer", "payee"], me.id, me.email);
  }

  const settlements = await Settlement.find(filter)
    .populate("group", "name category icon")
    .populate("createdBy", "fullName email")
    .sort({ date: -1, createdAt: -1 })
    .lean();

  res.status(200).json({ status: "success", results: settlements.length, data: { settlements } });
});

exports.deleteSettlement = asyncHandler(async (req, res) => {
  const me = await loadMe(req.user.id);

  const settlement = await Settlement.findById(validateObjectId(req.params.id, "Settlement ID"));
  if (!settlement) throw new AppError("Settlement not found", 404);

  const group = settlement.group ? await Group.findById(settlement.group).lean() : null;
  if (!canAccessSettlement(settlement, me, group)) {
    throw new AppError("You do not have access to this payment", 403);
  }

  const { amount, group: groupId } = settlement;
  const payerName = settlement.payer.name;
  const payeeName = settlement.payee.name;

  await settlement.deleteOne();

  await SplitActivity.create({
    group: groupId || null,
    user: me.id,
    type: "settlement_deleted",
    title: "Deleted payment",
    description: `Deleted settlement of ₹${amount} from ${payerName} to ${payeeName}`,
    amount,
  });

  res.status(200).json({ status: "success", message: "Settlement deleted successfully" });
});

// ==========================================
// 6. ACTIVITY FEED
// ==========================================
exports.getActivityFeed = asyncHandler(async (req, res) => {
  const me = await loadMe(req.user.id);

  const groups = await getUserGroups(me.id, me.email);
  const groupIds = groups.map((g) => g._id);

  const activities = await SplitActivity.find({
    $or: [{ user: me.id }, { group: { $in: groupIds } }],
  })
    .populate("user", "fullName email profileImageUrl")
    .populate("group", "name category icon")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  res.status(200).json({
    status: "success",
    results: activities.length,
    data: { activities },
  });
});

// ==========================================
// 7. REPORTS & ANALYTICS
// ==========================================
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

exports.getSplitAnalytics = asyncHandler(async (req, res) => {
  const me = await loadMe(req.user.id);

  const [groups, allExpenses] = await Promise.all([
    getUserGroups(me.id, me.email),
    getUserExpenses(me.id, me.email),
  ]);

  const blankGroup = (name, category) => ({ name, category, totalSpent: 0, userPaid: 0, userShare: 0 });
  const groupSpendingMap = { non_group: blankGroup("Non-Group (Direct)", "Friends") };
  groups.forEach((g) => {
    groupSpendingMap[String(g._id)] = blankGroup(g.name, g.category);
  });

  const categoryMap = {};
  const monthlyMap = {}; // "YYYY-MM" -> amount, so months sort chronologically

  allExpenses.forEach((exp) => {
    const bucket = groupSpendingMap[exp.group ? String(exp.group) : "non_group"];
    if (bucket) {
      bucket.totalSpent += exp.amount;
      (exp.paidBy || []).forEach((p) => {
        if (sameParty(p, me)) bucket.userPaid += p.amount;
      });
      (exp.participants || []).forEach((p) => {
        if (sameParty(p, me)) bucket.userShare += p.shareAmount;
      });
    }

    const cat = exp.category || "General";
    categoryMap[cat] = (categoryMap[cat] || 0) + exp.amount;

    const d = new Date(exp.date);
    const key = isNaN(d.getTime()) ? "unknown" : `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    monthlyMap[key] = (monthlyMap[key] || 0) + exp.amount;
  });

  const groupSpending = Object.values(groupSpendingMap)
    .filter((g) => g.totalSpent > 0)
    .map((g) => ({ ...g, totalSpent: round2(g.totalSpent), userPaid: round2(g.userPaid), userShare: round2(g.userShare) }));

  const categoryDistribution = Object.entries(categoryMap).map(([category, amount]) => ({
    category,
    amount: round2(amount),
  }));

  const monthlyTrend = Object.keys(monthlyMap)
    .sort()
    .map((key) => {
      const [year, month] = key.split("-");
      return { month: key === "unknown" ? "Unknown" : `${MONTH_NAMES[Number(month) - 1]} ${year}`, amount: round2(monthlyMap[key]) };
    });

  res.status(200).json({
    status: "success",
    data: {
      groupSpending,
      categoryDistribution,
      monthlyTrend,
      totalExpensesCount: allExpenses.length,
      totalSharedSpent: round2(allExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)),
    },
  });
});
