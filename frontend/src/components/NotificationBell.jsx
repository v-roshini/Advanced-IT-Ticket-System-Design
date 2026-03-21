import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FiBell, FiCheck, FiInfo, FiAlertTriangle, FiFlag, FiExternalLink } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

const BASE = process.env.REACT_APP_URL || process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function NotificationBell() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const socketRef = useRef(null);
    const navigate = useNavigate();

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;
            const res = await axios.get(`${BASE}/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(res.data.notifications || []);
            setUnreadCount(res.data.unreadCount || 0);
        } catch (err) {
            console.error("Error fetching notifications:", err);
        }
    };

    useEffect(() => {
        fetchNotifications();

        // ✅ Socket.io Real-time Setup
        const token = localStorage.getItem("token");
        if (token) {
            // Decode userId from JWT token (assuming standard header.payload.signature)
            try {
                const payload = JSON.parse(atob(token.split(".")[1]));
                const userId = payload.id;

                socketRef.current = io(BASE);
                
                socketRef.current.on("connect", () => {
                    console.log("🔌 Connected to Socket.io Server");
                    socketRef.current.emit("join", userId);
                });

                socketRef.current.on("notification", (newNotif) => {
                    console.log("🔔 New Notification Received:", newNotif);
                    setNotifications(prev => [newNotif, ...prev]);
                    setUnreadCount(prev => prev + 1);
                    
                    // Simple Browser Notification
                    if (Notification.permission === "granted") {
                        new Notification(newNotif.title, { body: newNotif.message });
                    }
                });
            } catch (err) {
                console.error("Socket integration error:", err);
            }
        }

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, []);


    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const markAsRead = async (id) => {
        try {
            const token = localStorage.getItem("token");
            await axios.patch(`${BASE}/notifications/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchNotifications();
        } catch (err) {
            console.error("Error marking as read:", err);
        }
    };

    const markAllRead = async () => {
        try {
            const token = localStorage.getItem("token");
            await axios.patch(`${BASE}/notifications/read-all`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchNotifications();
        } catch (err) {
            console.error("Error marking all as read:", err);
        }
    };

    const handleNotificationClick = (notif) => {
        if (!notif.is_read) markAsRead(notif.id);
        setIsOpen(false);
        if (notif.link) {
            navigate(notif.link);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'ticket_created': return <FiFlag className="text-blue-500" />;
            case 'sla_breach': return <FiAlertTriangle className="text-red-500" />;
            case 'sla_risk': return <FiAlertTriangle className="text-orange-500" />;
            case 'renewal_due': return <FiInfo className="text-purple-500" />;
            default: return <FiInfo className="text-blue-500" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-400 hover:text-blue-600 transition outline-none"
            >
                <FiBell size={22} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                    <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-bold text-gray-800 text-sm">Notifications</h3>
                        {unreadCount > 0 && (
                            <button 
                                onClick={markAllRead}
                                className="text-[10px] font-black uppercase text-blue-600 hover:underline"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length > 0 ? (
                            notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`p-4 border-b border-gray-50 last:border-0 cursor-pointer transition hover:bg-blue-50 relative ${!notif.is_read ? 'bg-blue-50/20' : ''}`}
                                >
                                    {!notif.is_read && <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-600 rounded-full"></div>}
                                    <div className="flex gap-3">
                                        <div className="mt-1">
                                            {getIcon(notif.type)}
                                        </div>
                                        <div className="flex-1">
                                            <p className={`text-xs ${!notif.is_read ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                                                {notif.title}
                                            </p>
                                            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">
                                                {notif.message}
                                            </p>
                                            <div className="flex justify-between items-center mt-2">
                                                <span className="text-[10px] text-gray-400">
                                                    {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {notif.link && <FiExternalLink size={10} className="text-blue-400" />}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center">
                                <p className="text-sm text-gray-400">No notifications yet</p>
                            </div>
                        )}
                    </div>

                    <div className="p-2 bg-gray-50 border-t border-gray-100 text-center">
                        <button className="text-[10px] font-bold text-gray-500 hover:text-blue-600 uppercase transition">
                            View All History
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
