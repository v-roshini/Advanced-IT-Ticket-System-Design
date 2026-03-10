import { useState, useEffect } from "react";
import { FiPlus, FiSearch, FiX } from "react-icons/fi";
import axios from "axios";

const BASE = process.env.REACT_APP_URL;

export default function AMCContracts() {
  const [contracts, setContracts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    customer_id: "",
    company_name: "",
    start_date: "",
    end_date: "",
    monthly_hours: 10,
    priority_sla: "",
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
      console.error("Fetch contracts error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await axios.get(`${BASE}/customers`, { headers });
      setCustomers(res.data);
    } catch (err) {
      console.error("Fetch customers error:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ Validate dates
    if (new Date(form.end_date) <= new Date(form.start_date)) {
      alert("End date must be after start date!");
      return;
    }

    try {
      await axios.post(`${BASE}/amc`, {
        customer_id: form.customer_id,
        company_name: form.company_name,
        start_date: form.start_date,   // "2026-03-01" format ✅
        end_date: form.end_date,     // "2027-03-01" format ✅
        monthly_hours: form.monthly_hours,
        priority_sla: form.priority_sla,
      }, { headers });

      alert("✅ AMC Contract added!");
      setShowModal(false);
      resetForm();
      fetchContracts();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add contract");
    }
  };

  const resetForm = () => {
    setForm({
      customer_id: "",
      company_name: "",
      start_date: "",
      end_date: "",
      monthly_hours: 10,
      priority_sla: "",
    });
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

  // ✅ Safe date formatting — avoids timezone shift
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",   // ← prevents day shifting
    });
  };

  const getBarColor = (used, total) => {
    const pct = (used / total) * 100;
    if (pct >= 90) return "bg-red-500";
    if (pct >= 60) return "bg-yellow-400";
    return "bg-green-500";
  };

  // ✅ Check if contract is expired
  const isExpired = (endDate) => new Date(endDate) < new Date();

  const filtered = contracts.filter((c) =>
    c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.customer?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-blue-900">AMC Contracts</h2>
          <p className="text-gray-400 text-sm">{filtered.length} contracts</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition text-sm font-medium">
          <FiPlus /> Add Contract
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 w-72 mb-5">
        <FiSearch className="text-gray-400" />
        <input
          type="text"
          placeholder="Search contracts..."
          className="outline-none text-sm w-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Cards */}
      {loading ? (
        <p className="text-blue-600 text-sm">Loading contracts...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400">
          No AMC contracts found. Add your first contract!
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {filtered.map((c) => {
            const pct = c.monthly_hours > 0
              ? Math.min((c.hours_used / c.monthly_hours) * 100, 100)
              : 0;
            const expired = isExpired(c.end_date);

            return (
              <div key={c.id}
                className="bg-white rounded-xl shadow p-6 hover:shadow-md transition">

                {/* Card Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-800">{c.company_name || c.customer?.company}</p>
                      {expired && (
                        <span className="bg-red-100 text-red-500 text-xs px-2 py-0.5 rounded-full">
                          Expired
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(c.start_date)} – {formatDate(c.end_date)}
                    </p>
                    <p className="text-xs text-blue-500 mt-0.5">
                      {c.customer?.name}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-red-400 hover:text-red-600 text-sm transition">
                    ✕
                  </button>
                </div>

                {/* Hours Progress */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Hours Used</span>
                    <span className="font-medium">
                      {c.hours_used} / {c.monthly_hours} hrs
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getBarColor(c.hours_used, c.monthly_hours)}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {c.monthly_hours - c.hours_used} hrs remaining
                  </p>
                </div>

                {/* SLA */}
                <div className="flex justify-between text-xs items-center">
                  <span className="text-gray-500">SLA Priority:</span>
                  <span className="bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                    {c.priority_sla || "Standard"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Contract Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg mx-4">

            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-blue-900">Add AMC Contract</h3>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              {/* Customer */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Customer *</label>
                <select
                  required
                  className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.customer_id}
                  onChange={(e) => {
                    const selected = customers.find((c) => c.id === Number(e.target.value));
                    setForm({
                      ...form,
                      customer_id: e.target.value,
                      company_name: selected?.company || "",
                    });
                  }}>
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} – {c.company}
                    </option>
                  ))}
                </select>
              </div>

              {/* Company Name */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Company Name</label>
                <input
                  type="text"
                  placeholder="Auto-filled from customer"
                  className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Start Date *</label>
                  <input
                    type="date"
                    required
                    className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">End Date *</label>
                  <input
                    type="date"
                    required
                    min={form.start_date}
                    className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>

              {/* Hours + SLA */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Monthly Hours</label>
                  <input
                    type="number"
                    min="1"
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

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-700 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-800 transition text-sm">
                  Add Contract
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
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
