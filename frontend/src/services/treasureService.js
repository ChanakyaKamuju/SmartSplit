// frontend/src/services/treasureService.js
import axios from "axios";
import { resourceUrl } from "./apiConfig";

const API_URL = resourceUrl("treasure");

// Helper to get auth header
const getAuthHeader = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// Add amount to room treasure (Admin only)
const addTreasureAmount = async (roomId, amount, description, token) => {
  try {
    const response = await axios.post(
      API_URL + `${roomId}/add`,
      { amount, description },
      getAuthHeader(token),
    );
    return response.data;
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    throw new Error(message);
  }
};

// Record a transaction (debit) from room treasure (Admin only)
const recordTreasureTransaction = async (
  roomId,
  amount,
  description,
  token,
) => {
  try {
    const response = await axios.post(
      API_URL + `${roomId}/transaction`,
      { amount, description },
      getAuthHeader(token),
    );
    return response.data;
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    throw new Error(message);
  }
};

// Get current treasure amount for a room (Any member)
const getCurrentTreasure = async (roomId, token) => {
  try {
    const response = await axios.get(
      API_URL + `${roomId}`,
      getAuthHeader(token),
    );
    return response.data;
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    throw new Error(message);
  }
};

// Get all treasure transactions for a room (Any member)
const getTreasureTransactions = async (roomId, token) => {
  try {
    const response = await axios.get(
      API_URL + `${roomId}/transactions`,
      getAuthHeader(token),
    );
    return response.data;
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    throw new Error(message);
  }
};

// Delete a treasure transaction and revert its effect on the balance
// (room admin, or the member who recorded it)
const deleteTreasureTransaction = async (transactionId, token) => {
  try {
    const response = await axios.delete(
      API_URL + `transaction/${transactionId}`,
      getAuthHeader(token),
    );
    return response.data;
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    throw new Error(message);
  }
};

const treasureService = {
  addTreasureAmount,
  recordTreasureTransaction,
  getCurrentTreasure,
  getTreasureTransactions,
  deleteTreasureTransaction,
};

export default treasureService;
