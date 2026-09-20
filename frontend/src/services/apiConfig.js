// Single source of truth for the backend base URL.
//
// Set VITE_APP_API_URL in .env.development / .env.production to point the app
// at a different host (e.g. http://192.168.1.11:5000/api when testing from a
// phone on the same LAN). Falls back to localhost for a plain `npm run dev`.
const API_BASE_URL = (
  import.meta.env.VITE_APP_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

// resourceUrl("users") -> "http://localhost:5000/api/users/"
export const resourceUrl = (resource) => `${API_BASE_URL}/${resource}/`;

export default API_BASE_URL;
