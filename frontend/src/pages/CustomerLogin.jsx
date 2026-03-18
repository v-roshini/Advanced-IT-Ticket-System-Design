import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FiMail, FiLock, FiArrowRight, FiShield } from "react-icons/fi";

const BASE = process.env.REACT_APP_URL;

export default function CustomerLogin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${BASE}/auth/login`, form);
      if (res.data.user.role !== 'client') {
          setError("This portal is only for customers. Support staff should use the main login.");
          setLoading(false);
          return;
      }
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/customer/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="bg-blue-600 p-10 text-center text-white relative">
            <div className="absolute top-0 right-0 p-4 opacity-10"><FiShield size={100}/></div>
            <h2 className="text-3xl font-black uppercase tracking-widest italic mb-2">Customer Portal</h2>
            <p className="text-blue-100 text-xs font-medium uppercase tracking-tighter">Secure access to your support resources</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-10 space-y-6">
          {error && <p className="bg-red-50 text-red-500 p-3 rounded-xl text-xs font-bold border border-red-100 text-center">{error}</p>}
          
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Email Address</label>
            <div className="relative">
              <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="email" 
                required 
                className="w-full bg-gray-50 border-none rounded-xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition font-medium" 
                placeholder="name@company.com"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Password</label>
            <div className="relative">
              <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="password" 
                required 
                className="w-full bg-gray-50 border-none rounded-xl py-4 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-100 outline-none transition font-medium" 
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-100 transition transform active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
          >
            {loading ? "Authenticating..." : "Enter Portal"} <FiArrowRight />
          </button>

          <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            Don't have access? <span className="text-blue-600 hover:underline cursor-pointer">Contact Support</span>
          </p>
        </form>
      </div>
    </div>
  );
}
