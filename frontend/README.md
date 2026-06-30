SmartSplitAI - Frontend
📱 Overview
This repository contains the frontend user interface for SmartSplitAI, a web application designed to help groups manage shared expenses, treasure funds, and recurring duties. Built with React and Vite, it provides an intuitive and responsive experience for users to organize their financial and task-based interactions within shared rooms.

✨ Features
User Authentication: Register and log in to access your rooms.

Dashboard: View and navigate to all rooms you are a member of.

Room Management:

Create new rooms with unique shareable IDs.

Join existing rooms using a Room ID.

View detailed room information, including members.

Expense Splitting:

Add and manage expenses with various split types: Equal, Unequal, Percentage, and Shares.

View a history of all expenses in a room.

Delete expenses (if authorized).

See real-time balance calculations and simplified "who owes whom" breakdowns.

"Settle Up" debts directly from the UI.

Treasure Fund:

View the current balance of the room's shared treasure fund.

Add or deduct funds from the treasure (admin-only).

Track a history of all treasure transactions.

Delete individual treasure transactions (if authorized).

Member Management:

View all members in a room.

Add new members by email (admin-only).

Remove members (admin-only, with checks for outstanding debts).

Change member roles (admin-only).

Leave a room (with checks for outstanding debts).

Duty Time Table:

Configure and manage recurring duties for room members.

Assign and rotate duties among members.

Responsive Design: Optimized for various screen sizes (mobile, tablet, desktop).

🚀 Technologies Used
React.js: JavaScript library for building user interfaces.

Vite: Fast build tool for modern web projects.

Tailwind CSS: Utility-first CSS framework for rapid UI development.

React Router DOM: For declarative routing in the application.

Axios: Promise-based HTTP client for API requests.

Context API / Custom Hooks: For state management and reusable logic.

🛠️ Setup & Local Development
To get the frontend up and running on your local machine:

Prerequisites
Node.js (LTS version recommended)

npm (Node Package Manager)

The SmartSplitAI Backend running locally or deployed.

Installation
Clone the repository:

git clone https://github.com/YOUR_GITHUB_USERNAME/SmartSplitAI-Frontend.git
cd SmartSplitAI-Frontend

(Replace YOUR_GITHUB_USERNAME with your actual GitHub username).

Install dependencies:

npm install

Create a .env.development file:
In the root of the frontend folder, create a file named .env.development and add the following environment variable:

VITE_APP_API_URL=http://localhost:5000/api

Note: This VITE_APP_API_URL should point to your locally running backend API (or your deployed backend API if you're testing against that).

Running the Application
To start the frontend development server:

npm run dev

The application will open in your browser, usually at http://localhost:5173.

Building for Production
To create a production-ready build of the application:

npm run build

This will generate a dist folder containing the optimized static files.
