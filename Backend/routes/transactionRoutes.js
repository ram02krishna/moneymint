const express = require("express");
const { Protect } = require("../middleware/authMiddleware");
const {
  getAllTransactions,
  downloadTransactionsExcel,
} = require("../controllers/transactionController");

let router = express.Router();

router.route("/").get(Protect, getAllTransactions);

router.route("/download-excel").get(Protect, downloadTransactionsExcel);

module.exports = router;
