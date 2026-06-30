// frontend/src/components/MemberList.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useRoom } from "../hooks/useRoomData"; // To get current room details and roomService
import expenseService from "../services/expenseService"; // Import expenseService for balance check
import { useNavigate } from "react-router-dom"; // For navigation after leaving room

function MemberList() {
  const { user, logout } = useAuth();
  const {
    currentRoom,
    roomService,
    selectRoom,
    clearCurrentRoom,
    removeRoomFromMyRooms,
  } = useRoom();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // State for Add Member form
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("user"); // Default to 'user'

  // Clear messages after a few seconds
  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        setMessage(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, error]);

  // Determine if the current user is an admin in this room
  const userIsAdminInRoom = currentRoom?.members.some(
    (member) => member.user._id === user._id && member.role === "admin"
  );

  // Helper to check if a user has outstanding balances
  const hasOutstandingBalances = async (userId) => {
    try {
      const { rawBalances } = await expenseService.getRoomBalances(
        currentRoom._id,
        user.token
      );
      const memberBalance = rawBalances.find((b) => b._id === userId);
      return memberBalance && Math.abs(memberBalance.amount) > 0.01; // Check if balance is not zero
    } catch (err) {
      console.error("Error checking outstanding balances:", err);
      setError("Failed to check balances. Please try again.");
      return true; // Assume outstanding to be safe
    }
  };

  // Handle Add Member
  const handleAddMember = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!newMemberEmail.trim()) {
      setError("Please enter an email address.");
      return;
    }
    setLoading(true);
    try {
      const response = await roomService.addMemberToRoom(
        currentRoom._id,
        newMemberEmail,
        newMemberRole,
        user.token
      );
      setMessage(`Member "${newMemberEmail}" added successfully!`);
      setNewMemberEmail("");
      setNewMemberRole("user");
      // Re-fetch room details to update the member list in context
      await selectRoom(currentRoom._id);
    } catch (err) {
      setError(err.message || "Failed to add member.");
      console.error("Add member error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Remove Member
  const handleRemoveMember = async (memberIdToRemove, memberName) => {
    setError(null);
    setMessage(null);

    // Check for outstanding balances before allowing removal
    const hasDebts = await hasOutstandingBalances(memberIdToRemove);
    if (hasDebts) {
      setError(
        `${memberName} has outstanding debts or credits and cannot be removed. Please settle all expenses first.`
      );
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to remove ${memberName} from this room?`
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      await roomService.removeMemberFromRoom(
        currentRoom._id,
        memberIdToRemove,
        user.token
      );
      setMessage(`Member "${memberName}" removed successfully.`);
      // Re-fetch room details to update the member list in context
      await selectRoom(currentRoom._id);
    } catch (err) {
      setError(err.message || "Failed to remove member.");
      console.error("Remove member error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Change Role
  const handleChangeRole = async (memberIdToChange, memberName, newRole) => {
    setError(null);
    setMessage(null);
    if (
      !window.confirm(
        `Are you sure you want to change ${memberName}'s role to ${newRole}?`
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      await roomService.changeMemberRole(
        currentRoom._id,
        memberIdToChange,
        newRole,
        user.token
      );
      setMessage(
        `Member "${memberName}" role changed to ${newRole} successfully.`
      );
      // Re-fetch room details to update the member list in context
      await selectRoom(currentRoom._id);
    } catch (err) {
      setError(err.message || "Failed to change role.");
      console.error("Change role error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle Leave Room
  const handleLeaveRoom = async () => {
    setError(null);
    setMessage(null);

    // Check for outstanding balances before allowing user to leave
    const hasDebts = await hasOutstandingBalances(user._id);
    if (hasDebts) {
      setError(
        `You have outstanding debts or credits and cannot leave the room. Please settle all expenses first.`
      );
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to leave the room "${currentRoom.name}"?`
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      await roomService.leaveRoom(currentRoom._id, user.token);
      setMessage(`Successfully left room "${currentRoom.name}".`);
      clearCurrentRoom(); // Clear the current room from context and localStorage
      removeRoomFromMyRooms(currentRoom._id); // Remove from user's list of rooms
      navigate("/dashboard"); // Redirect to dashboard
    } catch (err) {
      setError(err.message || "Failed to leave room.");
      console.error("Leave room error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4 text-gray-600">Loading members...</div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-2xl font-semibold mb-4 text-gray-800">
        Room Members
      </h3>

      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          {error}
        </div>
      )}

      {/* Current Members List */}
      <div className="mb-8">
        <h4 className="text-xl font-semibold text-gray-800 mb-3">
          Members in {currentRoom?.name}
        </h4>
        {currentRoom?.members.length === 0 ? (
          <p className="text-gray-600">No members in this room yet.</p>
        ) : (
          <ul className="space-y-3">
            {currentRoom.members.map((member) => (
              <li
                key={member.user._id}
                className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center"
              >
                <div className="mb-2 sm:mb-0">
                  <p className="text-lg font-medium text-gray-800">
                    {member.user.name}{" "}
                    {member.user._id === user._id && (
                      <span className="text-sm text-gray-500">(You)</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-600">{member.user.email}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      member.role === "admin"
                        ? "bg-blue-200 text-blue-800"
                        : "bg-gray-200 text-gray-800"
                    }`}
                  >
                    {member.role.toUpperCase()}
                  </span>
                  {userIsAdminInRoom &&
                    member.user._id !== user._id && ( // Admin can't change their own role or remove themselves
                      <>
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleChangeRole(
                              member.user._id,
                              member.user.name,
                              e.target.value
                            )
                          }
                          className="p-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() =>
                            handleRemoveMember(
                              member.user._id,
                              member.user.name
                            )
                          }
                          className="bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-3 rounded-md transition duration-200 ease-in-out"
                        >
                          Remove
                        </button>
                      </>
                    )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Admin: Add New Member Form */}
      {userIsAdminInRoom && (
        <div className="mt-8 border-t pt-6 border-gray-200">
          <h4 className="text-xl font-semibold text-gray-800 mb-4">
            Add New Member
          </h4>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div>
              <label
                htmlFor="newMemberEmail"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                Member Email
              </label>
              <input
                type="email"
                id="newMemberEmail"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter email of user to add"
                required
              />
            </div>
            <div>
              <label
                htmlFor="newMemberRole"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                Role
              </label>
              <select
                id="newMemberRole"
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 ease-in-out"
            >
              Add Member
            </button>
          </form>
        </div>
      )}

      {/* Leave Room Button (for current user) */}
      <div className="mt-8 border-t pt-6 border-gray-200 text-center">
        <button
          onClick={handleLeaveRoom}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 ease-in-out"
        >
          Leave Room
        </button>
      </div>
    </div>
  );
}

export default MemberList;
