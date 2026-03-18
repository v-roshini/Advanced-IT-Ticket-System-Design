import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { FiPlus, FiSearch, FiDownload, FiSlash, FiUserPlus, FiCheckCircle } from "react-icons/fi";
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
  Waiting_on_Customer: "bg-yellow-100 text-yellow-700",
  Waiting_on_Third_Party: "bg-orange-100 text-orange-600",
  Escalated: "bg-red-100 text-red-600",
  On_Hold: "bg-gray-100 text-gray-600",
  Resolved: "bg-green-100 text-green-600",
  Reopened: "bg-pink-100 text-pink-600",
  Closed: "bg-gray-500 text-white",
};

const categories = ["Server Issue", "Website Bug", "Login Issue", "Payment Issue", "Email Issue", "General Support"];

export default function Tickets() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get("customer");
  const agentId = searchParams.get("agent");

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    if (user.role === 'client') {
      navigate('/customer/tickets');
    }
  }, [user, navigate]);

  const [tickets, setTickets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState(location.state?.filterStatus || "All");
  const [filterPriority, setFilterPriority] = useState(location.state?.filterPriority || "All");
  const [filterAgent, setFilterAgent] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterCompany, setFilterCompany] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [loading, setLoading] = useState(true);
  
  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState([]);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (location.state?.filterStatus) setFilterStatus(location.state.filterStatus);
    if (location.state?.filterPriority) setFilterPriority(location.state.filterPriority);
  }, [location.state]);

  useEffect(() => {
    fetchTickets();
    if (user.role === 'admin') fetchAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, agentId]);

  const fetchTickets = async () => {
    try {
      let url = `${process.env.REACT_APP_URL}/tickets`;
      if (customerId) url += `?customer=${customerId}`;
      if (agentId) url += `?agent=${agentId}`;
      
      const res = await axios.get(url, { headers });
      setTickets(res.data);
    } catch (err) {
      console.error("Error fetching tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_URL}/agents`, { headers });
      setAgents(res.data);
    } catch (err) { console.error(err); }
  };

  const handleBulkUpdate = async (status, agent_id) => {
    if (selectedIds.length === 0) return;
    try {
      await axios.post(`${process.env.REACT_APP_URL}/tickets/bulk-update`, 
        { ticketIds: selectedIds, status, agent_id }, { headers });
      setSelectedIds([]);
      fetchTickets();
      alert("Bulk update successful!");
    } catch (err) {
      alert("Bulk update failed");
    }
  };

  const exportToCSV = () => {
    const data = filtered.map(t => ({
      ID: t.ticket_no,
      Title: t.issue_title,
      Company: t.company || "",
      Priority: t.priority,
      Status: t.status,
      Agent: t.agent?.full_name || "Unassigned",
      Date: new Date(t.created_at).toLocaleDateString()
    }));
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => Object.values(row).join(",")).join("\n");
    const blob = new Blob([`${headers}\n${rows}`], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tickets_export_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) setSelectedIds([]);
    else setSelectedIds(filtered.map(t => t.id));
  };

  const toggleSelect = (id) => {
    if (selectedIds.includes(id)) setSelectedIds(prev => prev.filter(x => x !== id));
    else setSelectedIds(prev => [...prev, id]);
  };

  const filtered = tickets.filter((t) => {
    const matchSearch =
      t.issue_title?.toLowerCase().includes(search.toLowerCase()) ||
      t.company?.toLowerCase().includes(search.toLowerCase()) ||
      t.ticket_no?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || t.status === filterStatus;
    const matchPriority = filterPriority === "All" || t.priority === filterPriority;
    const matchAgent = filterAgent === "All" || t.agent_id === Number(filterAgent);
    const matchCategory = filterCategory === "All" || t.category === filterCategory;
    const matchCompany = !filterCompany || t.company?.toLowerCase().includes(filterCompany.toLowerCase());
    
    let matchDate = true;
    if (dateRange.start && dateRange.end) {
      const d = new Date(t.created_at);
      matchDate = d >= new Date(dateRange.start) && d <= new Date(dateRange.end);
    }

    return matchSearch && matchStatus && matchPriority && matchAgent && matchCategory && matchCompany && matchDate;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-blue-900">All Tickets</h2>
          <p className="text-gray-500 text-sm">
            {filtered.length === 1 ? '1 ticket found' : `${filtered.length} tickets found`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportToCSV}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm font-medium">
            <FiDownload /> Export
          </button>
          <button onClick={() => navigate("/tickets/create")}
            className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition text-sm font-medium">
            <FiPlus /> New Ticket
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white rounded-xl border p-4 mb-5 flex flex-col gap-4">
        <div className="flex gap-3 flex-wrap items-center">
          <div className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2 w-64 focus-within:ring-2 focus-within:ring-blue-100 transition">
            <FiSearch className="text-gray-400" />
            <input type="text" placeholder="Search No, Title, Company..."
              className="outline-none text-sm w-full bg-transparent"
              value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </div>

          <select className="bg-white border rounded-lg px-3 py-2 text-sm outline-none"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="All">All Status</option>
            {Object.keys(statusColor).map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
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

          <select className="bg-white border rounded-lg px-3 py-2 text-sm outline-none"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="All">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {user.role === 'admin' && (
            <select className="bg-white border rounded-lg px-3 py-2 text-sm outline-none"
              value={filterAgent}
              onChange={(e) => setFilterAgent(e.target.value)}>
              <option value="All">All Agents</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
            </select>
          )}

          <button onClick={() => {
            setSearch(""); setFilterStatus("All"); setFilterPriority("All");
            setFilterAgent("All"); setFilterCategory("All"); setFilterCompany("");
            setDateRange({ start: "", end: "" });
          }} className="text-gray-400 hover:text-red-500 p-2" title="Reset Filters">
            <FiSlash size={16} />
          </button>
        </div>

        <div className="flex gap-4 items-center pl-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Date Range</span>
            <input type="date" className="text-xs border rounded p-1" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
            <span className="text-gray-300">to</span>
            <input type="date" className="text-xs border rounded p-1" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-600 text-white p-3 rounded-xl mb-5 flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold">{selectedIds.length} tickets selected</span>
            <div className="h-6 w-px bg-blue-400 mx-2"></div>
            <div className="flex gap-3">
              <div className="flex items-center gap-1 group relative">
                <FiCheckCircle size={16} />
                <select className="bg-transparent text-sm outline-none cursor-pointer border-b border-blue-400"
                  onChange={(e) => handleBulkUpdate(e.target.value, undefined)}>
                  <option className="text-gray-800" value="">Change Status</option>
                  {Object.keys(statusColor).map(s => <option className="text-gray-800" key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              {user.role === 'admin' && (
                <div className="flex items-center gap-1">
                  <FiUserPlus size={16} />
                  <select className="bg-transparent text-sm outline-none cursor-pointer border-b border-blue-400"
                    onChange={(e) => handleBulkUpdate(undefined, e.target.value)}>
                    <option className="text-gray-800" value="">Assign Agent</option>
                    {agents.map(a => <option className="text-gray-800" key={a.id} value={a.id}>{a.full_name}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>
          <button onClick={() => setSelectedIds([])} className="text-xs font-bold hover:underline">Deselect All</button>
        </div>
      )}

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
                <th className="px-4 py-3 text-left">
                  <input type="checkbox" 
                    checked={selectedIds.length === filtered.length && filtered.length > 0} 
                    onChange={toggleSelectAll} 
                  />
                </th>
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
                    <td className="px-4 py-3">
                      <input type="checkbox" 
                        checked={selectedIds.includes(t.id)} 
                        onChange={() => toggleSelect(t.id)} 
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-blue-600 font-medium">{t.ticket_no}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{t.issue_title}</td>
                    <td className="px-4 py-3 text-gray-600">{t.company || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${priorityColor[t.priority]}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${statusColor[t.status]}`}>
                        {t.status?.replace(/_/g, " ")}
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
