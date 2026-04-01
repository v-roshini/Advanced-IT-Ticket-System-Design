/**
 * ToastContainer — Global popup notification toasts
 * Works via a custom browser event: window.dispatchEvent(new CustomEvent('show-toast', { detail: { title, message, type } }))
 * Included once in App.jsx or Navbar.jsx — renders anywhere on screen
 */
import { useState, useEffect, useCallback } from "react";

// ── Icon map per type ──────────────────────────────────
const ICONS = {
    ticket_created:  { emoji: "🎫", color: "#3B82F6" },
    ticket_assigned: { emoji: "⚡", color: "#6366F1" },
    new_message:     { emoji: "💬", color: "#3B82F6" },
    customer_reply:  { emoji: "💬", color: "#10B981" },
    agent_reply:     { emoji: "💬", color: "#059669" },
    status_changed:  { emoji: "🔄", color: "#8B5CF6" },
    sla_breach:      { emoji: "🚨", color: "#EF4444" },
    sla_risk:        { emoji: "⚠️", color: "#F97316" },
    renewal_due:     { emoji: "📅", color: "#7C3AED" },
    renewal_summary: { emoji: "📊", color: "#4F46E5" },
    default:         { emoji: "🔔", color: "#3B82F6" },
};

// ── Single Toast Card ──────────────────────────────────
function ToastCard({ id, title, message, type, onDismiss }) {
    const [visible, setVisible] = useState(false);
    const [leaving, setLeaving] = useState(false);
    const cfg = ICONS[type] || ICONS.default;

    useEffect(() => {
        // Animate in
        const showTimer = setTimeout(() => setVisible(true), 10);
        // Auto-dismiss after 5s
        const dismissTimer = setTimeout(() => dismiss(), 5000);
        return () => { clearTimeout(showTimer); clearTimeout(dismissTimer); };
    }, []);

    const dismiss = () => {
        setLeaving(true);
        setTimeout(() => onDismiss(id), 350);
    };

    return (
        <div
            onClick={dismiss}
            style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                background: "#ffffff",
                borderRadius: "16px",
                padding: "16px 18px",
                width: "340px",
                boxShadow: "0 8px 30px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
                border: "1px solid rgba(0,0,0,0.06)",
                cursor: "pointer",
                position: "relative",
                overflow: "hidden",
                transform: visible && !leaving ? "translateX(0)" : "translateX(110%)",
                opacity: visible && !leaving ? 1 : 0,
                transition: "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease",
            }}
        >
            {/* Coloured left accent bar */}
            <div style={{
                position: "absolute", left: 0, top: 0, bottom: 0,
                width: "4px", background: cfg.color, borderRadius: "16px 0 0 16px"
            }} />

            {/* Icon */}
            <div style={{
                width: "38px", height: "38px", borderRadius: "50%",
                background: cfg.color + "18",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "18px", flexShrink: 0, marginLeft: "6px"
            }}>
                {cfg.emoji}
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                    margin: 0, fontWeight: 700, fontSize: "14px",
                    color: "#111827", lineHeight: "1.3", marginBottom: "3px"
                }}>
                    {title}
                </p>
                <p style={{
                    margin: 0, fontSize: "12px", color: "#6B7280",
                    lineHeight: "1.4", display: "-webkit-box",
                    WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden"
                }}>
                    {message}
                </p>
            </div>

            {/* Close button */}
            <button
                onClick={(e) => { e.stopPropagation(); dismiss(); }}
                style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "#9CA3AF", fontSize: "16px", padding: "2px 4px",
                    lineHeight: 1, flexShrink: 0, marginTop: "-2px",
                    borderRadius: "4px",
                }}
                onMouseEnter={e => e.currentTarget.style.color = "#374151"}
                onMouseLeave={e => e.currentTarget.style.color = "#9CA3AF"}
            >
                ×
            </button>

            {/* Progress bar */}
            <div style={{
                position: "absolute", bottom: 0, left: 0, height: "3px",
                background: cfg.color, borderRadius: "0 0 0 16px",
                animation: "toastProgress 5s linear forwards",
            }} />
        </div>
    );
}

// ── Toast Container (renders all active toasts) ────────
export default function ToastContainer() {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((detail) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, ...detail }]);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    useEffect(() => {
        const handler = (e) => addToast(e.detail);
        window.addEventListener("show-toast", handler);
        return () => window.removeEventListener("show-toast", handler);
    }, [addToast]);

    if (toasts.length === 0) return null;

    return (
        <>
            <style>{`
                @keyframes toastProgress {
                    from { width: 100%; }
                    to   { width: 0%; }
                }
            `}</style>
            <div style={{
                position: "fixed",
                bottom: "24px",
                right: "24px",
                zIndex: 99999,
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                pointerEvents: "none",
            }}>
                {toasts.map(toast => (
                    <div key={toast.id} style={{ pointerEvents: "all" }}>
                        <ToastCard {...toast} onDismiss={removeToast} />
                    </div>
                ))}
            </div>
        </>
    );
}

// ── Helper function to show toasts from anywhere ───────
export function showToast(title, message, type = "default") {
    window.dispatchEvent(new CustomEvent("show-toast", {
        detail: { title, message, type }
    }));
}
