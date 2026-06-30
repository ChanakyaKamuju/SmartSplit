// // frontend/src/components/ExpenseSplitter.jsx
// import React, { useState, useEffect } from "react";
// import expenseService from "../services/expenseService";
// import { useAuth } from "../contexts/AuthContext";
// import { useRoom } from "../hooks/useRoomData";

// function ExpenseSplitter() {
//   const { user } = useAuth();
//   const { currentRoom } = useRoom();

//   const [expenses, setExpenses] = useState([]);
//   const [balances, setBalances] = useState([]);
//   const [simplifiedDebts, setSimplifiedDebts] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [message, setMessage] = useState(null);

//   // Form states
//   const [description, setDescription] = useState("");
//   const [totalAmount, setTotalAmount] = useState("");
//   const [paidBy, setPaidBy] = useState(user?._id || ""); // Default to current user
//   const [splitType, setSplitType] = useState("equal");
//   const [splitMembers, setSplitMembers] = useState([]); // Members involved in the split
//   const [customAmounts, setCustomAmounts] = useState({}); // For unequal split
//   const [percentages, setPercentages] = useState({}); // For percentage split
//   const [shares, setShares] = useState({}); // For shares split

//   // Fetch expenses and balances on component mount or when currentRoom changes
//   useEffect(() => {
//     const fetchExpensesAndBalances = async () => {
//       if (!currentRoom || !user || !user.token) return;

//       setLoading(true);
//       setError(null);
//       try {
//         const fetchedExpenses = await expenseService.getRoomExpenses(
//           currentRoom._id,
//           user.token
//         );
//         setExpenses(fetchedExpenses);

//         const fetchedBalances = await expenseService.getRoomBalances(
//           currentRoom._id,
//           user.token
//         );
//         console.log("Fetched Balances:", fetchedBalances);
//         setBalances(fetchedBalances.rawBalances);
//         setSimplifiedDebts(fetchedBalances.simplifiedDebts);

//         // Initialize splitMembers with all room members for new expense form
//         const initialSplitMembers = currentRoom.members.map((member) => ({
//           _id: member.user._id,
//           name: member.user.name,
//           email: member.user.email,
//           selected: true, // Default to all selected for equal split
//         }));
//         setSplitMembers(initialSplitMembers);
//         setPaidBy(user._id); // Ensure paidBy is current user by default
//       } catch (err) {
//         console.error("Failed to fetch expenses or balances:", err);
//         setError(err.message || "Failed to load expenses and balances.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchExpensesAndBalances();
//   }, [currentRoom, user]);

//   // Clear messages after a few seconds
//   useEffect(() => {
//     if (message || error) {
//       const timer = setTimeout(() => {
//         setMessage(null);
//         setError(null);
//       }, 5000);
//       return () => clearTimeout(timer);
//     }
//   }, [message, error]);

//   // Handle changes for custom amounts, percentages, shares
//   const handleSplitValueChange = (userId, value, type) => {
//     const parsedValue = parseFloat(value);
//     if (type === "unequal") {
//       setCustomAmounts((prev) => ({
//         ...prev,
//         [userId]: isNaN(parsedValue) ? "" : parsedValue,
//       }));
//     } else if (type === "percentage") {
//       setPercentages((prev) => ({
//         ...prev,
//         [userId]: isNaN(parsedValue) ? "" : parsedValue,
//       }));
//     } else if (type === "shares") {
//       setShares((prev) => ({
//         ...prev,
//         [userId]: isNaN(parsedValue) ? "" : parsedValue,
//       }));
//     }
//   };

//   // Toggle member selection for split
//   const handleMemberSelection = (userId) => {
//     setSplitMembers((prev) =>
//       prev.map((member) =>
//         member._id === userId
//           ? { ...member, selected: !member.selected }
//           : member
//       )
//     );
//   };

//   // Reset form fields
//   const resetForm = () => {
//     setDescription("");
//     setTotalAmount("");
//     setPaidBy(user._id);
//     setSplitType("equal");
//     setSplitMembers(
//       currentRoom.members.map((member) => ({
//         _id: member.user._id,
//         name: member.user.name,
//         email: member.user.email,
//         selected: true,
//       }))
//     );
//     setCustomAmounts({});
//     setPercentages({});
//     setShares({});
//   };

//   // Handle Add Expense submission
//   const handleAddExpense = async (e) => {
//     e.preventDefault();
//     setError(null);
//     setMessage(null);

//     if (!description.trim() || !totalAmount || parseFloat(totalAmount) <= 0) {
//       setError(
//         "Please provide a valid description and a positive total amount."
//       );
//       return;
//     }

//     const selectedMembersForSplit = splitMembers.filter((m) => m.selected);
//     if (selectedMembersForSplit.length === 0) {
//       setError("Please select at least one member to split the expense.");
//       return;
//     }

//     let splitsData = [];
//     let validationError = false;

//     switch (splitType) {
//       case "equal":
//         splitsData = selectedMembersForSplit.map((member) => ({
//           user: member._id,
//         }));
//         break;
//       case "unequal":
//         let sumCustomAmounts = 0;
//         splitsData = selectedMembersForSplit.map((member) => {
//           const amount = customAmounts[member._id];
//           if (typeof amount !== "number" || amount <= 0) {
//             validationError = true;
//             setError(
//               `Please enter a valid positive amount for ${member.name}.`
//             );
//             return;
//           }
//           sumCustomAmounts += amount;
//           return { user: member._id, amount: amount };
//         });
//         if (validationError) return;
//         if (Math.abs(sumCustomAmounts - parseFloat(totalAmount)) > 0.01) {
//           setError("Sum of unequal amounts does not match the total amount.");
//           return;
//         }
//         break;
//       case "percentage":
//         let sumPercentages = 0;
//         splitsData = selectedMembersForSplit.map((member) => {
//           const percentage = percentages[member._id];
//           if (
//             typeof percentage !== "number" ||
//             percentage < 0 ||
//             percentage > 100
//           ) {
//             validationError = true;
//             setError(
//               `Please enter a valid percentage (0-100) for ${member.name}.`
//             );
//             return;
//           }
//           sumPercentages += percentage;
//           return { user: member._id, percentage: percentage };
//         });
//         if (validationError) return;
//         if (Math.abs(sumPercentages - 100) > 0.01) {
//           setError("Sum of percentages must be 100%.");
//           return;
//         }
//         break;
//       case "shares":
//         let sumShares = 0;
//         splitsData = selectedMembersForSplit.map((member) => {
//           const sharesVal = shares[member._id];
//           if (typeof sharesVal !== "number" || sharesVal <= 0) {
//             validationError = true;
//             setError(
//               `Please enter a valid positive number of shares for ${member.name}.`
//             );
//             return;
//           }
//           sumShares += sharesVal;
//           return { user: member._id, shares: sharesVal };
//         });
//         if (validationError) return;
//         if (sumShares === 0) {
//           setError("Total shares cannot be zero.");
//           return;
//         }
//         break;
//       default:
//         setError("Invalid split type selected.");
//         return;
//     }

//     try {
//       const expenseData = {
//         roomId: currentRoom._id,
//         description,
//         totalAmount: parseFloat(totalAmount),
//         paidBy,
//         splitType,
//         splits: splitsData,
//       };
//       const response = await expenseService.addExpense(expenseData, user.token);
//       setMessage("Expense added successfully!");
//       resetForm();
//       // Re-fetch all expenses and balances to update the lists
//       const fetchedExpenses = await expenseService.getRoomExpenses(
//         currentRoom._id,
//         user.token
//       );
//       setExpenses(fetchedExpenses);
//       const fetchedBalances = await expenseService.getRoomBalances(
//         currentRoom._id,
//         user.token
//       );
//       setBalances(fetchedBalances.rawBalances);
//       setSimplifiedDebts(fetchedBalances.simplifiedDebts);
//     } catch (err) {
//       setError(err.message || "Failed to add expense.");
//       console.error("Add expense error:", err);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="text-center py-4 text-gray-600">Loading expenses...</div>
//     );
//   }

//   if (error && !message) {
//     // Only show error if no success message is present
//     return (
//       <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4">
//         {error}
//       </div>
//     );
//   }

//   return (
//     <div className="bg-white p-6 rounded-lg shadow-md">
//       <h3 className="text-2xl font-semibold mb-4 text-gray-800">
//         Expenses Split
//       </h3>

//       {message && (
//         <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
//           {message}
//         </div>
//       )}
//       {error && (
//         <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
//           {error}
//         </div>
//       )}

//       {/* Add New Expense Form */}
//       <div className="mb-8 p-6 bg-indigo-50 rounded-lg border border-indigo-200">
//         <h4 className="text-xl font-semibold text-gray-800 mb-4">
//           Add New Expense
//         </h4>
//         <form onSubmit={handleAddExpense} className="space-y-4">
//           <div>
//             <label
//               htmlFor="description"
//               className="block text-gray-700 text-sm font-bold mb-2"
//             >
//               Description
//             </label>
//             <input
//               type="text"
//               id="description"
//               value={description}
//               onChange={(e) => setDescription(e.target.value)}
//               className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
//               placeholder="e.g., Dinner, Groceries, Rent"
//               required
//             />
//           </div>
//           <div>
//             <label
//               htmlFor="totalAmount"
//               className="block text-gray-700 text-sm font-bold mb-2"
//             >
//               Total Amount
//             </label>
//             <input
//               type="number"
//               id="totalAmount"
//               value={totalAmount}
//               onChange={(e) => setTotalAmount(e.target.value)}
//               className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
//               placeholder="e.g., 50.00"
//               step="0.01"
//               required
//             />
//           </div>
//           <div>
//             <label
//               htmlFor="paidBy"
//               className="block text-gray-700 text-sm font-bold mb-2"
//             >
//               Paid By
//             </label>
//             <select
//               id="paidBy"
//               value={paidBy}
//               onChange={(e) => setPaidBy(e.target.value)}
//               className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
//               required
//             >
//               {currentRoom?.members.map((member) => (
//                 <option key={member.user._id} value={member.user._id}>
//                   {member.user.name} {member.user._id === user._id && "(You)"}
//                 </option>
//               ))}
//             </select>
//           </div>
//           <div>
//             <label
//               htmlFor="splitType"
//               className="block text-gray-700 text-sm font-bold mb-2"
//             >
//               Split Type
//             </label>
//             <select
//               id="splitType"
//               value={splitType}
//               onChange={(e) => setSplitType(e.target.value)}
//               className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
//             >
//               <option value="equal">Equal</option>
//               <option value="unequal">Unequal (Manual Entry)</option>
//               <option value="percentage">Percentages</option>
//               <option value="shares">Shares</option>
//             </select>
//           </div>

//           {/* Members involved in split & dynamic input fields */}
//           <div className="border border-gray-200 p-4 rounded-md bg-white">
//             <h5 className="text-md font-semibold mb-3">
//               Who is splitting this expense?
//             </h5>
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//               {currentRoom?.members.map((member) => (
//                 <div
//                   key={member.user._id}
//                   className="flex items-center space-x-2"
//                 >
//                   <input
//                     type="checkbox"
//                     id={`split-${member.user._id}`}
//                     checked={
//                       splitMembers.find((m) => m._id === member.user._id)
//                         ?.selected || false
//                     }
//                     onChange={() => handleMemberSelection(member.user._id)}
//                     className="rounded text-indigo-600 focus:ring-indigo-500"
//                   />
//                   <label
//                     htmlFor={`split-${member.user._id}`}
//                     className="text-gray-700 flex-grow"
//                   >
//                     {member.user.name}
//                   </label>
//                   {splitMembers.find((m) => m._id === member.user._id)
//                     ?.selected && (
//                     <>
//                       {splitType === "unequal" && (
//                         <input
//                           type="number"
//                           placeholder="Amount"
//                           value={customAmounts[member.user._id] || ""}
//                           onChange={(e) =>
//                             handleSplitValueChange(
//                               member.user._id,
//                               e.target.value,
//                               "unequal"
//                             )
//                           }
//                           className="w-24 p-1 border border-gray-300 rounded-md text-sm"
//                           step="0.01"
//                         />
//                       )}
//                       {splitType === "percentage" && (
//                         <div className="flex items-center">
//                           <input
//                             type="number"
//                             placeholder="%"
//                             value={percentages[member.user._id] || ""}
//                             onChange={(e) =>
//                               handleSplitValueChange(
//                                 member.user._id,
//                                 e.target.value,
//                                 "percentage"
//                               )
//                             }
//                             className="w-20 p-1 border border-gray-300 rounded-md text-sm"
//                             min="0"
//                             max="100"
//                           />
//                           <span className="ml-1 text-gray-600">%</span>
//                         </div>
//                       )}
//                       {splitType === "shares" && (
//                         <div className="flex items-center">
//                           <input
//                             type="number"
//                             placeholder="Shares"
//                             value={shares[member.user._id] || ""}
//                             onChange={(e) =>
//                               handleSplitValueChange(
//                                 member.user._id,
//                                 e.target.value,
//                                 "shares"
//                               )
//                             }
//                             className="w-20 p-1 border border-gray-300 rounded-md text-sm"
//                             min="1"
//                           />
//                           <span className="ml-1 text-gray-600">shares</span>
//                         </div>
//                       )}
//                     </>
//                   )}
//                 </div>
//               ))}
//             </div>
//           </div>

//           <button
//             type="submit"
//             className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 ease-in-out"
//           >
//             Add Expense
//           </button>
//         </form>
//       </div>

//       {/* Expenses List */}
//       <div className="mb-8">
//         <h4 className="text-xl font-semibold text-gray-800 mb-3">
//           Recent Expenses
//         </h4>
//         {expenses.length === 0 ? (
//           <p className="text-gray-600">No expenses added yet.</p>
//         ) : (
//           <ul className="space-y-4">
//             {expenses.map((expense) => (
//               <li
//                 key={expense._id}
//                 className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm"
//               >
//                 <div className="flex justify-between items-center mb-2">
//                   <span className="text-lg font-bold text-gray-800">
//                     {expense.description}
//                   </span>
//                   <span className="text-xl font-semibold text-indigo-600">
//                     ${expense.totalAmount.toFixed(2)}
//                   </span>
//                 </div>
//                 <p className="text-sm text-gray-600 mb-1">
//                   Paid by:{" "}
//                   <span className="font-medium">{expense.paidBy.name}</span>
//                 </p>
//                 <p className="text-sm text-gray-600 mb-2">
//                   Split Type:{" "}
//                   <span className="font-medium capitalize">
//                     {expense.splitType}
//                   </span>
//                 </p>
//                 <div className="mt-2 border-t border-gray-200 pt-2">
//                   <p className="text-sm font-semibold text-gray-700 mb-1">
//                     Split Details:
//                   </p>
//                   <ul className="list-disc list-inside text-sm text-gray-600 space-y-0.5">
//                     {expense.splits.map((split, index) => (
//                       <li key={index}>
//                         {split.user.name}: ${split.amount.toFixed(2)}
//                         {split.percentage && ` (${split.percentage}%)`}
//                         {split.shares && ` (${split.shares} shares)`}
//                       </li>
//                     ))}
//                   </ul>
//                 </div>
//                 <p className="text-xs text-gray-500 mt-2 text-right">
//                   {new Date(expense.date).toLocaleDateString()}
//                 </p>
//               </li>
//             ))}
//           </ul>
//         )}
//       </div>

//       {/* Balances Section */}
//       <div>
//         <h4 className="text-xl font-semibold text-gray-800 mb-3">
//           Current Balances
//         </h4>
//         {balances.length === 0 ? (
//           <p className="text-gray-600">No balances to display yet.</p>
//         ) : (
//           <ul className="space-y-2 mb-6">
//             {balances.map((balance) => (
//               <li
//                 key={balance.name}
//                 className={`flex justify-between items-center p-3 rounded-md ${
//                   balance.amount > 0
//                     ? "bg-green-100 border-green-300"
//                     : balance.amount < 0
//                     ? "bg-red-100 border-red-300"
//                     : "bg-gray-100 border-gray-300"
//                 } border`}
//               >
//                 <span className="font-medium text-gray-800">
//                   {balance.name}
//                 </span>
//                 <span
//                   className={`font-bold ${
//                     balance.amount > 0
//                       ? "text-green-700"
//                       : balance.amount < 0
//                       ? "text-red-700"
//                       : "text-gray-700"
//                   }`}
//                 >
//                   ${balance.amount.toFixed(2)}{" "}
//                   {balance.amount > 0
//                     ? "is owed"
//                     : balance.amount < 0
//                     ? "owes"
//                     : ""}
//                 </span>
//               </li>
//             ))}
//           </ul>
//         )}

//         <h4 className="text-xl font-semibold text-gray-800 mb-3">
//           Simplified Debts
//         </h4>
//         {simplifiedDebts.length === 0 ? (
//           <p className="text-gray-600">No debts to settle!</p>
//         ) : (
//           <ul className="space-y-2">
//             {simplifiedDebts.map((debt, index) => (
//               <li
//                 key={index}
//                 className="bg-yellow-50 p-3 rounded-md border border-yellow-300"
//               >
//                 <span className="font-medium text-gray-800">{debt.from}</span>{" "}
//                 owes{" "}
//                 <span className="font-medium text-gray-800">{debt.to}</span>:{" "}
//                 <span className="font-bold text-yellow-700">
//                   ${debt.amount.toFixed(2)}
//                 </span>
//               </li>
//             ))}
//           </ul>
//         )}
//       </div>
//     </div>
//   );
// }

// export default ExpenseSplitter;
// frontend/src/components/ExpenseSplitter.jsx
import React, { useState, useEffect } from "react";
import expenseService from "../services/expenseService";
import { useAuth } from "../contexts/AuthContext";
import { useRoom } from "../hooks/useRoomData";

function ExpenseSplitter() {
  const { user } = useAuth();
  const { currentRoom } = useRoom();

  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [simplifiedDebts, setSimplifiedDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Form states
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [paidBy, setPaidBy] = useState(user?._id || ""); // Default to current user
  const [splitType, setSplitType] = useState("equal");
  const [splitMembers, setSplitMembers] = useState([]); // Members involved in the split
  const [customAmounts, setCustomAmounts] = useState({}); // For unequal split
  const [percentages, setPercentages] = useState({}); // For percentage split
  const [shares, setShares] = useState({}); // For shares split

  // Determine if the current user is an admin in this room
  const userIsAdminInRoom = currentRoom?.members.some(
    (member) => member.user._id === user._id && member.role === "admin"
  );

  // Function to re-fetch all data (expenses, balances, simplified debts)
  const refreshData = async () => {
    if (!currentRoom || !user || !user.token) return;
    setLoading(true);
    setError(null);
    try {
      const fetchedExpenses = await expenseService.getRoomExpenses(
        currentRoom._id,
        user.token
      );
      setExpenses(fetchedExpenses);

      const fetchedBalances = await expenseService.getRoomBalances(
        currentRoom._id,
        user.token
      );
      setBalances(fetchedBalances.rawBalances);
      setSimplifiedDebts(fetchedBalances.simplifiedDebts);

      // Initialize splitMembers with all room members for new expense form if not already set
      if (splitMembers.length === 0) {
        const initialSplitMembers = currentRoom.members.map((member) => ({
          _id: member.user._id,
          name: member.user.name,
          email: member.user.email,
          selected: true, // Default to all selected for equal split
        }));
        setSplitMembers(initialSplitMembers);
        setPaidBy(user._id); // Ensure paidBy is current user by default
      }
    } catch (err) {
      console.error("Failed to refresh expenses or balances:", err);
      setError(err.message || "Failed to refresh expenses and balances.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount or when currentRoom changes
  useEffect(() => {
    refreshData();
  }, [currentRoom, user]); // Depend on currentRoom and user

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

  // Handle changes for custom amounts, percentages, shares
  const handleSplitValueChange = (userId, value, type) => {
    const parsedValue = parseFloat(value);
    if (type === "unequal") {
      setCustomAmounts((prev) => ({
        ...prev,
        [userId]: isNaN(parsedValue) ? "" : parsedValue,
      }));
    } else if (type === "percentage") {
      setPercentages((prev) => ({
        ...prev,
        [userId]: isNaN(parsedValue) ? "" : parsedValue,
      }));
    } else if (type === "shares") {
      setShares((prev) => ({
        ...prev,
        [userId]: isNaN(parsedValue) ? "" : parsedValue,
      }));
    }
  };

  // Toggle member selection for split
  const handleMemberSelection = (userId) => {
    setSplitMembers((prev) =>
      prev.map((member) =>
        member._id === userId
          ? { ...member, selected: !member.selected }
          : member
      )
    );
  };

  // Reset form fields
  const resetForm = () => {
    setDescription("");
    setTotalAmount("");
    setPaidBy(user._id);
    setSplitType("equal");
    setSplitMembers(
      currentRoom.members.map((member) => ({
        _id: member.user._id,
        name: member.user.name,
        email: member.user.email,
        selected: true,
      }))
    );
    setCustomAmounts({});
    setPercentages({});
    setShares({});
  };

  // Handle Add Expense submission
  const handleAddExpense = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!description.trim() || !totalAmount || parseFloat(totalAmount) <= 0) {
      setError(
        "Please provide a valid description and a positive total amount."
      );
      return;
    }

    const selectedMembersForSplit = splitMembers.filter((m) => m.selected);
    if (selectedMembersForSplit.length === 0) {
      setError("Please select at least one member to split the expense.");
      return;
    }

    let splitsData = [];
    let validationError = false;

    switch (splitType) {
      case "equal":
        splitsData = selectedMembersForSplit.map((member) => ({
          user: member._id,
        }));
        break;
      case "unequal":
        let sumCustomAmounts = 0;
        splitsData = selectedMembersForSplit.map((member) => {
          const amount = customAmounts[member._id];
          if (typeof amount !== "number" || amount <= 0) {
            validationError = true;
            setError(
              `Please enter a valid positive amount for ${member.name}.`
            );
            return;
          }
          sumCustomAmounts += amount;
          return { user: member._id, amount: amount };
        });
        if (validationError) return;
        if (Math.abs(sumCustomAmounts - parseFloat(totalAmount)) > 0.01) {
          setError("Sum of unequal amounts does not match the total amount.");
          return;
        }
        break;
      case "percentage":
        let sumPercentages = 0;
        splitsData = selectedMembersForSplit.map((member) => {
          const percentage = percentages[member._id];
          if (
            typeof percentage !== "number" ||
            percentage < 0 ||
            percentage > 100
          ) {
            validationError = true;
            setError(
              `Please enter a valid percentage (0-100) for ${member.name}.`
            );
            return;
          }
          sumPercentages += percentage;
          return { user: member._id, percentage: percentage };
        });
        if (validationError) return;
        if (Math.abs(sumPercentages - 100) > 0.01) {
          setError("Sum of percentages must be 100%.");
          return;
        }
        break;
      case "shares":
        let sumShares = 0;
        splitsData = selectedMembersForSplit.map((member) => {
          const sharesVal = shares[member._id];
          if (typeof sharesVal !== "number" || sharesVal <= 0) {
            validationError = true;
            setError(
              `Please enter a valid positive number of shares for ${member.name}.`
            );
            return;
          }
          sumShares += sharesVal;
          return { user: member._id, shares: sharesVal };
        });
        if (validationError) return;
        if (sumShares === 0) {
          setError("Total shares cannot be zero.");
          return;
        }
        break;
      default:
        setError("Invalid split type selected.");
        return;
    }

    try {
      const expenseData = {
        roomId: currentRoom._id,
        description,
        totalAmount: parseFloat(totalAmount),
        paidBy,
        splitType,
        splits: splitsData,
      };
      await expenseService.addExpense(expenseData, user.token);
      setMessage("Expense added successfully!");
      resetForm();
      refreshData(); // Re-fetch all data
    } catch (err) {
      setError(err.message || "Failed to add expense.");
      console.error("Add expense error:", err);
    }
  };

  // Handle Delete Expense
  const handleDeleteExpense = async (expenseId, expenseDescription) => {
    setError(null);
    setMessage(null);
    if (
      !window.confirm(
        `Are you sure you want to delete the expense "${expenseDescription}"?`
      )
    ) {
      return;
    }
    try {
      await expenseService.deleteExpense(expenseId, user.token);
      setMessage(`Expense "${expenseDescription}" deleted successfully!`);
      refreshData(); // Re-fetch all data
    } catch (err) {
      setError(err.message || "Failed to delete expense.");
      console.error("Delete expense error:", err);
    }
  };

  // Handle Settle Up Debt
  const handleSettleDebt = async (fromUser, toUser, amount) => {
    setError(null);
    setMessage(null);
    const fromUserName =
      currentRoom.members.find((m) => m.user._id === fromUser)?.user.name ||
      "Unknown";
    const toUserName =
      currentRoom.members.find((m) => m.user._id === toUser)?.user.name ||
      "Unknown";

    if (
      !window.confirm(
        `Are you sure you want to mark ${fromUserName} settling $${amount.toFixed(
          2
        )} to ${toUserName}? This will add a new expense.`
      )
    ) {
      return;
    }

    try {
      // The settleDebt service function adds a new expense to balance the debt
      await expenseService.settleDebt(
        currentRoom._id,
        fromUser,
        toUser,
        amount,
        user.token
      );
      setMessage(
        `Debt of $${amount.toFixed(
          2
        )} settled between ${fromUserName} and ${toUserName}!`
      );
      refreshData(); // Re-fetch all data
    } catch (err) {
      setError(err.message || "Failed to settle debt.");
      console.error("Settle debt error:", err);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-4 text-gray-600">Loading expenses...</div>
    );
  }

  if (error && !message) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-4">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-2xl font-semibold mb-4 text-gray-800">
        Expenses Split
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

      {/* Add New Expense Form */}
      <div className="mb-8 p-6 bg-indigo-50 rounded-lg border border-indigo-200">
        <h4 className="text-xl font-semibold text-gray-800 mb-4">
          Add New Expense
        </h4>
        <form onSubmit={handleAddExpense} className="space-y-4">
          <div>
            <label
              htmlFor="description"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Description
            </label>
            <input
              type="text"
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., Dinner, Groceries, Rent"
              required
            />
          </div>
          <div>
            <label
              htmlFor="totalAmount"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Total Amount
            </label>
            <input
              type="number"
              id="totalAmount"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., 50.00"
              step="0.01"
              required
            />
          </div>
          <div>
            <label
              htmlFor="paidBy"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Paid By
            </label>
            <select
              id="paidBy"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              {currentRoom?.members.map((member) => (
                <option key={member.user._id} value={member.user._id}>
                  {member.user.name} {member.user._id === user._id && "(You)"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="splitType"
              className="block text-gray-700 text-sm font-bold mb-2"
            >
              Split Type
            </label>
            <select
              id="splitType"
              value={splitType}
              onChange={(e) => setSplitType(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="equal">Equal</option>
              <option value="unequal">Unequal (Manual Entry)</option>
              <option value="percentage">Percentages</option>
              <option value="shares">Shares</option>
            </select>
          </div>

          {/* Members involved in split & dynamic input fields */}
          <div className="border border-gray-200 p-4 rounded-md bg-white">
            <h5 className="text-md font-semibold mb-3">
              Who is splitting this expense?
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentRoom?.members.map((member) => (
                <div
                  key={member.user._id}
                  className="flex items-center space-x-2"
                >
                  <input
                    type="checkbox"
                    id={`split-${member.user._id}`}
                    checked={
                      splitMembers.find((m) => m._id === member.user._id)
                        ?.selected || false
                    }
                    onChange={() => handleMemberSelection(member.user._id)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <label
                    htmlFor={`split-${member.user._id}`}
                    className="text-gray-700 flex-grow"
                  >
                    {member.user.name}
                  </label>
                  {splitMembers.find((m) => m._id === member.user._id)
                    ?.selected && (
                    <>
                      {splitType === "unequal" && (
                        <input
                          type="number"
                          placeholder="Amount"
                          value={customAmounts[member.user._id] || ""}
                          onChange={(e) =>
                            handleSplitValueChange(
                              member.user._id,
                              e.target.value,
                              "unequal"
                            )
                          }
                          className="w-24 p-1 border border-gray-300 rounded-md text-sm"
                          step="0.01"
                        />
                      )}
                      {splitType === "percentage" && (
                        <div className="flex items-center">
                          <input
                            type="number"
                            placeholder="%"
                            value={percentages[member.user._id] || ""}
                            onChange={(e) =>
                              handleSplitValueChange(
                                member.user._id,
                                e.target.value,
                                "percentage"
                              )
                            }
                            className="w-20 p-1 border border-gray-300 rounded-md text-sm"
                            min="0"
                            max="100"
                          />
                          <span className="ml-1 text-gray-600">%</span>
                        </div>
                      )}
                      {splitType === "shares" && (
                        <div className="flex items-center">
                          <input
                            type="number"
                            placeholder="Shares"
                            value={shares[member.user._id] || ""}
                            onChange={(e) =>
                              handleSplitValueChange(
                                member.user._id,
                                e.target.value,
                                "shares"
                              )
                            }
                            className="w-20 p-1 border border-gray-300 rounded-md text-sm"
                            min="1"
                          />
                          <span className="ml-1 text-gray-600">shares</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-200 ease-in-out"
          >
            Add Expense
          </button>
        </form>
      </div>

      {/* Expenses List */}
      <div className="mb-8">
        <h4 className="text-xl font-semibold text-gray-800 mb-3">
          Recent Expenses
        </h4>
        {expenses.length === 0 ? (
          <p className="text-gray-600">No expenses added yet.</p>
        ) : (
          <ul className="space-y-4">
            {expenses.map((expense) => (
              <li
                key={expense._id}
                className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-lg font-bold text-gray-800">
                    {expense.description}
                  </span>
                  <span className="text-xl font-semibold text-indigo-600">
                    ${expense.totalAmount.toFixed(2)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  Paid by:{" "}
                  <span className="font-medium">{expense.paidBy.name}</span>
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Split Type:{" "}
                  <span className="font-medium capitalize">
                    {expense.splitType}
                  </span>
                </p>
                <div className="mt-2 border-t border-gray-200 pt-2">
                  <p className="text-sm font-semibold text-gray-700 mb-1">
                    Split Details:
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-0.5">
                    {expense.splits.map((split, index) => (
                      <li key={index}>
                        {split.user.name}: ${split.amount.toFixed(2)}
                        {split.percentage && ` (${split.percentage}%)`}
                        {split.shares && ` (${split.shares} shares)`}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-gray-500">
                    {new Date(expense.date).toLocaleDateString()}
                  </p>
                  {(userIsAdminInRoom || expense.paidBy._id === user._id) && (
                    <button
                      onClick={() =>
                        handleDeleteExpense(expense._id, expense.description)
                      }
                      className="bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-2 rounded-md transition duration-200 ease-in-out"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Balances Section */}
      <div>
        <h4 className="text-xl font-semibold text-gray-800 mb-3">
          Current Balances
        </h4>
        {balances.length === 0 ? (
          <p className="text-gray-600">No balances to display yet.</p>
        ) : (
          <ul className="space-y-2 mb-6">
            {balances.map((balance) => (
              <li
                key={balance._id}
                className={`flex justify-between items-center p-3 rounded-md ${
                  balance.amount > 0
                    ? "bg-green-100 border-green-300"
                    : balance.amount < 0
                    ? "bg-red-100 border-red-300"
                    : "bg-gray-100 border-gray-300"
                } border`}
              >
                <span className="font-medium text-gray-800">
                  {balance.name}
                </span>
                <span
                  className={`font-bold ${
                    balance.amount > 0
                      ? "text-green-700"
                      : balance.amount < 0
                      ? "text-red-700"
                      : "text-gray-700"
                  }`}
                >
                  ${balance.amount.toFixed(2)}{" "}
                  {balance.amount > 0
                    ? "is owed"
                    : balance.amount < 0
                    ? "owes"
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        )}

        <h4 className="text-xl font-semibold text-gray-800 mb-3">
          Simplified Debts
        </h4>
        {simplifiedDebts.length === 0 ? (
          <p className="text-gray-600">No debts to settle!</p>
        ) : (
          <ul className="space-y-2">
            {simplifiedDebts.map((debt, index) => (
              <li
                key={index}
                className="bg-yellow-50 p-3 rounded-md border border-yellow-300 flex justify-between items-center"
              >
                <span className="font-medium text-gray-800">
                  {debt.from} owes {debt.to}:{" "}
                  <span className="font-bold text-yellow-700">
                    ${debt.amount.toFixed(2)}
                  </span>
                </span>
                {(debt.from === user.name || debt.to === user.name) && ( // Only show settle button if current user is involved
                  <button
                    onClick={() =>
                      handleSettleDebt(
                        currentRoom.members.find(
                          (m) => m.user.name === debt.from
                        )?.user._id,
                        currentRoom.members.find((m) => m.user.name === debt.to)
                          ?.user._id,
                        debt.amount
                      )
                    }
                    className="ml-4 bg-blue-600 hover:bg-blue-700 text-white text-sm py-1 px-3 rounded-md transition duration-200 ease-in-out"
                  >
                    Settle Up
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default ExpenseSplitter;
