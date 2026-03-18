import { useState, useRef, useEffect } from "react";
import { FiPlus, FiSearch, FiEdit, FiTrash2, FiX, FiExternalLink, FiUpload, FiUser } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const BASE = process.env.REACT_APP_URL;

export default function Customers() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: "", company: "", email: "", phone: "", type: "Monthly", status: "Active", notes: "", portal_login: false
  });

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setForm({ name: "", company: "", email: "", phone: "", type: "Monthly", status: "Active", notes: "", portal_login: false });
    setShowModal(true);
  };

  const openEditModal = (c) => {
    setEditId(c.id);
    setForm({ name: c.name, company: c.company || "", email: c.email || "", phone: c.phone || "", type: c.type || "Monthly", status: c.status || "Active", notes: c.notes || "", portal_login: false });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await axios.put(`${BASE}/customers/${editId}`, form, { headers });
        alert("✅ Customer updated!");
      } else {
        const res = await axios.post(`${BASE}/customers`, form, { headers });
        if (res.data.generatedPassword) {
          alert(`✅ Customer added!\n\nPortal Login Created!\nEmail: ${form.email}\nTemp Password: ${res.data.generatedPassword}\n\nPlease save this password before closing.`);
        } else {
          alert("✅ Customer added!");
        }
      }
      setShowModal(false);
      setEditId(null);
      setForm({ name: "", company: "", email: "", phone: "", type: "Monthly", status: "Active", notes: "", portal_login: false });
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

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const rows = text.split("\n").filter(row => row.trim() !== "");
      if (rows.length < 2) return alert("Invalid CSV or empty.");

      // Assume header: name,company,email,phone,type,status
      const headersArr = rows[0].split(",").map(h => h.trim().toLowerCase());
      const customersToImport = rows.slice(1).map(row => {
        const values = row.split(",");
        const obj = {};
        headersArr.forEach((h, i) => {
          if (values[i]) obj[h] = values[i].trim();
        });
        return obj;
      }).filter(c => c.name);

      try {
        const res = await axios.post(`${BASE}/customers/import`, { customers: customersToImport }, { headers });
        alert(res.data.message);
        fetchCustomers();
      } catch (err) {
        alert(err.response?.data?.message || "Failed to import customers");
      }
    };
    reader.readAsText(file);
    e.target.value = null; // reset 
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
        <div className="flex items-center gap-3">
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCSV} style={{ display: 'none' }} />
          <button
            onClick={() => fileInputRef.current.click()}
            className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition text-sm font-medium">
            <FiUpload /> Import CSV
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition text-sm font-medium">
            <FiPlus /> Add Customer
          </button>
        </div>
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
                <th className="px-4 py-3 text-left">Status</th>
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
                    <td className="px-4 py-3 font-medium text-blue-700 hover:underline">
                      <Link to={`/customers/${c.id}`} className="flex items-center gap-2">
                        <FiUser /> {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{c.company || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{c.email || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{c.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700`}>
                        {c.type === 'Per-Ticket' || c.type === 'Per_Ticket' ? 'Per-Ticket' : c.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        c.status === 'Active' ? 'bg-green-100 text-green-700' :
                        c.status === 'Churned' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {c.status || "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => navigate(`/tickets?customer=${c.id}`)}
                          className="text-blue-600 hover:text-blue-800 transition flex items-center gap-1 text-xs border border-blue-200 px-2 py-1 rounded bg-blue-50">
                          <FiExternalLink /> Tickets
                        </button>
                        <button
                          onClick={() => openEditModal(c)}
                          className="text-gray-500 hover:text-blue-600 transition" title="Edit">
                          <FiEdit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="text-red-400 hover:text-red-600 transition" title="Delete">
                          <FiTrash2 size={16} />
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
                  <option value="Annual">Annual</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Per-Ticket">Per-Ticket</option>
                  <option value="Retainer">Retainer</option>
                  <option value="AMC">AMC</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
                <select
                  className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Churned">Churned</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Internal Notes</label>
                <textarea
                  placeholder="Notes for account managers..."
                  rows={2}
                  className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>

              {!editId && form.email && (
                <div className="flex items-center gap-2 mt-1">
                  <input 
                    type="checkbox" 
                    id="portal_login"
                    checked={form.portal_login}
                    onChange={(e) => setForm({ ...form, portal_login: e.target.checked })}
                  />
                  <label htmlFor="portal_login" className="text-sm text-gray-700 cursor-pointer">
                    Enable Portal Login (Auto-generates password)
                  </label>
                </div>
              )}

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
