import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiPhone } from "react-icons/fi";
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
      await axios.post(`${process.env.REACT_APP_URL}/auth/register`, {
        full_name: form.fullName,
        email: form.email,
        phone: form.phone,
        company: form.company,
        role: form.role,
        password: form.password,
      });
      alert("Account created! Please login.");
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed!");
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
        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
          <span className="text-white text-xl font-black">IT</span>
        </div>
        <h1 className="text-white text-2xl font-bold">IT Ticket Support System</h1>
      </div>

      <div className="relative z-10 bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md mx-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Create Account</h2>
          <p className="text-gray-400 text-sm mt-1">Sign up to get started</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition">
            <FiUser className="text-gray-400" />
            <input type="text" placeholder="Full Name" required
              className="outline-none text-sm w-full bg-transparent text-gray-700"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>

          <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition">
            <FiMail className="text-gray-400" />
            <input type="email" placeholder="Email Address" required
              className="outline-none text-sm w-full bg-transparent text-gray-700"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>

          <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition">
            <FiPhone className="text-gray-400" />
            <input type="tel" placeholder="Phone Number"
              className="outline-none text-sm w-full bg-transparent text-gray-700"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>

          <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition">
            <FiUser className="text-gray-400" />
            <input type="text" placeholder="Company Name (Optional)"
              className="outline-none text-sm w-full bg-transparent text-gray-700"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </div>

          <select required
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 text-gray-700"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="client">Client / Customer</option>
            <option value="agent">Support Agent</option>
            <option value="admin">Admin</option>
          </select>

          <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition">
            <FiLock className="text-gray-400" />
            <input type={showPassword ? "text" : "password"} placeholder="Password" required
              className="outline-none text-sm w-full bg-transparent text-gray-700"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="text-gray-400 hover:text-blue-600 transition">
              {showPassword ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>

          <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition">
            <FiLock className="text-gray-400" />
            <input type="password" placeholder="Confirm Password" required
              className="outline-none text-sm w-full bg-transparent text-gray-700"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
          </div>

          <button type="submit" disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-semibold text-base transition-all shadow-md disabled:opacity-60">
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="border-t border-gray-100 mt-6 pt-5 text-center">
          <p className="text-sm text-gray-400">
            Already have an account?{" "}
            <Link to="/" className="text-blue-600 hover:underline font-medium">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
