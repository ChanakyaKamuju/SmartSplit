// frontend/src/contexts/RoomContext.js
import React, { createContext, useState, useEffect } from "react"; // Removed useContext from here
import roomService from "../services/roomService";
import { useAuth } from "./AuthContext"; // To get the user's token

// Create and export the AuthContext itself
export const RoomContext = createContext();

// RoomProvider component
export const RoomProvider = ({ children }) => {
  const { user, isAuthenticated, loading: authLoading } = useAuth(); // Get auth state
  const [myRooms, setMyRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null); // The room currently being viewed/managed
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [error, setError] = useState(null);

  // Load user's rooms when authenticated user changes
  useEffect(() => {
    const fetchMyRooms = async () => {
      if (isAuthenticated && user && user.token) {
        setLoadingRooms(true);
        setError(null);
        try {
          const rooms = await roomService.getMyRooms(user.token);
          setMyRooms(rooms);
          // If a currentRoom was previously selected (e.g., from local storage or previous session),
          // try to re-select it if it's still in the user's rooms.
          const storedRoomId = localStorage.getItem("currentRoomId");
          if (storedRoomId && !currentRoom) {
            const foundRoom = rooms.find((r) => r._id === storedRoomId);
            if (foundRoom) {
              await selectRoom(foundRoom._id); // Re-select to load full details
            } else {
              localStorage.removeItem("currentRoomId");
              setCurrentRoom(null);
            }
          } else if (!storedRoomId && currentRoom) {
            // If currentRoom is set in context but not in localStorage, clear it
            setCurrentRoom(null);
          } else if (!storedRoomId && !currentRoom) {
            // No stored room and no current room, ensure it's null
            setCurrentRoom(null);
          }
        } catch (err) {
          console.error("Failed to fetch user's rooms:", err);
          setError(err.message || "Failed to load rooms");
          setMyRooms([]);
          setCurrentRoom(null);
          localStorage.removeItem("currentRoomId");
        } finally {
          setLoadingRooms(false);
        }
      } else if (!authLoading) {
        // If not authenticated and auth loading is done
        setMyRooms([]);
        setCurrentRoom(null);
        setLoadingRooms(false);
        localStorage.removeItem("currentRoomId");
      }
    };
    fetchMyRooms();
  }, [isAuthenticated, user, authLoading, currentRoom]); // Re-run when auth state changes

  // Function to select a room and load its full details
  const selectRoom = async (roomId) => {
    if (!isAuthenticated || !user || !user.token) {
      setError("Not authenticated to select a room.");
      return;
    }
    setLoadingRooms(true); // Indicate loading for room details
    setError(null);
    try {
      const roomDetails = await roomService.getRoomDetails(roomId, user.token);
      setCurrentRoom(roomDetails);
      localStorage.setItem("currentRoomId", roomId); // Persist current room selection
    } catch (err) {
      console.error("Failed to load room details:", err);
      setError(err.message || "Failed to load room details");
      setCurrentRoom(null);
      localStorage.removeItem("currentRoomId");
    } finally {
      setLoadingRooms(false);
    }
  };

  // Function to clear current room selection
  const clearCurrentRoom = () => {
    console.log(
      "Executing clearCurrentRoom. Current currentRoomId in localStorage before removal:",
      localStorage.getItem("currentRoomId")
    );
    setCurrentRoom(null); // Set context state to null FIRST
    localStorage.removeItem("currentRoomId"); // Then remove from localStorage
    console.log(
      "localStorage.currentRoomId should now be removed. Value after removal:",
      localStorage.getItem("currentRoomId")
    );
  };

  // Function to add a room to user's list after creation/join
  const addRoomToMyRooms = (newRoom) => {
    setMyRooms((prevRooms) => [...prevRooms, newRoom]);
    // Automatically select the new room
    selectRoom(newRoom._id);
  };

  // Function to remove a room from user's list (e.g., if admin removes them)
  const removeRoomFromMyRooms = (removedRoomId) => {
    setMyRooms((prevRooms) =>
      prevRooms.filter((room) => room._id !== removedRoomId)
    );
    if (currentRoom && currentRoom._id === removedRoomId) {
      clearCurrentRoom(); // Clear if it was the active room
    }
  };

  const roomContextValue = {
    myRooms,
    currentRoom,
    loadingRooms,
    error,
    selectRoom,
    clearCurrentRoom,
    addRoomToMyRooms,
    removeRoomFromMyRooms,
    // Expose roomService for direct calls if needed (e.g., in components for create/join)
    roomService,
  };

  return (
    <RoomContext.Provider value={roomContextValue}>
      {/* Only render children once auth and room loading is complete */}
      {!authLoading && !loadingRooms && children}
      {/* Or show a global loading indicator here if needed */}
      {(authLoading || loadingRooms) && (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
          <p className="text-gray-700 text-lg">Loading application data...</p>
        </div>
      )}
    </RoomContext.Provider>
  );
};
