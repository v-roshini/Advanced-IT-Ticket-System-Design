import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSend } from "react-icons/fi";
import axios from "axios";

const BASE = process.env.REACT_APP_URL;

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

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [agents, setAgents] = useState([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const isAdmin = user.role === "admin";

  useEffect(() => {
    fetchTicket();
    if (isAdmin) fetchAgents();
  }, []);

  const fetchTicket = async () => {
    try {
      const res = await axios.get(`${BASE}/tickets/${id}`, { headers });
      setTicket(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await axios.get(`${BASE}/agents`, { headers });
      setAgents(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (status) => {
    try {
      await axios.put(`${BASE}/tickets/${id}`,
        { status, agent_id: ticket.agent_id }, { headers });
      fetchTicket();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const handleAssignAgent = async (agent_id) => {
    try {
      await axios.put(`${BASE}/tickets/${id}`,
        { status: ticket.status, agent_id: Number(agent_id) }, { headers });
      fetchTicket();
    } catch (err) {
      alert("Failed to assign agent");
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await axios.post(`${BASE}/tickets/${id}/comments`,
        { message: comment, user_id: user.id }, { headers });
      setComment("");
      fetchTicket();
    } catch (err) {
      alert("Failed to add comment");
    }
  };

  if (loading) return (
    <div className="text-center py-20 text-blue-600 font-medium">Loading ticket...</div>
  );

  if (!ticket) return (
    <div className="text-center py-20 text-gray-400">Ticket not found</div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/tickets")}
          className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition">
          <FiArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-blue-900">
            Ticket #{ticket.ticket_no}
          </h2>
          <p className="text-gray-400 text-sm">
            Created {new Date(ticket.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left — Main Info */}
        <div className="col-span-2 flex flex-col gap-5">

          {/* Issue Details */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-bold text-gray-800 text-lg mb-2">{ticket.issue_title}</h3>
            <div className="flex gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${priorityColor[ticket.priority]}`}>
                {ticket.priority}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor[ticket.status]}`}>
                {ticket.status?.replace("_", " ")}
              </span>
              {ticket.category && (
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs">
                  {ticket.category}
                </span>
              )}
            </div>
            <p className="text-gray-600 text-sm leading-relaxed">{ticket.description}</p>
          </div>

          {/* Comments */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-blue-900 mb-4">
              Comments ({ticket.comments?.length || 0})
            </h3>

            <div className="flex flex-col gap-3 mb-5 max-h-64 overflow-y-auto">
              {ticket.comments?.length === 0 ? (
                <p className="text-gray-400 text-sm">No comments yet.</p>
              ) : (
                ticket.comments?.map((c) => (
                  <div key={c.id} className="bg-blue-50 rounded-xl p-4">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-blue-800 text-sm">
                        {c.user?.full_name || "Unknown"}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(c.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm">{c.message}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment */}
            <form onSubmit={handleComment} className="flex gap-2">
              <input type="text"
                placeholder="Add a comment..."
                className="flex-1 border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                value={comment}
                onChange={(e) => setComment(e.target.value)} />
              <button type="submit"
                className="bg-blue-700 text-white px-4 py-2.5 rounded-xl hover:bg-blue-800 transition">
                <FiSend size={16} />
              </button>
            </form>
          </div>
        </div>

        {/* Right — Actions */}
        <div className="flex flex-col gap-5">

          {/* Ticket Info */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-blue-900 mb-4">Ticket Info</h3>
            <div className="flex flex-col gap-3 text-sm">
              {[
                { label: "Customer", value: ticket.customer_name || "—" },
                { label: "Company", value: ticket.company || "—" },
                { label: "Project", value: ticket.project || "—" },
                { label: "Category", value: ticket.category || "—" },
              ].map((info) => (
                <div key={info.label} className="flex justify-between">
                  <span className="text-gray-500">{info.label}:</span>
                  <span className="font-medium text-gray-800">{info.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Update Status — Admin & Agent only */}
          {(user.role === "admin" || user.role === "agent") ? (
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-semibold text-blue-900 mb-3">Update Status</h3>
              <div className="flex flex-col gap-2">
                {["Open", "In_Progress", "Resolved"].map((s) => (
                  <button key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`py-2 rounded-lg text-sm font-medium transition
                      ${ticket.status === s
                        ? "bg-blue-700 text-white"
                        : "bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-700 border"}`}>
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-semibold text-blue-900 mb-3">Status</h3>
              <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${statusColor[ticket.status]}`}>
                {ticket.status?.replace("_", " ")}
              </span>
            </div>
          )}

          {/* Assign Agent — Admin only */}
          {isAdmin ? (
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-semibold text-blue-900 mb-3">Assign Agent</h3>
              <select
                className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                value={ticket.agent_id || ""}
                onChange={(e) => handleAssignAgent(e.target.value)}>
                <option value="">Unassigned</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.full_name}</option>
                ))}
              </select>
              {ticket.agent && (
                <p className="text-xs text-green-600 mt-2">
                  ✅ Assigned to: {ticket.agent.full_name}
                </p>
              )}
            </div>
          ) : ticket.agent ? (
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-semibold text-blue-900 mb-2">Assigned Agent</h3>
              <p className="text-sm text-green-700 font-medium">✅ {ticket.agent.full_name}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
