import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Tickets from "./pages/Tickets";
import CreateTicket from "./pages/CreateTicket";
import TicketDetail from "./pages/TicketDetail";
import Customers from "./pages/Customers";
import AMCContracts from "./pages/AMCContracts";
import Billing from "./pages/Billing";
import WorkLog from "./pages/WorkLog";
import AdminPanel from "./pages/AdminPanel";
import AIChat from "./pages/AIChat";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Agents from "./pages/Agents";
import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_URL,
});
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

// Redirects unauthenticated users to login
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/" replace />;
};

// Redirects already-logged-in users away from login/signup to dashboard
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? <Navigate to="/dashboard" replace /> : children;
};

const Layout = ({ children }) => (
  <div className="flex">
    <Sidebar />
    <div className="ml-64 flex-1 bg-blue-50 min-h-screen p-6">
      {children}
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes — redirect to /dashboard if already logged in */}
        <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />

        {/* Protected routes — redirect to / if not logged in */}
        <Route path="/dashboard" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
        <Route path="/tickets" element={<PrivateRoute><Layout><Tickets /></Layout></PrivateRoute>} />
        <Route path="/tickets/create" element={<PrivateRoute><Layout><CreateTicket /></Layout></PrivateRoute>} />
        <Route path="/tickets/:id" element={<PrivateRoute><Layout><TicketDetail /></Layout></PrivateRoute>} />
        <Route path="/customers" element={<PrivateRoute><Layout><Customers /></Layout></PrivateRoute>} />
        <Route path="/amc" element={<PrivateRoute><Layout><AMCContracts /></Layout></PrivateRoute>} />
        <Route path="/billing" element={<PrivateRoute><Layout><Billing /></Layout></PrivateRoute>} />
        <Route path="/worklog" element={<PrivateRoute><Layout><WorkLog /></Layout></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><Layout><AdminPanel /></Layout></PrivateRoute>} />
        <Route path="/ai-chat" element={<PrivateRoute><Layout><AIChat /></Layout></PrivateRoute>} />
        <Route path="/agents" element={<PrivateRoute><Layout><Agents /></Layout></PrivateRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

