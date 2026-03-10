import { useState, useEffect } from "react";
import { FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";
import axios from "axios";

const BASE = process.env.REACT_APP_URL;

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", password: "", role: "agent"
  });

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await axios.get(`${BASE}/agents`, { headers });
      setAgents(res.data);
    } catch (err) {
      console.error("Error fetching agents:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAgent = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${BASE}/auth/register`, {
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: "agent",
      }, { headers });
      alert("✅ Agent added successfully!");
      setShowModal(false);
      setForm({ full_name: "", email: "", phone: "", password: "", role: "agent" });
      fetchAgents();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add agent");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this agent?")) return;
    try {
      await axios.delete(`${BASE}/agents/${id}`, { headers });
      fetchAgents();
    } catch (err) {
      alert("Failed to delete agent");
    }
  };

  const filtered = agents.filter((a) =>
    a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-blue-900">Agents</h2>
          <p className="text-gray-400 text-sm">{filtered.length} agents found</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition text-sm font-medium">
          <FiPlus /> Add Agent
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 w-72 mb-5">
        <FiSearch className="text-gray-400" />
        <input
          type="text"
          placeholder="Search agents..."
          className="outline-none text-sm w-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Agent Cards */}
      {loading ? (
        <p className="text-blue-600 text-sm">Loading agents...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400">
          No agents found. Add your first agent!
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {filtered.map((a) => (
            <div key={a.id} className="bg-white rounded-xl shadow p-6 hover:shadow-md transition">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-700 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {a.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{a.full_name}</p>
                    <p className="text-xs text-gray-400">{a.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="text-red-400 hover:text-red-600 transition">
                  <FiTrash2 size={15} />
                </button>
              </div>

              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Phone:</span>
                <span className="text-gray-700">{a.phone || "—"}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Role:</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
                  {a.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Agent Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-blue-900 mb-5">Add New Agent</h3>
            <form onSubmit={handleAddAgent} className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Full Name *"
                required
                className="border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })} />

              <input
                type="email"
                placeholder="Email *"
                required
                className="border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />

              <input
                type="tel"
                placeholder="Phone"
                className="border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />

              <input
                type="password"
                placeholder="Password *"
                required
                className="border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} />

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-700 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-800 transition text-sm">
                  Add Agent
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
