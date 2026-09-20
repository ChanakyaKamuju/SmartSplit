// backend/routes/treasureRoutes.js
const express = require("express");
const router = express.Router();
const {
  addTreasureAmount,
  recordTreasureTransaction,
  getCurrentTreasure,
  getTreasureTransactions,
  deleteTreasureTransaction,
} = require("../controllers/treasureController");
const { protect, adminProtect } = require("../middleware/authMiddleware");

// Routes for treasure management
// Admin-only actions:
router.post("/:id/add", protect, adminProtect, addTreasureAmount);
router.post(
  "/:id/transaction",
  protect,
  adminProtect,
  recordTreasureTransaction
);

// Deleting a transaction is authorized inside the controller (room admin or the
// member who recorded it), so adminProtect is deliberately not used here.
router.delete("/transaction/:transactionId", protect, deleteTreasureTransaction);

// View-only actions (accessible by any room member):
router.get("/:roomId", protect, getCurrentTreasure);
router.get("/:roomId/transactions", protect, getTreasureTransactions);

module.exports = router;
