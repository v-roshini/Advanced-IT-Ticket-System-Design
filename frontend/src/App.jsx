import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Tickets from "./pages/Tickets";
import CreateTicket from "./pages/CreateTicket";
import TicketDetail from "./pages/TicketDetail";
import Customers from "./pages/Customers";
import CustomerProfile from "./pages/CustomerProfile";
import AMCContracts from "./pages/AMCContracts";
import Billing from "./pages/Billing";
import WorkLog from "./pages/WorkLog";
import AdminPanel from "./pages/AdminPanel";
import AIChat from "./pages/AIChat";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Agents from "./pages/Agents";
import AgentProfile from "./pages/AgentProfile";
import Renewals from "./pages/Renewals";
import Reports from "./pages/Reports";
import CustomerReports from "./pages/CustomerReports";
import CustomerLogin from "./pages/CustomerLogin";
import CustomerDashboard from "./pages/CustomerDashboard";
import CustomerTickets from "./pages/CustomerTickets";
import CustomerBilling from "./pages/CustomerBilling";
import CustomerRenewals from "./pages/CustomerRenewals";
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
    <div className="ml-64 flex-1 bg-blue-50/50 min-h-screen">
      <Navbar />
      <div className="p-8">
        {children}
      </div>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes — redirect to /dashboard if already logged in */}
        <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/customer/login" element={<PublicRoute><CustomerLogin /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />

        {/* Protected routes — redirect to / if not logged in */}
        <Route path="/dashboard" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
        <Route path="/tickets" element={<PrivateRoute><Layout><Tickets /></Layout></PrivateRoute>} />
        <Route path="/tickets/create" element={<PrivateRoute><Layout><CreateTicket /></Layout></PrivateRoute>} />
        <Route path="/tickets/:id" element={<PrivateRoute><Layout><TicketDetail /></Layout></PrivateRoute>} />
        <Route path="/customers" element={<PrivateRoute><Layout><Customers /></Layout></PrivateRoute>} />
        <Route path="/customers/:id" element={<PrivateRoute><Layout><CustomerProfile /></Layout></PrivateRoute>} />
        <Route path="/amc" element={<PrivateRoute><Layout><AMCContracts /></Layout></PrivateRoute>} />
        <Route path="/billing" element={<PrivateRoute><Layout><Billing /></Layout></PrivateRoute>} />
        <Route path="/worklog" element={<PrivateRoute><Layout><WorkLog /></Layout></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute><Layout><AdminPanel /></Layout></PrivateRoute>} />
        <Route path="/ai-chat" element={<PrivateRoute><Layout><AIChat /></Layout></PrivateRoute>} />
        <Route path="/agents" element={<PrivateRoute><Layout><Agents /></Layout></PrivateRoute>} />
        <Route path="/agents/:id" element={<PrivateRoute><Layout><AgentProfile /></Layout></PrivateRoute>} />
        <Route path="/renewals" element={<PrivateRoute><Layout><Renewals /></Layout></PrivateRoute>} />
        <Route path="/reports" element={<PrivateRoute><Layout><Reports /></Layout></PrivateRoute>} />

        {/* Customer Portal Specific */}
        <Route path="/customer/dashboard" element={<PrivateRoute><Layout><CustomerDashboard /></Layout></PrivateRoute>} />
        <Route path="/customer/tickets" element={<PrivateRoute><Layout><CustomerTickets /></Layout></PrivateRoute>} />
        <Route path="/customer/billing" element={<PrivateRoute><Layout><CustomerBilling /></Layout></PrivateRoute>} />
        <Route path="/customer/renewals" element={<PrivateRoute><Layout><CustomerRenewals /></Layout></PrivateRoute>} />
        <Route path="/customer/reports" element={<PrivateRoute><Layout><CustomerReports /></Layout></PrivateRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

