import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FiPlus, FiFileText, FiDollarSign, FiZap, FiCheckCircle,
  FiClock, FiAlertCircle, FiMessageSquare, FiTrendingUp,
  FiRefreshCw, FiArrowRight, FiStar, FiBell
} from "react-icons/fi";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

const BASE = process.env.REACT_APP_URL;
const PIE_COLORS = ["#3B82F6", "#8B5CF6", "#22C55E", "#94A3B8"];

const statusColor = {
  Open: "bg-blue-100 text-blue-700",
  In_Progress: "bg-purple-100 text-purple-700",
  Resolved: "bg-green-100 text-green-700",
  Closed: "bg-gray-100 text-gray-600",
  Reopened: "bg-orange-100 text-orange-700",
  Waiting_on_Customer: "bg-yellow-100 text-yellow-700",
};

const priorityDot = {
  Critical: "bg-red-500",
  High: "bg-orange-400",
  Medium: "bg-yellow-400",
  Low: "bg-green-400",
};

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [billing, setBilling] = useState([]);
  const [renewals, setRenewals] = useState([]);
  const [amc, setAmc] = useState(null);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tRes, bRes, rRes, cRes] = await Promise.all([
        axios.get(`${BASE}/tickets`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${BASE}/api/billing`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${BASE}/renewals`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${BASE}/amc`, { headers }).catch(() => ({ data: [] })),
      ]);
      setTickets(tRes.data);
      setBilling(bRes.data);
      setRenewals(rRes.data);
      setAmc(cRes.data[0] || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── KPIs ──────────────────────────────
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const openCount      = tickets.filter(t => t.status === "Open").length;
  const inProgCount    = tickets.filter(t => t.status === "In_Progress").length;
  const resolvedCount  = tickets.filter(t => t.status === "Resolved" && new Date(t.updated_at || t.created_at) >= thisMonthStart).length;
  const pendingBills   = billing.filter(b => !b.invoices?.[0]?.is_paid);
  const pendingTotal   = pendingBills.reduce((s, b) => s + (b.total_amount || 0), 0);

  // AMC
  const amcHoursUsed = amc?.hours_used || 0;
  const amcHoursTotal = amc?.monthly_hours || 0;
  const amcRemaining = Math.max(0, amcHoursTotal - amcHoursUsed);
  const amcPct = amcHoursTotal > 0 ? Math.min(100, Math.round((amcHoursUsed / amcHoursTotal) * 100)) : 0;

  // Next renewal
  const upcoming = renewals
    .filter(r => new Date(r.expiry_date) >= now)
    .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
  const nextRenewal = upcoming[0];
  const daysLeft = nextRenewal
    ? Math.ceil((new Date(nextRenewal.expiry_date) - now) / 86400000)
    : null;

  // Expiring ≤ 30 days
  const expiringRenewals = renewals.filter(r => {
    const d = Math.ceil((new Date(r.expiry_date) - now) / 86400000);
    return d >= 0 && d <= 30;
  });

  // ── Chart Data ─────────────────────────
  // Last 6 months bar chart
  const monthMap = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("en-US", { month: "short" });
    monthMap[label] = 0;
  }
  tickets.forEach(t => {
    const d = new Date(t.created_at);
    if ((now - d) / 86400000 <= 180) {
      const label = d.toLocaleDateString("en-US", { month: "short" });
      if (monthMap[label] !== undefined) monthMap[label]++;
    }
  });
  const trendData = Object.entries(monthMap).map(([name, count]) => ({ name, count }));

  const statusData = [
    { name: "Open", value: openCount },
    { name: "In Progress", value: inProgCount },
    { name: "Resolved", value: tickets.filter(t => t.status === "Resolved").length },
    { name: "Closed", value: tickets.filter(t => t.status === "Closed").length },
  ].filter(d => d.value > 0);

  const recentTickets = [...tickets].slice(0, 5);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-blue-900 font-black uppercase tracking-widest text-xs animate-pulse">Initialising Your Portal...</p>
      </div>
    </div>
  );

  return (
    <div className="pb-10 max-w-[1400px] mx-auto">

      {/* ── Header ── */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">Customer Portal</p>
          <h1 className="text-3xl font-black text-blue-900 tracking-tight">
            Welcome back, <span className="text-blue-600">{user.full_name?.split(" ")[0]}</span> 👋
          </h1>
          <p className="text-gray-400 text-xs mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {expiringRenewals.length > 0 && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-2 rounded-2xl flex items-center gap-2 text-xs font-black uppercase tracking-widest animate-pulse">
              <FiBell size={14} /> {expiringRenewals.length} Renewal{expiringRenewals.length > 1 ? "s" : ""} Expiring Soon
            </div>
          )}
          <button
            onClick={() => navigate("/tickets/create")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-3 rounded-2xl flex items-center gap-2 transition shadow-lg shadow-blue-200 uppercase tracking-widest text-xs"
          >
            <FiPlus /> Raise Ticket
          </button>
        </div>
      </div>

      {/* ── KPI Row 1: Tickets ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {[
          { label: "Open Tickets",        value: openCount,     icon: <FiClock />,        bg: "from-blue-500 to-blue-600",    light: "bg-blue-50 text-blue-600"   },
          { label: "In Progress",         value: inProgCount,   icon: <FiTrendingUp />,   bg: "from-violet-500 to-purple-600",light: "bg-purple-50 text-purple-600"},
          { label: "Resolved This Month", value: resolvedCount, icon: <FiCheckCircle />,  bg: "from-emerald-500 to-green-600",light: "bg-green-50 text-green-600"  },
          { label: "Pending Invoices",    value: pendingBills.length, icon: <FiDollarSign />, bg: "from-rose-500 to-red-600", light: "bg-red-50 text-red-600"     },
        ].map((k, i) => (
          <div
            key={k.label}
            className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-5 hover:shadow-lg hover:-translate-y-1 transition-all group cursor-pointer"
          >
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${k.bg} flex items-center justify-center text-white text-xl shadow-lg flex-shrink-0 group-hover:scale-110 transition`}>
              {k.icon}
            </div>
            <div>
              <p className="text-3xl font-black text-gray-900 tracking-tighter">{k.value}</p>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── KPI Row 2: AMC + Next Renewal + Balance ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">

        {/* AMC Meter */}
        <div className="bg-gradient-to-br from-blue-900 to-blue-700 rounded-3xl p-8 text-white relative overflow-hidden">
          <FiZap className="absolute -top-4 -right-4 text-[120px] text-white/5" />
          <p className="text-blue-200 text-[9px] font-black uppercase tracking-widest mb-1 flex items-center gap-2">
            <FiCheckCircle size={10}/> AMC Monthly Usage
          </p>
          {amcHoursTotal > 0 ? (
            <>
              <div className="flex items-baseline gap-2 mt-2 mb-6">
                <span className="text-5xl font-black tracking-tighter">{amcRemaining}</span>
                <span className="text-blue-200 font-bold">/ {amcHoursTotal} hrs</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-black uppercase text-blue-200">
                  <span>Consumption</span><span>{amcPct}%</span>
                </div>
                <div className="h-2.5 bg-blue-950/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${amcPct > 80 ? "bg-red-400" : amcPct > 60 ? "bg-orange-400" : "bg-emerald-400"}`}
                    style={{ width: `${amcPct}%` }}
                  />
                </div>
                <p className="text-blue-300 text-[9px] font-medium">Resets on the 1st of next month</p>
              </div>
            </>
          ) : (
            <div className="mt-4">
              <p className="text-blue-200 text-sm font-bold">No AMC contract found</p>
              <p className="text-blue-300 text-xs mt-1">Contact us to setup your AMC plan</p>
            </div>
          )}
        </div>

        {/* Next Renewal */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
            <FiRefreshCw className="text-orange-500" size={12}/> Next Critical Renewal
          </p>
          {nextRenewal ? (
            <div className="flex-1">
              <p className="text-xl font-black text-blue-900 leading-tight mb-1 truncate">{nextRenewal.asset_name?.split(" - ")[0]}</p>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-4">{nextRenewal.category}</p>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${daysLeft <= 7 ? "bg-red-100 text-red-600 animate-pulse" : daysLeft <= 30 ? "bg-orange-100 text-orange-600" : "bg-blue-50 text-blue-600"}`}>
                  <FiClock size={10}/> {daysLeft} Days Left
                </span>
                <span className="text-xs font-bold text-gray-500">₹{nextRenewal.cost?.toLocaleString()}</span>
              </div>
              {upcoming.length > 1 && (
                <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest mt-4">+{upcoming.length - 1} more upcoming</p>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center">
              <FiCheckCircle size={36} className="text-green-300 mb-3"/>
              <p className="text-sm font-bold text-gray-400">All assets up to date!</p>
            </div>
          )}
          <button
            onClick={() => navigate("/customer/renewals")}
            className="mt-6 w-full border-2 border-dashed border-gray-200 text-gray-400 font-black py-3 rounded-2xl text-[9px] uppercase tracking-widest hover:border-blue-400 hover:text-blue-600 transition flex items-center justify-center gap-2"
          >
            View All Assets <FiArrowRight size={11}/>
          </button>
        </div>

        {/* Outstanding Invoice */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
            <FiAlertCircle className={pendingTotal > 0 ? "text-red-500 animate-pulse" : "text-gray-300"} size={12}/> Balance Outstanding
          </p>
          <div className="flex-1">
            <p className={`text-4xl font-black tracking-tighter ${pendingTotal > 0 ? "text-red-600" : "text-gray-800"}`}>
              ₹{pendingTotal.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-tight mt-1">
              {pendingBills.length > 0 ? `Due from ${pendingBills.length} invoice${pendingBills.length > 1 ? "s" : ""}` : "All invoices settled ✓"}
            </p>
            {pendingTotal > 0 && (
              <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-3">
                <FiAlertCircle className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600 font-bold">Payment overdue. Please clear to avoid service interruption.</p>
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => navigate("/customer/billing")} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black py-3 rounded-2xl text-[9px] uppercase tracking-widest transition">
              View Statement
            </button>
            {pendingTotal > 0 && (
              <button className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-2xl text-[9px] uppercase tracking-widest transition shadow-lg shadow-red-100">
                Pay Now
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-6">

        {/* Ticket Trend Bar Chart – 3/5 */}
        <div className="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest">Ticket Trend</h3>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Last 6 months</p>
            </div>
          </div>
          {trendData.some(d => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trendData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: "#9CA3AF" }} dy={8}/>
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: "#9CA3AF" }} allowDecimals={false}/>
                <Tooltip
                  cursor={{ fill: "#EFF6FF" }}
                  contentStyle={{ borderRadius: 16, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", fontSize: 12 }}
                  formatter={v => [`${v} tickets`, "Count"]}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[10, 10, 0, 0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex flex-col items-center justify-center text-gray-200">
              <FiFileText size={48} className="mb-3"/>
              <p className="text-gray-400 font-bold text-sm">No ticket history yet</p>
            </div>
          )}
        </div>

        {/* Status Donut – 2/5 */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col">
          <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest mb-1">Status Breakdown</h3>
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-2">All time</p>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="45%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                  {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 16, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}/>
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 900 }}/>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-200">
              <FiCheckCircle size={48}/><p className="mt-3 text-gray-400 font-bold text-sm">No tickets yet</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Tickets + Upcoming Renewals ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">

        {/* Recent Tickets – 2/3 */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest">Recent Tickets</h3>
            <button onClick={() => navigate("/customer/tickets")} className="text-[9px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest flex items-center gap-1 transition">
              View All <FiArrowRight size={10}/>
            </button>
          </div>
          {recentTickets.length === 0 ? (
            <div className="p-10 text-center">
              <FiMessageSquare size={40} className="mx-auto text-gray-200 mb-3"/>
              <p className="text-gray-400 font-bold text-sm">No tickets yet</p>
              <button onClick={() => navigate("/tickets/create")} className="mt-4 bg-blue-600 text-white font-black px-5 py-2 rounded-2xl text-xs uppercase tracking-widest hover:bg-blue-700 transition">
                Raise your first ticket
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentTickets.map(t => (
                <div
                  key={t.id}
                  onClick={() => navigate(`/tickets/${t.id}`)}
                  className="px-6 py-4 hover:bg-blue-50/40 transition cursor-pointer flex items-center gap-4 group"
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[t.priority] || "bg-gray-300"}`}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-gray-800 truncate group-hover:text-blue-700 transition">{t.issue_title}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">#{t.ticket_no} · {new Date(t.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex-shrink-0 ${statusColor[t.status] || "bg-gray-100 text-gray-600"}`}>
                    {t.status?.replace(/_/g, " ")}
                  </span>
                  <FiArrowRight size={12} className="text-gray-300 group-hover:text-blue-400 transition flex-shrink-0"/>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Renewals – 1/3 */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest">Upcoming Renewals</h3>
            <button onClick={() => navigate("/customer/renewals")} className="text-[9px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest flex items-center gap-1 transition">
              All <FiArrowRight size={10}/>
            </button>
          </div>
          {upcoming.length === 0 ? (
            <div className="p-10 text-center">
              <FiCheckCircle size={40} className="mx-auto text-green-200 mb-3"/>
              <p className="text-gray-400 font-bold text-sm">No upcoming renewals</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {upcoming.slice(0, 5).map(r => {
                const d = Math.ceil((new Date(r.expiry_date) - now) / 86400000);
                return (
                  <div key={r.id} className="px-6 py-4 flex items-center gap-3 hover:bg-orange-50/30 transition">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base flex-shrink-0 font-bold text-white ${d <= 7 ? "bg-red-500" : d <= 30 ? "bg-orange-400" : "bg-blue-500"}`}>
                      {d <= 7 ? "!" : d <= 30 ? d : "✓"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-gray-800 truncate">{r.asset_name?.split(" - ")[0]}</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{r.category}</p>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg flex-shrink-0 ${d <= 7 ? "bg-red-100 text-red-600" : d <= 30 ? "bg-orange-100 text-orange-600" : "bg-blue-50 text-blue-600"}`}>
                      {d}d
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Quick Actions</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Raise New Ticket",    icon: <FiPlus size={22}/>,         color: "from-blue-500 to-blue-600",     action: () => navigate("/tickets/create"),      desc: "Create a support request" },
            { label: "My Tickets",          icon: <FiFileText size={22}/>,      color: "from-violet-500 to-purple-600", action: () => navigate("/customer/tickets"),     desc: "View your history" },
            { label: "Renewals",            icon: <FiRefreshCw size={22}/>,     color: "from-orange-400 to-orange-500", action: () => navigate("/customer/renewals"),    desc: "Manage digital assets" },
            { label: "Billing & Invoices",  icon: <FiDollarSign size={22}/>,    color: "from-emerald-500 to-green-600", action: () => navigate("/customer/billing"),     desc: "View statements" },
          ].map(q => (
            <button
              key={q.label}
              onClick={q.action}
              className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all text-left group flex flex-col gap-3"
            >
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${q.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition`}>
                {q.icon}
              </div>
              <div>
                <p className="text-sm font-black text-gray-800">{q.label}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{q.desc}</p>
              </div>
              <FiArrowRight size={14} className="text-gray-300 group-hover:text-blue-500 transition self-end mt-auto"/>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
