import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiPhone, FiArrowLeft } from "react-icons/fi";
import axios from "axios";

export default function Signup() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", company: "",
    role: "client", password: "", confirm: ""
  });

  const handleSignup = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError("Passwords do not match!");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await axios.post(`${process.env.REACT_APP_URL || "http://localhost:5000"}/auth/register`, {
        full_name: form.fullName,
        email: form.email,
        phone: form.phone,
        company: form.company,
        role: form.role,
        password: form.password,
      });
      alert("✅ Account created! Please login.");
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative p-4 font-outfit"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=2072')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}>
      <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-md"></div>

      <div className="relative z-10 w-full max-w-md animate-in zoom-in-95 duration-500">
        <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 relative border-t-8 border-blue-600">
            <Link to="/" className="absolute top-8 left-8 p-3 rounded-full hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-all flex items-center justify-center bg-gray-50">
                <FiArrowLeft size={18} />
            </Link>

            <div className="text-center mt-6 mb-8">
                <h2 className="text-3xl font-black text-gray-800 italic uppercase">Onboarding</h2>
                <p className="text-gray-400 mt-2 text-xs font-medium uppercase tracking-tighter">Join the Linotec support ecosystem</p>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 text-[10px] font-black px-4 py-3 rounded-xl mb-6 border border-red-100 text-center uppercase tracking-widest">
                    {error}
                </div>
            )}

            <form onSubmit={handleSignup} className="flex flex-col gap-4">
                <div className="group">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Full Identity</label>
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 focus-within:bg-white focus-within:border-blue-500 transition-all shadow-inner">
                        <FiUser className="text-gray-400 text-lg group-focus-within:text-blue-600" />
                        <input type="text" placeholder="John Doe" required
                            className="outline-none text-sm w-full bg-transparent text-gray-800 font-semibold"
                            value={form.fullName}
                            onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                    </div>
                </div>

                <div className="group">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Secure Email</label>
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 focus-within:bg-white focus-within:border-blue-500 transition-all shadow-inner">
                        <FiMail className="text-gray-400 text-lg group-focus-within:text-blue-600" />
                        <input type="email" placeholder="name@company.com" required
                            className="outline-none text-sm w-full bg-transparent text-gray-800 font-semibold"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="group">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Phone</label>
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 focus-within:bg-white focus-within:border-blue-500 transition-all shadow-inner text-xs">
                            <FiPhone className="text-gray-400" />
                            <input type="tel" placeholder="+91"
                                className="outline-none w-full bg-transparent text-gray-800 font-semibold"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                        </div>
                    </div>
                    <div className="group">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Access Level</label>
                        <select required
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-xs font-bold uppercase tracking-tighter outline-none focus:ring-2 focus:ring-blue-100 text-blue-700"
                            value={form.role}
                            onChange={(e) => setForm({ ...form, role: e.target.value })}>
                            <option value="client">Customer</option>
                            <option value="agent">Agent</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                </div>

                <div className="group">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Set Cipher</label>
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 focus-within:bg-white focus-within:border-blue-500 transition-all shadow-inner">
                        <FiLock className="text-gray-400 text-lg group-focus-within:text-blue-600" />
                        <input type={showPassword ? "text" : "password"} placeholder="••••••••" required
                            className="outline-none text-sm w-full bg-transparent text-gray-800 font-semibold"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                            className="text-gray-300 hover:text-blue-600 transition-all">
                            {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                        </button>
                    </div>
                </div>

                <div className="group">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Confirm Cipher</label>
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 focus-within:bg-white focus-within:border-blue-500 transition-all shadow-inner">
                        <FiLock className="text-gray-400 text-lg group-focus-within:text-blue-600" />
                        <input type="password" placeholder="••••••••" required
                            className="outline-none text-sm w-full bg-transparent text-gray-800 font-semibold"
                            value={form.confirm}
                            onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
                    </div>
                </div>

                <button type="submit" disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white py-4.5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all transform active:scale-95 shadow-xl shadow-blue-600/20 disabled:opacity-60 flex items-center justify-center gap-3 mt-4">
                    {loading ? "Registering..." : "Initialize Account"}
                </button>
            </form>

            <div className="border-t border-gray-100 mt-8 pt-5 text-center">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                    Already have an account?{" "}
                    <Link to="/" className="text-blue-600 hover:text-blue-800 underline ml-1">Sign In</Link>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}
