// frontend/src/services/expenseService.js
import axios from "axios";
import { resourceUrl } from "./apiConfig";

const API_URL = resourceUrl("expenses");

// Helper to get auth header
const getAuthHeader = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// Add a new expense
const addExpense = async (expenseData, token) => {
  try {
    const response = await axios.post(
      API_URL + "add",
      expenseData,
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

// Delete an expense
const deleteExpense = async (expenseId, token) => {
  try {
    const response = await axios.delete(
      API_URL + `${expenseId}`,
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

// Get all expenses for a specific room
const getRoomExpenses = async (roomId, token) => {
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

// Get calculated balances for a specific room
const getRoomBalances = async (roomId, token) => {
  try {
    const response = await axios.get(
      API_URL + `${roomId}/balances`,
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

// Settle a debt (simulated by adding a new expense)
// This function will create a new expense where 'fromUser' pays 'toUser'
const settleDebt = async (roomId, fromUserId, toUserId, amount, token) => {
  const description = `Settlement: ${amount.toFixed(
    2,
  )} from ${fromUserId} to ${toUserId}`;
  const expenseData = {
    roomId,
    description,
    totalAmount: amount,
    paidBy: fromUserId, // The person who owes pays
    splitType: "unequal",
    splits: [{ user: toUserId, amount: amount }], // Only the person who is owed receives
  };
  try {
    const response = await axios.post(
      API_URL + "add",
      expenseData,
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

const expenseService = {
  addExpense,
  deleteExpense, // Export deleteExpense
  getRoomExpenses,
  getRoomBalances,
  settleDebt, // Export settleDebt
};

export default expenseService;
