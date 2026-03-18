import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiPlus, FiSearch, FiTrash2, FiEdit, FiBriefcase, FiX } from "react-icons/fi";
import axios from "axios";

const BASE = process.env.REACT_APP_URL;

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", role: "agent", specialization: "Level 1 Support", availability: "Online"
  });

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const openAddModal = () => {
    setEditId(null);
    setForm({ full_name: "", email: "", phone: "", role: "agent", specialization: "Level 1 Support", availability: "Online" });
    setShowModal(true);
  };

  const openEditModal = (a) => {
    setEditId(a.id);
    setForm({ 
      full_name: a.full_name, email: a.email, phone: a.phone || "", role: a.role, 
      specialization: a.specialization || "Level 1 Support", availability: a.availability || "Online" 
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await axios.put(`${BASE}/agents/${editId}`, form, { headers });
        alert("✅ Agent updated successfully!");
      } else {
        const res = await axios.post(`${BASE}/agents/invite`, form, { headers });
        alert(`✅ Agent invited successfully!\n\nTemporary Password: ${res.data.invitePassword}\n(Please copy this and send it securely)`);
      }
      setShowModal(false);
      fetchAgents();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save agent");
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
          onClick={openAddModal}
          className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition text-sm font-medium">
          <FiPlus /> Invite Agent
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((a) => (
            <div key={a.id} className="bg-white rounded-xl shadow border border-gray-100 p-6 hover:shadow-lg transition relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-lg">
                    {a.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <Link to={`/agents/${a.id}`} className="font-bold text-gray-800 hover:text-blue-700 hover:underline">
                      {a.full_name}
                    </Link>
                    <p className="text-xs text-gray-400 truncate w-40">{a.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEditModal(a)} className="text-gray-400 hover:text-blue-500 transition"><FiEdit /></button>
                  <button onClick={() => handleDelete(a.id)} className="text-gray-400 hover:text-red-500 transition"><FiTrash2 /></button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 rounded p-2 text-center text-xs">
                  <span className="block text-gray-400 font-medium mb-1">Open Tickets</span>
                  <span className="font-bold text-blue-700 text-lg">{a._count?.tickets || 0}</span>
                </div>
                <div className="bg-gray-50 rounded p-2 text-center text-xs">
                  <span className="block text-gray-400 font-medium mb-1">Status</span>
                  <span className={`inline-block px-2 py-0.5 rounded-full font-bold uppercase mt-1 ${
                    a.availability === 'Online' ? 'bg-green-100 text-green-700' :
                    a.availability === 'Busy' ? 'bg-red-100 text-red-700' :
                    a.availability === 'On Leave' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-200 text-gray-700'
                  }`}>
                    {a.availability || "Offline"}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <FiBriefcase className="text-gray-400" /> 
                  <span className="font-medium text-gray-700">{a.specialization}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Agent Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-blue-900">
                {editId ? "Edit Agent" : "Invite Agent"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Full Name *</label>
                <input type="text" required className="border rounded-lg px-4 py-2.5 text-sm w-full outline-none focus:ring-2 focus:ring-blue-400" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Email Address *</label>
                <input type="email" required className="border rounded-lg px-4 py-2.5 text-sm w-full outline-none focus:ring-2 focus:ring-blue-400" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!editId} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Specialization</label>
                  <select className="border rounded-lg px-4 py-2.5 text-sm w-full outline-none" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })}>
                    <option value="Level 1 Support">Level 1 Support</option>
                    <option value="Level 2 Support">Level 2 Support</option>
                    <option value="Senior Agent">Senior Agent</option>
                    <option value="Network IT">Network IT</option>
                    <option value="Hardware IT">Hardware IT</option>
                    <option value="Account Manager">Account Manager</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Status</label>
                  <select className="border rounded-lg px-4 py-2.5 text-sm w-full outline-none" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })}>
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                    <option value="Busy">Busy</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>
              </div>

              {!editId && (
                <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded mt-2 border border-blue-100 flex items-start gap-2">
                  <span>ℹ️</span> 
                  A temporary password will be auto-generated and securely provided to you upon inviting the agent.
                </div>
              )}

              <div className="flex gap-3 pt-2 mt-2 border-t pt-4">
                <button type="submit" className="flex-1 bg-blue-700 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-800 transition text-sm">
                  {editId ? "Save Changes" : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
