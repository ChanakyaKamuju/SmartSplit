// frontend/src/pages/RoomDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useRoom } from "../hooks/useRoomData";

// Import actual components
import ExpenseSplitter from "../components/ExpenseSplitter";
import TreasureManager from "../components/TreasureManager";
import MemberList from "../components/MemberList";
import DutyTimeTable from "../components/DutyTimeTable";

function RoomDetail() {
  const { id: roomIdFromUrl } = useParams();
  const navigate = useNavigate();

  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const {
    currentRoom,
    selectRoom,
    loadingRooms,
    error: roomContextError,
    clearCurrentRoom,
    myRooms,
    roomService,
    removeRoomFromMyRooms,
  } = useRoom(); // Added roomService and removeRoomFromMyRooms

  const [activeTab, setActiveTab] = useState("expenses");
  const [localError, setLocalError] = useState(null);
  const [message, setMessage] = useState(null); // For success messages
  const [deleteError, setDeleteError] = useState(null); // Specific error for delete operation

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
      return;
    }

    if (
      isAuthenticated &&
      roomIdFromUrl &&
      (!currentRoom || currentRoom._id !== roomIdFromUrl)
    ) {
      if (myRooms.some((room) => room._id === roomIdFromUrl)) {
        selectRoom(roomIdFromUrl);
      } else if (!loadingRooms) {
        setLocalError(
          "You are not a member of this room or the room does not exist."
        );
        clearCurrentRoom();
      }
    }

    if (
      !loadingRooms &&
      roomContextError &&
      currentRoom === null &&
      roomIdFromUrl
    ) {
      setLocalError(roomContextError);
      clearCurrentRoom();
    }
  }, [
    roomIdFromUrl,
    isAuthenticated,
    authLoading,
    navigate,
    currentRoom,
    selectRoom,
    loadingRooms,
    roomContextError,
    myRooms,
    clearCurrentRoom,
  ]);

  // Clear messages after a few seconds
  useEffect(() => {
    if (message || deleteError) {
      const timer = setTimeout(() => {
        setMessage(null);
        setDeleteError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, deleteError]);

  const handleBackToDashboard = () => {
    clearCurrentRoom();
    navigate("/dashboard");
  };

  const handleDeleteRoom = async () => {
    setDeleteError(null);
    setMessage(null);
    if (!currentRoom || !user || !user.token) {
      setDeleteError("Cannot delete room: Room data or user token missing.");
      return;
    }

    // Double confirmation for deleting a room
    if (
      !window.confirm(
        `Are you absolutely sure you want to DELETE the room "${currentRoom.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }
    if (
      !window.confirm(
        `THIS IS THE FINAL WARNING! Deleting "${currentRoom.name}" will permanently remove all its expenses, treasure data, and duties. Are you REALLY sure?`
      )
    ) {
      return;
    }

    try {
      await roomService.deleteRoom(currentRoom._id, user.token);
      setMessage(`Room "${currentRoom.name}" deleted successfully!`);
      clearCurrentRoom(); // Clear current room from context and localStorage
      removeRoomFromMyRooms(currentRoom._id); // Remove from user's list of rooms
      navigate("/dashboard"); // Redirect to dashboard
    } catch (err) {
      setDeleteError(err.message || "Failed to delete room.");
      console.error("Delete room error:", err);
    }
  };

  if (authLoading || loadingRooms) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-gray-700 text-lg">Loading room data...</p>
      </div>
    );
  }

  if (!currentRoom || localError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error!</h2>
          <p className="text-gray-700 mb-6">
            {localError ||
              "Could not load room details or you don't have access to this room."}
          </p>
          <button
            onClick={handleBackToDashboard}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 ease-in-out"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const userIsAdminInRoom = currentRoom.members.some(
    (member) => member.user._id === user._id && member.role === "admin"
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">
            {currentRoom.name}
            <span className="block text-base sm:text-lg font-normal text-gray-500">
              ID: {currentRoom.roomId}
            </span>
          </h1>
          <button
            onClick={handleBackToDashboard}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg text-sm transition duration-200 ease-in-out"
          >
            &larr; Back to Dashboard
          </button>
        </div>

        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
            {message}
          </div>
        )}
        {deleteError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            {deleteError}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex flex-wrap border-b border-gray-200 mb-6">
          <button
            className={`px-4 py-2 text-lg font-medium rounded-t-lg transition-colors duration-200 ${
              activeTab === "expenses"
                ? "bg-indigo-600 text-white"
                : "text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => setActiveTab("expenses")}
          >
            Expenses
          </button>
          <button
            className={`px-4 py-2 text-lg font-medium rounded-t-lg transition-colors duration-200 ${
              activeTab === "treasure"
                ? "bg-indigo-600 text-white"
                : "text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => setActiveTab("treasure")}
          >
            Treasure
          </button>
          <button
            className={`px-4 py-2 text-lg font-medium rounded-t-lg transition-colors duration-200 ${
              activeTab === "members"
                ? "bg-indigo-600 text-white"
                : "text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => setActiveTab("members")}
          >
            Members
          </button>
          <button
            className={`px-4 py-2 text-lg font-medium rounded-t-lg transition-colors duration-200 ${
              activeTab === "duties"
                ? "bg-indigo-600 text-white"
                : "text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => setActiveTab("duties")}
          >
            Duties
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "expenses" && (
            <ExpenseSplitter room={currentRoom} user={user} />
          )}
          {activeTab === "treasure" && (
            <TreasureManager room={currentRoom} user={user} />
          )}
          {activeTab === "members" && (
            <MemberList room={currentRoom} user={user} />
          )}
          {activeTab === "duties" && (
            <DutyTimeTable room={currentRoom} user={user} />
          )}
        </div>

        {/* Admin: Delete Room Button */}
        {userIsAdminInRoom && (
          <div className="mt-8 border-t pt-6 border-gray-200 text-center">
            <button
              onClick={handleDeleteRoom}
              className="bg-red-700 hover:bg-red-800 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 ease-in-out"
            >
              Delete Room
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default RoomDetail;
