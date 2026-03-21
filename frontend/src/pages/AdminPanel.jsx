import { useState, useEffect } from "react";
import { FiUsers, FiFileText, FiSettings, FiShield, FiPlus, FiX } from "react-icons/fi";
import axios from "axios";

const BASE = process.env.REACT_APP_URL || process.env.REACT_APP_API_URL || "http://localhost:5000";
const tabs = ["Overview", "Users", "AMC Contracts", "Billing", "Permissions", "System Logs", "Settings"];

// ─────────────────────────────────────────
// ADMIN OVERVIEW
// ─────────────────────────────────────────
function AdminOverview() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeContracts: 0,
    pendingInvoices: 0,
    adminUsers: 0,
  });

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersRes, contractsRes, invoicesRes] = await Promise.all([
          axios.get(`${BASE}/agents`, { headers }),
          axios.get(`${BASE}/amc`, { headers }),
          axios.get(`${BASE}/api/invoices`, { headers }),
        ]);
        setStats({
          totalUsers: usersRes.data.length,
          activeContracts: contractsRes.data.filter(c => new Date(c.end_date) >= new Date()).length,
          pendingInvoices: invoicesRes.data.filter((i) => i.status === "Pending").length,
          adminUsers: 1,
        });
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    { label: "Total Agents", value: stats.totalUsers, icon: <FiUsers />, color: "bg-blue-600" },
    { label: "Active Contracts", value: stats.activeContracts, icon: <FiFileText />, color: "bg-purple-600" },
    { label: "Pending Invoices", value: stats.pendingInvoices, icon: <FiFileText />, color: "bg-yellow-500" },
    { label: "Admin Users", value: stats.adminUsers, icon: <FiShield />, color: "bg-green-600" },
  ];

  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
            <div className={`${s.color} text-white p-3 rounded-xl text-xl`}>
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{s.value}</p>
              <p className="text-gray-400 text-sm">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="font-semibold text-blue-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Add New Agent", color: "bg-blue-50 text-blue-700 hover:bg-blue-100", href: "/agents" },
            { label: "Create Invoice", color: "bg-green-50 text-green-700 hover:bg-green-100", href: "/billing" },
            { label: "Add AMC Contract", color: "bg-purple-50 text-purple-700 hover:bg-purple-100", href: "/amc" },
          ].map((a) => (
            <button key={a.label}
              onClick={() => window.location.href = a.href}
              className={`${a.color} px-4 py-3 rounded-xl text-sm font-medium transition`}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// AMC CONTRACTS
// ─────────────────────────────────────────
function AMCContracts() {
  const [contracts, setContracts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    customer_id: "", company_name: "", start_date: "",
    end_date: "", monthly_hours: 10, priority_sla: "",
  });

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchContracts();
    fetchCustomers();
  }, []);

  const fetchContracts = async () => {
    try {
      const res = await axios.get(`${BASE}/amc`, { headers });
      setContracts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await axios.get(`${BASE}/customers`, { headers });
      setCustomers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${BASE}/amc`, form, { headers });
      alert("✅ AMC Contract added!");
      setShowModal(false);
      setForm({ customer_id: "", company_name: "", start_date: "", end_date: "", monthly_hours: 10, priority_sla: "" });
      fetchContracts();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add contract");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this contract?")) return;
    try {
      await axios.delete(`${BASE}/amc/${id}`, { headers });
      fetchContracts();
    } catch (err) {
      alert("Failed to delete contract");
    }
  };

  const getBarColor = (used, total) => {
    const pct = (used / total) * 100;
    if (pct >= 90) return "bg-red-500";
    if (pct >= 60) return "bg-yellow-400";
    return "bg-green-500";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-gray-500 text-sm">{contracts.length} contracts</p>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition text-sm font-medium">
          <FiPlus /> Add Contract
        </button>
      </div>

      {loading ? (
        <p className="text-blue-600 text-sm">Loading...</p>
      ) : contracts.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400">
          No AMC contracts yet. Add your first!
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {contracts.map((c) => {
            const pct = Math.min((c.hours_used / c.monthly_hours) * 100, 100);
            return (
              <div key={c.id} className="bg-white rounded-xl shadow p-6 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-bold text-gray-800">{c.company_name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(c.start_date).toLocaleDateString()} –{" "}
                      {new Date(c.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(c.id)}
                    className="text-red-400 hover:text-red-600 text-sm">✕</button>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Hours Used</span>
                    <span>{c.hours_used} / {c.monthly_hours} hrs</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${getBarColor(c.hours_used, c.monthly_hours)}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">SLA:</span>
                  <span className="bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                    {c.priority_sla || "Standard"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-blue-900">Add AMC Contract</h3>
              <button onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Customer *</label>
                <select required
                  className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.customer_id}
                  onChange={(e) => {
                    const c = customers.find((c) => c.id === Number(e.target.value));
                    setForm({ ...form, customer_id: e.target.value, company_name: c?.company || "" });
                  }}>
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} – {c.company}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Company Name</label>
                <input type="text" placeholder="Company name"
                  className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Start Date *</label>
                  <input type="date" required
                    className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">End Date *</label>
                  <input type="date" required
                    className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Monthly Hours</label>
                  <input type="number" min="1"
                    className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    value={form.monthly_hours}
                    onChange={(e) => setForm({ ...form, monthly_hours: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Priority SLA</label>
                  <select
                    className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    value={form.priority_sla}
                    onChange={(e) => setForm({ ...form, priority_sla: e.target.value })}>
                    <option value="">Select SLA</option>
                    <option value="Critical">Critical (2hr)</option>
                    <option value="High">High (4hr)</option>
                    <option value="Standard">Standard (8hr)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit"
                  className="flex-1 bg-blue-700 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-800 transition text-sm">
                  Add Contract
                </button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg font-semibold hover:bg-gray-50 transition text-sm">
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

// ─────────────────────────────────────────
// BILLING PANEL
// ─────────────────────────────────────────
function BillingPanel() {
  const [bills, setBills] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    customer_id: "", hours_used: "", hourly_rate: "", month: ""
  });

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchBills();
    fetchCustomers();
  }, []);

  const fetchBills = async () => {
    try {
      const res = await axios.get(`${BASE}/api/billing`, { headers });
      setBills(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await axios.get(`${BASE}/customers`, { headers });
      setCustomers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const calcTotal = (hours, rate) =>
    (Number(hours) * Number(rate)).toFixed(2);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const total_amount = calcTotal(form.hours_used, form.hourly_rate);
    try {
      await axios.post(`${BASE}/api/billing`, { ...form, total_amount }, { headers });
      alert("✅ Bill created!");
      setShowModal(false);
      setForm({ customer_id: "", hours_used: "", hourly_rate: "", month: "" });
      fetchBills();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create bill");
    }
  };

  const handleGenerateInvoice = async (billing_id) => {
    const invoice_number = "INV" + Date.now().toString().slice(-6);
    try {
      await axios.post(`${BASE}/api/invoices`, { billing_id, invoice_number }, { headers });
      alert(`✅ Invoice ${invoice_number} generated!`);
      fetchBills();
    } catch (err) {
      alert("Failed to generate invoice");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-gray-500 text-sm">{bills.length} billing records</p>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition text-sm font-medium">
          <FiPlus /> Create Bill
        </button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-blue-600">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-blue-50 text-blue-800">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Month</th>
                <th className="px-4 py-3 text-left">Hours</th>
                <th className="px-4 py-3 text-left">Rate/hr</th>
                <th className="px-4 py-3 text-left">Total</th>
                <th className="px-4 py-3 text-left">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {bills.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-gray-400">
                    No billing records yet
                  </td>
                </tr>
              ) : bills.map((b, i) => (
                <tr key={b.id} className="border-t hover:bg-blue-50 transition">
                  <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {b.customer?.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{b.month}</td>
                  <td className="px-4 py-3 text-gray-600">{b.hours_used} hrs</td>
                  <td className="px-4 py-3 text-gray-600">₹{b.hourly_rate}</td>
                  <td className="px-4 py-3 font-bold text-green-600">₹{b.total_amount}</td>
                  <td className="px-4 py-3">
                    {b.invoices?.length > 0 ? (
                      <span className="bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs font-medium">
                        {b.invoices[0].invoice_number}
                      </span>
                    ) : (
                      <button onClick={() => handleGenerateInvoice(b.id)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium">
                        <FiFileText size={12} /> Generate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-blue-900">Create Bill</h3>
              <button onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Customer *</label>
                <select required
                  className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.customer_id}
                  onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} – {c.company}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Month *</label>
                <input type="month" required max={new Date().toISOString().slice(0,7)}
                  className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.month}
                  onChange={(e) => setForm({ ...form, month: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Hours Used *</label>
                  <input type="number" min="0" step="0.5" required placeholder="e.g. 10"
                    className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    value={form.hours_used}
                    onChange={(e) => setForm({ ...form, hours_used: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Rate/Hour (₹) *</label>
                  <input type="number" min="0" required placeholder="e.g. 500"
                    className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    value={form.hourly_rate}
                    onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} />
                </div>
              </div>

              {form.hours_used && form.hourly_rate && (
                <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm font-medium">
                  💰 Total: <strong>₹{calcTotal(form.hours_used, form.hourly_rate)}</strong>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit"
                  className="flex-1 bg-blue-700 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-800 transition text-sm">
                  Create Bill
                </button>
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg font-semibold hover:bg-gray-50 transition text-sm">
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

// ─────────────────────────────────────────
// USER MANAGEMENT TAB
// ─────────────────────────────────────────

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${BASE}/api/admin/users`, { headers });
      setUsers(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await axios.patch(`${BASE}/api/admin/users/${id}/status`, { is_active: !currentStatus }, { headers });
      fetchUsers();
    } catch (err) { alert("Status toggle failed"); }
  };

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="p-6 border-b flex justify-between items-center">
         <h3 className="font-bold text-blue-900">User & Agent Directory</h3>
         <span className="text-xs text-gray-500 font-medium">Manage IDs, Roles & Access</span>
      </div>
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-bold tracking-wider">
          <tr>
            <th className="px-6 py-4">Name</th>
            <th className="px-6 py-4">Role</th>
            <th className="px-6 py-4">Specialization</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} className="border-t hover:bg-gray-50 transition">
              <td className="px-6 py-4 flex flex-col">
                <span className="font-bold text-gray-800">{u.full_name}</span>
                <span className="text-xs text-gray-400">{u.email}</span>
              </td>
              <td className="px-6 py-4">
                 <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : u.role === 'agent' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                   {u.role}
                 </span>
              </td>
              <td className="px-6 py-4 text-gray-500">{u.specialization || "—"}</td>
              <td className="px-6 py-4">
                 <span className={`w-3 h-3 rounded-full inline-block mr-2 ${u.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                 {u.is_active ? 'Active' : 'Inactive'}
              </td>
              <td className="px-6 py-4">
                <button onClick={() => handleToggleStatus(u.id, u.is_active)} className={`text-xs font-bold ${u.is_active ? 'text-red-600' : 'text-green-600'} hover:underline`}>
                  {u.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────
// SYSTEM LOGS TAB
// ─────────────────────────────────────────

function SystemLogs() {
  const [logs, setLogs] = useState([]);
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await axios.get(`${BASE}/api/admin/logs`, { headers });
        setLogs(res.data);
      } catch (err) { console.error(err); }
    };
    fetchLogs();
  }, []);

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="p-6 border-b">
         <h3 className="font-bold text-blue-900">Audit Trail & System Logs</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-blue-900 text-white uppercase text-[10px] font-bold tracking-widest">
            <tr>
              <th className="px-6 py-4">Timestamp</th>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Action</th>
              <th className="px-6 py-4">Details</th>
              <th className="px-6 py-4">IP Address</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id} className="border-t hover:bg-gray-50 transition font-mono">
                <td className="px-6 py-4 text-gray-400">{new Date(l.created_at).toLocaleString()}</td>
                <td className="px-6 py-4 font-bold text-blue-800">{l.user?.full_name || "System"}</td>
                <td className="px-6 py-4 text-gray-800">{l.action}</td>
                <td className="px-6 py-4 text-gray-500 italic max-w-xs truncate">{l.details || "—"}</td>
                <td className="px-6 py-4 text-gray-400">{l.ip_address}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────
function Settings() {
  const [form, setForm] = useState({
    company_name: "Linotec IT Solutions",
    email: "support@linotec.com",
    phone: "+91 98765 43210",
    hourly_rate: "500",
  });

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const handleBackup = async () => {
    try {
      const res = await axios.get(`${BASE}/api/admin/backup`, { headers, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'linotec_backup.json');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) { alert("Backup failed"); }
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="font-semibold text-blue-900 mb-5">Company Branding</h3>
        <div className="flex flex-col gap-4">
          {[
            { label: "Company Name", key: "company_name" },
            { label: "Support Email", key: "email" },
            { label: "Phone Number", key: "phone" },
            { label: "Default Hourly Rate (₹)", key: "hourly_rate" },
          ].map((f) => (
            <div key={f.key}>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{f.label}</label>
              <input type="text"
                className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            </div>
          ))}
          <button className="bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-800 transition w-fit mt-2">
            Save Settings
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
         <h3 className="font-semibold text-blue-900 mb-5">Security & Maintenance</h3>
         <div className="flex flex-col gap-4">
            <div className="p-4 border border-dashed border-gray-200 rounded-xl">
               <h4 className="text-sm font-bold text-gray-800 mb-1">Full Data Export</h4>
               <p className="text-xs text-gray-400 mb-3">Download a raw JSON dump of all tickets, customers, and contracts.</p>
               <button onClick={handleBackup} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-200 transition">
                  Generate Cloud Backup (.JSON)
               </button>
            </div>
            <div className="p-4 border border-dashed border-gray-200 rounded-xl">
               <h4 className="text-sm font-bold text-gray-800 mb-1">SLA Configuration</h4>
               <p className="text-xs text-gray-400 mb-3">Configure global resolution timers for Priority tiers.</p>
               <button className="text-blue-600 text-xs font-bold hover:underline">Edit SLA Tiers</button>
            </div>
         </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// PERMISSION ENGINE
// ─────────────────────────────────────────
function AdminPermissions() {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const res = await axios.get(`${BASE}/api/admin/permissions`, { headers });
      setPermissions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      alert("Error fetching permissions. Check backend connection.");
    }
    finally { setLoading(false); }
  };

  const seedPermissions = async () => {
    if (!window.confirm("Initialize default permission matrix?")) return;
    try {
      setLoading(true);
      await axios.post(`${BASE}/api/admin/permissions/seed`, {}, { headers });
      alert("✅ Permissions seeded successfully!");
      fetchPermissions();
    } catch (err) {
      alert("Seeding failed: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (id, currentStatus) => {
    try {
      await axios.patch(`${BASE}/api/admin/permissions/${id}`, { is_enabled: !currentStatus }, { headers });
      fetchPermissions();
    } catch (err) { alert("Failed to update permission"); }
  };

  const agentPerms = permissions.filter(p => p.role === 'agent');
  const clientPerms = permissions.filter(p => p.role === 'client');

  const PermissionRow = ({ p }) => (
    <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition border-b last:border-0 border-gray-100">
      <div className="flex-1">
        <p className="font-bold text-gray-800 text-sm tracking-tight">{p.permission_key.replace(/_/g, " ").toUpperCase()}</p>
        <p className="text-[10px] text-gray-400 font-medium">Last updated by {p.updated_by?.full_name || "System"}</p>
      </div>
      <button 
        onClick={() => togglePermission(p.id, p.is_enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${p.is_enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${p.is_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <div>
      {/* Seed Button for empty state */}
      {!loading && agentPerms.length === 0 && clientPerms.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8 text-center">
          <p className="text-yellow-700 font-bold mb-3 italic">Permission table is currently empty.</p>
          <button onClick={seedPermissions} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg">
            Initialize Default Permissions
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Agent Permissions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-blue-900 text-white p-5">
             <h3 className="text-lg font-black uppercase tracking-widest text-center">Support Team Access</h3>
             <p className="text-[10px] text-blue-200 text-center uppercase font-bold mt-1">Control Agent Capabilities</p>
          </div>
          <div className="divide-y divide-gray-50 min-h-[100px]">
            {loading ? (
              <p className="p-10 text-center text-blue-600 font-bold">Scanning...</p>
            ) : agentPerms.length > 0 ? (
              agentPerms.map(p => <PermissionRow key={p.id} p={p} />)
            ) : (
              <p className="p-10 text-center text-gray-400 text-sm">No agent permissions found.</p>
            )}
          </div>
        </div>

        {/* Client Permissions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-blue-600 text-white p-5">
             <h3 className="text-lg font-black uppercase tracking-widest text-center">Customer Portal Access</h3>
             <p className="text-[10px] text-blue-100 text-center uppercase font-bold mt-1">Control Portal Visibility</p>
          </div>
          <div className="divide-y divide-gray-50 min-h-[100px]">
             {loading ? (
               <p className="p-10 text-center text-blue-600 font-bold">Scanning...</p>
             ) : clientPerms.length > 0 ? (
               clientPerms.map(p => <PermissionRow key={p.id} p={p} />)
             ) : (
               <p className="p-10 text-center text-gray-400 text-sm">No portal permissions found.</p>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN ADMIN PANEL
// ─────────────────────────────────────────
export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("Overview");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-blue-900">Admin Panel</h2>
        <p className="text-gray-400 text-sm">Manage your system settings and configurations</p>
      </div>

      {/* Admin Info Card */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 rounded-2xl p-6 mb-6 text-white flex items-center gap-5">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl font-bold border-2 border-white/30">
          {user.full_name?.charAt(0) || "A"}
        </div>
        <div className="flex-1">
          <p className="text-xl font-bold">{user.full_name || "Admin"}</p>
          <p className="text-blue-200 text-sm">{user.email}</p>
          <span className="bg-white/20 text-white text-[10px] uppercase font-black px-3 py-1 rounded-md mt-1 inline-block tracking-widest">
            🛡️ {user.role?.toUpperCase()} ACCESS
          </span>
        </div>
        <div className="hidden md:block">
           <p className="text-white text-xs font-bold bg-green-500/50 px-3 py-1 rounded-full border border-green-400/50">SYSTEM ONLINE</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white rounded-xl shadow p-1 w-fit border border-gray-100">
        {tabs.map((tab) => (
          <button key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition
              ${activeTab === tab
                ? "bg-blue-700 text-white shadow-lg"
                : "text-gray-400 hover:text-blue-700"}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in duration-500">
        {activeTab === "Overview" && <AdminOverview />}
        {activeTab === "Users" && <UserManagement />}
        {activeTab === "AMC Contracts" && <AMCContracts />}
        {activeTab === "Billing" && <BillingPanel />}
        {activeTab === "Permissions" && <AdminPermissions />}
        {activeTab === "System Logs" && <SystemLogs />}
        {activeTab === "Settings" && <Settings />}
      </div>
    </div>
  );
}
