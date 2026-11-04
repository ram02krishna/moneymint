const express = require("express");
const router = express.Router();
const { Protect } = require("../middleware/authMiddleware");
const splitController = require("../controllers/splitController");

// All split routes require authentication
router.use(Protect);

// Dashboard
router.get("/dashboard", splitController.getSplitDashboard);

// Groups
router.post("/groups", splitController.createGroup);
router.get("/groups", splitController.getGroups);
router.get("/groups/:id", splitController.getGroupById);
router.put("/groups/:id", splitController.updateGroup);
router.delete("/groups/:id", splitController.deleteGroup);
router.post("/groups/:id/members", splitController.addGroupMember);
router.delete("/groups/:id/members/:memberId", splitController.removeGroupMember);

// Friends
router.get("/friends", splitController.getFriends);
router.post("/friends", splitController.addFriend);
router.get("/friends/search-users", splitController.searchUsers);
router.get("/friends/:id", splitController.getFriendDetail);
router.delete("/friends/:id", splitController.deleteFriend);

// Shared Expenses
router.post("/expenses", splitController.createSplitExpense);
router.get("/expenses", splitController.getSplitExpenses);
router.put("/expenses/:id", splitController.updateSplitExpense);
router.delete("/expenses/:id", splitController.deleteSplitExpense);

// Settlements
router.post("/settlements", splitController.createSettlement);
router.get("/settlements", splitController.getSettlements);
router.delete("/settlements/:id", splitController.deleteSettlement);

// Activity & Audit Feed
router.get("/activity", splitController.getActivityFeed);

// Analytics
router.get("/analytics", splitController.getSplitAnalytics);

module.exports = router;

