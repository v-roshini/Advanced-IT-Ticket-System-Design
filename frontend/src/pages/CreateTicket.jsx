import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import axios from "axios";

const priorities = ["Critical", "High", "Medium", "Low"];
const categories = ["Server Issue", "Website Bug", "Login Issue", "Payment Issue", "Email Issue", "General Support"];

export default function CreateTicket() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [visionLoading, setVisionLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    customer_id: "", customerName: "", company: "", issue_title: "",
    description: "", priority: "", category: "", project: "",
  });
  const [customers, setCustomers] = useState([]);
  const [attachments, setAttachments] = useState([]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${process.env.REACT_APP_URL}/customers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const templates = [
    { name: "Email Setup", title: "Email Configuration Issue", category: "Email Issue", priority: "Medium", desc: "User is unable to send/receive emails." },
    { name: "VPN Issue", title: "Cannot connect to VPN", category: "Server Issue", priority: "High", desc: "User is getting a connection timeout when connecting to the VPN." },
    { name: "Password Reset", title: "Password Reset Request", category: "Login Issue", priority: "Medium", desc: "User is locked out and needs a password reset." },
    { name: "Website Down", title: "Website is unresponsive", category: "Website Bug", priority: "Critical", desc: "The main website is returning a 5xx error." }
  ];

  const applyTemplate = (tpl) => {
    setForm(prev => ({
      ...prev,
      issue_title: tpl.title,
      category: tpl.category,
      priority: tpl.priority,
      description: tpl.desc
    }));
  };

  const handleAiClassify = async () => {
    if (!form.description) return alert("Please enter a description first");
    setAiLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${process.env.REACT_APP_URL}/ai/classify`,
        { description: form.description },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setForm((prev) => ({
        ...prev,
        category: res.data.category || prev.category,
        priority: res.data.priority || prev.priority
      }));
    } catch (err) {
      alert("AI Classify failed");
    } finally {
      setAiLoading(false);
    }
  };

  const handleScreenshotUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setVisionLoading(true);
    const formData = new FormData();
    formData.append("screenshot", file);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${process.env.REACT_APP_URL}/ai/analyze-screenshot`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        },
      });

      setForm((prev) => ({
        ...prev,
        issue_title: res.data.issue_title || prev.issue_title,
        description: res.data.description || prev.description,
        category: res.data.category || prev.category,
        priority: res.data.priority || prev.priority
      }));
      alert("✅ Screenshot analyzed and form auto-filled!");
    } catch (err) {
      console.error(err);
      alert("Screenshot analysis failed");
    } finally {
      setVisionLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");

      const submitData = new FormData();
      if (form.customer_id) {
        submitData.append("customer_id", form.customer_id);
      }
      submitData.append("customer_name", form.customerName);
      submitData.append("company", form.company);
      submitData.append("issue_title", form.issue_title);
      submitData.append("description", form.description);
      submitData.append("priority", form.priority);
      submitData.append("category", form.category);
      if (form.project) submitData.append("project", form.project);
      submitData.append("source", "Web Portal");

      Array.from(attachments).forEach(file => {
        submitData.append("attachments", file);
      });

      await axios.post(`${process.env.REACT_APP_URL}/tickets`, submitData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        },
      });
      alert("✅ Ticket raised successfully!");
      navigate("/tickets");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create ticket");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/tickets")}
          className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition">
          <FiArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-blue-900">Create New Ticket</h2>
          <p className="text-gray-400 text-sm">Fill in the details to raise a support ticket</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4 max-w-3xl">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-8 max-w-3xl">
        {/* Templates */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 mb-2 block">Quick Templates</label>
          <div className="flex gap-2 flex-wrap">
            {templates.map(tpl => (
              <button 
                key={tpl.name}
                type="button"
                onClick={() => applyTemplate(tpl)}
                className="bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700 text-xs px-3 py-1.5 rounded-full transition"
              >
                {tpl.name}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="bg-gray-50 p-4 rounded-xl border mb-5">
            <label className="text-sm font-bold text-gray-700 mb-2 block">Link to Customer (Recommended)</label>
            <select
              className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 mb-4"
              value={form.customer_id}
              onChange={(e) => {
                const cId = e.target.value;
                const c = customers.find(x => x.id === Number(cId));
                setForm({ 
                  ...form, 
                  customer_id: cId, 
                  customerName: c ? c.name : form.customerName, 
                  company: c ? (c.company || "") : form.company 
                });
              }}>
              <option value="">-- No Customer Link (Manual Entry) --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ""}</option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Customer Name *</label>
                <input type="text" placeholder="Enter customer name" required
                  className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
                  disabled={!!form.customer_id}
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Company *</label>
                <input type="text" placeholder="Enter company name"
                  className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
                  disabled={!!form.customer_id}
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <h4 className="text-blue-900 font-bold text-sm mb-2">AI Boost</h4>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex-1">
                <p className="text-blue-600 text-xs">Upload an error screenshot and let AI fill the form for you.</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotUpload}
                  className="mt-2 text-xs text-blue-800"
                  id="screenshot-upload"
                />
              </div>
              <div className="h-px sm:h-8 w-full sm:w-px bg-blue-200"></div>
              <div className="flex-1 flex justify-end">
                <button
                  type="button"
                  onClick={handleAiClassify}
                  disabled={aiLoading || !form.description}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50">
                  {aiLoading ? "Classifying..." : "Auto-Classify Text"}
                </button>
              </div>
            </div>
            {visionLoading && (
              <div className="mt-3 flex items-center gap-2 text-blue-700 text-sm font-medium">
                <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full font-bold"></div>
                AI analyzing screenshot...
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Issue Title *</label>
            <input type="text" placeholder="Brief title of the issue" required
              className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
              value={form.issue_title}
              onChange={(e) => setForm({ ...form, issue_title: e.target.value })} />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Description *</label>
            <textarea rows={4} placeholder="Describe the issue in detail..." required
              className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Priority *</label>
              <select required
                className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="">Select Priority</option>
                {priorities.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Category *</label>
              <select required
                className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">Select Category</option>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Project</label>
              <input type="text" placeholder="Project name"
                className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                value={form.project}
                onChange={(e) => setForm({ ...form, project: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Attachments (JPG, PNG, PDF, ZIP)</label>
            <input type="file" multiple
              accept=".jpg,.jpeg,.png,.pdf,.zip"
              className="w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
              onChange={(e) => setAttachments(e.target.files)} />
            {attachments.length > 0 && (
              <p className="text-xs text-blue-600 mt-1">{attachments.length} file(s) selected.</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="bg-blue-700 text-white px-8 py-2.5 rounded-lg font-semibold hover:bg-blue-800 transition text-sm disabled:opacity-60">
              {loading ? "Creating..." : "Create Ticket"}
            </button>
            <button type="button" onClick={() => navigate("/tickets")}
              className="border border-gray-300 text-gray-600 px-8 py-2.5 rounded-lg font-semibold hover:bg-gray-50 transition text-sm">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
