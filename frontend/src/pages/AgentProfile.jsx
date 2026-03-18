import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { FiArrowLeft, FiMail, FiPhone, FiBriefcase, FiClock, FiStar, FiCheckCircle } from "react-icons/fi";
import axios from "axios";

export default function AgentProfile() {
  const { id } = useParams();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_URL}/agents/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAgent(res.data);
      } catch (err) {
        setError("Failed to load agent profile.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id, token]);

  if (loading) return <div className="p-8 text-center text-blue-600">Loading profile...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!agent) return <div className="p-8 text-center text-gray-500">Agent not found.</div>;

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/agents" className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition">
          <FiArrowLeft size={20} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-blue-900">Agent Profile</h2>
          <p className="text-gray-400 text-sm">Performance metrics and workload</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Contact Info & Status */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow p-6 border border-gray-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
            <div className="flex flex-col items-center mt-4 mb-6 text-center">
              <div className="w-24 h-24 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-3xl font-bold mb-4">
                {agent.full_name.charAt(0).toUpperCase()}
              </div>
              <h3 className="text-xl font-bold text-gray-800 leading-tight">{agent.full_name}</h3>
              <p className="text-blue-600 font-medium text-sm mt-1">{agent.specialization}</p>
              
              <span className={`px-3 py-1 mt-3 inline-block rounded-full text-xs font-bold uppercase ${
                agent.availability === 'Online' ? 'bg-green-100 text-green-700' :
                agent.availability === 'Busy' ? 'bg-red-100 text-red-700' :
                agent.availability === 'On Leave' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-200 text-gray-700'
              }`}>
                {agent.availability || "Offline"}
              </span>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center"><FiMail className="text-gray-400" /></div>
                <a href={`mailto:${agent.email}`} className="text-blue-600 hover:underline">{agent.email || "—"}</a>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center"><FiPhone className="text-gray-400" /></div>
                <span>{agent.phone || "—"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center"><FiBriefcase className="text-gray-400" /></div>
                <span>Role: <span className="font-medium text-gray-800 capitalize">{agent.role}</span></span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Performance Metrics</h3>
            <div className="space-y-4">
               <div>
                 <div className="flex justify-between text-sm mb-1">
                   <span className="text-gray-500 font-medium">CSAT Score</span>
                   <span className="font-bold text-blue-700 flex items-center gap-1"><FiStar className="text-yellow-400 fill-yellow-400"/> {agent.performance.csat_score} / 5</span>
                 </div>
                 <div className="w-full bg-gray-100 rounded-full h-2">
                   <div className="bg-yellow-400 h-2 rounded-full" style={{ width: agent.performance.csat_score !== 'N/A' ? `${(agent.performance.csat_score / 5) * 100}%` : '0%' }}></div>
                 </div>
               </div>
               
               <div>
                 <div className="flex justify-between text-sm mb-1">
                   <span className="text-gray-500 font-medium">SLA Compliance</span>
                   <span className="font-bold text-green-600">{agent.performance.sla_compliance}</span>
                 </div>
                 <div className="w-full bg-gray-100 rounded-full h-2">
                   <div className="bg-green-500 h-2 rounded-full" style={{ width: agent.performance.sla_compliance !== '100%' ? agent.performance.sla_compliance : '100%' }}></div>
                 </div>
               </div>

               <div className="pt-3 border-t grid grid-cols-2 gap-4">
                 <div className="text-center bg-gray-50 rounded p-3">
                   <span className="block text-gray-400 text-xs font-bold uppercase mb-1">Avg Resolution</span>
                   <span className="font-bold text-gray-800 text-lg">{agent.performance.avg_resolution_time}</span>
                 </div>
                 <div className="text-center bg-green-50 rounded p-3">
                   <span className="block text-green-600/70 text-xs font-bold uppercase mb-1">Completed</span>
                   <span className="font-bold text-green-700 text-lg">{agent.performance.completed_tickets}</span>
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* Right Column: Tickets, AMCs, Billing */}
        <div className="md:col-span-2 space-y-6">
          
          <div className="bg-blue-600 rounded-xl shadow-lg p-6 text-white flex justify-between items-center relative overflow-hidden">
             <div className="relative z-10">
               <h3 className="text-xl font-bold mb-1">Open Tickets Workload</h3>
               <p className="text-blue-200 text-sm">Active tickets currently assigned to {agent.full_name}</p>
             </div>
             <div className="text-4xl font-black relative z-10 px-6 py-2 bg-white/20 rounded-lg shadow-inner">
               {agent.performance.open_tickets}
             </div>
             <FiClock className="absolute -right-4 -bottom-4 text-white/10" size={120} />
          </div>

          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">Assigned Tickets</h3>
              <Link to={`/tickets?agent=${agent.id}`} className="text-sm text-blue-600 hover:underline font-medium">
                View All
              </Link>
            </div>
            <div className="p-0">
              {!agent.tickets || agent.tickets.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">No tickets assigned to this agent.</div>
              ) : (
                <div className="divide-y max-h-[400px] overflow-y-auto">
                  {agent.tickets.map(ticket => (
                    <Link to={`/tickets/${ticket.id}`} key={ticket.id} className="block p-4 hover:bg-blue-50 transition group">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-blue-900 text-sm group-hover:underline">{ticket.ticket_no}</span>
                        <span className="text-xs text-gray-500 font-medium">{new Date(ticket.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-gray-700 text-sm font-medium mb-3 truncate">{ticket.issue_title}</p>
                      <div className="flex items-center justify-between">
                         <div className="flex gap-2">
                           <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border
                             ${ticket.status === 'Open' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                               ticket.status === 'Closed' || ticket.status === 'Resolved' ? 'bg-gray-50 text-gray-600 border-gray-200' : 
                               'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                             {ticket.status?.replace(/_/g, " ")}
                           </span>
                           <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border bg-gray-50 text-gray-600 border-gray-200">
                             {ticket.priority}
                           </span>
                         </div>
                         <span className="text-xs text-gray-400 font-medium">{ticket.company || "No Company"}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><FiCheckCircle className="text-green-600"/> Recent Work Logs</h3>
            </div>
            <div className="p-0">
              {!agent.work_logs || agent.work_logs.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">No recent work logged.</div>
              ) : (
                <div className="divide-y max-h-[300px] overflow-y-auto">
                  {agent.work_logs.map(log => (
                    <div key={log.id} className="p-4 hover:bg-gray-50 transition">
                       <div className="flex justify-between items-center mb-2">
                         <Link to={`/tickets/${log.ticket_id}`} className="text-sm font-bold text-blue-600 hover:underline">
                           {log.ticket?.ticket_no}
                         </Link>
                         <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{log.time_spent}</span>
                       </div>
                       <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded border border-gray-100">
                         {log.description}
                       </p>
                       <div className="text-[10px] text-gray-400 font-bold uppercase mt-2 tracking-wider">
                         {new Date(log.created_at).toLocaleDateString()} • {log.start_time} - {log.end_time}
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
