import { useState, useEffect } from "react";
import { FiPlus, FiX, FiFileText } from "react-icons/fi";
import axios from "axios";

const BASE = process.env.REACT_APP_URL;

export default function BillingPanel() {
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

  const totalAmount = (hours, rate) => (
    (Number(hours) * Number(rate)).toFixed(2)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const total_amount = totalAmount(form.hours_used, form.hourly_rate);
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-blue-900">Billing</h2>
          <p className="text-gray-400 text-sm">{bills.length} billing records</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition text-sm font-medium">
          <FiPlus /> Create Bill
        </button>
      </div>

      {/* Bills Table */}
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
                  <td className="px-4 py-3 font-bold text-green-600">
                    ₹{b.total_amount}
                  </td>
                  <td className="px-4 py-3">
                    {b.invoices?.length > 0 ? (
                      <span className="bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs font-medium">
                        {b.invoices[0].invoice_number}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleGenerateInvoice(b.id)}
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

      {/* Create Bill Modal */}
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
                <input type="month" required
                  className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.month}
                  onChange={(e) => setForm({ ...form, month: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Hours Used *</label>
                  <input type="number" min="0" step="0.5" required
                    placeholder="e.g. 10"
                    className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    value={form.hours_used}
                    onChange={(e) => setForm({ ...form, hours_used: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Rate / Hour (₹) *</label>
                  <input type="number" min="0" required
                    placeholder="e.g. 500"
                    className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    value={form.hourly_rate}
                    onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} />
                </div>
              </div>

              {/* Live Total */}
              {form.hours_used && form.hourly_rate && (
                <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm font-medium">
                  💰 Total Amount: <strong>₹{totalAmount(form.hours_used, form.hourly_rate)}</strong>
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
