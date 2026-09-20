// frontend/src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import RoomDetail from "./pages/RoomDetail";

import { AuthProvider } from "./contexts/AuthContext";
import { RoomProvider } from "./contexts/RoomContext"; // Import RoomProvider

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
