import { useState, useEffect } from "react";
import { FiClock, FiUsers, FiEye, FiDownload } from "react-icons/fi";
import axios from "axios";

export default function WorkLog() {
  const [logs, setLogs] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAgent, setFilterAgent] = useState("");
  const [form, setForm] = useState({
    ticket_id: "", agent_id: "", start_time: "", end_time: "", description: ""
  });

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  const isAdmin = user.role === "admin";

  useEffect(() => {
    fetchLogs();
    fetchTickets();
    if (isAdmin) fetchAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_URL}/tickets`, { headers });
      setTickets(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchAgents = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_URL}/agents`, { headers });
      setAgents(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchLogs = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_URL}/worklog`, { headers });
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calcTimeSpent = (start, end) => {
    if (!start || !end) return "N/A";
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff <= 0) return "Invalid";
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const time_spent = calcTimeSpent(form.start_time, form.end_time);
    try {
      await axios.post(`${process.env.REACT_APP_URL}/worklog`, { ...form, time_spent }, { headers });
      alert("✅ Work log saved!");
      setForm({ ticket_id: "", agent_id: "", start_time: "", end_time: "", description: "" });
      fetchLogs();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save work log");
    }
  };

  // For admin: filter logs by agent if selected
  const displayedLogs = isAdmin && filterAgent
    ? logs.filter((l) => String(l.agent_id) === filterAgent)
    : logs;

  // Compute total time for admin summary
  const totalMinutes = displayedLogs.reduce((acc, l) => {
    if (!l.start_time || !l.end_time) return acc;
    const [sh, sm] = l.start_time.split(":").map(Number);
    const [eh, em] = l.end_time.split(":").map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return acc + (diff > 0 ? diff : 0);
  }, 0);
  const totalHrs = Math.floor(totalMinutes / 60);
  const totalMins = totalMinutes % 60;

  const handleExportCSV = () => {
    // Basic CSV Export Logic
    const headers = ["Date", "Agent", "Ticket No", "Start Time", "End Time", "Time Spent", "Description"];
    const csvData = displayedLogs.map(l => [
      new Date(l.created_at).toLocaleDateString(),
      l.agent?.full_name || "N/A",
      l.ticket?.ticket_no || l.ticket_id || "N/A",
      l.start_time,
      l.end_time,
      l.time_spent,
      `"${l.description.replace(/"/g, '""')}"` 
    ]);
    
    // Combine Headers and Rows
    const csvContent = [headers.join(","), ...csvData.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `WorkLogs_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ─── ADMIN VIEW — Monitor only ─────────────────────────────────────────────
  if (isAdmin) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-blue-900 flex items-center gap-2">
              <FiEye className="text-blue-600" /> Agent Work Log Monitor
            </h2>
            <p className="text-gray-400 text-sm mt-1">Read-only view of all agents' work activity</p>
          </div>
          {/* Agent filter */}
          <div className="flex items-center gap-2">
            <button onClick={handleExportCSV} className="bg-green-100 flex items-center gap-1 text-green-700 px-3 py-2 rounded-lg text-sm font-bold hover:bg-green-200 transition">
              <FiDownload size={14} /> Export CSV
            </button>
            <FiUsers className="text-blue-600 ml-2" />
            <select
              className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 min-w-[180px]"
              value={filterAgent}
              onChange={(e) => setFilterAgent(e.target.value)}
            >
              <option value="">All Agents</option>
              {agents.map((a) => (
                <option key={a.id} value={String(a.id)}>{a.full_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary Bar */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <FiClock size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Logs</p>
              <p className="text-xl font-bold text-blue-900">{displayedLogs.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
              <FiClock size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Time Logged</p>
              <p className="text-xl font-bold text-green-700">
                {totalHrs > 0 ? `${totalHrs}h ` : ""}{totalMins}m
              </p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
              <FiUsers size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-400">Active Agents</p>
              <p className="text-xl font-bold text-purple-700">
                {[...new Set(logs.map((l) => l.agent_id))].length}
              </p>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-semibold text-blue-900 mb-4">Work Log Entries</h3>
          {loading ? (
            <p className="text-blue-600 text-sm">Loading...</p>
          ) : displayedLogs.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No work logs found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-blue-700 border-b">
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Agent</th>
                    <th className="pb-2 pr-4">Ticket</th>
                    <th className="pb-2 pr-4">Time</th>
                    <th className="pb-2 pr-4">Duration</th>
                    <th className="pb-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedLogs.map((l) => (
                    <tr key={l.id} className="border-b hover:bg-blue-50 transition">
                      <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">
                        {new Date(l.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 pr-4 font-medium text-gray-800">
                        {l.agent?.full_name || "—"}
                      </td>
                      <td className="py-3 pr-4 font-mono text-blue-600">
                        #{l.ticket?.ticket_no || l.ticket_id || "—"}
                      </td>
                      <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">
                        {l.start_time} – {l.end_time}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs font-medium">
                          {l.time_spent}
                        </span>
                      </td>
                      <td className="py-3 text-gray-600 max-w-xs truncate">{l.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── AGENT VIEW — Log their own work ───────────────────────────────────────
  return (
    <div>
      <h2 className="text-2xl font-bold text-blue-900 mb-6">Work Log</h2>

      <div className="grid grid-cols-2 gap-6">
        {/* Add Work Log Form */}
        <div className="bg-white rounded-xl shadow p-6 h-fit">
          <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
            <FiClock /> Add Work Log
          </h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Ticket No *</label>
              <select required
                className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                value={form.ticket_id}
                onChange={(e) => setForm({ ...form, ticket_id: e.target.value })}>
                <option value="">Select Ticket</option>
                {tickets.map(t => (
                  <option key={t.id} value={t.id}>{t.ticket_no} - {t.issue_title}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Start Time *</label>
                <input type="time" required
                  className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">End Time *</label>
                <input type="time" required
                  className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
              </div>
            </div>
            {form.start_time && form.end_time && (
              <div className="bg-blue-50 text-blue-700 text-sm px-4 py-2 rounded-lg">
                ⏱ Time Spent: <strong>{calcTimeSpent(form.start_time, form.end_time)}</strong>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Description *</label>
              <textarea rows={3} placeholder="What work was done?" required
                className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <button type="submit"
              className="bg-blue-700 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-800 transition text-sm">
              Save Work Log
            </button>
          </form>
        </div>

        {/* My Recent Logs */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-semibold text-blue-900 mb-4">My Recent Logs</h3>
          {loading ? (
            <p className="text-blue-600 text-sm">Loading...</p>
          ) : logs.length === 0 ? (
            <p className="text-gray-400 text-sm">No work logs yet.</p>
          ) : (
            <div className="flex flex-col gap-3 overflow-y-auto max-h-96">
              {logs.map((l) => (
                <div key={l.id} className="border rounded-lg p-4 hover:bg-blue-50 transition">
                  <div className="flex justify-between mb-1">
                    <span className="font-mono text-blue-600 text-sm font-medium">
                      #{l.ticket?.ticket_no || l.ticket_id}
                    </span>
                    <span className="text-xs text-gray-400">
                      {l.start_time} – {l.end_time}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{l.description}</p>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-400">
                      {new Date(l.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                      {l.time_spent}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
