import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FiClock, FiCheckCircle, FiAlertCircle, FiZap, FiPlus, FiMessageSquare, FiTrendingUp } from "react-icons/fi";

const BASE = process.env.REACT_APP_URL;

export default function CustomerRenewals() {
  const navigate = useNavigate();
  const [renewals, setRenewals] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchRenewals();
  }, []);

  const fetchRenewals = async () => {
    try {
      const res = await axios.get(`${BASE}/renewals`, { headers });
      setRenewals(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const getStatus = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { label: "Expired", color: "bg-red-50 text-red-600 border border-red-100 animate-pulse", icon: <FiAlertCircle /> };
    if (diffDays <= 30) return { label: `${diffDays} Days Left`, color: "bg-orange-50 text-orange-600 border border-orange-100", icon: <FiClock /> };
    return { label: "Active", color: "bg-green-50 text-green-600 border border-green-100", icon: <FiCheckCircle /> };
  };

  const categories = [...new Set(renewals.map(r => r.category))];

  return (
    <div className="pb-10">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-black text-blue-900 border-l-8 border-blue-600 pl-6 uppercase tracking-tighter italic">Digital Asset Management</h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-3">Monitoring Expiring Services & Subscriptions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-12">
        {categories.length === 0 && !loading ? (
          <div className="bg-white rounded-[40px] p-20 text-center border-2 border-dashed border-gray-100">
             <FiZap size={60} className="mx-auto text-gray-100 mb-6 drop-shadow-xl" />
             <p className="text-gray-400 font-black uppercase tracking-widest text-xs">No active assets found under your account</p>
          </div>
        ) : categories.map(cat => (
          <div key={cat} className="space-y-6">
             <div className="flex items-center gap-4">
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-[0.3em] font-mono italic">{cat} Services</h3>
                <div className="flex-1 h-[2px] bg-gradient-to-r from-gray-100 to-transparent"></div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {renewals.filter(r => r.category === cat).map(r => {
                  const status = getStatus(r.expiry_date);
                  return (
                    <div key={r.id} className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 relative overflow-hidden group">
                       <FiZap className="absolute -bottom-4 -right-4 text-[120px] text-gray-50 opacity-10 group-hover:scale-125 transition duration-1000" />
                       
                       <div className="flex justify-between items-start mb-8">
                          <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${status.color}`}>
                             {status.icon} {status.label}
                          </div>
                          <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest italic">{r.currency} {r.cost?.toLocaleString() || "N/A"}</p>
                       </div>

                       <h4 className="text-2xl font-black text-blue-900 tracking-tighter mb-2 group-hover:text-blue-600 transition">{r.asset_name}</h4>
                       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8 italic">{r.vendor}</p>

                       <div className="flex items-center justify-between mt-auto">
                          <div>
                             <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1 italic">Expiry Date</p>
                             <p className="text-xs font-black text-gray-800 italic uppercase">{new Date(r.expiry_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                          </div>
                          <button 
                            className="bg-blue-600 text-white font-black px-6 py-3 rounded-2xl text-[9px] uppercase tracking-widest hover:bg-black transition shadow-lg shadow-blue-100 hover:shadow-none"
                            onClick={() => navigate(`/tickets/create?subject=Renewal Request: ${r.asset_name}&category=Renewal`)}
                          >
                            Request Renewal
                          </button>
                       </div>
                    </div>
                  );
                })}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
