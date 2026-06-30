import axios from "axios";

const API_URL = "http://localhost:5000/api/duties/"; // Ensure this matches your backend port
// const API_URL = "http://192.168.1.11:5000/api/duties/"; // Ensure this matches your backend port
// const API_URL = "http://10.209.140.157:5000/api/duties/"; // Ensure this matches your backend port

// Helper to get auth header
const getAuthHeader = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// Configure or update duties for a room (Admin only)
const createOrUpdateDuties = async (roomId, duties, memberOrder, token) => {
  try {
    const response = await axios.post(
      API_URL + `${roomId}/configure`,
      { duties, memberOrder },
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

// Get today's duty assignments and full duty table for a room (Any member)
const getDutiesTable = async (roomId, token) => {
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

// Skip a member from the current duty cycle (Admin only)
const skipMemberFromCycle = async (roomId, userIdToSkip, token) => {
  try {
    const response = await axios.put(
      API_URL + `${roomId}/skip-member`,
      { userIdToSkip },
      getAuthHeader(token),
    );
    return response.data; // Backend returns updated duty table after skip
  } catch (error) {
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      error.message ||
      error.toString();
    throw new Error(message);
  }
};

const dutyService = {
  createOrUpdateDuties,
  getDutiesTable,
  skipMemberFromCycle,
};

export default dutyService;
