import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from "recharts";
import { FaFileExcel, FaFilePdf, FaHandPointer } from "react-icons/fa";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

const API_URL = `${process.env.REACT_APP_URL}/api` || "http://localhost:5000/api";

const CustomerReports = () => {
  const [activeReport, setActiveReport] = useState("my-tickets");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const reportsList = [
    { id: "my-tickets", name: "My Tickets Summary" },
    { id: "work-hours", name: "Work Hours Statement" },
    { id: "billing-statement", name: "Billing Statement" },
    { id: "asset-renewals", name: "Asset Renewal Report" },
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/reports/customer/${activeReport}`, {
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
  }, [activeReport]);

  const handleExportExcel = () => {
    if (!data) return;
    const ws = XLSX.utils.json_to_sheet(Array.isArray(data) ? data : [data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${activeReport}_report.xlsx`);
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Personalized Reports</h1>
          <p className="text-gray-500 font-medium">Tracking your service history, resource usage and billing details.</p>
        </div>
        <button 
          onClick={handleExportExcel}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-semibold shadow-xl shadow-blue-100"
        >
          <FaFileExcel className="text-lg" /> Export to Excel
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {reportsList.map(report => (
          <button
            key={report.id}
            onClick={() => setActiveReport(report.id)}
            className={`whitespace-nowrap px-6 py-3 rounded-2xl transition-all font-bold text-sm border-2 ${
              activeReport === report.id 
              ? 'bg-blue-50 border-blue-600 text-blue-700' 
              : 'bg-white border-transparent text-gray-600 hover:border-gray-200'
            }`}
          >
            {report.name}
          </button>
        ))}
      </div>

      <div className="min-h-[500px]">
        {loading ? (
             <div className="flex items-center justify-center p-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
             </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {activeReport === "my-tickets" && data && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <h3 className="text-xl font-bold mb-6 text-gray-800">Ticket Breakdown</h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                            <Pie 
                                data={data} 
                                dataKey="_count.id" 
                                nameKey="status" 
                                cx="50%" cy="50%" 
                                innerRadius={60} outerRadius={100} 
                                paddingAngle={5}
                            >
                              {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                            <Legend iconType="circle" />
                         </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     {data.map((item, idx) => (
                       <div key={idx} className="bg-white p-6 rounded-3xl border border-gray-100 flex flex-col justify-center">
                          <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">{item.status.replace("_", " ")}</span>
                          <span className="text-4xl font-black text-gray-900 mt-1">{item._count.id}</span>
                       </div>
                     ))}
                  </div>
               </div>
             )}

             {activeReport !== "my-tickets" && (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                   <div className="overflow-x-auto">
                   <table className="w-full text-left">
                      <thead className="bg-gray-50/50 border-b border-gray-100">
                        <tr>
                          {data && data.length > 0 && Object.keys(data[0]).map(key => (
                             <th key={key} className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-widest">{key.replace("_", " ")}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data && data.length > 0 ? data.map((row, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                            {Object.values(row).map((val, i) => (
                              <td key={i} className="px-6 py-5 text-sm font-semibold text-gray-700">
                                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                              </td>
                            ))}
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan="100%" className="p-20 text-center text-gray-400 font-medium">
                               <FaHandPointer className="mx-auto mb-4 text-4xl opacity-20" />
                               No records found for this report.
                            </td>
                          </tr>
                        )}
                      </tbody>
                   </table>
                   </div>
                </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerReports;
