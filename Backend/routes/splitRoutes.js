const express = require("express");
const { Protect } = require("../middleware/authMiddleware");
const controller = require("../controllers/splitController");

const router = express.Router();
router.use(Protect);
router.get("/friends/search", controller.searchFriend);
router.route("/groups").get(controller.listGroups).post(controller.createGroup);
router.route("/groups/:id").get(controller.getGroup).delete(controller.deleteGroup);
router.post("/groups/:id/members", controller.addMember);
router.post("/groups/:id/expenses", controller.createExpense);
router.post("/groups/:id/settlements", controller.createSettlement);

module.exports = router;
