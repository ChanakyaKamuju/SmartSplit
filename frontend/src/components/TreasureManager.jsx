// frontend/src/components/TreasureManager.jsx
import React, { useState, useEffect } from "react";
import treasureService from "../services/treasureService";
import { useAuth } from "../contexts/AuthContext";
import { useRoom } from "../hooks/useRoomData";

function TreasureManager() {
  const { user } = useAuth();
  const { currentRoom } = useRoom();

  const [currentTreasure, setCurrentTreasure] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Form states
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionType, setTransactionType] = useState("add"); // 'add' or 'deduct'

  // Function to re-fetch all treasure data
  const refreshTreasureData = async () => {
    if (!currentRoom || !user || !user.token) return;

    setLoading(true);
    setError(null);
    try {
      const currentTreasureData = await treasureService.getCurrentTreasure(
        currentRoom._id,
        user.token
      );
      setCurrentTreasure(currentTreasureData.currentTreasure);

      const transactionData = await treasureService.getTreasureTransactions(
        currentRoom._id,
        user.token
      );
      setTransactions(transactionData.treasureTransactions);
    } catch (err) {
      console.error("Failed to refresh treasure data:", err);
      setError(err.message || "Failed to load treasure data.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch treasure data on component mount or when currentRoom changes
  useEffect(() => {
    refreshTreasureData();
  }, [currentRoom, user]);

  // Determine if the current user is an admin in this room
  const userIsAdminInRoom = currentRoom?.members.some(
    (member) => member.user._id === user._id && member.role === "admin"
  );

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

  // Handle form submission for adding/deducting treasure
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid positive amount.");
      return;
    }
    if (!description.trim()) {
      setError("Please provide a description.");
      return;
    }

    try {
      let response;
      if (transactionType === "add") {
        response = await treasureService.addTreasureAmount(
          currentRoom._id,
          parseFloat(amount),
          description,
          user.token
        );
        setMessage("Amount added to treasure successfully!");
      } else {
        // 'deduct'
        response = await treasureService.recordTreasureTransaction(
          currentRoom._id,
          parseFloat(amount),
          description,
          user.token
        );
        setMessage("Amount deducted from treasure successfully!");
      }
      setCurrentTreasure(response.currentTreasure);
      refreshTreasureData(); // Re-fetch transactions to update the list

      // Reset form
      setAmount("");
      setDescription("");
    } catch (err) {
      setError(err.message || "Transaction failed.");
      console.error("Treasure transaction error:", err);
    }
  };

  // Handle Delete Treasure Transaction
  const handleDeleteTransaction = async (
    transactionId,
    transactionDescription
  ) => {
    setError(null);
    setMessage(null);
    if (
      !window.confirm(
        `Are you sure you want to delete the transaction "${transactionDescription}"? This will revert the treasure amount.`
      )
    ) {
      return;
    }
    try {
      const response = await treasureService.deleteTreasureTransaction(
        transactionId,
        user.token
      );
      setMessage(
        `Transaction "${transactionDescription}" deleted successfully!`
      );
      setCurrentTreasure(response.currentTreasure); // Update treasure amount from response
      refreshTreasureData(); // Re-fetch transactions to update the list
    } catch (err) {
      setError(err.message || "Failed to delete transaction.");
      console.error("Delete transaction error:", err);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4 text-gray-600">
        Loading treasure data...
      </div>
    );
  }

  if (error && !message) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-2xl font-semibold mb-4 text-gray-800">
        Treasure Management
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

      {/* Current Treasure Amount */}
      <div className="mb-8 p-6 bg-yellow-50 rounded-lg border border-yellow-200 text-center">
        <h4 className="text-xl font-semibold text-yellow-800 mb-2">
          Current Treasure Fund:
        </h4>
        <p className="text-4xl font-bold text-yellow-700">
          ${currentTreasure.toFixed(2)}
        </p>
      </div>

      {/* Admin Form to Add/Deduct Treasure */}
      {userIsAdminInRoom && (
        <div className="mb-8 p-6 bg-indigo-50 rounded-lg border border-indigo-200">
          <h4 className="text-xl font-semibold text-gray-800 mb-4">
            Manage Treasure Fund
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="amount"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                Amount
              </label>
              <input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., 100.00"
                step="0.01"
                required
              />
            </div>
            <div>
              <label
                htmlFor="description"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                Description
              </label>
              <input
                type="text"
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Monthly contribution, Paid for utilities"
                required
              />
            </div>
            <div>
              <label
                htmlFor="transactionType"
                className="block text-gray-700 text-sm font-bold mb-2"
              >
                Transaction Type
              </label>
              <select
                id="transactionType"
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="add">Add to Treasure</option>
                <option value="deduct">Deduct from Treasure</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 ease-in-out"
            >
              {transactionType === "add" ? "Add Funds" : "Deduct Funds"}
            </button>
          </form>
        </div>
      )}

      {/* Transaction History */}
      <div>
        <h4 className="text-xl font-semibold text-gray-800 mb-3">
          Transaction History
        </h4>
        {transactions.length === 0 ? (
          <p className="text-gray-600">No transactions recorded yet.</p>
        ) : (
          <ul className="space-y-3">
            {transactions.map((transaction) => (
              <li
                key={transaction._id}
                className={`p-4 rounded-lg border shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center ${
                  transaction.type === "credit"
                    ? "bg-green-50 border-green-300"
                    : "bg-red-50 border-red-300"
                }`}
              >
                <div className="mb-2 sm:mb-0">
                  <p className="text-lg font-medium text-gray-800">
                    {transaction.description}
                  </p>
                  <p className="text-sm text-gray-600">
                    By: {transaction.performedBy?.name || "Unknown"} -{" "}
                    {new Date(transaction.date).toLocaleDateString()} at{" "}
                    {new Date(transaction.date).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <span
                    className={`text-xl font-bold ${
                      transaction.type === "credit"
                        ? "text-green-700"
                        : "text-red-700"
                    }`}
                  >
                    {transaction.type === "credit" ? "+" : "-"}$
                    {transaction.amount.toFixed(2)}
                  </span>
                  {(userIsAdminInRoom ||
                    transaction.performedBy?._id === user._id) && (
                    <button
                      onClick={() =>
                        handleDeleteTransaction(
                          transaction._id,
                          transaction.description
                        )
                      }
                      className="bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-3 rounded-md transition duration-200 ease-in-out"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default TreasureManager;
