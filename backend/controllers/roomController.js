// backend/controllers/roomController.js
const asyncHandler = require("express-async-handler");
const Room = require("../models/Room");
const User = require("../models/User");
const Expense = require("../models/Expense"); // Expense model is correctly imported and used
const Duty = require("../models/Duty");
const { resolveAssignments } = require("../utils/dutyAssignment");

// Keep the duty rotation in sync when someone stops being a room member.
// Without this a departed member stays in memberOrder and keeps being assigned
// duties by the nightly rotation job.
const dropMemberFromDuties = async (roomId, userId) => {
  const dutyConfig = await Duty.findOne({ roomId });
  if (!dutyConfig) return;

  const target = userId.toString();
  const sizeBefore = dutyConfig.memberOrder.length;

  dutyConfig.memberOrder = dutyConfig.memberOrder.filter(
    (id) => id.toString() !== target,
  );
  dutyConfig.skippedMembersForCurrentCycle =
    dutyConfig.skippedMembersForCurrentCycle.filter(
      (id) => id.toString() !== target,
    );

  if (dutyConfig.memberOrder.length === sizeBefore) return; // not in the rotation

  if (dutyConfig.currentStartingMemberIndex >= dutyConfig.memberOrder.length) {
    dutyConfig.currentStartingMemberIndex = 0;
  }

  // Duties are kept even if they now outnumber the remaining members; the
  // rotation wraps so someone takes more than one, and nothing is silently
  // discarded. With no members left every duty becomes unassigned.
  const assignments = resolveAssignments(
    dutyConfig.duties,
    dutyConfig.memberOrder,
    dutyConfig.currentStartingMemberIndex,
    dutyConfig.skippedMembersForCurrentCycle,
  );
  dutyConfig.duties.forEach((duty, index) => {
    duty.assignedTo = assignments[index];
  });

  await dutyConfig.save();
};

// Removed: const TreasureTransaction = require('../models/TreasureTransaction'); // This line is removed

// @desc    Create a new room
// @route   POST /api/rooms/create
// @access  Private
const createRoom = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name) {
    res.status(400);
    throw new Error("Please add a room name");
  }

  // Generate a unique 6-character alphanumeric room ID
  let roomId;
  let roomExists = true;
  while (roomExists) {
    roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const existingRoom = await Room.findOne({ roomId });
    if (!existingRoom) {
      roomExists = false;
    }
  }

  const room = await Room.create({
    name,
    roomId, // Store the generated short ID
    createdBy: req.user._id,
    members: [{ user: req.user._id, role: "admin" }], // Creator is admin by default
  });

  if (room) {
    res.status(201).json({
      _id: room._id,
      name: room.name,
      roomId: room.roomId,
      members: room.members, // Return initial members
      message: "Room created successfully",
    });
  } else {
    res.status(400);
    throw new Error("Invalid room data");
  }
});

// @desc    Join an existing room
// @route   POST /api/rooms/join
// @access  Private
const joinRoom = asyncHandler(async (req, res) => {
  const { roomId } = req.body; // Use the short, human-readable roomId

  if (!roomId) {
    res.status(400);
    throw new Error("Please provide a Room ID");
  }

  const room = await Room.findOne({ roomId }); // Find by the short roomId
  if (!room) {
    res.status(404);
    throw new Error("Room not found with that ID.");
  }

  // Check if user is already a member
  const isMember = room.members.some(
    (member) => member.user.toString() === req.user._id.toString(),
  );

  if (isMember) {
    res.status(400);
    throw new Error("You are already a member of this room.");
  }

  // Add user as a regular member
  room.members.push({ user: req.user._id, role: "user" });
  await room.save();

  res.status(200).json({
    _id: room._id, // Return MongoDB _id for frontend navigation
    name: room.name,
    roomId: room.roomId,
    message: `Successfully joined room ${room.name}`,
  });
});

// @desc    Get all rooms a user is a member of
// @route   GET /api/rooms/my-rooms
// @access  Private
const getMyRooms = asyncHandler(async (req, res) => {
  // Find rooms where the user's ID exists in the members array
  const rooms = await Room.find({ "members.user": req.user._id }).select(
    "name roomId",
  ); // Select only necessary fields
  res.status(200).json(rooms);
});

// @desc    Get room details by MongoDB _id
// @route   GET /api/rooms/:id
// @access  Private
const getRoomDetails = asyncHandler(async (req, res) => {
  const roomId = req.params.id; // This is the MongoDB _id

  const room = await Room.findById(roomId).populate(
    "members.user",
    "name email",
  ); // Populate user details
  if (!room) {
    res.status(404);
    throw new Error("Room not found.");
  }

  // Check if the requesting user is a member of this room
  const isMember = room.members.some(
    (member) => member.user._id.toString() === req.user._id.toString(),
  );
  if (!isMember) {
    res.status(403);
    throw new Error("Not authorized to view this room.");
  }

  res.status(200).json(room);
});

// @desc    Admin: Add a member to a room by email
// @route   PUT /api/rooms/:id/add-member
// @access  Private/Admin
const addMemberToRoom = asyncHandler(async (req, res) => {
  const roomId = req.params.id;
  const { email, role } = req.body; // role can be 'user' or 'admin'

  // Find the room by its MongoDB _id
  const room = await Room.findById(roomId).populate(
    "members.user",
    "name email",
  );
  if (!room) {
    res.status(404);
    throw new Error("Room not found.");
  }

  // Check if the requesting user is an admin of this room
  const isAdmin = room.members.some(
    (member) =>
      member.user._id.toString() === req.user._id.toString() &&
      member.role === "admin",
  );
  if (!isAdmin) {
    res.status(403);
    throw new Error("Not authorized. Only room admins can add members.");
  }

  // Find the user to add by email
  const userToAdd = await User.findOne({ email });
  if (!userToAdd) {
    res.status(404);
    throw new Error("User with that email not found.");
  }

  // Check if the user is already a member of the room. members.user is
  // populated here, so compare _id and not the document itself.
  const isAlreadyMember = room.members.some(
    (member) => member.user._id.toString() === userToAdd._id.toString(),
  );
  if (isAlreadyMember) {
    res.status(400);
    throw new Error("User is already a member of this room.");
  }

  // Add the user to the room's members array
  room.members.push({ user: userToAdd._id, role: role || "user" });
  await room.save();

  // Re-populate members to send updated list back
  const updatedRoom = await Room.findById(roomId).populate(
    "members.user",
    "name email",
  );

  res.status(200).json(updatedRoom);
});

// @desc    Admin: Remove a member from a room
// @route   PUT /api/rooms/:id/remove-member
// @access  Private/Admin
const removeMemberFromRoom = asyncHandler(async (req, res) => {
  const roomId = req.params.id;
  const { userId } = req.body; // User ID to remove

  const room = await Room.findById(roomId).populate(
    "members.user",
    "name email",
  );
  if (!room) {
    res.status(404);
    throw new Error("Room not found.");
  }

  // Check if the requesting user is an admin of this room
  const isAdmin = room.members.some(
    (member) =>
      member.user._id.toString() === req.user._id.toString() &&
      member.role === "admin",
  );
  if (!isAdmin) {
    res.status(403);
    throw new Error("Not authorized. Only room admins can remove members.");
  }

  // Prevent admin from removing themselves unless they are the last admin
  const memberToRemove = room.members.find(
    (m) => m.user._id.toString() === userId,
  );
  if (!memberToRemove) {
    res.status(404);
    throw new Error("Member not found in this room.");
  }

  if (memberToRemove.user._id.toString() === req.user._id.toString()) {
    const adminCount = room.members.filter((m) => m.role === "admin").length;
    if (adminCount === 1) {
      res.status(400);
      throw new Error(
        "You cannot remove yourself as you are the last admin. Appoint another admin first or delete the room.",
      );
    }
  }

  // Check for outstanding balances before removal. Only the lookup is wrapped
  // in try/catch; the 400 below must not be swallowed and relabelled.
  let rawBalances;
  try {
    // Pass the Expense model directly to the internal function
    ({ rawBalances } = await getRoomBalancesInternal(
      roomId,
      req.user._id,
      Expense,
    ));
  } catch (balanceError) {
    console.error(
      `[removeMemberFromRoom] Error during balance check for user ${userId}:`,
      balanceError.message,
    );
    res.status(500);
    throw new Error(
      `Failed to check outstanding balances: ${balanceError.message}`,
    );
  }

  const memberBalance = rawBalances.find((b) => b._id === userId);

  console.log(
    `[removeMemberFromRoom] Balance for ${
      memberToRemove.user.name
    } (${userId}): ${memberBalance ? memberBalance.amount : "N/A"}`,
  );

  if (memberBalance && Math.abs(memberBalance.amount) > 0.01) {
    // Check if balance is not zero (allowing for float inaccuracies)
    console.warn(
      `[removeMemberFromRoom] User ${userId} has outstanding balance: ${memberBalance.amount}`,
    );
    res.status(400);
    throw new Error(
      `${memberToRemove.user.name} has outstanding debts or credits and cannot be removed. Please settle all expenses first.`,
    );
  }
  console.log(
    `[removeMemberFromRoom] User ${userId} has no outstanding balances.`,
  );

  // Remove the member
  room.members = room.members.filter(
    (member) => member.user._id.toString() !== userId,
  );
  await room.save();
  await dropMemberFromDuties(roomId, userId);
  console.log(
    `[removeMemberFromRoom] User ${userId} removed from room members array.`,
  );

  // Re-populate members to send updated list back
  const updatedRoom = await Room.findById(roomId).populate(
    "members.user",
    "name email",
  );
  console.log(`[removeMemberFromRoom] Room ${roomId} updated and repopulated.`);

  res.status(200).json(updatedRoom);
});

// @desc    Admin: Change a member's role in a room
// @route   PUT /api/rooms/:id/change-role
// @access  Private/Admin
const changeMemberRole = asyncHandler(async (req, res) => {
  const roomId = req.params.id;
  const { userId, newRole } = req.body;

  if (!["user", "admin"].includes(newRole)) {
    res.status(400);
    throw new Error('Invalid role specified. Must be "user" or "admin".');
  }

  const room = await Room.findById(roomId).populate(
    "members.user",
    "name email",
  );
  if (!room) {
    res.status(404);
    throw new Error("Room not found.");
  }

  const isAdmin = room.members.some(
    (member) =>
      member.user._id.toString() === req.user._id.toString() &&
      member.role === "admin",
  );
  if (!isAdmin) {
    res.status(403);
    throw new Error(
      "Not authorized. Only room admins can change member roles.",
    );
  }

  const memberToUpdate = room.members.find(
    (m) => m.user._id.toString() === userId,
  );
  if (!memberToUpdate) {
    res.status(404);
    throw new Error("Member not found in this room.");
  }

  // Prevent an admin from demoting themselves if they are the last admin
  if (
    memberToUpdate.user._id.toString() === req.user._id.toString() &&
    newRole === "user"
  ) {
    const adminCount = room.members.filter((m) => m.role === "admin").length;
    if (adminCount === 1) {
      res.status(400);
      throw new Error(
        "You cannot demote yourself as you are the last admin. Appoint another admin first.",
      );
    }
  }

  memberToUpdate.role = newRole;
  await room.save();

  const updatedRoom = await Room.findById(roomId).populate(
    "members.user",
    "name email",
  );
  res.status(200).json(updatedRoom);
});

// @desc    User: Leave a room
// @route   PUT /api/rooms/:id/leave
// @access  Private
const leaveRoom = asyncHandler(async (req, res) => {
  const roomId = req.params.id; // MongoDB _id of the room

  console.log(
    `[leaveRoom] User ${req.user._id} attempting to leave room ${roomId}`,
  );

  const room = await Room.findById(roomId).populate(
    "members.user",
    "name email",
  );
  if (!room) {
    console.error(`[leaveRoom] Room ${roomId} not found.`);
    res.status(404);
    throw new Error("Room not found.");
  }
  console.log(`[leaveRoom] Room found: ${room.name}`);

  // Check if the user is a member
  const isMember = room.members.some(
    (member) => member.user._id.toString() === req.user._id.toString(),
  );
  if (!isMember) {
    console.warn(
      `[leaveRoom] User ${req.user._id} is not a member of room ${roomId}.`,
    );
    res.status(400);
    throw new Error("You are not a member of this room.");
  }
  console.log(`[leaveRoom] User ${req.user._id} is a member.`);

  // Prevent leaving if user is the last admin
  const userIsAdmin = room.members.some(
    (m) =>
      m.user._id.toString() === req.user._id.toString() && m.role === "admin",
  );
  if (userIsAdmin) {
    const adminCount = room.members.filter((m) => m.role === "admin").length;
    if (adminCount === 1) {
      console.warn(
        `[leaveRoom] User ${req.user._id} is last admin and attempting to leave.`,
      );
      res.status(400);
      throw new Error(
        "You cannot leave as you are the last admin. Appoint another admin first or delete the room.",
      );
    }
  }

  // Check for outstanding balances before leaving
  console.log(
    `[leaveRoom] Checking balances for user leaving: ${req.user._id}...`,
  );
  // Only the lookup is wrapped in try/catch; the 400 below must not be
  // swallowed and relabelled.
  let rawBalances;
  try {
    // Pass the Expense model directly to the internal function
    ({ rawBalances } = await getRoomBalancesInternal(
      roomId,
      req.user._id,
      Expense,
    ));
  } catch (balanceError) {
    console.error(
      `[leaveRoom] Error during balance check for user ${req.user._id}:`,
      balanceError.message,
    );
    res.status(500);
    throw new Error(
      `Failed to check outstanding balances: ${balanceError.message}`,
    );
  }

  const userBalance = rawBalances.find(
    (b) => b._id === req.user._id.toString(),
  );

  console.log(
    `[leaveRoom] Balance for user leaving (${req.user.name || req.user._id}): ${
      userBalance ? userBalance.amount : "N/A"
    }`,
  );

  if (userBalance && Math.abs(userBalance.amount) > 0.01) {
    console.warn(
      `[leaveRoom] User ${req.user._id} has outstanding balance: ${userBalance.amount}`,
    );
    res.status(400);
    throw new Error(
      "You have outstanding debts or credits and cannot leave the room. Please settle all expenses first.",
    );
  }
  console.log(`[leaveRoom] User ${req.user._id} has no outstanding balances.`);

  // Remove the user from the members array
  room.members = room.members.filter(
    (member) => member.user._id.toString() !== req.user._id.toString(),
  );
  await room.save();
  await dropMemberFromDuties(roomId, req.user._id);
  console.log(
    `[leaveRoom] User ${req.user._id} removed from room members array.`,
  );

  res.status(200).json({ message: "Successfully left the room." });
});

// @desc    Admin: Delete a room
// @route   DELETE /api/rooms/:id
// @access  Private/Admin
const deleteRoom = asyncHandler(async (req, res) => {
  const roomId = req.params.id; // MongoDB _id of the room

  console.log(
    `[deleteRoom] Admin ${req.user._id} attempting to delete room ${roomId}`,
  );

  const room = await Room.findById(roomId);
  if (!room) {
    console.error(`[deleteRoom] Room ${roomId} not found.`);
    res.status(404);
    throw new Error("Room not found.");
  }
  console.log(`[deleteRoom] Room found: ${room.name}`);

  // Check if the requesting user is an admin of this room
  const isAdmin = room.members.some(
    (member) =>
      member.user.toString() === req.user._id.toString() &&
      member.role === "admin",
  );
  if (!isAdmin) {
    console.warn(
      `[deleteRoom] User ${req.user._id} is not an admin for room ${roomId}.`,
    );
    res.status(403);
    throw new Error("Not authorized. Only room admins can delete a room.");
  }
  console.log(`[deleteRoom] Requesting user ${req.user._id} is an admin.`);

  // Additional checks before deleting the room:
  // 1. Ensure no other members are in the room (only the admin deleting it)
  if (room.members.length > 1) {
    console.warn(
      `[deleteRoom] Room ${roomId} has other members. Cannot delete.`,
    );
    res.status(400);
    throw new Error(
      "Room cannot be deleted. All other members must leave the room first.",
    );
  }

  // 2. Ensure there are no outstanding expenses
  const expensesCount = await Expense.countDocuments({ roomId });
  if (expensesCount > 0) {
    console.warn(
      `[deleteRoom] Room ${roomId} has ${expensesCount} outstanding expenses. Cannot delete.`,
    );
    res.status(400);
    throw new Error(
      "Room cannot be deleted. All expenses must be deleted or settled first.",
    );
  }

  // Removed the TreasureTransaction check as the model doesn't exist yet.
  // If you implement TreasureTransaction model later, you can add this check back:
  /*
    const treasureTransactionsCount = await TreasureTransaction.countDocuments({ roomId });
    if (treasureTransactionsCount > 0) {
        console.warn(`[deleteRoom] Room ${roomId} has ${treasureTransactionsCount} treasure transactions. Cannot delete.`);
        res.status(400);
        throw new Error('Room cannot be deleted. All treasure transactions must be cleared/handled first.');
    }
    */
  console.log(
    `[deleteRoom] No outstanding treasure transactions (check skipped as model not present).`,
  );

  // If all checks pass, delete the room and its duty configuration (which
  // would otherwise be orphaned and keep getting rotated nightly)
  await Duty.deleteOne({ roomId });
  await room.deleteOne(); // Use deleteOne() for Mongoose 6+
  console.log(`[deleteRoom] Room ${roomId} deleted successfully.`);

  res.status(200).json({ message: "Room deleted successfully." });
});

// Internal helper function to get room balances without sending a response.
// Deliberately NOT wrapped in asyncHandler: that wrapper expects
// (req, res, next) and would treat the third argument as `next`, swallowing
// any error instead of propagating it to the caller.
const getRoomBalancesInternal = async (
  roomId,
  requestingUserId,
  ExpenseModel
) => {
    // Debug log for ExpenseModel
    const room = await Room.findById(roomId).populate("members.user", "name");
    if (!room) {
      throw new Error("Room not found.");
    }

    // Ensure the requesting user is a member of this room to calculate balances
    const isMember = room.members.some(
      (member) => member.user._id.toString() === requestingUserId.toString(),
    );
    if (!isMember) {
      throw new Error("Requesting user is not a member of this room.");
    }

    // Use ExpenseModel passed as argument
    const expenses = await ExpenseModel.find({ roomId })
      .populate("paidBy", "name")
      .populate("splits.user", "name");

    const balances = {};
    room.members.forEach((member) => {
      balances[member.user._id.toString()] = {
        _id: member.user._id.toString(),
        name: member.user.name,
        amount: 0,
      };
    });

    expenses.forEach((expense) => {
      // Ensure paidBy is populated and not null
      if (!expense.paidBy) {
        return; // Skip this expense if paidBy is invalid
      }
      const paidById = expense.paidBy._id.toString();
      const totalAmount = expense.totalAmount;

      if (balances[paidById]) {
        balances[paidById].amount += totalAmount;
      } else {
        console.warn(
          `  -> PaidBy user ${paidById} not found in room members for balance calculation. (Expense: ${expense.description})`,
        );
      }

      expense.splits.forEach((split) => {
        // Ensure split.user is populated and not null
        if (!split.user) {
          console.warn(
            `[getRoomBalancesInternal] Expense ${expense._id} has unpopulated or null split.user field. Skipping split.`,
          );
          return; // Skip this split if user is invalid
        }
        const splitUserId = split.user._id.toString();
        const owedAmount = split.amount;

        if (balances[splitUserId]) {
          balances[splitUserId].amount -= owedAmount;
        } else {
          console.warn(
            `  -> Split user ${splitUserId} not found in room members for balance calculation. (Expense: ${expense.description})`,
          );
        }
      });
    });

    const balanceArray = Object.values(balances);

  return {
    rawBalances: balanceArray.map((b) => ({
      _id: b._id,
      name: b.name,
      amount: parseFloat(b.amount.toFixed(2)),
    })),
  };
};

module.exports = {
  createRoom,
  joinRoom,
  getMyRooms,
  getRoomDetails,
  addMemberToRoom,
  removeMemberFromRoom,
  changeMemberRole,
  leaveRoom,
  deleteRoom, // Export the new function
};
