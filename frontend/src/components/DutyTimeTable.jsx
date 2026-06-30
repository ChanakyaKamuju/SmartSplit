// frontend/src/components/DutyTimeTable.jsx
import React, { useState, useEffect } from "react";
import dutyService from "../services/dutyService";
import { useAuth } from "../contexts/AuthContext"; // To get the user's token
import { useRoom } from "../hooks/useRoomData"; // To get current room details and its members

function DutyTimeTable() {
  const { user } = useAuth();
  const { currentRoom, loadingRooms, error: roomError } = useRoom();

  const [dutiesConfig, setDutiesConfig] = useState(null); // Stores the full duty configuration
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null); // For success messages

  // State for Admin configuration form
  const [newDutyDescription, setNewDutyDescription] = useState("");
  const [dutiesList, setDutiesList] = useState([]); // List of duty objects for form
  const [memberOrderList, setMemberOrderList] = useState([]); // List of member IDs for order
  const [showConfigForm, setShowConfigForm] = useState(false); // Toggle config form visibility

  // Fetch duties on component mount or when currentRoom changes
  useEffect(() => {
    const fetchDuties = async () => {
      if (!currentRoom || !user || !user.token) return;

      setLoading(true);
      setError(null);
      try {
        const data = await dutyService.getDutiesTable(
          currentRoom._id,
          user.token
        );
        console.log("Fetched duties data:", data);

        setDutiesConfig(data);
        // Initialize form states if duties are configured
        if (data.isConfigured) {
          setDutiesList(
            data.allDuties.map((d) => ({
              description: d.description,
              _id: d._id,
            }))
          );
          setMemberOrderList(data.allDuties.map((d) => d.assignedTo._id));
        } else {
          // If not configured, initialize with room members for potential configuration
          setMemberOrderList(currentRoom.members.map((m) => m.user._id));
          console.log(memberOrderList);
        }
      } catch (err) {
        console.error("Failed to fetch duties:", err);
        setError(err.message || "Failed to load duties.");
        setDutiesConfig(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDuties();
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

  // --- Duty Configuration Form Handlers ---
  const handleAddDuty = () => {
    if (
      newDutyDescription.trim() &&
      dutiesList.length < memberOrderList.length
    ) {
      setDutiesList([
        ...dutiesList,
        { description: newDutyDescription.trim(), _id: `new-${Date.now()}` },
      ]);
      setNewDutyDescription("");
    } else if (dutiesList.length >= memberOrderList.length) {
      setError(
        "Number of duties cannot be greater than or equal to the number of members in the order."
      );
    }
  };

  const handleRemoveDuty = (idToRemove) => {
    setDutiesList(dutiesList.filter((duty) => duty._id !== idToRemove));
  };

  const handleDutyDescriptionChange = (id, newDesc) => {
    setDutiesList(
      dutiesList.map((duty) =>
        duty._id === id ? { ...duty, description: newDesc } : duty
      )
    );
  };

  const handleMemberOrderChange = (e, index) => {
    const newOrder = [...memberOrderList];
    newOrder[index] = e.target.value;
    setMemberOrderList(newOrder);
  };

  const handleMoveMemberUp = (index) => {
    if (index > 0) {
      const newOrder = [...memberOrderList];
      [newOrder[index - 1], newOrder[index]] = [
        newOrder[index],
        newOrder[index - 1],
      ];
      setMemberOrderList(newOrder);
    }
  };

  const handleMoveMemberDown = (index) => {
    if (index < memberOrderList.length - 1) {
      const newOrder = [...memberOrderList];
      [newOrder[index + 1], newOrder[index]] = [
        newOrder[index],
        newOrder[index + 1],
      ];
      setMemberOrderList(newOrder);
    }
  };

  const handleSaveConfiguration = async () => {
    setError(null);
    setMessage(null);
    if (dutiesList.length === 0 || memberOrderList.length === 0) {
      setError("Please add duties and set member order.");
      return;
    }
    if (dutiesList.length > memberOrderList.length) {
      setError(
        "Number of duties cannot be greater than the number of members in the order."
      );
      return;
    }

    // Filter out temporary _id's for new duties if any, backend will assign real ones
    const finalDuties = dutiesList.map((d) => ({ description: d.description }));

    try {
      const response = await dutyService.createOrUpdateDuties(
        currentRoom._id,
        finalDuties,
        memberOrderList,
        user.token
      );
      setDutiesConfig(response.dutyConfig); // Update local state with saved config
      setMessage("Duty configuration saved successfully!");
      setShowConfigForm(false); // Hide form after saving
    } catch (err) {
      setError(err.message || "Failed to save configuration.");
      console.error("Save config error:", err);
    }
  };

  // --- Skip Member Handler ---
  const handleSkipMember = async (userIdToSkip) => {
    setError(null);
    setMessage(null);
    if (
      !window.confirm(
        `Are you sure you want to skip this member for today's duties?`
      )
    ) {
      return;
    }
    try {
      const response = await dutyService.skipMemberFromCycle(
        currentRoom._id,
        userIdToSkip,
        user.token
      );
      setDutiesConfig(response.updatedDutyTable); // Update with new assignments after skip
      setMessage(`Member skipped successfully! Duties re-assigned.`);
    } catch (err) {
      setError(err.message || "Failed to skip member.");
      console.error("Skip member error:", err);
    }
  };

  if (loading || loadingRooms) {
    return (
      <div className="text-center py-4 text-gray-600">Loading duties...</div>
    );
  }

  //   if (error) {
  //     console.log("Error loading duties:", error);
  //     return (
  //       <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4">
  //         {error}
  //       </div>
  //     );
  //   }

  // Map member IDs to names for display
  const getMemberName = (userId) => {
    const member = currentRoom?.members.find((m) => m.user._id === userId);
    return member ? member.user.name : "Unknown User";
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-2xl font-semibold mb-4 text-gray-800">
        Duty Time Table
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

      {/* User's Assigned Duty for Today */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="text-xl font-semibold text-blue-800 mb-2">
          Your Duty for Today:
        </h4>
        {dutiesConfig?.currentUserDuty ? (
          <p className="text-lg text-blue-700 font-medium">
            {dutiesConfig.currentUserDuty.description}
          </p>
        ) : (
          <p className="text-gray-700">
            {dutiesConfig?.isConfigured
              ? "No duty assigned to you today (you might be skipped or all duties are assigned)."
              : "Duties are not configured for this room yet."}
          </p>
        )}
      </div>

      {/* All Duties and Assignments for Today */}
      <div className="mb-8">
        <h4 className="text-xl font-semibold text-gray-800 mb-3">
          All Duties for Today:
        </h4>
        {dutiesConfig?.allDuties && dutiesConfig.allDuties.length > 0 ? (
          <ul className="space-y-2">
            {dutiesConfig.allDuties.map((assignment, index) => (
              <li
                key={index}
                className="flex justify-between items-center bg-gray-50 p-3 rounded-md border border-gray-200"
              >
                <span className="text-gray-700 font-medium">
                  {assignment.description}
                </span>
                <span className="text-indigo-600 font-semibold">
                  {assignment.assignedTo.name}
                  {assignment.assignedTo._id === user._id && (
                    <span className="ml-2 text-sm text-gray-500">(You)</span>
                  )}
                </span>
                {userIsAdminInRoom &&
                  assignment.assignedTo._id !== user._id && (
                    <button
                      onClick={() =>
                        handleSkipMember(assignment.assignedTo._id)
                      }
                      className="ml-4 bg-yellow-500 hover:bg-yellow-600 text-white text-sm py-1 px-3 rounded-md transition duration-200 ease-in-out"
                    >
                      Skip
                    </button>
                  )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600">
            No duties assigned for today or not configured.
          </p>
        )}
      </div>

      {/* Admin Configuration Section */}
      {userIsAdminInRoom && (
        <div className="mt-8 border-t pt-6 border-gray-200">
          <button
            onClick={() => setShowConfigForm(!showConfigForm)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 ease-in-out"
          >
            {showConfigForm ? "Hide Configuration" : "Add/Edit Duties & Order"}
          </button>

          {showConfigForm && (
            <div className="mt-6 p-6 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="text-xl font-semibold text-gray-800 mb-4">
                Configure Duties & Member Order
              </h4>

              {/* Duties List Management */}
              <div className="mb-6">
                <h5 className="text-lg font-medium text-gray-700 mb-2">
                  Duties:
                </h5>
                <div className="flex mb-3">
                  <input
                    type="text"
                    placeholder="New duty description"
                    value={newDutyDescription}
                    onChange={(e) => setNewDutyDescription(e.target.value)}
                    className="flex-grow p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={handleAddDuty}
                    className="ml-2 bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-md transition duration-200 ease-in-out"
                  >
                    Add Duty
                  </button>
                </div>
                <ul className="space-y-2">
                  {dutiesList.length === 0 && (
                    <p className="text-gray-500">No duties added yet.</p>
                  )}
                  {dutiesList.map((duty, index) => (
                    <li
                      key={duty._id || `temp-${index}`}
                      className="flex items-center bg-white p-2 rounded-md border border-gray-200"
                    >
                      <input
                        type="text"
                        value={duty.description}
                        onChange={(e) =>
                          handleDutyDescriptionChange(duty._id, e.target.value)
                        }
                        className="flex-grow p-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-400"
                      />
                      <button
                        onClick={() => handleRemoveDuty(duty._id)}
                        className="ml-3 bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-3 rounded-md transition duration-200 ease-in-out"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Member Order Management */}
              <div>
                <h5 className="text-lg font-medium text-gray-700 mb-2">
                  Member Order for Rotation:
                </h5>
                <p className="text-sm text-gray-500 mb-3">
                  (Drag and drop functionality can be added later. Use up/down
                  arrows to reorder.)
                </p>
                <ul className="space-y-2">
                  {memberOrderList.length === 0 && (
                    <p className="text-gray-500">
                      No members available for order.
                    </p>
                  )}
                  {memberOrderList.map((memberId, index) => (
                    <li
                      key={memberId}
                      className="flex items-center bg-white p-2 rounded-md border border-gray-200"
                    >
                      <span className="flex-grow text-gray-700">
                        {getMemberName(memberId)}
                      </span>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleMoveMemberUp(index)}
                          disabled={index === 0}
                          className="bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm py-1 px-2 rounded-md disabled:opacity-50 transition duration-200 ease-in-out"
                        >
                          &#9650; {/* Up arrow */}
                        </button>
                        <button
                          onClick={() => handleMoveMemberDown(index)}
                          disabled={index === memberOrderList.length - 1}
                          className="bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm py-1 px-2 rounded-md disabled:opacity-50 transition duration-200 ease-in-out"
                        >
                          &#9660; {/* Down arrow */}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={handleSaveConfiguration}
                className="mt-6 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 ease-in-out"
              >
                Save Duty Configuration
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DutyTimeTable;
