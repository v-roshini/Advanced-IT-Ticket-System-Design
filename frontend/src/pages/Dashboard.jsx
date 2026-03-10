import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StatCard from "../components/StatCard";
import axios from "axios";
import { FiBell } from "react-icons/fi";

const priorityColor = {
    Critical: "bg-red-100 text-red-600",
    High: "bg-orange-100 text-orange-600",
    Medium: "bg-yellow-100 text-yellow-700",
    Low: "bg-green-100 text-green-600",
};

const statusColor = {
    Open: "bg-blue-100 text-blue-600",
    In_Progress: "bg-purple-100 text-purple-600",
    Resolved: "bg-green-100 text-green-600",
};

export default function Dashboard() {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await axios.get(`${process.env.REACT_APP_URL}/tickets`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setTickets(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Tickets assigned to the current agent (excluding Resolved)
    const myTickets = user.role === "agent"
        ? tickets.filter((t) => t.agent_id === user.id && t.status !== "Resolved")
        : [];

    const stats = [
        { label: "Total Tickets", value: tickets.length, color: "bg-blue-600" },
        { label: "Open", value: tickets.filter((t) => t.status === "Open").length, color: "bg-yellow-500" },
        { label: "In Progress", value: tickets.filter((t) => t.status === "In_Progress").length, color: "bg-purple-500" },
        { label: "Resolved", value: tickets.filter((t) => t.status === "Resolved").length, color: "bg-green-500" },
    ];

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-blue-900">
                    Welcome back, {user.full_name || "User"}! 👋
                </h2>
                <p className="text-gray-400 text-sm">Here's what's happening today</p>
            </div>

            {/* Agent — Assigned Tickets Notification Banner */}
            {user.role === "agent" && !loading && (
                <div className="mb-6">
                    {myTickets.length > 0 ? (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
                                    <FiBell size={16} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-orange-800 text-sm">
                                        🎫 {myTickets.length} Ticket{myTickets.length > 1 ? "s" : ""} Assigned to You
                                    </h3>
                                    <p className="text-orange-600 text-xs">Please action these tickets</p>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                {myTickets.map((t) => (
                                    <div
                                        key={t.id}
                                        onClick={() => navigate(`/tickets/${t.id}`)}
                                        className="bg-white rounded-lg px-4 py-3 flex items-center justify-between cursor-pointer hover:shadow-md transition border border-orange-100"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono text-blue-600 text-sm font-semibold">
                                                #{t.ticket_no}
                                            </span>
                                            <span className="text-gray-700 text-sm">{t.issue_title}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColor[t.priority]}`}>
                                                {t.priority}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[t.status]}`}>
                                                {t.status?.replace("_", " ")}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                            <span className="text-green-600 text-lg">✅</span>
                            <p className="text-green-700 text-sm font-medium">
                                No active tickets assigned to you right now. Great job!
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                {stats.map((s) => <StatCard key={s.label} {...s} />)}
            </div>

            {/* Recent Tickets */}
            <div className="bg-white rounded-xl shadow p-5">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-blue-900">Recent Tickets</h3>
                    <button onClick={() => navigate("/tickets")}
                        className="text-blue-600 text-sm hover:underline">
                        View All →
                    </button>
                </div>

                {loading ? (
                    <p className="text-center py-8 text-blue-600">Loading...</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-blue-700 border-b">
                                <th className="pb-2">Ticket No</th>
                                <th className="pb-2">Title</th>
                                <th className="pb-2">Priority</th>
                                <th className="pb-2">Status</th>
                                <th className="pb-2">Agent</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tickets.slice(0, 5).map((t) => (
                                <tr key={t.id} className="border-b hover:bg-blue-50 transition cursor-pointer"
                                    onClick={() => navigate(`/tickets/${t.id}`)}>
                                    <td className="py-3 font-mono text-blue-600">{t.ticket_no}</td>
                                    <td className="py-3 font-medium text-gray-800">{t.issue_title}</td>
                                    <td className="py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColor[t.priority]}`}>
                                            {t.priority}
                                        </span>
                                    </td>
                                    <td className="py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[t.status]}`}>
                                            {t.status?.replace("_", " ")}
                                        </span>
                                    </td>
                                    <td className="py-3 text-gray-600">
                                        {t.agent?.full_name || "Unassigned"}
                                    </td>
                                </tr>
                            ))}
                            {tickets.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="text-center py-8 text-gray-400">
                                        No tickets yet. Create your first ticket!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
