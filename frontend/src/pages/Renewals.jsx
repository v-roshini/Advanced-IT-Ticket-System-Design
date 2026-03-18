import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiCalendar, FiList, FiSearch, FiArrowRight, FiCheckCircle, FiAlertCircle, FiClock, FiTrash2, FiEdit2, FiRepeat } from "react-icons/fi";
import axios from "axios";

const BASE = process.env.REACT_APP_URL;

const categoryIcons = {
  domain: "🌐",
  hosting: "☁️",
  email: "📧",
  ssl: "🔒",
  software: "💿",
  firewall: "🛡️",
  amc: "🛠️",
};

const statusColors = {
  active: "bg-green-100 text-green-700",
  expiring_soon: "bg-orange-100 text-orange-700",
  expired: "bg-red-100 text-red-700",
  renewed: "bg-blue-100 text-blue-700",
};

export default function Renewals() {
  const [renewals, setRenewals] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // list or calendar
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    if (user.role === 'client') {
      navigate('/customer/renewals');
    }
  }, [user, navigate]);
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState({
    customer_id: "",
    category: "domain",
    asset_name: "",
    vendor: "",
    purchase_date: "",
    expiry_date: "",
    cost: "",
    currency: "INR",
    auto_renew: false,
    notes: "",
    assigned_agent_id: "",
  });

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchData();
    fetchSupportData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${BASE}/renewals`, { headers });
      setRenewals(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchSupportData = async () => {
    try {
      const [cRes, aRes] = await Promise.all([
        axios.get(`${BASE}/customers`, { headers }),
        axios.get(`${BASE}/agents`, { headers }),
      ]);
      setCustomers(cRes.data);
      setAgents(aRes.data);
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formattedForm = { ...form };
    if (!formattedForm.purchase_date) delete formattedForm.purchase_date;
    
    try {
      if (editId) {
        await axios.put(`${BASE}/renewals/${editId}`, formattedForm, { headers });
        alert("✅ Renewal updated!");
      } else {
        await axios.post(`${BASE}/renewals`, formattedForm, { headers });
        alert("✅ Renewal added!");
      }
      setShowModal(false);
      setEditId(null);
      resetForm();
      fetchData();
    } catch (err) {
      alert("Failed to save renewal record");
    }
  };

  const resetForm = () => {
    setForm({
      customer_id: "",
      category: "domain",
      asset_name: "",
      vendor: "",
      purchase_date: "",
      expiry_date: "",
      cost: "",
      currency: "INR",
      auto_renew: false,
      notes: "",
      assigned_agent_id: "",
    });
  };

  const handleRenew = async (r) => {
    const curExp = new Date(r.expiry_date);
    const SUGGESTED_EXP = new Date(curExp.setFullYear(curExp.getFullYear() + 1)).toISOString().split('T')[0];
    
    const newDate = prompt("Enter new expiry date (YYYY-MM-DD):", SUGGESTED_EXP);
    if (!newDate) return;
    try {
      await axios.post(`${BASE}/renewals/${r.id}/renew`, { new_expiry_date: newDate, new_cost: r.cost }, { headers });
      alert("✅ Renewed successfully!");
      fetchData();
    } catch (err) { alert("Renewal failed"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this renewal permanently?")) return;
    try {
      await axios.delete(`${BASE}/renewals/${id}`, { headers });
      fetchData();
    } catch (err) { alert("Failed to delete"); }
  };

  const stats = {
    total: renewals.length,
    expiring: renewals.filter(r => r.status === 'expiring_soon').length,
    expired: renewals.filter(r => r.status === 'expired').length,
    active: renewals.filter(r => r.status === 'active').length,
  };

  const filtered = renewals.filter(r => {
    const matchSearch = r.asset_name?.toLowerCase().includes(search.toLowerCase()) || r.customer?.name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "All" || r.category === filterCategory;
    const matchStatus = filterStatus === "All" || r.status === filterStatus;
    return matchSearch && matchCat && matchStatus;
  });

  return (
    <div className="pb-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-blue-900">Renewal Manager</h2>
          <p className="text-gray-400 text-sm">Managing client digital assets and expiries</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white border rounded-lg p-1 flex shadow-sm">
            <button onClick={() => setView("list")} className={`p-2 rounded transition ${view === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}><FiList size={18} /></button>
            <button onClick={() => setView("calendar")} className={`p-2 rounded transition ${view === 'calendar' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-50'}`}><FiCalendar size={18} /></button>
          </div>
          <button onClick={() => { setEditId(null); resetForm(); setShowModal(true); }} className="bg-blue-700 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-800 transition flex items-center gap-2 shadow-lg shadow-blue-100">
            <FiPlus /> New Renewal
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {[
          { label: "Total Active", value: stats.active, color: "border-blue-500", icon: <FiCheckCircle className="text-blue-500" /> },
          { label: "Expiring (30d)", value: stats.expiring, color: "border-orange-400", icon: <FiClock className="text-orange-400" /> },
          { label: "Expired Assets", value: stats.expired, color: "border-red-500", icon: <FiAlertCircle className="text-red-500" /> },
          { label: "Total Records", value: stats.total, color: "border-gray-300", icon: <FiList className="text-gray-400" /> },
        ].map((k) => (
          <div key={k.label} className={`bg-white rounded-2xl shadow-sm p-5 border-l-4 ${k.color} hover:shadow-md transition`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{k.label}</p>
                <p className="text-3xl font-black text-blue-900 mt-1">{k.value}</p>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-xl text-xl shadow-inner">{k.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[300px]">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search domain, hosting, customer..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-sm transition" />
        </div>
        
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-white border rounded-lg px-4 py-2 text-sm outline-none cursor-pointer hover:bg-gray-50 transition">
          <option value="All">All Categories</option>
          {Object.keys(categoryIcons).map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
        </select>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-white border rounded-lg px-4 py-2 text-sm outline-none cursor-pointer hover:bg-gray-50 transition">
          <option value="All">All Status</option>
          <option value="active">Active</option>
          <option value="expiring_soon">Expiring Soon</option>
          <option value="expired">Expired</option>
          <option value="renewed">Renewed</option>
        </select>
      </div>

      {/* Content View */}
      {view === "list" ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border">
          <table className="w-full text-sm">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-[10px]">Category</th>
                <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-[10px]">Asset / Domain</th>
                <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-[10px]">Customer</th>
                <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-[10px]">Expiry Date</th>
                <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-[10px]">Cost</th>
                <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-[10px]">Status</th>
                <th className="px-6 py-4 text-right font-black uppercase tracking-widest text-[10px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="7" className="text-center py-16 text-blue-600 font-black animate-pulse">Scanning records...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-20 text-gray-400 italic bg-gray-50/50">
                   <div className="flex flex-col items-center gap-2 opacity-50">
                     <FiList size={40} />
                     <span>No matching renewal records found.</span>
                   </div>
                </td></tr>
              ) : filtered.map((r) => {
                const isOverdue = new Date(r.expiry_date) < new Date();
                return (
                  <tr key={r.id} className="hover:bg-blue-50/30 transition group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <span className="text-xl w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center border group-hover:bg-white transition" title={r.category}>{categoryIcons[r.category]}</span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{r.category}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-800">{r.asset_name}</td>
                    <td className="px-6 py-4">
                       <p className="font-bold text-blue-700">{r.customer?.name}</p>
                       <p className="text-[10px] text-gray-400 font-medium truncate w-32">{r.customer?.company}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className={`font-mono text-xs font-black ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                        {new Date(r.expiry_date).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      {isOverdue && <span className="text-[9px] text-red-500 font-black uppercase">Overdue</span>}
                    </td>
                    <td className="px-6 py-4 font-black text-gray-900 italic">₹{r.cost?.toLocaleString() || 0}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-tight ${statusColors[r.status]}`}>
                        {r.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => handleRenew(r)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition" title="Mark Renewed"><FiRepeat /></button>
                        <button onClick={() => { setEditId(r.id); setForm(r); setShowModal(true); }} className="p-2 text-gray-400 hover:text-blue-600 rounded-lg transition"><FiEdit2 /></button>
                        <button onClick={() => handleDelete(r.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg transition"><FiTrash2 /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-gray-400 border border-gray-100">
          <FiCalendar size={60} className="mx-auto mb-6 opacity-10 text-blue-900" />
          <h4 className="text-gray-800 font-bold text-lg mb-2">Month View Calendar</h4>
          <p className="text-sm max-w-sm mx-auto mb-8">Visualization of renewal deadlines across the current month.</p>
          <div className="grid grid-cols-7 gap-3 mt-8 max-w-2xl mx-auto p-4 bg-gray-50 rounded-2xl border">
             {['S','M','T','W','T','F','S'].map((d, i) => (
               <div key={i} className="text-[10px] font-black text-gray-300 py-1">{d}</div>
             ))}
             {[...Array(30).keys()].map(i => {
               const dayNum = i + 1;
               const hasRenewal = renewals.some(r => new Date(r.expiry_date).getDate() === dayNum && new Date(r.expiry_date).getMonth() === new Date().getMonth());
               return (
                 <div key={i} className={`aspect-square rounded-xl border flex flex-col items-center justify-center text-xs relative transition hover:shadow-inner ${hasRenewal ? 'bg-white border-blue-200 text-blue-700 font-black ring-2 ring-blue-50' : 'bg-white text-gray-400'}`}>
                    {dayNum}
                    {hasRenewal && (
                      <span className="absolute bottom-1.5 w-1.5 h-1.5 bg-blue-600 rounded-full shadow-sm animate-pulse"></span>
                    )}
                 </div>
               );
             })}
          </div>
          <div className="mt-8 flex justify-center gap-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
             <div className="flex items-center gap-2"><span className="w-2.4 h-2 rounded-full bg-blue-600"></span> Expiry Deadlines</div>
             <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-gray-200"></span> No Deadlines</div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-2xl overflow-y-auto max-h-[90vh] border border-white/20">
            <div className="flex justify-between items-center mb-8">
               <div>
                  <h3 className="text-2xl font-black text-blue-900">{editId ? "Update Record" : "New Digital Asset"}</h3>
                  <p className="text-gray-400 text-xs font-medium">Capture details for proactive renewal tracking</p>
               </div>
               <button onClick={() => setShowModal(false)} className="bg-gray-50 p-2 rounded-full text-gray-400 hover:text-red-500 transition"><FiTrash2 size={20}/></button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
              <div className="col-span-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Customer *</label>
                <select required className="w-full bg-gray-50 border rounded-xl p-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 transition" value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})}>
                  <option value="">Select Customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.company}</option>)}
                </select>
              </div>
              <div className="col-span-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Category *</label>
                <select required className="w-full bg-gray-50 border rounded-xl p-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 transition" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                  {Object.keys(categoryIcons).map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Asset Name (Domain/Software) *</label>
                <input required type="text" placeholder="e.g. linotec.solutions" className="w-full bg-gray-50 border rounded-xl p-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 transition font-bold" value={form.asset_name} onChange={e => setForm({...form, asset_name: e.target.value})} />
              </div>
              <div className="col-span-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Vendor / Provider</label>
                <input type="text" placeholder="GoDaddy, Google Cloud, AWS" className="w-full bg-gray-50 border rounded-xl p-3.5 text-sm outline-none" value={form.vendor} onChange={e => setForm({...form, vendor: e.target.value})} />
              </div>
              <div className="col-span-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Annual Market Cost (₹)</label>
                <input type="number" placeholder="599.00" className="w-full bg-gray-50 border rounded-xl p-3.5 text-sm outline-none" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} />
              </div>
              <div className="col-span-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Renewal / Purchase Date</label>
                <input type="date" className="w-full bg-gray-50 border rounded-xl p-3.5 text-sm outline-none" value={form.purchase_date} onChange={e => setForm({...form, purchase_date: e.target.value})} />
              </div>
              <div className="col-span-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Expiry Date *</label>
                <input required type="date" className="w-full bg-gray-50 border rounded-xl p-3.5 text-sm outline-none focus:ring-2 focus:ring-orange-100 transition" value={form.expiry_date} onChange={e => setForm({...form, expiry_date: e.target.value})} />
              </div>
              <div className="col-span-1">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Assigned Account Manager</label>
                <select className="w-full bg-gray-50 border rounded-xl p-3.5 text-sm outline-none" value={form.assigned_agent_id} onChange={e => setForm({...form, assigned_agent_id: e.target.value})}>
                   <option value="">No Agent Assigned</option>
                   {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                </select>
              </div>
              <div className="col-span-1 flex items-center gap-3 mt-4">
                 <div className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="auto_renew" className="sr-only peer" checked={form.auto_renew} onChange={e => setForm({...form, auto_renew: e.target.checked})} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                 </div>
                 <label htmlFor="auto_renew" className="text-xs font-bold text-gray-600">Auto-Renewal Mode</label>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block">Asset Documentation / Notes</label>
                <textarea rows="3" placeholder="Server IPs, SSH keys, Registrar login refs..." className="w-full bg-gray-50 border rounded-xl p-3.5 text-sm outline-none resize-none" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}></textarea>
              </div>

              <div className="col-span-2 flex gap-4 mt-6">
                 <button type="submit" className="flex-1 bg-blue-700 text-white font-black py-4 rounded-2xl hover:bg-blue-900 transition shadow-lg shadow-blue-200 uppercase tracking-widest text-xs">Save Asset Data</button>
                 <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 text-gray-500 font-bold py-4 rounded-2xl hover:bg-gray-200 transition uppercase tracking-widest text-xs">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
