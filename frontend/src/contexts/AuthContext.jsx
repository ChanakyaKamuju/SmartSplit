// frontend/src/contexts/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from "react";
import authService from "../services/authService"; // Import auth service

// Create the AuthContext
const AuthContext = createContext();

// AuthProvider component to wrap your application
export const AuthProvider = ({ children }) => {
  // State to hold user information and loading status
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // useEffect to check for user on component mount (e.g., from localStorage)
  useEffect(() => {
    const checkUser = async () => {
      try {
        // Attempt to get user from local storage
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (storedUser && storedUser.token) {
          // Set user immediately from stored data (which includes the token)
          setUser(storedUser);

          // Optional: Validate token by fetching profile.
          // This is good for ensuring the token is still active and getting fresh profile data.
          // We already have the token from storedUser, so we pass it directly.
          try {
            const profile = await authService.getProfile(storedUser.token);
            // Update user with potentially fresher profile data, ensuring token is preserved
            setUser((prevUser) => ({ ...prevUser, ...profile }));
          } catch (profileError) {
            console.error(
              "Failed to validate token or fetch fresh profile:",
              profileError
            );
            localStorage.removeItem("user"); // Clear invalid user data
            setUser(null);
          }
        }
      } catch (error) {
        console.error(
          "Failed to load user from localStorage or validate token:",
          error
        );
        localStorage.removeItem("user"); // Clear invalid user data
        setUser(null);
      } finally {
        setLoading(false); // Authentication check is complete
      }
    };
    checkUser();
  }, []);

  // Login function: calls authService and updates state
  const login = async (email, password) => {
    const userData = await authService.login(email, password);
    setUser(userData);
    // Store user data (including token) in localStorage
    localStorage.setItem("user", JSON.stringify(userData));
  };

  // Register function: calls authService and updates state
  const register = async (name, email, password) => {
    const userData = await authService.register(name, email, password);
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  // Logout function: clears state and localStorage
  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  // Value provided by the context to its consumers
  const authContextValue = {
    user,
    loading,
    isAuthenticated: !!user, // Convenience boolean
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {/* Only render children once loading is complete */}
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Custom hook to easily consume the AuthContext
export const useAuth = () => {
  return useContext(AuthContext);
};
