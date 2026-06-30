// frontend/src/App.jsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";

import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import RoomDetail from "./pages/RoomDetail";

import { AuthProvider } from "./contexts/AuthContext";
import { RoomProvider } from "./contexts/RoomContext"; // Import RoomProvider

const InitialRouter = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { myRooms, loadingRooms, currentRoom } = useRoom();
  const navigate = useNavigate;

  useEffect(() => {
    // Wait for both authentication and room data to finish loading
    if (!authLoading && !loadingRooms) {
      const storedRoomId = localStorage.getItem("currentRoomId");

      if (isAuthenticated) {
        // Check if there's a stored room ID and if the user is still a member of that room
        if (storedRoomId && myRooms.some((room) => room._id === storedRoomId)) {
          // If currentRoom is already loaded and matches, no need to navigate again
          // Otherwise, navigate to the stored room
          if (!currentRoom || currentRoom._id !== storedRoomId) {
            navigate(`/room/${storedRoomId}`, { replace: true }); // AUTOMATIC NAVIGATION
          }
        } else {
          // If authenticated but no valid stored room, go to dashboard
          navigate("/dashboard", { replace: true });
        }
      } else {
        // If not authenticated, go to login
        navigate("/login", { replace: true });
      }
    }
  }, [
    isAuthenticated,
    authLoading,
    loadingRooms,
    myRooms,
    currentRoom,
    navigate,
  ]);

  return null;
};

function App() {
  return (
    <AuthProvider>
      {/* RoomProvider now wraps components that need room data */}
      <RoomProvider>
        <Router>
          <div className="min-h-screen bg-gray-200 font-inter">
            <Routes>
              {/* Public Routes */}
              <Route path="/register" element={<Register />} />
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Login />} />

              {/* Protected Routes */}
              {/* These will implicitly be protected because RoomProvider waits for auth */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/room/:id" element={<RoomDetail />} />
            </Routes>
          </div>
        </Router>
      </RoomProvider>
    </AuthProvider>
  );
}

export default App;
