import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FiSearch, FiFilter, FiPlus, FiMessageSquare, FiStar, FiCheckCircle, FiAlertCircle, FiClock, FiDownload } from "react-icons/fi";

const BASE = process.env.REACT_APP_URL;

const statusColor = {
  Open: "bg-blue-100 text-blue-700",
  In_Progress: "bg-purple-100 text-purple-700",
  Resolved: "bg-green-100 text-green-700",
  Closed: "bg-gray-100 text-gray-700",
  Reopened: "bg-orange-100 text-orange-700",
};

export default function CustomerTickets() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await axios.get(`${BASE}/tickets`, { headers });
      setTickets(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filtered = tickets.filter(t => {
    const matchSearch = t.issue_title.toLowerCase().includes(search.toLowerCase()) || t.ticket_no.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'All' || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="pb-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black text-blue-900">My Support Tickets</h2>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Track and manage your requests</p>
        </div>
        <button onClick={() => navigate("/tickets/create")} className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-3 rounded-2xl flex items-center gap-2 transition shadow-lg shadow-blue-100 uppercase tracking-widest text-[10px]">
          <FiPlus /> New Ticket
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-50 p-4 mb-8 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[300px]">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by ticket no or subject..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-100 outline-none text-sm font-medium transition"
          />
        </div>
        <select 
          value={filterStatus} 
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-white border-2 border-gray-50 rounded-2xl px-6 py-3 text-sm font-black text-gray-500 uppercase tracking-widest outline-none cursor-pointer hover:bg-gray-50 transition"
        >
          <option value="All">All Status</option>
          <option value="Open">Open</option>
          <option value="In_Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      {/* Ticket List */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <p className="text-center py-20 text-blue-600 font-black animate-pulse uppercase tracking-[0.2em]">Retrieving your history...</p>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-gray-100">
            <FiMessageSquare size={60} className="mx-auto mb-4 text-gray-100" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No matching tickets found</p>
          </div>
        ) : filtered.map((t) => (
          <div 
            key={t.id} 
            onClick={() => navigate(`/tickets/${t.id}`)}
            className="bg-white rounded-3xl p-6 shadow-sm border border-gray-50 hover:shadow-md hover:-translate-y-1 transition group cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
          >
            <div className="flex items-center gap-4 flex-1">
               <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-black text-xs shadow-inner">
                  {t.ticket_no.slice(-2)}
               </div>
               <div>
                  <h3 className="font-black text-gray-800 tracking-tight text-lg group-hover:text-blue-600 transition">{t.issue_title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                     <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest font-mono">#{t.ticket_no}</span>
                     <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                     <span className="text-[10px] text-gray-400 font-bold uppercase">{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-6">
               <div className="text-right hidden md:block">
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Assigned Support</p>
                  <p className="text-xs font-bold text-gray-800">{t.agent?.full_name || "Unassigned"}</p>
               </div>
               
               <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${statusColor[t.status]}`}>
                  {t.status.replace("_", " ")}
               </div>

               <div className="flex gap-2">
                  <button className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition"><FiMessageSquare size={16}/></button>
                  {t.status === 'Resolved' && (
                    <button className="p-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition flex items-center gap-2 font-black text-[9px] uppercase tracking-widest">
                       <FiCheckCircle size={14}/> Approve
                    </button>
                  )}
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
