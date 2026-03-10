import { useState, useEffect } from "react";
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiX } from "react-icons/fi";
import axios from "axios";

const BASE = process.env.REACT_APP_URL;

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: "", company: "", email: "", phone: "", type: "Monthly"
  });

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await axios.get(`${BASE}/customers`, { headers });
      setCustomers(res.data);
    } catch (err) {
      console.error("Error fetching customers:", err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditId(null);
    setForm({ name: "", company: "", email: "", phone: "", type: "Monthly" });
    setShowModal(true);
  };

  const openEditModal = (c) => {
    setEditId(c.id);
    setForm({ name: c.name, company: c.company, email: c.email, phone: c.phone, type: c.type });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await axios.put(`${BASE}/customers/${editId}`, form, { headers });
        alert("✅ Customer updated!");
      } else {
        await axios.post(`${BASE}/customers`, form, { headers });
        alert("✅ Customer added!");
      }
      setShowModal(false);
      setEditId(null);
      setForm({ name: "", company: "", email: "", phone: "", type: "Monthly" });
      fetchCustomers();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save customer");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this customer?")) return;
    try {
      await axios.delete(`${BASE}/customers/${id}`, { headers });
      fetchCustomers();
    } catch (err) {
      alert("Failed to delete customer");
    }
  };

  const filtered = customers.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-blue-900">Customers</h2>
          <p className="text-gray-400 text-sm">{filtered.length} customers found</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition text-sm font-medium">
          <FiPlus /> Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 w-72 mb-5">
        <FiSearch className="text-gray-400" />
        <input
          type="text"
          placeholder="Search customers..."
          className="outline-none text-sm w-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-blue-600">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-blue-50 text-blue-800">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-gray-400">
                    No customers found. Add your first customer!
                  </td>
                </tr>
              ) : (
                filtered.map((c, i) => (
                  <tr key={c.id} className="border-t hover:bg-blue-50 transition">
                    <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                    <td className="px-4 py-3 text-gray-600">{c.company || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{c.email || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{c.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium
                        ${c.type === "AMC"
                          ? "bg-purple-100 text-purple-600"
                          : "bg-blue-100 text-blue-600"}`}>
                        {c.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEditModal(c)}
                          className="text-blue-500 hover:text-blue-700 transition">
                          <FiEdit size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="text-red-400 hover:text-red-600 transition">
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">

            {/* Modal Header */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-blue-900">
                {editId ? "Edit Customer" : "Add Customer"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Name *</label>
                <input
                  type="text"
                  placeholder="Customer name"
                  required
                  className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Company</label>
                <input
                  type="text"
                  placeholder="Company name"
                  className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
                <input
                  type="email"
                  placeholder="Email address"
                  className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Phone</label>
                <input
                  type="tel"
                  placeholder="Phone number"
                  className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Customer Type</label>
                <select
                  className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="Monthly">Monthly</option>
                  <option value="AMC">AMC</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-700 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-800 transition text-sm">
                  {editId ? "Update Customer" : "Add Customer"}
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
