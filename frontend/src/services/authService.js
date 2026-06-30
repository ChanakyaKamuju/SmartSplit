// frontend/src/services/authService.js
import axios from "axios";

// Base URL for your backend API
const API_URL = "http://localhost:5000/api/users/"; // Ensure this matches your backend port
// const API_URL = "http://192.168.1.11:5000/api/users/"; // Ensure this matches your backend port
// const API_URL = "http://10.209.140.157:5000/api/users/"; // Ensure this matches your backend port

// Register user
const register = async (name, email, password) => {
  try {
    const response = await axios.post(API_URL + "register", {
      name,
      email,
      password,
    });
    return response.data; // Returns user data and token
  } catch (error) {
    // Handle error (e.g., display error message)
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    throw new Error(message);
  }
};

// Login user
const login = async (email, password) => {
  try {
    const response = await axios.post(API_URL + "login", { email, password });
    return response.data; // Returns user data and token
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    throw new Error(message);
  }
};

// Get user profile (protected route)
const getProfile = async (token) => {
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
    const response = await axios.get(API_URL + "profile", config);
    return response.data; // Returns user profile data
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    throw new Error(message);
  }
};

// Logout user (client-side only)
const logout = () => {
  localStorage.removeItem("user");
};

const authService = {
  register,
  login,
  getProfile,
  logout,
};

export default authService;
