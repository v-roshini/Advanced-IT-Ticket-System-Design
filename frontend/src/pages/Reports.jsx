import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line 
} from "recharts";
import { FaFileExcel, FaFilePdf, FaFilter, FaCalendarAlt } from "react-icons/fa";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

const API_URL = `${process.env.REACT_APP_URL}/api` || "http://localhost:5000/api";

const Reports = () => {
  const [activeReport, setActiveReport] = useState("ticket-summary");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    customer_id: "",
    agent_id: "",
    priority: "",
    category: "",
    days: "30"
  });

  const reportsList = [
    { id: "ticket-summary", name: "Ticket Summary" },
    { id: "agent-performance", name: "Agent Performance" },
    { id: "sla-compliance", name: "SLA Compliance" },
    { id: "customer-activity", name: "Customer Activity" },
    { id: "renewal-report", name: "Renewal Report" },
    { id: "amc-utilisation", name: "AMC Utilisation" },
    { id: "revenue-report", name: "Revenue Report" },
    { id: "work-log-report", name: "Work Log Report" },
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams(filters);
      const res = await axios.get(`${API_URL}/reports/${activeReport}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
    } catch (err) {
      console.error("Error fetching report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeReport, filters.days]);

  const handleExportExcel = () => {
    if (!data) return;
    const ws = XLSX.utils.json_to_sheet(Array.isArray(data) ? data : [data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${activeReport}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportPDF = () => {
    if (!data) return;
    const doc = jsPDF();
    doc.text(`Report: ${activeReport.replace("-", " ").toUpperCase()}`, 14, 15);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 25);
    
    const tableData = Array.isArray(data) ? data : [data];
    if (tableData.length > 0) {
      const headers = Object.keys(tableData[0]);
      const body = tableData.map(row => headers.map(h => row[h]));
      doc.autoTable({
        startY: 30,
        head: [headers],
        body: body,
      });
    }
    doc.save(`${activeReport}.pdf`);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const renderReportContent = () => {
    if (loading) return <div className="p-8 text-center text-gray-500">Loading Report Data...</div>;
    if (!data) return <div className="p-8 text-center text-gray-500">No data available for the selected filters.</div>;

    switch (activeReport) {
      case "ticket-summary":
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold mb-4">Tickets by Status</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.summaryByStatus} dataKey="_count.id" nameKey="status" cx="50%" cy="50%" outerRadius={80} label>
                      {data.summaryByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold mb-4">Tickets by Priority</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.summaryByPriority}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="priority" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="_count.id" fill="#8884d8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );

      case "agent-performance":
        return (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Agent</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">Resolved</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">SLA Compliance</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">CSAT Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map(agent => (
                  <tr key={agent.agent_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{agent.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{agent.resolvedCount}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div className={`h-2 rounded-full ${agent.slaCompliance > 80 ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${agent.slaCompliance}%` }}></div>
                        </div>
                        <span className="text-xs font-semibold">{agent.slaCompliance}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-orange-500">{agent.csatScore} / 5.0</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "revenue-report":
        return (
          <div className="space-y-6">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-80">
                <h3 className="text-lg font-semibold mb-4">Revenue Trend</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={Object.entries(data.revenueTrend).map(([key, value]) => ({ month: key, revenue: value }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
          </div>
        );

      // Add more cases for other reports as needed
      default:
        return (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
            <h3 className="text-lg font-semibold mb-4 capitalize">{activeReport.replace("-", " ")}</h3>
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {data && data.length > 0 && Object.keys(data[0]).map(key => (
                    <th key={key} className="px-4 py-3 text-sm font-semibold text-gray-600 capitalize">{key.replace("_", " ")}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Array.isArray(data) ? data.map((row, idx) => (
                  <tr key={idx}>
                    {Object.values(row).map((val, i) => (
                      <td key={i} className="px-4 py-3 text-sm text-gray-600">
                        {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                      </td>
                    ))}
                  </tr>
                )) : <tr><td className="p-4 text-center">Complex data view not implemented for this report yet.</td></tr>}
              </tbody>
            </table>
          </div>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Reports & Analytics</h1>
          <p className="text-gray-500">Business insights and operational performance tracking.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl hover:bg-green-100 transition-all font-medium"
          >
            <FaFileExcel /> Export Excel
          </button>
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-all font-medium"
          >
            <FaFilePdf /> Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Nav */}
        <div className="lg:col-span-1 space-y-2">
          {reportsList.map(report => (
            <button
              key={report.id}
              onClick={() => setActiveReport(report.id)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all font-medium ${
                activeReport === report.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
              }`}
            >
              {report.name}
            </button>
          ))}
        </div>

        {/* Filters & Content */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                <FaCalendarAlt /> Date Range
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={filters.startDate} 
                  onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                />
                <span className="text-gray-400">to</span>
                <input 
                  type="date" 
                  value={filters.endDate} 
                  onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-1">
                <FaFilter /> Quick Filter
              </label>
              <select 
                value={filters.days}
                onChange={(e) => setFilters({...filters, days: e.target.value})}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="365">This Year</option>
              </select>
            </div>

            <div className="flex items-end">
              <button 
                onClick={fetchData}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-all font-medium"
              >
                Apply Filters
              </button>
            </div>
          </div>

          <div className="min-h-[400px]">
            {renderReportContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
