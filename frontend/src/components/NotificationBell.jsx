import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
    FiBell, FiInfo, FiAlertTriangle, FiFlag, FiExternalLink,
    FiBarChart, FiCheck, FiCheckCircle, FiX, FiRefreshCw,
    FiZap, FiMessageSquare, FiCalendar, FiClock
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { showToast } from "./ToastContainer";

const BASE = process.env.REACT_APP_URL || "http://localhost:5000";


// ─────────────────────────────────────────────
// Notification Icon by type
// ─────────────────────────────────────────────
function NotifIcon({ type, size = 14 }) {
    const map = {
        ticket_created:  { icon: FiFlag,         color: "text-blue-500",   bg: "bg-blue-50" },
        ticket_assigned: { icon: FiZap,           color: "text-indigo-500", bg: "bg-indigo-50" },
        customer_reply:  { icon: FiMessageSquare, color: "text-green-500",  bg: "bg-green-50" },
        agent_reply:     { icon: FiMessageSquare, color: "text-green-600",  bg: "bg-green-50" },
        status_changed:  { icon: FiCheckCircle,   color: "text-purple-500", bg: "bg-purple-50" },
        sla_breach:      { icon: FiAlertTriangle, color: "text-red-500",    bg: "bg-red-50" },
        sla_risk:        { icon: FiAlertTriangle, color: "text-orange-500", bg: "bg-orange-50" },
        renewal_due:     { icon: FiCalendar,      color: "text-purple-500", bg: "bg-purple-50" },
        renewal_summary: { icon: FiBarChart,      color: "text-indigo-500", bg: "bg-indigo-50" },
    };
    const cfg = map[type] || { icon: FiInfo, color: "text-blue-500", bg: "bg-blue-50" };
    const Icon = cfg.icon;
    return (
        <div className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
            <Icon size={size} className={cfg.color} />
        </div>
    );
}

// ─────────────────────────────────────────────
// Relative Time helper
// ─────────────────────────────────────────────
function relativeTime(dateStr) {
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ─────────────────────────────────────────────
// Main NotificationBell Component
// ─────────────────────────────────────────────
export default function NotificationBell() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount]     = useState(0);
    const [isOpen, setIsOpen]               = useState(false);
    const [filter, setFilter]               = useState("all"); // "all" | "unread"
    const [isConnected, setIsConnected]     = useState(false);
    const [isLoading, setIsLoading]         = useState(false);

    const dropdownRef = useRef(null);
    const socketRef   = useRef(null);
    const navigate    = useNavigate();

    // ── Fetch notifications from API ──────────
    const fetchNotifications = useCallback(async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem("token");
            if (!token) return;
            const res = await axios.get(`${BASE}/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(res.data.notifications || []);
            setUnreadCount(res.data.unreadCount || 0);
        } catch (err) {
            console.error("Error fetching notifications:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // ── Socket.io real-time setup ──────────────
    useEffect(() => {
        fetchNotifications();

        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            const userId  = payload.id;

            const socket = io(BASE, {
                reconnectionDelay: 1000,
                reconnectionAttempts: 5,
            });
            socketRef.current = socket;

            socket.on("connect", () => {
                setIsConnected(true);
                socket.emit("join", userId);
                console.log("🔌 Socket.io connected — joined room user_" + userId);
            });

            socket.on("disconnect", () => {
                setIsConnected(false);
                console.log("🔌 Socket.io disconnected");
            });

            socket.on("connect_error", () => setIsConnected(false));

            // ✅ New notification received via socket
            socket.on("notification", (newNotif) => {
                console.log("🔔 Real-time notification:", newNotif);

                // Add to notification list (top)
                setNotifications(prev => [newNotif, ...prev]);
                setUnreadCount(prev => prev + 1);

                // Show floating popup toast
                showToast(newNotif.title, newNotif.message, newNotif.type);

                // Browser notification
                if (Notification.permission === "granted") {
                    new Notification(newNotif.title, {
                        body: newNotif.message,
                        icon: "/favicon.ico",
                    });
                } else if (Notification.permission !== "denied") {
                    Notification.requestPermission();
                }
            });
        } catch (err) {
            console.error("Socket setup error:", err);
        }

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [fetchNotifications]);

    // ── Close on outside click ─────────────────
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // ── Mark single notification as read ───────
    const markAsRead = async (id) => {
        try {
            const token = localStorage.getItem("token");
            await axios.patch(`${BASE}/notifications/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error("Error marking as read:", err);
        }
    };

    // ── Mark all as read ───────────────────────
    const markAllRead = async () => {
        try {
            const token = localStorage.getItem("token");
            await axios.patch(`${BASE}/notifications/read-all`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error("Error marking all as read:", err);
        }
    };

    // ── Notification click ─────────────────────
    const handleClick = (notif) => {
        if (!notif.is_read) markAsRead(notif.id);
        setIsOpen(false);
        if (notif.link) navigate(notif.link);
    };


    // ── Filtered notifications ──────────────────
    const filtered = filter === "unread"
        ? notifications.filter(n => !n.is_read)
        : notifications;

    return (
        <>

            {/* ── Bell Button ──────────────────────────────── */}
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="relative p-2 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                    title="Notifications"
                >
                    <FiBell size={22} className={isConnected ? "" : "opacity-50"} />

                    {/* Live connection dot */}
                    <span
                        className={`absolute top-2 left-2 w-2 h-2 rounded-full border-2 border-white ${isConnected ? "bg-green-400" : "bg-gray-300"}`}
                    />

                    {/* Unread badge */}
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-black w-4.5 h-4.5 min-w-[18px] px-1 rounded-full flex items-center justify-center animate-bounce-once shadow-md">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </button>

                {/* ── Dropdown Panel ──────────────────────────── */}
                {isOpen && (
                    <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                        style={{ animation: "dropIn 0.2s ease-out" }}>

                        {/* Header */}
                        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-white font-bold text-sm">Notifications</h3>
                                    <p className="text-blue-100 text-[10px] mt-0.5 flex items-center gap-1.5">
                                        <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-300 animate-pulse" : "bg-gray-300"}`} />
                                        {isConnected ? "Live • Real-time connected" : "Offline"}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={fetchNotifications}
                                        className="p-1.5 rounded-lg hover:bg-white/20 text-white/70 hover:text-white transition"
                                        title="Refresh"
                                    >
                                        <FiRefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
                                    </button>
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={markAllRead}
                                            className="flex items-center gap-1 text-[10px] font-black uppercase bg-white/20 hover:bg-white/30 text-white px-2.5 py-1.5 rounded-lg transition"
                                        >
                                            <FiCheck size={10} /> Mark all read
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Filter tabs */}
                            <div className="flex gap-2 mt-3">
                                {["all", "unread"].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
                                            filter === f
                                                ? "bg-white text-blue-600"
                                                : "text-white/70 hover:bg-white/20"
                                        }`}
                                    >
                                        {f === "all" ? `All (${notifications.length})` : `Unread (${unreadCount})`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Notification list */}
                        <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
                            {filtered.length > 0 ? (
                                filtered.map((notif) => (
                                    <div
                                        key={notif.id}
                                        onClick={() => handleClick(notif)}
                                        className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer transition group hover:bg-blue-50/50 ${
                                            !notif.is_read ? "bg-blue-50/30" : ""
                                        }`}
                                    >
                                        <NotifIcon type={notif.type} />

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={`text-xs leading-tight ${!notif.is_read ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}>
                                                    {notif.title}
                                                </p>
                                                {!notif.is_read && (
                                                    <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-0.5" />
                                                )}
                                            </div>
                                            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                                                {notif.message}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <FiClock size={9} className="text-gray-300" />
                                                <span className="text-[10px] text-gray-400">
                                                    {relativeTime(notif.created_at)}
                                                </span>
                                                {notif.link && (
                                                    <span className="ml-auto opacity-0 group-hover:opacity-100 transition">
                                                        <FiExternalLink size={10} className="text-blue-400" />
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-14 text-center">
                                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                        <FiBell size={22} className="text-gray-300" />
                                    </div>
                                    <p className="text-sm font-semibold text-gray-400">
                                        {filter === "unread" ? "All caught up!" : "No notifications yet"}
                                    </p>
                                    <p className="text-xs text-gray-300 mt-1">
                                        {filter === "unread" ? "No unread notifications." : "Notifications will appear here in real-time."}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                            <button
                                onClick={() => { navigate("/renewals"); setIsOpen(false); }}
                                className="text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-wider"
                            >
                                View Renewals →
                            </button>
                            <span className="text-[9px] text-gray-300 font-black uppercase tracking-widest">
                                Lenok IT System
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Inline animation styles ──────────────── */}
            <style>{`
                @keyframes dropIn {
                    from { transform: translateY(-8px) scale(0.97); opacity: 0; }
                    to   { transform: translateY(0)    scale(1);    opacity: 1; }
                }
                @keyframes bounce-once {
                    0%, 100% { transform: scale(1); }
                    50%       { transform: scale(1.3); }
                }
                .animate-bounce-once { animation: bounce-once 0.4s ease; }
            `}</style>
        </>
    );
}
