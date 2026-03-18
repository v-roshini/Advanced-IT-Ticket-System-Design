import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  FiBell, FiFileText, FiPlus, FiBriefcase, FiAlertCircle, FiCheckCircle, FiClock, FiUsers, FiDollarSign, FiZap
} from "react-icons/fi";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend 
} from 'recharts';

const BASE = process.env.REACT_APP_URL || process.env.REACT_APP_API_URL;

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

const PIE_COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E']; // Critical, High, Medium, Low

export default function Dashboard() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [agents, setAgents] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [billing, setBilling] = useState([]);
  const [renewalsList, setRenewalsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFrame, setTimeFrame] = useState("30"); // "7", "30", "all"

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
     if (user.role === 'client') {
        navigate('/customer/dashboard');
     }
  }, [user, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (user.role === 'client') return; // Do not fetch as client
      
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        
        const [tRes, aRes, cRes, bRes, rRes] = await Promise.all([
          axios.get(`${BASE}/tickets`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${BASE}/agents`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${BASE}/amc`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${BASE}/api/billing`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${BASE}/renewals`, { headers }).catch(() => ({ data: [] }))
        ]);
        
        setTickets(tRes.data);
        setAgents(aRes.data);
        setContracts(cRes.data);
        setBilling(bRes.data);
        setRenewalsList(rRes.data);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // -- CALCULATIONS -- //
  const now = new Date();
  
  // 1. Filter tickets by Timeframe
  const filteredTickets = tickets.filter(t => {
    if (timeFrame === "all") return true;
    const tDate = new Date(t.created_at);
    const diffDays = (now - tDate) / (1000 * 60 * 60 * 24);
    return diffDays <= parseInt(timeFrame);
  });

  // 2. Headline KPIs
  const totalTickets = filteredTickets.length;
  const openTickets = filteredTickets.filter(t => t.status === "Open").length;
  const highPriority = filteredTickets.filter(t => t.priority === "High" || t.priority === "Critical").length;
  const closedTickets = filteredTickets.filter(t => t.status === "Resolved" || t.status === "Closed").length;

  // 3. Trend Chart Data (Group by date)
  const trendDataMap = {};
  filteredTickets.forEach(t => {
    // Format "Mar 15"
    const dateStr = new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (!trendDataMap[dateStr]) {
      trendDataMap[dateStr] = { date: dateStr, Created: 0, Resolved: 0, InProgress: 0, sortKey: new Date(t.created_at).setHours(0,0,0,0) };
    }
    trendDataMap[dateStr].Created += 1;
    if (t.status === "Resolved") trendDataMap[dateStr].Resolved += 1;
    if (t.status === "In_Progress") trendDataMap[dateStr].InProgress += 1;
  });
  const trendData = Object.values(trendDataMap).sort((a, b) => a.sortKey - b.sortKey);

  // 4. Priority Pie Chart
  const priorityData = [
    { name: 'Critical', value: filteredTickets.filter(t => t.priority === "Critical").length },
    { name: 'High', value: filteredTickets.filter(t => t.priority === "High").length },
    { name: 'Medium', value: filteredTickets.filter(t => t.priority === "Medium").length },
    { name: 'Low', value: filteredTickets.filter(t => t.priority === "Low").length }
  ].filter(d => d.value > 0);

  // 5. Agent Workload
  const agentWorkload = agents.map(a => {
    const agentTickets = tickets.filter(t => t.agent_id === a.id);
    const openCount = agentTickets.filter(t => t.status !== "Resolved").length;
    return { ...a, openCount, total: agentTickets.length };
  }).sort((a, b) => b.total - a.total).slice(0, 5);

  // 6. Upcoming Renewals (Contracts + Assets)
  const combinedRenewals = [
    ...contracts.map(c => ({ name: c.company_name || c.customer?.company || "AMC", type: "AMC", end: c.end_date })),
    ...renewalsList.map(r => ({ name: r.asset_name, type: r.category.toUpperCase(), end: r.expiry_date }))
  ];

  const upcomingRenewals = combinedRenewals
    .filter(r => new Date(r.end) >= now)
    .sort((a, b) => new Date(a.end) - new Date(b.end))
    .slice(0, 5);

  // 7. Revenue & SLA
  const currentMonthStr = now.toISOString().slice(0, 7); // YYYY-MM
  const monthlyRevenue = billing
    .filter(b => b.month === currentMonthStr)
    .reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);

  const slaCompliance = totalTickets > 0 ? Math.floor((closedTickets / (totalTickets || 1)) * 100) : 100;

  // -- RENDER -- //
  if (user.role === 'client') return null;

  return (
    <div className="pb-10">
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Welcome back, {user.full_name || "User"}! 👋
          </h2>
          <p className="text-gray-500 text-sm mt-1">Here is your system overview and analytics.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={timeFrame} 
            onChange={(e) => setTimeFrame(e.target.value)}
            className="bg-white border-none shadow-sm rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 outline-none"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>

          <button onClick={() => navigate("/tickets/create")} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg transition text-sm font-medium shadow-sm">
            <FiPlus /> New Ticket
          </button>
          {user.role === 'admin' && (
            <>
              <button onClick={() => navigate("/amc")} className="hidden md:flex items-center gap-2 border bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-lg transition text-sm font-medium shadow-sm">
                <FiBriefcase /> Add Contract
              </button>
              <button onClick={() => navigate("/renewals")} className="hidden md:flex items-center gap-2 border bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-lg transition text-sm font-medium shadow-sm">
                <FiZap /> New Asset
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 text-blue-600"><p>Loading Dashboard...</p></div>
      ) : (
        <>
          {/* Top KPI Cards (Clickable) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <div 
              onClick={() => navigate("/tickets", { state: { filterStatus: "All" } })}
              className="bg-blue-500 rounded-xl p-6 text-white shadow-md hover:-translate-y-1 hover:shadow-lg transition cursor-pointer"
            >
              <div className="flex justify-between items-start mb-2">
                <FiFileText size={24} className="opacity-80" />
              </div>
              <h3 className="text-4xl font-bold mb-1">{totalTickets}</h3>
              <p className="text-sm font-medium opacity-90 tracking-wide">Total Tickets</p>
            </div>

            <div 
              onClick={() => navigate("/tickets", { state: { filterStatus: "Open" } })}
              className="bg-orange-400 rounded-xl p-6 text-white shadow-md hover:-translate-y-1 hover:shadow-lg transition cursor-pointer"
            >
              <div className="flex justify-between items-start mb-2">
                <FiAlertCircle size={24} className="opacity-80" />
              </div>
              <h3 className="text-4xl font-bold mb-1">{openTickets}</h3>
              <p className="text-sm font-medium opacity-90 tracking-wide">Open Tickets</p>
            </div>

            <div 
              onClick={() => navigate("/tickets", { state: { filterPriority: "High" } })}
              className="bg-red-500 rounded-xl p-6 text-white shadow-md hover:-translate-y-1 hover:shadow-lg transition cursor-pointer"
            >
              <div className="flex justify-between items-start mb-2">
                <FiBell size={24} className="opacity-80" />
              </div>
              <h3 className="text-4xl font-bold mb-1">{highPriority}</h3>
              <p className="text-sm font-medium opacity-90 tracking-wide">High / Critical</p>
            </div>

            <div 
              onClick={() => navigate("/tickets", { state: { filterStatus: "Resolved" } })}
              className="bg-green-500 rounded-xl p-6 text-white shadow-md hover:-translate-y-1 hover:shadow-lg transition cursor-pointer"
            >
              <div className="flex justify-between items-start mb-2">
                <FiCheckCircle size={24} className="opacity-80" />
              </div>
              <h3 className="text-4xl font-bold mb-1">{closedTickets}</h3>
              <p className="text-sm font-medium opacity-90 tracking-wide">Closed Tickets</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Trend Chart */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-6">Tickets Over Time</h3>
              <div className="h-72">
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Area type="monotone" dataKey="Created" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorCreated)" />
                      <Area type="monotone" dataKey="Resolved" stroke="#22C55E" strokeWidth={3} fillOpacity={1} fill="url(#colorResolved)" />
                      <Area type="monotone" dataKey="InProgress" stroke="#F59E0B" strokeWidth={3} fillOpacity={0} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">No chart data available for this timeframe.</div>
                )}
              </div>
            </div>

            {/* Priority Donut Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Tickets by Priority</h3>
              <div className="flex-1 min-h-[250px] relative">
                {priorityData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={priorityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {priorityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">No data</div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Agent Workload Table */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 inline-flex items-center gap-2">
                <FiUsers className="text-blue-600" /> Top Performing Agents
              </h3>
              <div className="flex flex-col gap-4">
                {agentWorkload.length > 0 ? agentWorkload.map(a => (
                  <div key={a.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                        {a.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{a.full_name}</p>
                        <p className="text-xs text-gray-500">{a.openCount} open tickets</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-800">{a.total} <span className="text-xs font-normal text-gray-500">Total</span></p>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-gray-400">No agent data found.</p>
                )}
              </div>
            </div>

            {/* Recent Tickets Activity */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800 inline-flex items-center gap-2">
                  <FiClock className="text-blue-600" /> Recent Tickets
                </h3>
                <button onClick={() => navigate("/tickets")} className="text-sm text-blue-600 font-medium hover:underline">View All →</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 rounded-l-lg">ID</th>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 rounded-r-lg">Agent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.slice(0, 5).map(t => (
                      <tr 
                        key={t.id} 
                        onClick={() => navigate(`/tickets/${t.id}`)}
                        className="border-b last:border-0 hover:bg-gray-50 transition cursor-pointer"
                      >
                        <td className="px-4 py-3 font-mono text-blue-600 font-medium">#{t.ticket_no}</td>
                        <td className="px-4 py-3 font-medium text-gray-800">{t.issue_title}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${priorityColor[t.priority]}`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${statusColor[t.status]}`}>
                            {t.status?.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold">
                            {t.agent?.full_name?.charAt(0) || "?"}
                          </div>
                          {t.agent?.full_name || "Unassigned"}
                        </td>
                      </tr>
                    ))}
                    {tickets.length === 0 && (
                      <tr><td colSpan="5" className="px-4 py-6 text-center text-gray-400">No recent tickets</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Bottom Row / Extra Widgets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            
            {/* SLA Compliance */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">SLA Compliance</p>
                <p className="text-3xl font-bold text-gray-800">{slaCompliance}%</p>
                <p className="text-xs text-gray-400 mt-1">Resolution Time vs Target</p>
              </div>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${slaCompliance >= 90 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {slaCompliance >= 90 ? '🎉' : '⚠️'}
              </div>
            </div>

            {/* Revenue */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Monthly Revenue</p>
                <p className="text-3xl font-bold text-green-600">₹{monthlyRevenue.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">Billed this month ({currentMonthStr})</p>
              </div>
              <div className="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center text-green-500">
                <FiDollarSign size={28} />
              </div>
            </div>

            {/* Upcoming Renewals */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
               <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                 <FiBriefcase /> Upcoming Renewals
               </h3>
               <div className="flex flex-col gap-3">
                 {upcomingRenewals.length > 0 ? upcomingRenewals.map((r, index) => {
                   const daysLeft = Math.ceil((new Date(r.end) - now) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={index} className="flex justify-between items-center bg-gray-50/50 p-2 rounded-lg group hover:bg-blue-50 transition">
                        <div>
                          <p className="text-xs font-bold text-gray-800 tracking-tight">{r.name}</p>
                          <p className="text-[9px] text-gray-400 font-black uppercase">{r.type}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${daysLeft <= 14 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                          {daysLeft}d
                        </span>
                      </div>
                    );
                  }) : (
                   <p className="text-xs text-gray-400">No upcoming renewals.</p>
                 )}
               </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
