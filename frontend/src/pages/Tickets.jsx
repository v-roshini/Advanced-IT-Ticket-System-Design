import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiSearch } from "react-icons/fi";
import axios from "axios";

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

export default function Tickets() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPriority, setFilterPriority] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${process.env.REACT_APP_URL}/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTickets(res.data);
    } catch (err) {
      console.error("Error fetching tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = tickets.filter((t) => {
    const matchSearch =
      t.issue_title?.toLowerCase().includes(search.toLowerCase()) ||
      t.company?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || t.status === filterStatus;
    const matchPriority = filterPriority === "All" || t.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-blue-900">All Tickets</h2>
          <p className="text-gray-500 text-sm">{filtered.length} tickets found</p>
        </div>
        <button onClick={() => navigate("/tickets/create")}
          className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition text-sm font-medium">
          <FiPlus /> New Ticket
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 w-64">
          <FiSearch className="text-gray-400" />
          <input type="text" placeholder="Search tickets..."
            className="outline-none text-sm w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)} />
        </div>

        <select className="bg-white border rounded-lg px-3 py-2 text-sm outline-none"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="All">All Status</option>
          <option value="Open">Open</option>
          <option value="In_Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>

        <select className="bg-white border rounded-lg px-3 py-2 text-sm outline-none"
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="All">All Priority</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-blue-600 font-medium">
            Loading tickets...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-blue-50 text-blue-800">
              <tr>
                <th className="px-4 py-3 text-left">Ticket No</th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Priority</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-gray-400">
                    No tickets found
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="border-t hover:bg-blue-50 transition">
                    <td className="px-4 py-3 font-mono text-blue-600 font-medium">{t.ticket_no}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{t.issue_title}</td>
                    <td className="px-4 py-3 text-gray-600">{t.company || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColor[t.priority]}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[t.status]}`}>
                        {t.status?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {t.agent?.full_name || "Unassigned"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => navigate(`/tickets/${t.id}`)}
                        className="text-blue-600 hover:underline text-xs font-medium">
                        View →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
