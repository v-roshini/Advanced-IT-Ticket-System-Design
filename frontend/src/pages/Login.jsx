import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import axios from "axios";

export default function Login() {
    const navigate = useNavigate();
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
            const res = await axios.post(`${process.env.REACT_APP_URL}/auth/login`, {
                email: form.email,
                password: form.password,
            });
            localStorage.setItem("token", res.data.token);
            localStorage.setItem("user", JSON.stringify(res.data.user));
            navigate("/dashboard");
        } catch (err) {
            setError(err.response?.data?.message || "Login failed!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center relative"
            style={{
                backgroundImage: `url('/blue.png')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
            }}>
            <div className="absolute inset-0 bg-blue-900/60 backdrop-blur-sm"></div>

            <div className="relative z-10 flex items-center gap-3 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white text-2xl font-black">IT</span>
                </div>
                <h1 className="text-white text-3xl font-bold tracking-wide">
                    IT Ticket Support System
                </h1>
            </div>

            <div className="relative z-10 bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md mx-4">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gray-800">Welcome Back!</h2>
                    <p className="text-gray-400 mt-2 text-sm">Please sign in to your account</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="flex flex-col gap-5">
                    <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition">
                        <FiMail className="text-gray-400 text-lg flex-shrink-0" />
                        <input type="email" placeholder="user@example.com" required
                            className="outline-none text-sm w-full text-gray-700 bg-transparent"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>

                    <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition">
                        <FiLock className="text-gray-400 text-lg flex-shrink-0" />
                        <input type={showPassword ? "text" : "password"} placeholder="Enter Your Password" required
                            className="outline-none text-sm w-full text-gray-700 bg-transparent"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })} />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                            className="text-gray-400 hover:text-blue-600 transition">
                            {showPassword ? <FiEyeOff /> : <FiEye />}
                        </button>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                        <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                            <input type="checkbox" checked={remember}
                                onChange={() => setRemember(!remember)}
                                className="w-4 h-4 accent-blue-600" />
                            Remember Me
                        </label>
                        <a href="#" className="text-blue-600 hover:underline font-medium">
                            Forgot Password?
                        </a>
                    </div>

                    <button type="submit" disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-semibold text-base transition-all shadow-md disabled:opacity-60">
                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                </form>

                <div className="border-t border-gray-100 mt-8 pt-5 text-center flex flex-col gap-2">
                    <p className="text-sm text-gray-400">
                        Don't have an account?{" "}
                        <Link to="/signup" className="text-blue-600 hover:underline font-medium">Sign Up</Link>
                    </p>
                    <p className="text-sm text-gray-400">
                        Need help?{" "}
                        <a href="#" className="text-blue-600 hover:underline font-medium">Contact Support</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
