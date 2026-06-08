import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiX, FiFileText, FiDownload, FiDollarSign, FiClock, FiCheckSquare } from "react-icons/fi";
import axios from "axios";

const BASE = process.env.REACT_APP_URL;

export default function Billing() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    if (user.role === 'client') {
      navigate('/customer/billing');
    }
  }, [user, navigate]);

  const [bills, setBills] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [unbilledLogs, setUnbilledLogs] = useState([]);
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    customer_id: "", 
    hours_used: "", 
    hourly_rate: "500", 
    month: "", 
    gst_percentage: "18",
    billing_type: "standard",
    base_amount: "0",
    overage_amount: "0",
    overage_hours: "0"
  });

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const isExpired = (endDate) => new Date(endDate) < new Date();

  useEffect(() => {
    fetchBills();
    fetchCustomers();
    fetchContracts();
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

  const fetchContracts = async () => {
    try {
      const res = await axios.get(`${BASE}/amc`, { headers });
      setContracts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUnbilled = async (cid) => {
    try {
      const res = await axios.get(`${BASE}/api/billing/unbilled/${cid}`, { headers });
      setUnbilledLogs(res.data);
      setSelectedLogs([]);
    } catch (err) { console.error(err); }
  };

  const recalculateAmounts = (logs, currentForm, amc) => {
    let totalHrs = 0;
    logs.forEach(l => {
      const timeStr = String(l.time_spent || "0h");
      const hMatch = timeStr.match(/(\d+)h/);
      if (hMatch) totalHrs += parseInt(hMatch[1], 10);
      const mMatch = timeStr.match(/(\d+)m/);
      if (mMatch) totalHrs += parseInt(mMatch[1], 10) / 60;
    });

    if (currentForm.billing_type === "amc" && amc) {
      const includedHours = amc.monthly_hours || 0;
      const overageHours = Math.max(0, totalHrs - includedHours);
      const overageRate = Number(currentForm.hourly_rate !== undefined ? currentForm.hourly_rate : amc.extra_hour_rate || 0);
      const overageAmount = overageHours * overageRate;
      const baseAmount = Number(currentForm.base_amount !== undefined ? currentForm.base_amount : amc.monthly_base_fee || 0);
      const totalAmount = baseAmount + overageAmount;

      return {
        hours_used: totalHrs.toFixed(2),
        overage_hours: overageHours.toFixed(2),
        overage_amount: overageAmount.toFixed(2),
        total_amount: totalAmount.toFixed(2)
      };
    } else {
      const rate = Number(currentForm.hourly_rate || 500);
      const totalAmount = totalHrs * rate;

      return {
        hours_used: totalHrs.toFixed(2),
        overage_hours: "0",
        overage_amount: "0",
        total_amount: totalAmount.toFixed(2)
      };
    }
  };

  const handleCustomerChange = (cid) => {
    const activeAMC = contracts.find(c => c.customer_id === Number(cid) && !isExpired(c.end_date));
    const btype = activeAMC ? "amc" : "standard";
    const baseAmount = activeAMC ? String(activeAMC.monthly_base_fee || 0) : "0";
    const hourlyRate = activeAMC ? String(activeAMC.extra_hour_rate || 150) : "500";
    
    setForm(prev => ({
      ...prev,
      customer_id: cid,
      billing_type: btype,
      hourly_rate: hourlyRate,
      base_amount: baseAmount,
      hours_used: "0.00",
      overage_hours: "0.00",
      overage_amount: "0.00"
    }));
    setSelectedLogs([]);
    setUnbilledLogs([]);
    if (cid) {
      fetchUnbilled(cid);
    }
  };

  const handleLogToggle = (log) => {
    let newSelected = [];
    if (selectedLogs.find(l => l.id === log.id)) {
      newSelected = selectedLogs.filter(l => l.id !== log.id);
    } else {
      newSelected = [...selectedLogs, log];
    }
    setSelectedLogs(newSelected);
    
    const activeAMC = contracts.find(c => c.customer_id === Number(form.customer_id) && !isExpired(c.end_date));
    const calculated = recalculateAmounts(newSelected, form, activeAMC);
    setForm(prev => ({ 
      ...prev, 
      hours_used: calculated.hours_used,
      overage_hours: calculated.overage_hours,
      overage_amount: calculated.overage_amount
    }));
  };

  const handleInputChange = (field, value) => {
    setForm(prev => {
      const updatedForm = { ...prev, [field]: value };
      const activeAMC = contracts.find(c => c.customer_id === Number(updatedForm.customer_id) && !isExpired(c.end_date));
      const calculated = recalculateAmounts(selectedLogs, updatedForm, activeAMC);
      return {
        ...updatedForm,
        hours_used: calculated.hours_used,
        overage_hours: calculated.overage_hours,
        overage_amount: calculated.overage_amount
      };
    });
  };

  const totalAmount = () => {
    const activeAMC = contracts.find(c => c.customer_id === Number(form.customer_id) && !isExpired(c.end_date));
    const calculated = recalculateAmounts(selectedLogs, form, activeAMC);
    return calculated.total_amount;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const activeAMC = contracts.find(c => c.customer_id === Number(form.customer_id) && !isExpired(c.end_date));
    const calculated = recalculateAmounts(selectedLogs, form, activeAMC);
    const total_amount = calculated.total_amount;
    const log_ids = selectedLogs.map(l => l.id);
    
    try {
      await axios.post(`${BASE}/api/billing`, { 
        ...form, 
        total_amount, 
        log_ids,
        hours_used: calculated.hours_used,
        overage_hours: calculated.overage_hours,
        overage_amount: calculated.overage_amount
      }, { headers });
      alert("✅ Bill created & Logs marked as Billed!");
      setShowModal(false);
      setForm({ 
        customer_id: "", 
        hours_used: "", 
        hourly_rate: "500", 
        month: "", 
        gst_percentage: "18",
        billing_type: "standard",
        base_amount: "0",
        overage_amount: "0",
        overage_hours: "0" 
      });
      setSelectedLogs([]);
      setUnbilledLogs([]);
      fetchBills();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create bill");
    }
  };

  const handleGenerateInvoice = async (billing_id) => {
    const invoice_number = "INV" + Date.now().toString().slice(-6);
    try {
      await axios.post(`${BASE}/api/invoices`, { 
        billing_id, 
        invoice_number,
        gst_percentage: form.gst_percentage || 18
      }, { headers });
      alert(`✅ Invoice ${invoice_number} generated!`);
      fetchBills();
    } catch (err) {
      alert("Failed to generate invoice");
    }
  };

  const handleDownloadPDF = async (invoice) => {
    try {
      const response = await axios.get(`${BASE}/api/invoices/${invoice.id}/download`, {
        headers,
        responseType: 'blob'
      });

      const file = new Blob([response.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);
      const fileLink = document.createElement('a');
      fileLink.href = fileURL;
      fileLink.setAttribute('download', `Invoice-${invoice.invoice_number}.pdf`);
      document.body.appendChild(fileLink);
      fileLink.click();
      
      fileLink.remove();
      URL.revokeObjectURL(fileURL);
    } catch (err) {
      console.error("Error downloading PDF:", err);
      alert("Failed to download PDF from server.");
    }
  };

  const handleMarkPaid = async (invoiceId) => {
    const method = window.prompt("Payment Method (e.g. Bank Transfer, UPI):", "Bank Transfer");
    if (!method) return;
    
    try {
      await axios.put(`${BASE}/api/invoices/${invoiceId}/paid`, { method, amount: 1 }, { headers });
      fetchBills();
      alert("✅ Invoice Marked Paid");
    } catch (err) {
      alert("Error marking invoice paid.");
    }
  };

  const currentMonthRevenue = bills
    .filter(b => b.month === new Date().toISOString().slice(0, 7))
    .reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);

  const pendingInvoices = bills.flatMap(b => b.invoices || []).filter(inv => inv.status !== 'Paid' && inv.status !== 'Cancelled').length;

  const activeAMC = contracts.find(c => c.customer_id === Number(form.customer_id) && !isExpired(c.end_date));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-blue-900">Billing</h2>
          <p className="text-gray-400 text-sm">{bills.length} billing records</p>
        </div>
        <button onClick={() => {
          setShowModal(true);
          setForm({
            customer_id: "", 
            hours_used: "", 
            hourly_rate: "500", 
            month: "", 
            gst_percentage: "18",
            billing_type: "standard",
            base_amount: "0",
            overage_amount: "0",
            overage_hours: "0"
          });
          setSelectedLogs([]);
          setUnbilledLogs([]);
        }}
          className="flex items-center gap-2 bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 transition text-sm font-medium">
          <FiPlus /> Create Bill
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow p-5 border-l-4 border-green-500">
           <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Current Month Revenue</h3>
           <p className="text-2xl font-black text-gray-800">AED {currentMonthRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-5 border-l-4 border-orange-400">
           <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Pending Invoices</h3>
           <p className="text-2xl font-black text-gray-800">{pendingInvoices}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-5 border-l-4 border-blue-500">
           <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Total Bills Generated</h3>
           <p className="text-2xl font-black text-gray-800">{bills.length}</p>
        </div>
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
              ) : bills.map((b, i) => {
                const isAMCBill = b.invoices[0]?.line_items?.some(li => li.ticket_ref?.includes("AMC"));
                return (
                  <tr key={b.id} className="border-t hover:bg-blue-50 transition">
                    <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      <div className="flex items-center gap-2">
                        <span>{b.customer?.name || "—"}</span>
                        {isAMCBill && (
                          <span className="bg-blue-100 text-blue-800 text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-sm">
                            AMC
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{b.month}</td>
                    <td className="px-4 py-3 text-gray-600">{b.hours_used} hrs</td>
                    <td className="px-4 py-3 text-gray-600">
                      {isAMCBill ? `AED ${b.hourly_rate} (Overage)` : `AED ${b.hourly_rate}`}
                    </td>
                    <td className="px-4 py-3 font-bold text-green-600">AED {b.total_amount}</td>
                    <td className="px-4 py-3">
                      {b.invoices?.length > 0 ? (
                        <div className="flex flex-col gap-2 relative">
                           <div className="flex items-center gap-2">
                             <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase
                                ${b.invoices[0].status === 'Draft' ? 'bg-gray-100 text-gray-600' : 
                                  b.invoices[0].status === 'Paid' ? 'bg-green-100 text-green-700' : 
                                  b.invoices[0].status === 'Overdue' ? 'bg-red-100 text-red-700' : 
                                  'bg-blue-100 text-blue-700'}`}>
                               {b.invoices[0].status}
                             </span>
                             <span className="text-xs font-bold text-gray-800">{b.invoices[0].invoice_number}</span>
                           </div>
                           <div className="flex gap-3 mt-1">
                             <button onClick={() => handleDownloadPDF(b.invoices[0], b)} className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-1 flex items-center gap-1 rounded hover:bg-indigo-100 transition">
                               <FiDownload /> PDF
                             </button>
                             {b.invoices[0].status !== 'Paid' && (
                               <button onClick={() => handleMarkPaid(b.invoices[0].id)} className="text-[10px] bg-green-50 text-green-700 font-bold px-2 py-1 flex items-center gap-1 rounded hover:bg-green-100 transition">
                                 <FiDollarSign /> Mark Paid
                               </button>
                             )}
                           </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleGenerateInvoice(b.id)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-bold bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition">
                          <FiCheckSquare size={14} /> Generate Invoice
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg mx-4 overflow-y-auto max-h-[95vh]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-blue-900">Create Bill</h3>
              <button onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Customer */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Customer *</label>
                <select required
                  className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.customer_id}
                  onChange={(e) => handleCustomerChange(e.target.value)}>
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} – {c.company}</option>
                  ))}
                </select>
              </div>

              {/* Active AMC details */}
              {activeAMC && (
                <div className="bg-gradient-to-br from-blue-900 to-indigo-900 text-white p-4 rounded-xl shadow border border-blue-800">
                  <h4 className="text-xs font-bold text-blue-200 mb-1.5 uppercase tracking-wider">Active AMC Contract</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <p>Included Hours: <strong>{activeAMC.monthly_hours} hrs/mo</strong></p>
                    <p>Base Fee: <strong>AED {activeAMC.monthly_base_fee || 0}</strong></p>
                    <p>Overage Rate: <strong>AED {activeAMC.extra_hour_rate || 0}/hr</strong></p>
                    <p>Hours Used Stored: <strong>{activeAMC.hours_used} hrs</strong></p>
                  </div>
                </div>
              )}

              {/* Billing Type selection */}
              {activeAMC && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Billing Mode *</label>
                  <select required
                    className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    value={form.billing_type}
                    onChange={(e) => handleInputChange("billing_type", e.target.value)}>
                    <option value="standard">Standard Ticket-based (Hourly)</option>
                    <option value="amc">AMC Base Retainer + Overage</option>
                  </select>
                </div>
              )}

              {/* Unbilled Work logs */}
              {unbilledLogs.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <h4 className="text-xs font-bold text-blue-800 mb-2 uppercase tracking-wide">Unbilled Work Logs</h4>
                  <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                    {unbilledLogs.map(l => (
                      <label key={l.id} className="flex items-center gap-2 bg-white p-2 rounded border cursor-pointer hover:border-blue-400 transition">
                        <input type="checkbox" 
                          checked={!!selectedLogs.find(sl => sl.id === l.id)}
                          onChange={() => handleLogToggle(l)}
                        />
                        <div className="flex-1 overflow-hidden">
                          <p className="text-[10px] font-bold text-gray-800 truncate">#{l.ticket?.ticket_no} - {l.ticket?.issue_title}</p>
                          <p className="text-[10px] text-gray-400">{l.time_spent} | {new Date(l.created_at).toLocaleDateString()}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <p className="text-[10px] text-blue-600 mt-2 italic">* Selecting logs auto-calculates hours below.</p>
                </div>
              )}

              {/* Date & GST */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Month *</label>
                  <input type="month" required max={new Date().toISOString().slice(0,7)}
                    className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    value={form.month}
                    onChange={(e) => handleInputChange("month", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">GST %</label>
                  <input type="number" required min="0"
                    className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    value={form.gst_percentage}
                    onChange={(e) => handleInputChange("gst_percentage", Number(e.target.value))} />
                </div>
              </div>

              {/* Pricing breakdown controls */}
              {form.billing_type === "amc" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Base Retainer Fee (AED) *</label>
                      <input type="number" min="0" required
                        className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                        value={form.base_amount}
                        onChange={(e) => handleInputChange("base_amount", e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Overage Rate / Hr (AED) *</label>
                      <input type="number" min="0" required
                        className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                        value={form.hourly_rate}
                        onChange={(e) => handleInputChange("hourly_rate", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">Total Hours</label>
                      <input type="number" disabled
                        className="w-full border rounded-lg px-3 py-2 text-xs outline-none bg-gray-50 text-gray-500 font-bold"
                        value={form.hours_used} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">Overage Hours</label>
                      <input type="number" disabled
                        className="w-full border rounded-lg px-3 py-2 text-xs outline-none bg-gray-50 text-gray-500 font-bold"
                        value={form.overage_hours} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">Overage Fee (AED)</label>
                      <input type="number" disabled
                        className="w-full border rounded-lg px-3 py-2 text-xs outline-none bg-gray-50 text-gray-500 font-bold"
                        value={form.overage_amount} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Hours Used *</label>
                    <input type="number" min="0" step="0.5" required
                      placeholder="e.g. 10"
                      className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                      value={form.hours_used}
                      onChange={(e) => handleInputChange("hours_used", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Rate / Hour (AED) *</label>
                    <input type="number" min="0" required
                      placeholder="e.g. 500"
                      className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                      value={form.hourly_rate}
                      onChange={(e) => handleInputChange("hourly_rate", e.target.value)} />
                  </div>
                </div>
              )}

              {/* Live Total */}
              {form.hours_used && (
                <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm font-medium flex flex-col gap-1 border border-green-100">
                  {form.billing_type === "amc" ? (
                    <>
                      <div className="flex justify-between">
                        <span>Base Retainer:</span> 
                        <strong>AED {Number(form.base_amount).toFixed(2)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Overage Support ({form.overage_hours} hrs @ AED {form.hourly_rate}/hr):</span>
                        <strong>AED {Number(form.overage_amount).toFixed(2)}</strong>
                      </div>
                      <div className="border-t pt-1.5 mt-1.5 flex justify-between font-bold text-base text-green-800">
                        <span>💰 Total Amount:</span>
                        <span>AED {totalAmount()}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between font-bold">
                      <span>💰 Total Amount ({form.hours_used} hrs @ AED {form.hourly_rate}/hr):</span>
                      <span>AED {totalAmount()}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit"
                  className="flex-1 bg-blue-700 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-800 transition text-sm shadow-md">
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
