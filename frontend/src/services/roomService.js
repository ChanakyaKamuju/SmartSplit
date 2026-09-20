// frontend/src/services/roomService.js
import axios from "axios";
import { resourceUrl } from "./apiConfig";

const API_URL = resourceUrl("rooms");

// Helper to get auth header
const getAuthHeader = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// Create a new room
const createRoom = async (roomName, token) => {
  try {
    const response = await axios.post(
      API_URL + "create",
      { name: roomName },
      getAuthHeader(token),
    );
    return response.data; // Returns room data with ID and members
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    throw new Error(message);
  }
};

// Join an existing room
const joinRoom = async (roomId, token) => {
  try {
    const response = await axios.post(
      API_URL + "join",
      { roomId },
      getAuthHeader(token),
    );
    return response.data; // Returns confirmation message and joined room details
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    throw new Error(message);
  }
};

// Get all rooms the authenticated user belongs to
const getMyRooms = async (token) => {
  try {
    const response = await axios.get(
      API_URL + "my-rooms",
      getAuthHeader(token),
    );
    return response.data; // Returns an array of rooms (basic info)
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    throw new Error(message);
  }
};

// Get detailed information for a specific room
const getRoomDetails = async (roomId, token) => {
  try {
    const response = await axios.get(
      API_URL + `${roomId}`,
      getAuthHeader(token),
    );
    return response.data; // Returns full room object including populated members
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    throw new Error(message);
  }
};

// Admin function: Add a member to a room
const addMemberToRoom = async (roomId, email, role, token) => {
  try {
    const response = await axios.put(
      API_URL + `${roomId}/add-member`,
      { email, role },
      getAuthHeader(token),
    );
    return response.data; // Returns updated room object
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    throw new Error(message);
  }
};

// Admin function: Remove a member from a room
const removeMemberFromRoom = async (roomId, userId, token) => {
  try {
    const response = await axios.put(
      API_URL + `${roomId}/remove-member`,
      { userId },
      getAuthHeader(token),
    );
    return response.data; // Returns updated room object
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    throw new Error(message);
  }
};

// Admin function: Change a member's role in a room
const changeMemberRole = async (roomId, userId, newRole, token) => {
  try {
    const response = await axios.put(
      API_URL + `${roomId}/change-role`,
      { userId, newRole },
      getAuthHeader(token),
    );
    return response.data; // Returns updated room object
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    throw new Error(message);
  }
};

// User function: Leave a room
const leaveRoom = async (roomId, token) => {
  try {
    const response = await axios.put(
      API_URL + `${roomId}/leave`,
      {},
      getAuthHeader(token),
    );
    return response.data; // Returns success message
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    throw new Error(message);
  }
};

// Admin function: Delete a room
const deleteRoom = async (roomId, token) => {
  try {
    const response = await axios.delete(
      API_URL + `${roomId}`,
      getAuthHeader(token),
    );
    return response.data; // Returns success message
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    throw new Error(message);
  }
};

const roomService = {
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

export default roomService;
