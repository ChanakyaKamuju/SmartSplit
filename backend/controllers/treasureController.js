const asyncHandler = require("express-async-handler");
const Room = require("../models/Room");

// @desc    Add amount to room treasure
// @route   POST /api/treasure/:roomId/add
// @access  Private/Admin
const addTreasureAmount = asyncHandler(async (req, res) => {
  // req.room is populated by adminProtect middleware
  const room = req.room;
  const { amount, description } = req.body;

  if (typeof amount !== "number" || amount <= 0) {
    res.status(400);
    throw new Error(
      "Please provide a valid positive amount to add to treasure."
    );
  }
  if (!description) {
    res.status(400);
    throw new Error("Please provide a description for the treasure addition.");
  }

  // Update the treasure amount
  room.treasure += amount;

  // Record the transaction
  room.treasureTransactions.push({
    description: description,
    amount: amount,
    type: "credit", // Type 'credit' for adding money
    performedBy: req.user._id,
    date: new Date(),
  });

  await room.save();

  res.status(200).json({
    message: `Successfully added ${amount} to treasure.`,
    currentTreasure: room.treasure,
    transaction:
      room.treasureTransactions[room.treasureTransactions.length - 1], // Return the last added transaction
  });
});

// @desc    Record a transaction (debit) from room treasure
// @route   POST /api/treasure/:roomId/transaction
// @access  Private/Admin
const recordTreasureTransaction = asyncHandler(async (req, res) => {
  // req.room is populated by adminProtect middleware
  const room = req.room;
  const { amount, description } = req.body;

  if (typeof amount !== "number" || amount <= 0) {
    res.status(400);
    throw new Error(
      "Please provide a valid positive amount for the transaction."
    );
  }
  if (!description) {
    res.status(400);
    throw new Error(
      "Please provide a description for the treasure transaction."
    );
  }

  // Check if there's enough money in the treasure
  if (room.treasure < amount) {
    res.status(400);
    throw new Error("Insufficient funds in treasure for this transaction.");
  }

  // Deduct amount from treasure
  room.treasure -= amount;

  // Record the transaction
  room.treasureTransactions.push({
    description: description,
    amount: amount,
    type: "debit", // Type 'debit' for spending money
    performedBy: req.user._id,
    date: new Date(),
  });

  await room.save();

  res.status(200).json({
    message: `Successfully recorded transaction of ${amount} from treasure.`,
    currentTreasure: room.treasure,
    transaction:
      room.treasureTransactions[room.treasureTransactions.length - 1], // Return the last added transaction
  });
});

// @desc    Get current treasure amount for a room
// @route   GET /api/treasure/:roomId
// @access  Private
const getCurrentTreasure = asyncHandler(async (req, res) => {
  const roomId = req.params.roomId;

  // Find the room by its MongoDB _id
  const room = await Room.findById(roomId);

  if (!room) {
    res.status(404);
    throw new Error("Room not found.");
  }

  // Check if the current user is a member of this room
  const isMember = room.members.some(
    (member) => member.user.toString() === req.user._id.toString()
  );

  if (!isMember) {
    res.status(403);
    throw new Error("Not authorized to view treasure for this room.");
  }

  res.status(200).json({
    roomId: room._id,
    currentTreasure: room.treasure,
  });
});

// @desc    Get all treasure transactions for a room
// @route   GET /api/treasure/:roomId/transactions
// @access  Private
const getTreasureTransactions = asyncHandler(async (req, res) => {
  const roomId = req.params.roomId;

  // Find the room by its MongoDB _id
  const room = await Room.findById(roomId).populate(
    "treasureTransactions.performedBy",
    "name email"
  );

  if (!room) {
    res.status(404);
    throw new Error("Room not found.");
  }

  // Check if the current user is a member of this room
  const isMember = room.members.some(
    (member) => member.user.toString() === req.user._id.toString()
  );

  if (!isMember) {
    res.status(403);
    throw new Error(
      "Not authorized to view treasure transactions for this room."
    );
  }

  // Sort transactions by date descending (most recent first) without mutating
  // the stored array order
  const sortedTransactions = [...room.treasureTransactions].sort(
    (a, b) => b.date - a.date
  );

  res.status(200).json({
    roomId: room._id,
    treasureTransactions: sortedTransactions,
  });
});

// @desc    Delete a treasure transaction and revert its effect on the balance
// @route   DELETE /api/treasure/transaction/:transactionId
// @access  Private (room admin or the member who recorded it)
const deleteTreasureTransaction = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;

  // Transactions are embedded in the room document, so locate the owning room
  const room = await Room.findOne({
    "treasureTransactions._id": transactionId,
  });

  if (!room) {
    res.status(404);
    throw new Error("Treasure transaction not found.");
  }

  const transaction = room.treasureTransactions.id(transactionId);
  if (!transaction) {
    res.status(404);
    throw new Error("Treasure transaction not found.");
  }

  const isRoomAdmin = room.members.some(
    (member) =>
      member.user.toString() === req.user._id.toString() &&
      member.role === "admin"
  );
  const isPerformer =
    transaction.performedBy &&
    transaction.performedBy.toString() === req.user._id.toString();

  if (!isRoomAdmin && !isPerformer) {
    res.status(403);
    throw new Error(
      "Not authorized to delete this transaction. Only a room admin or the member who recorded it can delete."
    );
  }

  // Reverting a credit removes money from the fund, so make sure that is possible
  if (transaction.type === "credit" && room.treasure < transaction.amount) {
    res.status(400);
    throw new Error(
      "Cannot delete this deposit: the treasure has already been spent below the deposited amount."
    );
  }

  // Revert the transaction's effect on the running total
  if (transaction.type === "credit") {
    room.treasure -= transaction.amount;
  } else {
    room.treasure += transaction.amount;
  }

  transaction.deleteOne();
  await room.save();

  res.status(200).json({
    message: "Treasure transaction deleted successfully.",
    currentTreasure: room.treasure,
  });
});

module.exports = {
  addTreasureAmount,
  recordTreasureTransaction,
  getCurrentTreasure,
  getTreasureTransactions,
  deleteTreasureTransaction,
};
