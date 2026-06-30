// frontend/src/pages/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useRoom } from "../hooks/useRoomData";

function Dashboard() {
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const {
    myRooms,
    currentRoom,
    loadingRooms,
    error: roomError,
    addRoomToMyRooms,
    selectRoom,
    clearCurrentRoom,
    roomService, // Access roomService for create/join
  } = useRoom();

  const navigate = useNavigate();

  const [roomName, setRoomName] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [dashboardMessage, setDashboardMessage] = useState(""); // For form submissions
  const [createRoomError, setCreateRoomError] = useState("");
  const [joinRoomError, setJoinRoomError] = useState("");
  const [showFields, setShowFields] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, authLoading, currentRoom, navigate]);

  // Clear message after some time
  useEffect(() => {
    if (dashboardMessage || createRoomError || joinRoomError) {
      const timer = setTimeout(() => {
        setDashboardMessage("");
        setCreateRoomError("");
        setJoinRoomError("");
      }, 5000); // Clear after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [dashboardMessage, createRoomError, joinRoomError]);

  // Handle Create Room
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setCreateRoomError("");
    if (!roomName.trim()) {
      setCreateRoomError("Room name cannot be empty.");
      return;
    }
    try {
      const newRoomResponse = await roomService.createRoom(
        roomName,
        user.token
      );
      addRoomToMyRooms(newRoomResponse); // Add to context and select it
      setRoomName("");
      setDashboardMessage(
        `Room "${newRoomResponse.name}" created successfully! Room ID: ${newRoomResponse.roomId}`
      );
      navigate(`/room/${newRoomResponse._id}`); // Navigate to the new room
    } catch (err) {
      setCreateRoomError(err.message || "Failed to create room.");
      console.error("Create room error:", err);
    }
  };

  // Handle Join Room
  const handleJoinRoom = async (e) => {
    e.preventDefault();
    setJoinRoomError("");
    if (!joinRoomId.trim()) {
      setJoinRoomError("Room ID cannot be empty.");
      return;
    }
    try {
      const joinResponse = await roomService.joinRoom(joinRoomId, user.token);
      // The backend returns a simple message on join, we need to fetch room details
      const joinedRoomBasicInfo = {
        _id: joinResponse._id,
        name: joinResponse.name,
        roomId: joinResponse.roomId,
      };
      addRoomToMyRooms(joinedRoomBasicInfo); // Add to context and select it
      setJoinRoomId("");
      setDashboardMessage(`Successfully joined room "${joinResponse.name}"!`);
      navigate(`/room/${joinResponse._id}`); // Navigate to the joined room
    } catch (err) {
      setJoinRoomError(err.message || "Failed to join room.");
      console.error("Join room error:", err);
    }
  };

  const handleRoomSelect = (roomId) => {
    selectRoom(roomId);
    navigate(`/room/${roomId}`);
  };

  if (authLoading || loadingRooms) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-gray-700 text-lg">Loading application data...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // This case is theoretically handled by useEffect redirect, but for robustness
    return null;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Fixed Header Section */}
      <div className="bg-emerald-600 px-4 pt-4 rounded-b-3xl shadow-2xl shadow-gray-800 w-full flex flex-col items-center flex-shrink-0 z-10">
        {/* Title */}
        <div className="w-full px-4 flex flex-col items-center justify-center mt-12">
          <h1
            className="text-4xl font-bold text-center text-black mb-12 w-full max-w-xs drop-shadow-lg"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            SmartSplitAI
          </h1>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4 text-center">
            Welcome, {user ? user.name : "User"}!
          </h2>
          <p className="text-lg text-gray-700 text-center mb-2">
            Your central hub for managing shared expenses.
          </p>
        </div>
        <div
          className={`overflow-hidden transition-all duration-500 ease-in-out w-full max-w-xs px-4 ${
            showFields ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="p-6 flex flex-col items-center justify-center">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              {showCreate ? "Create New Room" : "Join Existing Room"}
            </h2>

            {showCreate ? (
              // 👉 Create Room Section
              <form onSubmit={handleCreateRoom} className="flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="Enter Room Name"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="flex-grow p-3 border bg-blue-50 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 ease-in-out"
                >
                  Create Room
                </button>
              </form>
            ) : (
              // 👉 Join Room Section
              <form onSubmit={handleJoinRoom} className="flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="Enter Room ID"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)} // Added .toUpperCase() here
                  className="flex-grow p-3 border bg-blue-50 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 ease-in-out"
                >
                  Join Room
                </button>
              </form>
            )}

            {/* 🔴 Errors */}
            {showCreate && createRoomError && (
              <p className="text-red-500 text-sm mt-2">{createRoomError}</p>
            )}
            {!showCreate && joinRoomError && (
              <p className="text-red-500 text-sm mt-2">{joinRoomError}</p>
            )}

            {/* 🔁 Switch Links */}
            <div className="mt-4 text-center text-gray-600">
              {showCreate ? (
                <>
                  Already have a room?{" "}
                  <button
                    type="button"
                    className="text-green-600 hover:text-green-800 cursor-pointer font-semibold"
                    onClick={() => setShowCreate(false)}
                  >
                    Join Here
                  </button>
                </>
              ) : (
                <>
                  New Room?{" "}
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-800 cursor-pointer font-semibold"
                    onClick={() => setShowCreate(true)}
                  >
                    Create
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowFields((prev) => !prev)}
          className="relative bottom-[-6px] hover:cursor-pointer text-black transition-transform duration-300 focus:outline-none"
        >
          <span
            className={`inline-block transform transition-transform duration-300 ${
              showFields ? "rotate-180" : "rotate-0"
            }`}
          >
            <i
              className={`fa-solid fa-angle-down text-2xl ${
                showFields ? "" : "animate-bounce"
              }`}
            ></i>
          </span>
        </button>
      </div>

      {/* Scrollable Content Section */}
      <h3 className="mt-4 text-2xl w-full font-semibold text-gray-800 text-center sticky top-0 bg-gray-200 py-4 z-5">
        Your Rooms
      </h3>
      <div className="flex-1 overflow-y-auto px-4">
        {dashboardMessage && (
          <div
            className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <span className="block sm:inline">{dashboardMessage}</span>
          </div>
        )}
        {roomError && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <span className="block sm:inline">{roomError}</span>
          </div>
        )}
        {myRooms.length === 0 ? (
          <p className="text-gray-600 text-center">
            You haven't joined or created any rooms yet.
          </p>
        ) : (
          <ul className="grid grid-cols-1">
            {myRooms.map((room) => (
              <li
                key={room._id}
                className="bg-gray-300 mt-4 p-4 rounded-md bg-opacity-25 shadow-md flex justify-between"
              >
                <div>
                  <h4 className="text-lg font-bold opacity-100 text-gray-800">
                    {room.name}
                  </h4>
                  <p className="text-sm text-gray-800">ID: {room.roomId}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRoomSelect(room._id)}
                  className=" w-30 bg-blue-900 hover:bg-blue-950 cursor-pointer text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 ease-in-out"
                >
                  View Room
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Fixed Logout Button at the bottom */}
      <div className="p-4  flex-shrink-0">
        <button
          type="button"
          onClick={logout}
          className="w-full bg-red-600 hover:bg-red-800 cursor-pointer text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 ease-in-out"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
