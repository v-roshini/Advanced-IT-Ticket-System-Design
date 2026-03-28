import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FiMail, FiLock, FiEye, FiEyeOff, FiShield, FiUser, FiArrowLeft, FiAirplay } from "react-icons/fi";
import axios from "axios";

export default function Login() {
    const navigate = useNavigate();
    const [selectedRole, setSelectedRole] = useState(null); // 'admin', 'agent', 'client'
    const [form, setForm] = useState({ email: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await axios.post(`${process.env.REACT_APP_URL || "http://localhost:5000"}/auth/login`, {
                email: form.email,
                password: form.password,
                role: selectedRole
            });
            localStorage.setItem("token", res.data.token);
            localStorage.setItem("user", JSON.stringify(res.data.user));

            // Redirect based on role
            if (res.data.user.role === "client") navigate("/customer/dashboard");
            else navigate("/dashboard");
        } catch (err) {
            setError(err.response?.data?.message || "Login failed!");
        } finally {
            setLoading(false);
        }
    };

    const roles = [
        { id: "admin", label: "System Admin", icon: <FiShield />, color: "from-indigo-600 to-blue-900", desc: "Manage infrastructure & users" },
        { id: "agent", label: "Support Agent", icon: <FiAirplay />, color: "from-blue-500 to-indigo-600", desc: "Resolve tickets & assist users" },
        { id: "client", label: "Customer Portal", icon: <FiUser />, color: "from-blue-400 to-blue-600", desc: "View status & raise tickets" },
    ];

    return (
        <div className="min-h-screen flex flex-col items-center justify-center relative p-4 bg-gray-50 overflow-hidden font-outfit"
            style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=2072')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
            }}>
            <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-md"></div>

            {!selectedRole ? (
                <div className="relative z-10 w-full max-w-5xl animate-in fade-in slide-in-from-bottom-5 duration-700">
                    <div className="text-center mb-12">
                        <div className="inline-block p-3 bg-white/10 backdrop-blur-xl rounded-2xl mb-4 border border-white/20">
                            <h2 className="text-white font-black text-2xl tracking-widest italic uppercase">Lenok IT</h2>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow-2xl tracking-tight mb-2">Select Your Portal</h1>
                        <p className="text-blue-100/70 font-medium">Choose your workspace to continue to the system</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {roles.map((role) => (
                            <div key={role.id}
                                onClick={() => setSelectedRole(role.id)}
                                className="group relative bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl cursor-pointer hover:bg-white transition-all duration-500 transform hover:-translate-y-3 hover:shadow-2xl overflow-hidden shadow-xl"
                            >
                                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${role.color} opacity-20 -mr-16 -mt-16 rounded-full blur-3xl transition-opacity group-hover:opacity-60`}></div>

                                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${role.color} flex items-center justify-center text-white text-3xl mb-6 shadow-xl group-hover:scale-110 transition-transform`}>
                                    {role.icon}
                                </div>
                                <h3 className="text-white group-hover:text-blue-900 text-2xl font-black mb-2 transition-colors uppercase italic">{role.label}</h3>
                                <p className="text-blue-100 group-hover:text-gray-500 font-medium text-sm transition-colors mb-6">{role.desc}</p>

                                <div className="flex items-center gap-2 text-white group-hover:text-blue-600 font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-[-10px] group-hover:translate-x-0">
                                    Login with Secure ID <FiArrowLeft className="rotate-180" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="relative z-10 w-full max-w-md animate-in zoom-in-95 duration-500">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 relative border-t-8 border-blue-600">
                        <button onClick={() => { setSelectedRole(null); setError(""); }}
                            className="absolute top-8 left-8 p-3 rounded-full hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-all flex items-center justify-center bg-gray-50">
                            <FiArrowLeft size={20} />
                        </button>

                        <div className="text-center mt-6 mb-8">
                            <div className="inline-block px-4 py-1.5 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-full mb-3">
                                {selectedRole} Authentication
                            </div>
                            <h2 className="text-4xl font-black text-gray-800 italic uppercase">Log In</h2>
                            <p className="text-gray-400 mt-2 text-xs font-medium uppercase tracking-tighter">Enter your {selectedRole} credentials</p>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 text-[10px] font-black px-4 py-3 rounded-xl mb-6 border border-red-100 text-center uppercase tracking-widest">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="flex flex-col gap-5">
                            <div className="group">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1 text-left">Internal Identity</label>
                                <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100/50 transition-all duration-300 shadow-inner">
                                    <FiMail className="text-gray-400 text-lg flex-shrink-0 group-focus-within:text-blue-600 transition-colors" />
                                    <input type="email" placeholder="user@Lenok.com" required
                                        className="outline-none text-sm w-full text-gray-800 bg-transparent font-semibold placeholder:text-gray-300"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })} />
                                </div>
                            </div>

                            <div className="group">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block ml-1 text-left">Cipher Token</label>
                                <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100/50 transition-all duration-300 shadow-inner">
                                    <FiLock className="text-gray-400 text-lg flex-shrink-0 group-focus-within:text-blue-600 transition-colors" />
                                    <input type={showPassword ? "text" : "password"} placeholder="••••••••" required
                                        className="outline-none text-sm w-full text-gray-800 bg-transparent font-semibold tracking-widest placeholder:text-gray-300"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })} />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                        className="text-gray-300 hover:text-blue-600 transition-all p-1">
                                        {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-1 px-1">
                                <label className="flex items-center gap-2.5 text-[10px] font-black text-gray-400 uppercase tracking-wider cursor-pointer group">
                                    <input type="checkbox" checked={remember}
                                        onChange={() => setRemember(!remember)}
                                        className="w-4 h-4 accent-blue-600 cursor-pointer" />
                                    <span className="group-hover:text-blue-600 transition-colors">Session Lock</span>
                                </label>
                                <a href="#" className="text-blue-600 hover:text-blue-800 text-[10px] font-black uppercase tracking-wider underline">
                                    Reset
                                </a>
                            </div>

                            <button type="submit" disabled={loading}
                                className="bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all transform active:scale-95 shadow-xl shadow-blue-600/20 disabled:opacity-60 flex items-center justify-center gap-3 mt-4">
                                {loading ? "Decrypting Access..." : "Grant Entrance"} <FiArrowLeft className="rotate-180" />
                            </button>
                        </form>

                        {selectedRole === 'client' && (
                            <div className="mt-8 text-center bg-gray-50 p-6 rounded-3xl border border-gray-100 border-dashed">
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                                    New Organization?{" "}
                                    <Link to="/signup" className="text-blue-600 hover:text-blue-800 underline ml-1">Onboard Now</Link>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
