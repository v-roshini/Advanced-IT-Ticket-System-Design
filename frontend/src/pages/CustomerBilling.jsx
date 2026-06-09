import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FiDollarSign, FiFileText, FiDownload, FiClock, FiCheckCircle, FiShield, FiTrendingUp, FiAlertCircle } from "react-icons/fi";

const BASE = process.env.REACT_APP_URL;

export default function CustomerBilling() {
  const [billing, setBilling] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchBilling();
  }, []);

  const fetchBilling = async () => {
    try {
      const res = await axios.get(`${BASE}/api/billing`, { headers });
      setBilling(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const totalSpent = billing.reduce((sum, b) => sum + b.total_amount, 0);
  const pendingAmount = billing.filter(b => b.invoices[0]?.status !== "Paid").reduce((sum, b) => sum + b.total_amount, 0);

  // Dynamic Current Month Billing calculation
  const now = new Date();
  const currentYearMonth = now.toISOString().slice(0, 7); // "YYYY-MM"
  const currentMonthLong = now.toLocaleString("en-US", { month: "long" }).toLowerCase();
  const currentMonthShort = now.toLocaleString("en-US", { month: "short" }).toLowerCase();

  const currentMonthBilling = billing
    .filter(b => {
      const isCurrentMonthDate = b.created_at && 
        new Date(b.created_at).getMonth() === now.getMonth() && 
        new Date(b.created_at).getFullYear() === now.getFullYear();
        
      const isCurrentMonthString = b.month && (
        b.month.toLowerCase() === currentYearMonth ||
        b.month.toLowerCase() === currentMonthLong ||
        b.month.toLowerCase() === currentMonthShort
      );
      
      return isCurrentMonthDate || isCurrentMonthString;
    })
    .reduce((sum, b) => sum + (b.total_amount || 0), 0);

  // Dynamic Billing Cycle Reset remaining days calculation
  const getDaysRemainingInCycle = () => {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const diffTime = nextMonth.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  const daysRemaining = getDaysRemainingInCycle();

  const handlePayOutstanding = async () => {
    const unpaidRecords = billing.filter(b => b.invoices && b.invoices[0] && b.invoices[0].status !== "Paid");

    if (unpaidRecords.length === 0) {
      alert("No outstanding balance to pay.");
      return;
    }

    const confirmPay = window.confirm(`Proceed to pay the outstanding balance of AED ${pendingAmount.toLocaleString()} via Card Payment?`);
    if (!confirmPay) return;

    try {
      setLoading(true);
      for (const rec of unpaidRecords) {
        const invoice = rec.invoices[0];
        const payAmount = invoice.total_amout_with_tax || rec.total_amount;
        await axios.put(`${BASE}/api/invoices/${invoice.id}/paid`, {
          method: "Card Payment",
          amount: payAmount,
          notes: "Paid via Online Portal"
        }, { headers });
      }
      alert("✅ Outstanding balance paid successfully!");
      fetchBilling();
    } catch (err) {
      console.error(err);
      alert("Failed to process payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (invoice) => {
    try {
      if (!invoice) return alert("Invoice not found.");
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
      alert("Failed to download PDF.");
    }
  };

  return (
    <div className="pb-10">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-black text-blue-900 italic">Financial Summary</h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Manage your invoices and payments</p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-[40px] text-white shadow-2xl shadow-blue-200 flex flex-col justify-between overflow-hidden relative">
           <FiShield className="absolute top-0 right-0 p-4 opacity-10 text-[120px]"/>
           <div>
              <p className="text-blue-100 text-[10px] uppercase font-black tracking-widest mb-4 italic">Total Historical Spend</p>
              <h3 className="text-5xl font-black tracking-tighter">AED {totalSpent.toLocaleString()}</h3>
           </div>
           <p className="mt-8 text-blue-200 text-xs font-bold uppercase tracking-tighter flex items-center gap-2">
              <FiCheckCircle /> Verified Transaction History
           </p>
        </div>

        <div className="bg-white p-8 rounded-[40px] border-2 border-dashed border-red-50 text-red-600 shadow-sm flex flex-col justify-between">
           <div>
             <p className="text-red-400 text-[10px] uppercase font-black tracking-widest mb-4 italic flex items-center gap-2">
                <FiClock className="animate-pulse" /> Pending Balance
             </p>
             <h3 className="text-5xl font-black tracking-tighter">AED {pendingAmount.toLocaleString()}</h3>
           </div>
            <button 
              onClick={handlePayOutstanding}
              className="mt-8 bg-red-600 text-white font-black py-4 rounded-3xl text-[10px] uppercase tracking-widest shadow-xl shadow-red-100 hover:scale-105 transition"
            >
              Pay Outstanding Now
            </button>
        </div>

        <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col justify-between">
           <div>
             <p className="text-gray-400 text-[10px] uppercase font-black tracking-widest mb-4 italic flex items-center gap-2">
                <FiTrendingUp className="text-green-500" /> Current Month Billing
             </p>
             <h3 className="text-4xl font-black text-gray-800 tracking-tighter italic">AED {currentMonthBilling.toLocaleString()}</h3>
           </div>
           <p className="mt-8 text-gray-300 text-[10px] font-bold uppercase tracking-widest">
             Billing cycle resets in {daysRemaining} {daysRemaining === 1 ? "day" : "days"}
           </p>
        </div>
      </div>

      {/* Invoice List */}
      <div className="bg-white rounded-[40px] shadow-sm border border-gray-50 overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
           <h3 className="text-lg font-black text-blue-900 uppercase tracking-widest text-[10px]">Your Transaction History</h3>
           <div className="flex gap-2">
               <button className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 transition">Export All</button>
           </div>
        </div>
        
        <table className="w-full">
           <thead className="bg-gray-50">
              <tr>
                 <th className="text-left py-6 px-10 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Invoice No</th>
                 <th className="text-left py-6 px-10 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Month</th>
                 <th className="text-left py-6 px-10 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Amount</th>
                 <th className="text-left py-6 px-10 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
                 <th className="text-right py-6 px-10 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Action</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                   <td colSpan="5" className="py-20 text-center font-black text-blue-600 animate-pulse tracking-widest uppercase text-xs">Accessing Ledgers...</td>
                </tr>
              ) : billing.length === 0 ? (
                <tr>
                   <td colSpan="5" className="py-20 text-center text-gray-300">No payment records found</td>
                </tr>
              ) : billing.map(b => (
                <tr key={b.id} className="hover:bg-gray-50/50 transition font-black tracking-tight text-gray-700">
                   <td className="py-6 px-10">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 italic">#</div>
                         {b.invoices[0]?.invoice_number || `INV-${b.id}`}
                      </div>
                   </td>
                   <td className="py-6 px-10 font-bold text-gray-500 uppercase text-xs tracking-tighter italic">{new Date(b.month + "-01").toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</td>
                   <td className="py-6 px-10 text-lg">AED {b.total_amount.toLocaleString()}</td>
                   <td className="py-6 px-10">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] uppercase font-black tracking-widest flex items-center gap-2 w-fit italic
                        ${b.invoices[0]?.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600 animate-pulse border border-red-100'}`}>
                         {b.invoices[0]?.status === 'Paid' ? <><FiCheckCircle /> PAID</> : <><FiAlertCircle /> UNPAID</>}
                      </span>
                   </td>
                   <td className="py-6 px-10 text-right">
                      <button 
                        onClick={() => handleDownloadPDF(b.invoices[0])}
                        className="p-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-600 hover:text-white transition shadow-sm"
                      >
                         <FiDownload size={18}/>
                      </button>
                   </td>
                </tr>
              ))}
            </tbody>
       </table>
      </div>
    </div>
  );
}
