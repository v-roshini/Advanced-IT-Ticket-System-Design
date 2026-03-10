import { useNavigate, useLocation } from "react-router-dom";
import {
    FiGrid, FiTag, FiUsers, FiFileText, FiDollarSign,
    FiClock, FiShield, FiMessageSquare, FiLogOut, FiZap,
} from "react-icons/fi";

const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: <FiGrid /> },
    { label: "Tickets", path: "/tickets", icon: <FiTag /> },
    { label: "Customers", path: "/customers", icon: <FiUsers /> },
    { label: "Agents", path: "/agents", icon: <FiUsers /> },
    { label: "AMC Contracts", path: "/amc", icon: <FiFileText /> },
    { label: "Billing", path: "/billing", icon: <FiDollarSign /> },
    { label: "Work Log", path: "/worklog", icon: <FiClock /> },
    { label: "Admin Panel", path: "/admin", icon: <FiShield /> },
    { label: "AI Chat", path: "/ai-chat", icon: <FiMessageSquare />, badge: "AI" },
];

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();

    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
    };

    return (
        <div className="fixed top-0 left-0 h-screen w-64 bg-blue-900 flex flex-col py-6 px-4 z-50">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8 px-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center shadow">
                    <span className="text-white font-black text-sm">IT</span>
                </div>
                <span className="text-white font-bold text-lg leading-tight">
                    Ticket<br />
                    <span className="text-blue-300 text-sm font-normal">Support System</span>
                </span>
            </div>

            {/* Nav Items */}
            <nav className="flex flex-col gap-1 flex-1">
                {navItems
                    .filter((item) => {
                        if (user.role === "admin") return true;
                        if (user.role === "agent") {
                            return ["Dashboard", "Tickets", "Work Log"].includes(item.label);
                        }
                        if (user.role === "client") {
                            return ["Dashboard", "Tickets", "AI Chat"].includes(item.label);
                        }
                        return false;
                    })
                    .map((item) => {
                        const active = location.pathname === item.path;
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition w-full text-left ${active
                                    ? "bg-blue-700 text-white"
                                    : "text-blue-200 hover:bg-blue-800 hover:text-white"
                                    }`}
                            >
                                <span className="text-base">{item.icon}</span>
                                <span className="flex-1 text-left">{item.label}</span>
                                {item.badge && (
                                    <span className="bg-gradient-to-r from-blue-400 to-indigo-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none flex items-center gap-0.5">
                                        <FiZap size={8} />{item.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
            </nav>

            {/* User + Logout */}
            <div className="mt-auto pt-4 border-t border-blue-700">
                <p className="text-blue-300 text-xs px-2">Logged in as</p>
                <p className="text-white text-sm font-semibold mb-3 px-2 truncate">
                    {user.full_name || "User"}
                </p>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-blue-300 hover:text-white text-sm transition w-full px-2 py-1.5 rounded-lg hover:bg-blue-800"
                >
                    <FiLogOut /> Logout
                </button>
            </div>
        </div>
    );
}
