const Group = require("../models/Group");
const Friend = require("../models/Friend");
const SplitExpense = require("../models/SplitExpense");
const Settlement = require("../models/Settlement");
const SplitActivity = require("../models/SplitActivity");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { validateObjectId } = require("../utils/queryValidator");
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

/**
 * Helper: Find all groups where the user is a member or creator
 */
const getUserGroups = async (userId, userEmail) => {
  return await Group.find({
    $or: [
      { creator: userId },
      { "members.user": userId },
      ...(userEmail ? [{ "members.email": userEmail.toLowerCase() }] : []),
    ],
    isArchived: false,
  }).lean();
};

/**
 * Helper: Fetch all expenses involving the user (either directly or via user's groups)
 */
const getUserExpenses = async (userId, userEmail) => {
  const groups = await getUserGroups(userId, userEmail);
  const groupIds = groups.map((g) => g._id);

  return await SplitExpense.find({
    $or: [
      { createdBy: userId },
      { "paidBy.user": userId },
      { "participants.user": userId },
      ...(userEmail
        ? [
            { "paidBy.email": userEmail.toLowerCase() },
            { "participants.email": userEmail.toLowerCase() },
          ]
        : []),
      { group: { $in: groupIds } },
    ],
  })
    .sort({ date: -1, createdAt: -1 })
    .lean();
};

/**
 * Helper: Fetch all settlements involving the user
 */
const getUserSettlements = async (userId, userEmail) => {
  const groups = await getUserGroups(userId, userEmail);
  const groupIds = groups.map((g) => g._id);

  return await Settlement.find({
    $or: [
      { createdBy: userId },
      { "payer.user": userId },
      { "payee.user": userId },
      ...(userEmail
        ? [
            { "payer.email": userEmail.toLowerCase() },
            { "payee.email": userEmail.toLowerCase() },
          ]
        : []),
      { group: { $in: groupIds } },
    ],
  })
    .sort({ date: -1, createdAt: -1 })
    .lean();
};

// ==========================================
// 1. DASHBOARD OVERVIEW
// ==========================================
exports.getSplitDashboard = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const currentUser = await User.findById(userId).lean();
  if (!currentUser) throw new AppError("User not found", 404);

  const userEmail = currentUser.email?.toLowerCase();
  const uIdStr = String(userId);

  // Fetch groups, friends, expenses, settlements
  const [groups, friends, allExpenses, allSettlements] = await Promise.all([
    getUserGroups(userId, userEmail),
    Friend.find({ user: userId }).lean(),
    getUserExpenses(userId, userEmail),
    getUserSettlements(userId, userEmail),
  ]);

  // Compute overall net balances across all shared expenses & settlements
  let totalPaidCents = 0;
  let totalShareCents = 0;
  let totalSettlementReceivedCents = 0;
  let totalSettlementPaidCents = 0;

  allExpenses.forEach((exp) => {
    (exp.paidBy || []).forEach((p) => {
      if (
        (p.user && String(p.user) === uIdStr) ||
        (userEmail && p.email && p.email.toLowerCase() === userEmail)
      ) {
        totalPaidCents += toCents(p.amount);
      }
    });

    (exp.participants || []).forEach((p) => {
      if (
        (p.user && String(p.user) === uIdStr) ||
        (userEmail && p.email && p.email.toLowerCase() === userEmail)
      ) {
        totalShareCents += toCents(p.shareAmount);
      }
    });
  });

  allSettlements.forEach((s) => {
    if (
      (s.payee.user && String(s.payee.user) === uIdStr) ||
      (userEmail && s.payee.email && s.payee.email.toLowerCase() === userEmail)
    ) {
      totalSettlementReceivedCents += toCents(s.amount);
    }
    if (
      (s.payer.user && String(s.payer.user) === uIdStr) ||
      (userEmail && s.payer.email && s.payer.email.toLowerCase() === userEmail)
    ) {
      totalSettlementPaidCents += toCents(s.amount);
    }
  });

  // Net balance for user = (totalPaid - totalShare) + (totalSettlementPaid - totalSettlementReceived)
  const netBalanceCents =
    totalPaidCents -
    totalShareCents +
    totalSettlementPaidCents -
    totalSettlementReceivedCents;

  // Compute breakdown for each group
  const enrichedGroups = groups.map((grp) => {
    const grpExpenses = allExpenses.filter(
      (e) => e.group && String(e.group) === String(grp._id),
    );
    const grpSettlements = allSettlements.filter(
      (s) => s.group && String(s.group) === String(grp._id),
    );

    const { netBalances } = calculateNetBalances({
      members: grp.members,
      expenses: grpExpenses,
      settlements: grpSettlements,
    });

    // Find user's member ID or match by user/email
    let userBalance = 0;
    const memberEntry = grp.members.find(
      (m) =>
        (m.user && String(m.user) === uIdStr) ||
        (userEmail && m.email && m.email.toLowerCase() === userEmail),
    );

    if (memberEntry) {
      const mId = personId(memberEntry);
      userBalance = netBalances[mId] || 0;
    }

    const totalGroupSpent = grpExpenses.reduce(
      (acc, exp) => acc + (exp.amount || 0),
      0,
    );

    return {
      ...grp,
      userBalance: round2(userBalance),
      totalSpent: round2(totalGroupSpent),
      expenseCount: grpExpenses.length,
    };
  });

  // Compute breakdown for each friend (pairwise balance)
  const enrichedFriends = friends.map((fr) => {
    const frUserId = fr.friendUser ? String(fr.friendUser) : null;
    const frEmail = fr.email ? fr.email.toLowerCase() : null;

    let balanceCents = 0;

    allExpenses.forEach((exp) => {
      // Did current user pay for friend?
      const userPaidAmt = (exp.paidBy || [])
        .filter(
          (p) =>
            (p.user && String(p.user) === uIdStr) ||
            (userEmail && p.email && p.email.toLowerCase() === userEmail),
        )
        .reduce((sum, p) => sum + toCents(p.amount), 0);

      const friendPaidAmt = (exp.paidBy || [])
        .filter(
          (p) =>
            (frUserId && p.user && String(p.user) === frUserId) ||
            (frEmail && p.email && p.email.toLowerCase() === frEmail),
        )
        .reduce((sum, p) => sum + toCents(p.amount), 0);

      const userShare = (exp.participants || [])
        .filter(
          (p) =>
            (p.user && String(p.user) === uIdStr) ||
            (userEmail && p.email && p.email.toLowerCase() === userEmail),
        )
        .reduce((sum, p) => sum + toCents(p.shareAmount), 0);

      const friendShare = (exp.participants || [])
        .filter(
          (p) =>
            (frUserId && p.user && String(p.user) === frUserId) ||
            (frEmail && p.email && p.email.toLowerCase() === frEmail),
        )
        .reduce((sum, p) => sum + toCents(p.shareAmount), 0);

      // If user paid and friend participated
      if (userPaidAmt > 0 && friendShare > 0) {
        // Proportion of user's payment that covers friend's share
        const expTotalCents = toCents(exp.amount);
        if (expTotalCents > 0) {
          const ratio = userPaidAmt / expTotalCents;
          balanceCents += Math.round(friendShare * ratio);
        }
      }

      // If friend paid and user participated
      if (friendPaidAmt > 0 && userShare > 0) {
        const expTotalCents = toCents(exp.amount);
        if (expTotalCents > 0) {
          const ratio = friendPaidAmt / expTotalCents;
          balanceCents -= Math.round(userShare * ratio);
        }
      }
    });

    // Settlements between user and this friend
    allSettlements.forEach((s) => {
      const isUserPayer =
        (s.payer.user && String(s.payer.user) === uIdStr) ||
        (userEmail && s.payer.email && s.payer.email.toLowerCase() === userEmail);
      const isFriendPayee =
        (frUserId && s.payee.user && String(s.payee.user) === frUserId) ||
        (frEmail && s.payee.email && s.payee.email.toLowerCase() === frEmail);

      const isFriendPayer =
        (frUserId && s.payer.user && String(s.payer.user) === frUserId) ||
        (frEmail && s.payer.email && s.payer.email.toLowerCase() === frEmail);
      const isUserPayee =
        (s.payee.user && String(s.payee.user) === uIdStr) ||
        (userEmail && s.payee.email && s.payee.email.toLowerCase() === userEmail);

      if (isUserPayer && isFriendPayee) {
        balanceCents += toCents(s.amount);
      }
      if (isFriendPayer && isUserPayee) {
        balanceCents -= toCents(s.amount);
      }
    });

    return {
      ...fr,
      balance: fromCents(balanceCents),
    };
  });

  // Calculate total money user owes vs is owed
  let youOweCents = 0;
  let youAreOwedCents = 0;

  enrichedFriends.forEach((fr) => {
    if (fr.balance > 0) {
      youAreOwedCents += toCents(fr.balance);
    } else if (fr.balance < 0) {
      youOweCents += toCents(-fr.balance);
    }
  });

  // Also include group simplified debts for current user
  enrichedGroups.forEach((grp) => {
    if (grp.userBalance > 0) {
      // covered in overall stats
    } else if (grp.userBalance < 0) {
      // covered
    }
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
  const currentUser = await User.findById(userId).lean();
  if (!currentUser) throw new AppError("User not found", 404);

  const { name, description, category, icon, members = [], simplifyDebts } = req.body;

  if (!name || !name.trim()) {
    throw new AppError("Group name is required", 400);
  }

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
      name: matchedUser ? matchedUser.fullName : m.name.trim(),
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
  const userId = req.user.id;
  const currentUser = await User.findById(userId).lean();
  const userEmail = currentUser?.email?.toLowerCase();

  const groups = await getUserGroups(userId, userEmail);
  const groupIds = groups.map((g) => g._id);

  const [allExpenses, allSettlements] = await Promise.all([
    SplitExpense.find({ group: { $in: groupIds } }).lean(),
    Settlement.find({ group: { $in: groupIds } }).lean(),
  ]);

  const uIdStr = String(userId);

  const enriched = groups.map((grp) => {
    const grpExpenses = allExpenses.filter(
      (e) => String(e.group) === String(grp._id),
    );
    const grpSettlements = allSettlements.filter(
      (s) => String(s.group) === String(grp._id),
    );

    const { netBalances } = calculateNetBalances({
      members: grp.members,
      expenses: grpExpenses,
      settlements: grpSettlements,
    });

    const memberEntry = grp.members.find(
      (m) =>
        (m.user && String(m.user) === uIdStr) ||
        (userEmail && m.email && m.email.toLowerCase() === userEmail),
    );

    let userBalance = 0;
    if (memberEntry) {
      const mId = personId(memberEntry);
      userBalance = netBalances[mId] || 0;
    }

    const totalSpent = grpExpenses.reduce(
      (sum, e) => sum + (e.amount || 0),
      0,
    );

    return {
      ...grp,
      userBalance: round2(userBalance),
      totalSpent: round2(totalSpent),
      expensesCount: grpExpenses.length,
    };
  });

  res.status(200).json({
    status: "success",
    results: enriched.length,
    data: { groups: enriched },
  });
});

exports.getGroupById = asyncHandler(async (req, res) => {
  const groupId = validateObjectId(req.params.id, "Group ID");
  const userId = req.user.id;
  const currentUser = await User.findById(userId).lean();
  const userEmail = currentUser?.email?.toLowerCase();

  const group = await Group.findById(groupId)
    .populate("creator", "fullName email profileImageUrl")
    .lean();

  if (!group || group.isArchived) {
    throw new AppError("Group not found", 404);
  }

  // Check if caller is member
  const uIdStr = String(userId);
  const isMember =
    String(group.creator._id || group.creator) === uIdStr ||
    group.members.some(
      (m) =>
        (m.user && String(m.user) === uIdStr) ||
        (userEmail && m.email && m.email.toLowerCase() === userEmail),
    );

  if (!isMember) {
    throw new AppError("You do not have access to this group", 403);
  }

  const [expenses, settlements] = await Promise.all([
    SplitExpense.find({ group: groupId })
      .sort({ date: -1, createdAt: -1 })
      .lean(),
    Settlement.find({ group: groupId })
      .sort({ date: -1, createdAt: -1 })
      .lean(),
  ]);

  const { netBalances, memberMap } = calculateNetBalances({
    members: group.members,
    expenses,
    settlements,
  });

  // Calculate simplified debts
  const simplifiedDebts = simplifyDebts(netBalances, memberMap);
  // Calculate detailed debts
  const detailedDebts = calculateDetailedDebts(expenses, settlements, memberMap);

  // Enrich members with their individual balance and spending stats
  const enrichedMembers = group.members.map((m) => {
    const mId = personId(m);
    const balance = netBalances[mId] || 0;

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
      balance: round2(balance),
      totalPaid: round2(totalPaid),
      totalShare: round2(totalShare),
    };
  });

  const totalSpent = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // Find user's balance in this group
  const userMember = group.members.find(
    (m) =>
      (m.user && String(m.user) === uIdStr) ||
      (userEmail && m.email && m.email.toLowerCase() === userEmail),
  );
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
    group.members.some(
      (m) => String(m.user) === String(userId) && m.role === "admin",
    );
  if (!isAuthorized) {
    throw new AppError("Only group admins can update group details", 403);
  }

  const { name, description, category, icon, simplifyDebts } = req.body;
  if (name) group.name = name.trim();
  if (description !== undefined) group.description = description.trim();
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
  const groupId = validateObjectId(req.params.id, "Group ID");
  const userId = req.user.id;
  const { name, email, userId: memberUserId } = req.body;

  if (!name && !email) {
    throw new AppError("Member name or email is required", 400);
  }

  const group = await Group.findById(groupId);
  if (!group || group.isArchived) throw new AppError("Group not found", 404);

  let targetUser = null;
  const cleanEmail = email ? email.trim().toLowerCase() : "";

  if (memberUserId) {
    targetUser = await User.findById(memberUserId).lean();
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

  const memberName = targetUser ? targetUser.fullName : name.trim();
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
    user: userId,
    type: "member_added",
    title: "Added member",
    description: `Added "${memberName}" to the group`,
  });

  res.status(200).json({
    status: "success",
    data: { group },
  });
});

exports.removeGroupMember = asyncHandler(async (req, res) => {
  const groupId = validateObjectId(req.params.id, "Group ID");
  const memberId = req.params.memberId;
  const userId = req.user.id;

  const group = await Group.findById(groupId);
  if (!group || group.isArchived) throw new AppError("Group not found", 404);

  const targetMember = group.members.id(memberId);
  if (!targetMember) throw new AppError("Member not found in group", 404);

  // Check if member has unsettled balance in group
  const [expenses, settlements] = await Promise.all([
    SplitExpense.find({ group: groupId }).lean(),
    Settlement.find({ group: groupId }).lean(),
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
  group.members.pull({ _id: memberId });
  await group.save();

  await SplitActivity.create({
    group: group._id,
    user: userId,
    type: "member_removed",
    title: "Removed member",
    description: `Removed "${memberName}" from the group`,
  });

  res.status(200).json({
    status: "success",
    data: { group },
  });
});

// ==========================================
// 3. FRIENDS MANAGEMENT
// ==========================================
exports.getFriends = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const currentUser = await User.findById(userId).lean();
  const userEmail = currentUser?.email?.toLowerCase();
  const uIdStr = String(userId);

  const [friends, allExpenses, allSettlements] = await Promise.all([
    Friend.find({ user: userId })
      .populate("friendUser", "fullName email profileImageUrl")
      .lean(),
    getUserExpenses(userId, userEmail),
    getUserSettlements(userId, userEmail),
  ]);

  const enriched = friends.map((fr) => {
    const frUserId = fr.friendUser ? String(fr.friendUser._id || fr.friendUser) : null;
    const frEmail = fr.email ? fr.email.toLowerCase() : null;

    let balanceCents = 0;

    allExpenses.forEach((exp) => {
      const userPaidAmt = (exp.paidBy || [])
        .filter(
          (p) =>
            (p.user && String(p.user) === uIdStr) ||
            (userEmail && p.email && p.email.toLowerCase() === userEmail),
        )
        .reduce((sum, p) => sum + toCents(p.amount), 0);

      const friendPaidAmt = (exp.paidBy || [])
        .filter(
          (p) =>
            (frUserId && p.user && String(p.user) === frUserId) ||
            (frEmail && p.email && p.email.toLowerCase() === frEmail),
        )
        .reduce((sum, p) => sum + toCents(p.amount), 0);

      const userShare = (exp.participants || [])
        .filter(
          (p) =>
            (p.user && String(p.user) === uIdStr) ||
            (userEmail && p.email && p.email.toLowerCase() === userEmail),
        )
        .reduce((sum, p) => sum + toCents(p.shareAmount), 0);

      const friendShare = (exp.participants || [])
        .filter(
          (p) =>
            (frUserId && p.user && String(p.user) === frUserId) ||
            (frEmail && p.email && p.email.toLowerCase() === frEmail),
        )
        .reduce((sum, p) => sum + toCents(p.shareAmount), 0);

      if (userPaidAmt > 0 && friendShare > 0) {
        const expTotalCents = toCents(exp.amount);
        if (expTotalCents > 0) {
          const ratio = userPaidAmt / expTotalCents;
          balanceCents += Math.round(friendShare * ratio);
        }
      }

      if (friendPaidAmt > 0 && userShare > 0) {
        const expTotalCents = toCents(exp.amount);
        if (expTotalCents > 0) {
          const ratio = friendPaidAmt / expTotalCents;
          balanceCents -= Math.round(userShare * ratio);
        }
      }
    });

    allSettlements.forEach((s) => {
      const isUserPayer =
        (s.payer.user && String(s.payer.user) === uIdStr) ||
        (userEmail && s.payer.email && s.payer.email.toLowerCase() === userEmail);
      const isFriendPayee =
        (frUserId && s.payee.user && String(s.payee.user) === frUserId) ||
        (frEmail && s.payee.email && s.payee.email.toLowerCase() === frEmail);

      const isFriendPayer =
        (frUserId && s.payer.user && String(s.payer.user) === frUserId) ||
        (frEmail && s.payer.email && s.payer.email.toLowerCase() === frEmail);
      const isUserPayee =
        (s.payee.user && String(s.payee.user) === uIdStr) ||
        (userEmail && s.payee.email && s.payee.email.toLowerCase() === userEmail);

      if (isUserPayer && isFriendPayee) balanceCents += toCents(s.amount);
      if (isFriendPayer && isUserPayee) balanceCents -= toCents(s.amount);
    });

    return {
      ...fr,
      balance: fromCents(balanceCents),
    };
  });

  res.status(200).json({
    status: "success",
    results: enriched.length,
    data: { friends: enriched },
  });
});

exports.addFriend = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { name, email, phone, friendUserId } = req.body;

  if (!name && !email) {
    throw new AppError("Friend name or email is required", 400);
  }

  const cleanEmail = email ? email.trim().toLowerCase() : "";
  let matchedUser = null;

  if (friendUserId) {
    matchedUser = await User.findById(friendUserId).lean();
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

  const friendName = matchedUser ? matchedUser.fullName : name.trim();

  const newFriend = await Friend.create({
    user: userId,
    friendUser: matchedUser ? matchedUser._id : null,
    name: friendName,
    email: cleanEmail,
    phone: phone ? phone.trim() : "",
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
  const query = req.query.q ? req.query.q.trim() : "";
  const userId = req.user.id;

  if (!query || query.length < 2) {
    return res.status(200).json({ status: "success", data: { users: [] } });
  }

  const safeRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

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
  const userId = req.user.id;
  const currentUser = await User.findById(userId).lean();
  const userEmail = currentUser?.email?.toLowerCase();
  const uIdStr = String(userId);

  const friend = await Friend.findOne({ _id: friendId, user: userId })
    .populate("friendUser", "fullName email profileImageUrl")
    .lean();

  if (!friend) throw new AppError("Friend not found", 404);

  const frUserId = friend.friendUser
    ? String(friend.friendUser._id || friend.friendUser)
    : null;
  const frEmail = friend.email ? friend.email.toLowerCase() : null;

  // Fetch all shared expenses between current user and friend
  const allExpenses = await getUserExpenses(userId, userEmail);
  const allSettlements = await getUserSettlements(userId, userEmail);

  // Filter expenses where both user and friend are involved
  const sharedExpenses = allExpenses.filter((exp) => {
    const hasUser =
      (exp.paidBy || []).some(
        (p) =>
          (p.user && String(p.user) === uIdStr) ||
          (userEmail && p.email && p.email.toLowerCase() === userEmail),
      ) ||
      (exp.participants || []).some(
        (p) =>
          (p.user && String(p.user) === uIdStr) ||
          (userEmail && p.email && p.email.toLowerCase() === userEmail),
      );

    const hasFriend =
      (exp.paidBy || []).some(
        (p) =>
          (frUserId && p.user && String(p.user) === frUserId) ||
          (frEmail && p.email && p.email.toLowerCase() === frEmail) ||
          (friend.name && p.name && p.name.trim().toLowerCase() === friend.name.trim().toLowerCase()),
      ) ||
      (exp.participants || []).some(
        (p) =>
          (frUserId && p.user && String(p.user) === frUserId) ||
          (frEmail && p.email && p.email.toLowerCase() === frEmail) ||
          (friend.name && p.name && p.name.trim().toLowerCase() === friend.name.trim().toLowerCase()),
      );

    return hasUser && hasFriend;
  });

  // Filter settlements between both
  const sharedSettlements = allSettlements.filter((s) => {
    const isUserPayer =
      (s.payer.user && String(s.payer.user) === uIdStr) ||
      (userEmail && s.payer.email && s.payer.email.toLowerCase() === userEmail);
    const isFriendPayee =
      (frUserId && s.payee.user && String(s.payee.user) === frUserId) ||
      (frEmail && s.payee.email && s.payee.email.toLowerCase() === frEmail);

    const isFriendPayer =
      (frUserId && s.payer.user && String(s.payer.user) === frUserId) ||
      (frEmail && s.payer.email && s.payer.email.toLowerCase() === frEmail);
    const isUserPayee =
      (s.payee.user && String(s.payee.user) === uIdStr) ||
      (userEmail && s.payee.email && s.payee.email.toLowerCase() === userEmail);

    return (isUserPayer && isFriendPayee) || (isFriendPayer && isUserPayee);
  });

  // Calculate net balance
  let balanceCents = 0;
  sharedExpenses.forEach((exp) => {
    const userPaidAmt = (exp.paidBy || [])
      .filter(
        (p) =>
          (p.user && String(p.user) === uIdStr) ||
          (userEmail && p.email && p.email.toLowerCase() === userEmail),
      )
      .reduce((sum, p) => sum + toCents(p.amount), 0);

    const friendPaidAmt = (exp.paidBy || [])
      .filter(
        (p) =>
          (frUserId && p.user && String(p.user) === frUserId) ||
          (frEmail && p.email && p.email.toLowerCase() === frEmail),
      )
      .reduce((sum, p) => sum + toCents(p.amount), 0);

    const userShare = (exp.participants || [])
      .filter(
        (p) =>
          (p.user && String(p.user) === uIdStr) ||
          (userEmail && p.email && p.email.toLowerCase() === userEmail),
      )
      .reduce((sum, p) => sum + toCents(p.shareAmount), 0);

    const friendShare = (exp.participants || [])
      .filter(
        (p) =>
          (frUserId && p.user && String(p.user) === frUserId) ||
          (frEmail && p.email && p.email.toLowerCase() === frEmail),
      )
      .reduce((sum, p) => sum + toCents(p.shareAmount), 0);

    if (userPaidAmt > 0 && friendShare > 0) {
      const expTotalCents = toCents(exp.amount);
      if (expTotalCents > 0) {
        const ratio = userPaidAmt / expTotalCents;
        balanceCents += Math.round(friendShare * ratio);
      }
    }

    if (friendPaidAmt > 0 && userShare > 0) {
      const expTotalCents = toCents(exp.amount);
      if (expTotalCents > 0) {
        const ratio = friendPaidAmt / expTotalCents;
        balanceCents -= Math.round(userShare * ratio);
      }
    }
  });

  sharedSettlements.forEach((s) => {
    const isUserPayer =
      (s.payer.user && String(s.payer.user) === uIdStr) ||
      (userEmail && s.payer.email && s.payer.email.toLowerCase() === userEmail);
    const isFriendPayee =
      (frUserId && s.payee.user && String(s.payee.user) === frUserId) ||
      (frEmail && s.payee.email && s.payee.email.toLowerCase() === frEmail);

    const isFriendPayer =
      (frUserId && s.payer.user && String(s.payer.user) === frUserId) ||
      (frEmail && s.payer.email && s.payer.email.toLowerCase() === frEmail);
    const isUserPayee =
      (s.payee.user && String(s.payee.user) === uIdStr) ||
      (userEmail && s.payee.email && s.payee.email.toLowerCase() === userEmail);

    if (isUserPayer && isFriendPayee) balanceCents += toCents(s.amount);
    if (isFriendPayer && isUserPayee) balanceCents -= toCents(s.amount);
  });

  res.status(200).json({
    status: "success",
    data: {
      friend: {
        ...friend,
        balance: fromCents(balanceCents),
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
exports.createSplitExpense = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const currentUser = await User.findById(userId).lean();
  if (!currentUser) throw new AppError("User not found", 404);

  const {
    title,
    amount,
    currency = "INR",
    category = "General",
    date = new Date(),
    group = null,
    paidBy = [],
    splitMethod = "equal",
    participants = [],
    itemDetails = [],
    tax = 0,
    tip = 0,
    notes = "",
  } = req.body;

  if (!title || !title.trim()) {
    throw new AppError("Expense title is required", 400);
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new AppError("Amount must be a positive number", 400);
  }

  if (!Array.isArray(paidBy) || paidBy.length === 0) {
    throw new AppError("At least one payer is required", 400);
  }

  // Validate total paid equals total expense amount
  const totalPaidCents = paidBy.reduce((sum, p) => sum + toCents(p.amount), 0);
  if (totalPaidCents !== toCents(numAmount)) {
    throw new AppError(
      `Total paid (₹${fromCents(totalPaidCents)}) must equal total expense amount (₹${round2(numAmount)})`,
      400,
    );
  }

  if (!Array.isArray(participants) || participants.length === 0) {
    throw new AppError("At least one participant is required", 400);
  }

  // Calculate accurate participant shares
  let calculatedParticipants;
  try {
    calculatedParticipants = calculateShares({
      amount: numAmount,
      splitMethod,
      participants,
      itemDetails,
      tax,
      tip,
    });
  } catch (err) {
    throw new AppError(err.message, 400);
  }

  // If group expense, verify group exists
  let targetGroup = null;
  if (group) {
    targetGroup = await Group.findById(group);
    if (!targetGroup || targetGroup.isArchived) {
      throw new AppError("Group not found", 404);
    }
  }

  const newExpense = await SplitExpense.create({
    title: title.trim(),
    amount: round2(numAmount),
    currency,
    category,
    date: date ? new Date(date) : new Date(),
    group: group || null,
    paidBy: paidBy.map((p) => ({
      user: p.user || null,
      name: p.name,
      email: p.email ? p.email.toLowerCase() : "",
      amount: round2(p.amount),
    })),
    splitMethod,
    participants: calculatedParticipants,
    itemDetails: itemDetails || [],
    tax: round2(tax),
    tip: round2(tip),
    notes: notes ? notes.trim() : "",
    createdBy: userId,
  });

  // Record activity
  await SplitActivity.create({
    group: group || null,
    user: userId,
    type: "expense_added",
    title: "Added expense",
    description: `Added "${newExpense.title}" for ₹${newExpense.amount}${
      targetGroup ? ` in "${targetGroup.name}"` : ""
    }`,
    amount: newExpense.amount,
    metadata: { expenseId: newExpense._id },
  });

  res.status(201).json({
    status: "success",
    data: { expense: newExpense },
  });
});

exports.getSplitExpenses = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const currentUser = await User.findById(userId).lean();
  const userEmail = currentUser?.email?.toLowerCase();

  const { groupId, category, search, page = 1, limit = 50 } = req.query;

  const filter = {};

  if (groupId) {
    filter.group = validateObjectId(groupId, "Group ID");
  } else {
    // Show all user's shared expenses
    const groups = await getUserGroups(userId, userEmail);
    const groupIds = groups.map((g) => g._id);

    filter.$or = [
      { createdBy: userId },
      { "paidBy.user": userId },
      { "participants.user": userId },
      ...(userEmail
        ? [
            { "paidBy.email": userEmail },
            { "participants.email": userEmail },
          ]
        : []),
      { group: { $in: groupIds } },
    ];
  }

  if (category && category !== "All") {
    filter.category = category;
  }

  if (search && search.trim()) {
    const safeRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { title: safeRegex },
        { notes: safeRegex },
        { "paidBy.name": safeRegex },
        { "participants.name": safeRegex },
      ],
    });
  }

  const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

  const [expenses, total] = await Promise.all([
    SplitExpense.find(filter)
      .populate("group", "name category icon")
      .populate("createdBy", "fullName email")
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    SplitExpense.countDocuments(filter),
  ]);

  res.status(200).json({
    status: "success",
    results: expenses.length,
    total,
    page: Number(page),
    data: { expenses },
  });
});

exports.getSplitExpenseById = asyncHandler(async (req, res) => {
  const expenseId = validateObjectId(req.params.id, "Expense ID");
  const expense = await SplitExpense.findById(expenseId)
    .populate("group", "name category icon members")
    .populate("createdBy", "fullName email")
    .lean();

  if (!expense) throw new AppError("Expense not found", 404);

  res.status(200).json({
    status: "success",
    data: { expense },
  });
});

exports.updateSplitExpense = asyncHandler(async (req, res) => {
  const expenseId = validateObjectId(req.params.id, "Expense ID");
  const userId = req.user.id;

  const expense = await SplitExpense.findById(expenseId);
  if (!expense) throw new AppError("Expense not found", 404);

  const {
    title,
    amount,
    category,
    date,
    paidBy,
    splitMethod,
    participants,
    itemDetails,
    tax,
    tip,
    notes,
  } = req.body;

  const numAmount = amount !== undefined ? Number(amount) : expense.amount;
  const currentSplitMethod = splitMethod || expense.splitMethod;
  const currentParticipants = participants || expense.participants;
  const currentItemDetails = itemDetails !== undefined ? itemDetails : expense.itemDetails;
  const currentTax = tax !== undefined ? Number(tax) : expense.tax;
  const currentTip = tip !== undefined ? Number(tip) : expense.tip;

  let calculatedParticipants;
  try {
    calculatedParticipants = calculateShares({
      amount: numAmount,
      splitMethod: currentSplitMethod,
      participants: currentParticipants,
      itemDetails: currentItemDetails,
      tax: currentTax,
      tip: currentTip,
    });
  } catch (err) {
    throw new AppError(err.message, 400);
  }

  if (title) expense.title = title.trim();
  expense.amount = round2(numAmount);
  if (category) expense.category = category;
  if (date) expense.date = new Date(date);
  if (paidBy && Array.isArray(paidBy) && paidBy.length > 0) {
    const totalPaid = paidBy.reduce((sum, p) => sum + toCents(p.amount), 0);
    if (totalPaid !== toCents(numAmount)) {
      throw new AppError("Total paid must equal total expense amount", 400);
    }
    expense.paidBy = paidBy.map((p) => ({
      user: p.user || null,
      name: p.name,
      email: p.email ? p.email.toLowerCase() : "",
      amount: round2(p.amount),
    }));
  }
  expense.splitMethod = currentSplitMethod;
  expense.participants = calculatedParticipants;
  expense.itemDetails = currentItemDetails;
  expense.tax = round2(currentTax);
  expense.tip = round2(currentTip);
  if (notes !== undefined) expense.notes = notes.trim();
  expense.updatedBy = userId;

  await expense.save();

  await SplitActivity.create({
    group: expense.group || null,
    user: userId,
    type: "expense_updated",
    title: "Updated expense",
    description: `Updated "${expense.title}" (₹${expense.amount})`,
    amount: expense.amount,
  });

  res.status(200).json({
    status: "success",
    data: { expense },
  });
});

exports.deleteSplitExpense = asyncHandler(async (req, res) => {
  const expenseId = validateObjectId(req.params.id, "Expense ID");
  const userId = req.user.id;

  const expense = await SplitExpense.findById(expenseId);
  if (!expense) throw new AppError("Expense not found", 404);

  const title = expense.title;
  const amount = expense.amount;
  const groupId = expense.group;

  await SplitExpense.findByIdAndDelete(expenseId);

  await SplitActivity.create({
    group: groupId || null,
    user: userId,
    type: "expense_deleted",
    title: "Deleted expense",
    description: `Deleted "${title}" (₹${amount})`,
    amount,
  });

  res.status(200).json({
    status: "success",
    message: "Expense deleted successfully",
  });
});

// ==========================================
// 5. SETTLEMENTS ("SETTLE UP")
// ==========================================
exports.createSettlement = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const currentUser = await User.findById(userId).lean();
  if (!currentUser) throw new AppError("User not found", 404);

  const {
    group = null,
    payer,
    payee,
    amount,
    date = new Date(),
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
  if (isNaN(numAmount) || numAmount <= 0) {
    throw new AppError("Settlement amount must be greater than zero", 400);
  }

  const settlement = await Settlement.create({
    group: group || null,
    payer: {
      user: payer.user || null,
      name: payer.name,
      email: payer.email ? payer.email.toLowerCase() : "",
    },
    payee: {
      user: payee.user || null,
      name: payee.name,
      email: payee.email ? payee.email.toLowerCase() : "",
    },
    amount: round2(numAmount),
    date: date ? new Date(date) : new Date(),
    paymentMethod,
    referenceNumber: referenceNumber ? referenceNumber.trim() : "",
    notes: notes ? notes.trim() : "",
    createdBy: userId,
  });

  let targetGroup = null;
  if (group) {
    targetGroup = await Group.findById(group).lean();
  }

  await SplitActivity.create({
    group: group || null,
    user: userId,
    type: "settlement_added",
    title: "Recorded payment",
    description: `${payer.name} paid ${payee.name} ₹${settlement.amount} via ${paymentMethod}${
      targetGroup ? ` in "${targetGroup.name}"` : ""
    }`,
    amount: settlement.amount,
    metadata: { settlementId: settlement._id },
  });

  res.status(201).json({
    status: "success",
    data: { settlement },
  });
});

exports.getSettlements = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const currentUser = await User.findById(userId).lean();
  const userEmail = currentUser?.email?.toLowerCase();

  const { groupId } = req.query;
  const filter = {};

  if (groupId) {
    filter.group = validateObjectId(groupId, "Group ID");
  } else {
    const groups = await getUserGroups(userId, userEmail);
    const groupIds = groups.map((g) => g._id);

    filter.$or = [
      { createdBy: userId },
      { "payer.user": userId },
      { "payee.user": userId },
      ...(userEmail
        ? [
            { "payer.email": userEmail },
            { "payee.email": userEmail },
          ]
        : []),
      { group: { $in: groupIds } },
    ];
  }

  const settlements = await Settlement.find(filter)
    .populate("group", "name category icon")
    .populate("createdBy", "fullName email")
    .sort({ date: -1, createdAt: -1 })
    .lean();

  res.status(200).json({
    status: "success",
    results: settlements.length,
    data: { settlements },
  });
});

exports.deleteSettlement = asyncHandler(async (req, res) => {
  const settlementId = validateObjectId(req.params.id, "Settlement ID");
  const userId = req.user.id;

  const settlement = await Settlement.findById(settlementId);
  if (!settlement) throw new AppError("Settlement not found", 404);

  const amount = settlement.amount;
  const payerName = settlement.payer.name;
  const payeeName = settlement.payee.name;
  const groupId = settlement.group;

  await Settlement.findByIdAndDelete(settlementId);

  await SplitActivity.create({
    group: groupId || null,
    user: userId,
    type: "settlement_deleted",
    title: "Deleted payment",
    description: `Deleted settlement of ₹${amount} from ${payerName} to ${payeeName}`,
    amount,
  });

  res.status(200).json({
    status: "success",
    message: "Settlement deleted successfully",
  });
});

// ==========================================
// 6. ACTIVITY FEED
// ==========================================
exports.getActivityFeed = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const currentUser = await User.findById(userId).lean();
  const userEmail = currentUser?.email?.toLowerCase();

  const groups = await getUserGroups(userId, userEmail);
  const groupIds = groups.map((g) => g._id);

  const activities = await SplitActivity.find({
    $or: [{ user: userId }, { group: { $in: groupIds } }],
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
exports.getSplitAnalytics = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const currentUser = await User.findById(userId).lean();
  const userEmail = currentUser?.email?.toLowerCase();
  const uIdStr = String(userId);

  const [groups, allExpenses] = await Promise.all([
    getUserGroups(userId, userEmail),
    getUserExpenses(userId, userEmail),
  ]);

  // Group-wise spending
  const groupSpendingMap = {};
  groups.forEach((g) => {
    groupSpendingMap[String(g._id)] = {
      name: g.name,
      category: g.category,
      totalSpent: 0,
      userPaid: 0,
      userShare: 0,
    };
  });
  groupSpendingMap["non_group"] = {
    name: "Non-Group (Direct)",
    category: "Friends",
    totalSpent: 0,
    userPaid: 0,
    userShare: 0,
  };

  // Category breakdown
  const categoryMap = {};

  // Monthly spending
  const monthlyMap = {};

  allExpenses.forEach((exp) => {
    const grpKey = exp.group ? String(exp.group) : "non_group";
    if (groupSpendingMap[grpKey]) {
      groupSpendingMap[grpKey].totalSpent += exp.amount;
    }

    const cat = exp.category || "General";
    categoryMap[cat] = (categoryMap[cat] || 0) + exp.amount;

    const expDate = new Date(exp.date);
    const monthKey = !isNaN(expDate.getTime())
      ? expDate.toLocaleDateString("en-US", { year: "numeric", month: "short" })
      : "Unknown";
    monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + exp.amount;

    // Check user's paid amount & share
    (exp.paidBy || []).forEach((p) => {
      if (
        (p.user && String(p.user) === uIdStr) ||
        (userEmail && p.email && p.email.toLowerCase() === userEmail)
      ) {
        if (groupSpendingMap[grpKey]) {
          groupSpendingMap[grpKey].userPaid += p.amount;
        }
      }
    });

    (exp.participants || []).forEach((p) => {
      if (
        (p.user && String(p.user) === uIdStr) ||
        (userEmail && p.email && p.email.toLowerCase() === userEmail)
      ) {
        if (groupSpendingMap[grpKey]) {
          groupSpendingMap[grpKey].userShare += p.shareAmount;
        }
      }
    });
  });

  const groupSpending = Object.values(groupSpendingMap)
    .filter((g) => g.totalSpent > 0)
    .map((g) => ({
      ...g,
      totalSpent: round2(g.totalSpent),
      userPaid: round2(g.userPaid),
      userShare: round2(g.userShare),
    }));

  const categoryDistribution = Object.entries(categoryMap).map(
    ([category, amount]) => ({
      category,
      amount: round2(amount),
    }),
  );

  const monthlyTrend = Object.entries(monthlyMap).map(([month, amount]) => ({
    month,
    amount: round2(amount),
  }));

  res.status(200).json({
    status: "success",
    data: {
      groupSpending,
      categoryDistribution,
      monthlyTrend,
      totalExpensesCount: allExpenses.length,
      totalSharedSpent: round2(
        allExpenses.reduce((sum, e) => sum + (e.amount || 0), 0),
      ),
    },
  });
});

