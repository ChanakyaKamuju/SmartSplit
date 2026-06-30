// frontend/src/hooks/useRoomData.js
import { useContext } from "react";
import { RoomContext } from "../contexts/RoomContext"; // Import the RoomContext itself

// Custom hook to easily consume the RoomContext
// This hook will now live in its own file to improve Fast Refresh compatibility
export const useRoom = () => {
  return useContext(RoomContext);
};
