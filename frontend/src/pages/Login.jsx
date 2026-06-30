// frontend/src/pages/Login.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext"; // Import AuthContext

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(""); // For success/error messages
  const [showFields, setShowFields] = useState(false);

  const { login, isAuthenticated } = useAuth(); // Use the auth context
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

    try {
      await login(email, password);
      // Login successful, AuthContext will update, and useEffect will redirect
    } catch (error) {
      setMessage(error.message || "Login failed");
    }
  };

  return (
    // <div className="flex flex-col items-center w-full min-h-screen bg-gray-100">
    //   <form onSubmit={submitHandler} className="space-y-10 w-full ">
    //     <div className="bg-emerald-500 p-4 rounded-b-3xl shadow-lg w-full flex flex-col items-center">
    //       <div className="w-full px-4 flex justify-center mb-10 mt-5">
    //         <h2
    //           className="text-4xl font-bold text-center text-black-800 mb-6 w-full max-w-xs drop-shadow-lg"
    //           style={{ fontFamily: "Poppins, sans-serif" }}
    //         >
    //           SmartSplitAI
    //         </h2>
    //       </div>
    //       <h4 className="text-center mb-4">
    //         <p
    //           className="text-xl text-gray-600 "
    //           style={{ fontFamily: "Nunito, sans-serif" }}
    //         >
    //           Welcome to SmartSplitAI
    //         </p>
    //         <p
    //           className="text-xl text-gray-600 "
    //           style={{ fontFamily: "Nunito, sans-serif" }}
    //         >
    //           Your all together Group Expenses manager
    //         </p>
    //       </h4>
    //       <h4
    //         className="text-center text-lg mb-12 "
    //         style={{ fontFamily: "Nunito, sans-serif" }}
    //       >
    //         <p>Please Login to your account..!</p>
    //       </h4>

    //       <div className="w-full flex flex-col items-center transition-all duration-500 ease-in-out">
    //         <div className="w-full max-w-xs px-4 mb-4">
    //           <label
    //             className="block text-gray-700 text-md font-bold mb-2"
    //             htmlFor="email"
    //           >
    //             Email Address
    //           </label>
    //           <input
    //             type="email"
    //             id="email"
    //             className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    //             placeholder="Enter your email"
    //             value={email}
    //             onChange={(e) => setEmail(e.target.value)}
    //             required
    //           />
    //         </div>
    //         <div className="w-full max-w-xs px-4 mb-4">
    //           <label
    //             className="block text-gray-700 text-md font-bold mb-2"
    //             htmlFor="password"
    //           >
    //             Password
    //           </label>
    //           <input
    //             type="password"
    //             id="password"
    //             className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    //             placeholder="Enter your password"
    //             value={password}
    //             onChange={(e) => setPassword(e.target.value)}
    //             required
    //           />
    //         </div>
    //       </div>
    //       <div className="w-full flex justify-center">
    //         <button
    //           type="button"
    //           onClick={() => setShowFields((prev) => !prev)}
    //           className="text-white bg-gray-800 hover:bg-gray-700 p-2 rounded-full focus:outline-none transition-all duration-300"
    //           aria-label="Toggle fields"
    //         >
    //           {showFields ? (
    //             <span className="text-2xl">&#9650;</span> // Up Arrow
    //           ) : (
    //             <span className="text-2xl">&#9660;</span> // Down Arrow
    //           )}
    //         </button>
    //       </div>
    //     </div>

    //     <div className="w-full px-4 flex justify-center">
    //       <button
    //         type="submit"
    //         className="w-full max-w-[200px] bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 ease-in-out"
    //       >
    //         Login
    //       </button>
    //     </div>
    //   </form>
    //   {message && (
    //     <div
    //       className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
    //       role="alert"
    //     >
    //       <span className="block sm:inline">{message}</span>
    //     </div>
    //   )}
    //   <div className="mt-6 text-center">
    //     <p className="text-gray-600">
    //       New User?{" "}
    //       <Link
    //         to="/register"
    //         className="text-blue-600 hover:text-blue-800 font-bold"
    //       >
    //         Register
    //       </Link>
    //     </p>
    //   </div>
    // </div>
    <div className="flex flex-col items-center w-full max-h-screen">
      <form onSubmit={submitHandler} className="space-y-10 w-full">
        <div className="bg-emerald-600 p-4 rounded-b-3xl shadow-2xl shadow-gray-800 w-full flex flex-col items-center">
          {/* Title */}
          <div className="w-full px-4 flex justify-center mb-12 mt-16">
            <h2
              className="text-4xl font-bold text-center text-black mb-4 w-full max-w-xs drop-shadow-lg"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              SmartSplitAI
            </h2>
          </div>

          {/* Welcome Text */}
          <div className="w-full px-4 mb-8 mt-4 flex justify-center items-center relative ">
            <h3
              className={`absolute text-2xl font-bold text-center text-black mb-8 animate-fadeIn transition-all duration-500 ease-in-out ${
                showFields ? "opacity-100 " : "opacity-0 pointer-events-none"
              }`}
            >
              Login
            </h3>
            <div
              className={`absolute animate-fadeIn transition-all duration-500 ease-in-out ${
                showFields ? "opacity-0 pointer-events-none" : "opacity-100 "
              }`}
            >
              <h4 className=" text-center text-black text-xl font-semibold mb-2 font-nunito">
                Welcome to SmartSplitAI
              </h4>
              <p className=" text-center text-black-200 mb-6 font-nunito">
                Your all-together group expenses manager
              </p>
            </div>
          </div>
          <div
            className={`overflow-hidden transition-all duration-500 ease-in-out w-full max-w-xs px-4
      ${showFields ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}
    `}
          >
            {message && (
              <div
                className="bg-red-500 border border-red-500 text-red-200 px-4 py-3 rounded relative mb-4 flex justify-center items-center"
                role="alert"
              >
                <span className="block sm:inline">{message}</span>
              </div>
            )}
            {/* Email Field */}
            <div className="mb-4">
              <label
                className="block text-black text-sm font-bold mb-2"
                htmlFor="email"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password Field */}
            <div className="mb-4">
              <label
                className="block text-black text-sm font-bold mb-2"
                htmlFor="password"
              >
                Password
              </label>
              <input
                type="password"
                id="password"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
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
          </button>
        </div>

        {/* Toggle Area: Prompt ↔ Login Button */}
        <div className="w-full px-4 flex justify-center h-12 relative">
          {/* Prompt Text */}
          <p
            className={`absolute text-center text-gray-600 text-base font-nunito transition-opacity duration-300 ease-in-out ${
              showFields ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
          >
            Click the arrow to Login your account..!
          </p>

          {/* Submit Button */}
          <button
            type="submit"
            className={`absolute w-full max-w-[200px] bg-amber-700 hover:bg-amber-800 hover:cursor-pointer text-gray-200 font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-opacity duration-300 ease-in-out ${
              showFields ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            Login
          </button>
        </div>
      </form>
      <div
        className={`mt-6 text-center transition-all duration-300 ease-in-out  ${
          showFields ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <p className="text-gray-600">
          New User?{" "}
          <Link
            to="/register"
            className="text-amber-600 hover:text-amber-800 font-semibold"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
