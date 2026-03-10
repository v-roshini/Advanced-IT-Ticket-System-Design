import { useState, useRef, useEffect } from "react";
import { FiSend, FiUser, FiCpu, FiCheckCircle, FiAlertCircle, FiX, FiZap } from "react-icons/fi";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const priorities = ["Critical", "High", "Medium", "Low"];
const categories = ["Server Issue", "Website Bug", "Login Issue", "Payment Issue", "Email Issue", "General Support"];

const priorityColors = {
  Critical: "bg-red-100 text-red-700 border-red-300",
  High: "bg-orange-100 text-orange-700 border-orange-300",
  Medium: "bg-yellow-100 text-yellow-700 border-yellow-300",
  Low: "bg-green-100 text-green-700 border-green-300",
};

export default function AIChat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "👋 Hello! I'm your AI Support Agent for Linotec. I'll try to resolve your issue right here — no ticket needed!\n\nDescribe your problem and I'll walk you through a solution.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResolutionButtons, setShowResolutionButtons] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    customerName: "",
    company: "",
    issue_title: "",
    description: "",
    priority: "",
    category: "",
    project: "",
  });
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(null);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, showResolutionButtons]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: "user", content: input };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setShowResolutionButtons(false);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${process.env.REACT_APP_URL}/ai/chat`,
        { message: input, context: updatedMessages.slice(-6) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessages((prev) => [...prev, { role: "assistant", content: res.data.reply }]);
      setShowResolutionButtons(true);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I'm having trouble connecting right now. You can still raise a ticket manually from the Tickets page.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleResolved = () => {
    setShowResolutionButtons(false);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content:
          "✅ Great! I'm glad we could resolve your issue. If you ever need help again, I'm here anytime. Have a great day! 🎉",
      },
    ]);
  };

  const handleEscalate = async () => {
    setShowResolutionButtons(false);
    setEscalating(true);

    // Add a status message to chat
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content:
          "🔄 I'll escalate this to our support team right away. Let me draft a ticket from our conversation...",
      },
    ]);

    try {
      const token = localStorage.getItem("token");
      const conversation = messages.filter((m) => m.role === "user" || m.role === "assistant");
      const res = await axios.post(
        `${process.env.REACT_APP_URL}/ai/escalate`,
        { conversation },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const draft = res.data;
      setTicketForm((prev) => ({
        ...prev,
        issue_title: draft.issue_title || "",
        description: draft.description || "",
        category: draft.category || "",
        priority: draft.priority || "",
      }));

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `📋 I've drafted a ticket based on our conversation. Please review and add your details before submitting.`,
        },
      ]);
      setShowModal(true);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I couldn't auto-draft the ticket, but you can create one manually. Click below to go to the Create Ticket page.",
          isEscalateLink: true,
        },
      ]);
    } finally {
      setEscalating(false);
    }
  };

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    setSubmittingTicket(true);

    try {
      const token = localStorage.getItem("token");
      const submitData = {
        ...ticketForm,
        customer_name: ticketForm.customerName,
      };
      const res = await axios.post(`${process.env.REACT_APP_URL}/tickets`, submitData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const ticketNo = res.data.ticket?.ticket_no || "your ticket";
      setTicketSuccess(ticketNo);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `✅ Ticket **${ticketNo}** has been raised successfully! Our support team will contact you soon. You can track it in the Tickets section.`,
        },
      ]);
      setShowModal(false);
      setTicketForm({
        customerName: "", company: "", issue_title: "",
        description: "", priority: "", category: "", project: "",
      });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create ticket. Please try again.");
    } finally {
      setSubmittingTicket(false);
    }
  };

  const formatMessage = (content) => {
    // Bold text between **
    return content.split("**").map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
    );
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-120px)] flex flex-col relative">
      {/* Header */}
      <div className="bg-white rounded-t-2xl shadow-sm border-b p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center shadow">
          <FiCpu size={20} />
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-gray-800">AI Support Agent</h2>
          <p className="text-xs text-green-500 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span>
            Zero-Touch Resolution Mode
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200">
          <FiZap size={12} />
          AI-Powered
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 bg-gray-50 overflow-y-auto p-6 flex flex-col gap-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[82%] flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${m.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                  }`}
              >
                {m.role === "user" ? <FiUser size={14} /> : <FiCpu size={14} />}
              </div>
              <div
                className={`px-4 py-3 rounded-2xl text-sm shadow-sm whitespace-pre-line leading-relaxed ${m.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-none"
                    : "bg-white text-gray-800 rounded-tl-none border border-gray-100"
                  }`}
              >
                {formatMessage(m.content)}
                {m.isEscalateLink && (
                  <button
                    onClick={() => navigate("/tickets/create")}
                    className="mt-3 block w-full text-center bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-blue-700 transition"
                  >
                    Create Ticket Manually →
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Loading dots */}
        {(loading || escalating) && (
          <div className="flex justify-start">
            <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-gray-100 flex gap-1.5 items-center">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.15s]"></span>
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.3s]"></span>
              <span className="text-xs text-gray-400 ml-2">{escalating ? "Drafting ticket..." : "Thinking..."}</span>
            </div>
          </div>
        )}

        {/* Resolution Buttons */}
        {showResolutionButtons && !loading && !escalating && (
          <div className="flex justify-start ml-11">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 max-w-sm">
              <p className="text-sm text-blue-800 font-medium mb-3">Did this resolve your issue?</p>
              <div className="flex gap-2">
                <button
                  onClick={handleResolved}
                  className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition"
                >
                  <FiCheckCircle size={14} />
                  Yes, resolved!
                </button>
                <button
                  onClick={handleEscalate}
                  className="flex items-center gap-1.5 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-600 transition"
                >
                  <FiAlertCircle size={14} />
                  Still not resolved
                </button>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} className="bg-white p-4 rounded-b-2xl shadow-sm border-t flex gap-3">
        <input
          type="text"
          placeholder="Describe your issue and I'll help you resolve it..."
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading || escalating}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading || escalating}
          className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-3 rounded-xl hover:opacity-90 transition disabled:opacity-50 shadow"
        >
          <FiSend size={20} />
        </button>
      </form>

      {/* Escalation Modal – Ticket Draft */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">🎫 AI-Drafted Ticket</h3>
                <p className="text-xs text-gray-400">Review the auto-filled details and submit</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleTicketSubmit} className="p-5 flex flex-col gap-4">
              {/* AI Classification Banner */}
              {(ticketForm.category || ticketForm.priority) && (
                <div className="flex gap-2 flex-wrap">
                  {ticketForm.category && (
                    <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full border border-blue-200 font-medium">
                      📁 {ticketForm.category}
                    </span>
                  )}
                  {ticketForm.priority && (
                    <span className={`text-xs px-3 py-1 rounded-full border font-medium ${priorityColors[ticketForm.priority] || "bg-gray-100 text-gray-700"}`}>
                      🔴 Priority: {ticketForm.priority}
                    </span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Your Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Customer name"
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    value={ticketForm.customerName}
                    onChange={(e) => setTicketForm({ ...ticketForm, customerName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Company *</label>
                  <input
                    type="text"
                    required
                    placeholder="Company name"
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    value={ticketForm.company}
                    onChange={(e) => setTicketForm({ ...ticketForm, company: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Issue Title *</label>
                <input
                  type="text"
                  required
                  placeholder="Brief title"
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  value={ticketForm.issue_title}
                  onChange={(e) => setTicketForm({ ...ticketForm, issue_title: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the issue..."
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Category *</label>
                  <select
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    value={ticketForm.category}
                    onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Priority *</label>
                  <select
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    value={ticketForm.priority}
                    onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                  >
                    <option value="">Select Priority</option>
                    {priorities.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Project (Optional)</label>
                <input
                  type="text"
                  placeholder="Project name"
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  value={ticketForm.project}
                  onChange={(e) => setTicketForm({ ...ticketForm, project: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={submittingTicket}
                  className="flex-1 bg-blue-700 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-800 transition disabled:opacity-60"
                >
                  {submittingTicket ? "Submitting..." : "🎫 Submit Ticket"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="border border-gray-300 text-gray-600 px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
