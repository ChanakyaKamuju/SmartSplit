// frontend/src/pages/Register.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext"; // Import AuthContext

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState(""); // For success/error messages

  const { register, isAuthenticated } = useAuth(); // Use the auth context
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  const submitHandler = async (e) => {
    e.preventDefault();
    setMessage(""); // Clear previous messages

    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    try {
      await register(name, email, password);
      // Registration successful, AuthContext will update, and useEffect will redirect
    } catch (error) {
      setMessage(error.message || "Registration failed");
    }
  };

  return (
    <>
      {/* <div className="border-[12px] border-black rounded-[2rem] bg-white overflow-hidden shadow-2xl w-[375px] h-[800px]">
        <div className="flex items-center justify-center min-h-screen bg-red-100 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-lg w-[375px] sm:w-[375px]">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
              Register
            </h2>

            {message && (
              <div
                className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-sm"
                role="alert"
              >
                <span className="block sm:inline">{message}</span>
              </div>
            )}

            <form onSubmit={submitHandler} className="space-y-4 text-left">
              <div>
                <label
                  htmlFor="name"
                  className="block text-gray-700 text-sm font-bold mb-1"
                >
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  className="w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-gray-700 text-sm font-bold mb-1"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  className="w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-gray-700 text-sm font-bold mb-1"
                >
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  className="w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-gray-700 text-sm font-bold mb-1"
                >
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  className="w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-sm transition duration-200"
              >
                Register
              </button>
            </form>

            <div className="mt-6 text-center text-sm">
              <p className="text-gray-600">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-blue-600 hover:text-blue-800 font-bold"
                >
                  Login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div> */}
      <div className="flex flex-col items-center w-full max-h-screen">
        <form onSubmit={submitHandler} className="space-y-10 w-full">
          <div className="bg-emerald-600 p-4 rounded-b-3xl shadow-2xl shadow-gray-800 w-full flex flex-col items-center">
            {/* Title */}
            <div className="w-full px-4 flex justify-center mb-8 mt-16">
              <h2
                className="text-4xl font-bold text-center text-black mb-4 w-full max-w-xs drop-shadow-lg"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                SmartSplitAI
              </h2>
            </div>

            <h3 className="text-2xl font-bold text-center text-black mb-6">
              Register
            </h3>
            <div
              className={`overflow-hidden transition-all duration-500 ease-in-out w-full max-w-xs px-4 gap-4 flex flex-col`}
            >
              {message && (
                <div
                  className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-sm"
                  role="alert"
                >
                  <span className="block sm:inline">{message}</span>
                </div>
              )}
              {/* Email Field */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-black text-sm font-bold mb-1"
                >
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  className="w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-black text-sm font-bold mb-1"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  className="w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-black text-sm font-bold mb-1"
                >
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  className="w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="mb-4">
                <label
                  htmlFor="confirmPassword"
                  className="block text-black text-sm font-bold mb-1"
                >
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  className="w-full px-3 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* <button
              type="button"
              onClick={() => setShowFields((prev) => !prev)}
              className="relative bottom-[-20px] hover:cursor-pointer text-black transition-transform duration-300 focus:outline-none"
            >
              <span
                className={`inline-block transform transition-transform duration-300 ${
                  showFields ? "rotate-180" : "rotate-0"
                }`}
              >
                <i
                  class={`fa-solid fa-angle-down text-2xl ${
                    showFields ? "" : "animate-bounce"
                  }`}
                ></i>
              </span>
            </button> */}
          </div>

          {/* Toggle Area: Prompt ↔ Login Button */}
          <div className="w-full px-4 flex justify-center h-12">
            {/* Submit Button */}

            <button
              type="submit"
              className={` w-full max-w-[200px] bg-amber-700 hover:bg-amber-800 hover:cursor-pointer text-gray-200 font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-opacity duration-300 ease-in-out`}
            >
              Register
            </button>
          </div>
        </form>
        <div className="mt-6 text-center text-sm">
          <p className="text-gray-600">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-amber-600 hover:text-amber-800 font-semibold"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

export default Register;
