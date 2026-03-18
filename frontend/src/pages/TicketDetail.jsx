import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSend, FiEdit2, FiCheck, FiX, FiPlus, FiFileText, FiCheckCircle, FiPlay, FiSquare } from "react-icons/fi";
import axios from "axios";

const BASE = process.env.REACT_APP_URL;

const priorityColor = {
  Critical: "bg-red-100 text-red-600",
  High: "bg-orange-100 text-orange-600",
  Medium: "bg-yellow-100 text-yellow-700",
  Low: "bg-green-100 text-green-600",
};

const statusColor = {
  Open: "bg-blue-100 text-blue-600",
  In_Progress: "bg-purple-100 text-purple-600",
  Waiting_on_Customer: "bg-yellow-100 text-yellow-700",
  Waiting_on_Third_Party: "bg-orange-100 text-orange-600",
  Escalated: "bg-red-100 text-red-600",
  On_Hold: "bg-gray-100 text-gray-600",
  Resolved: "bg-green-100 text-green-600",
  Reopened: "bg-pink-100 text-pink-600",
  Closed: "bg-gray-500 text-white",
};

const SLATimer = ({ deadline }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (!deadline) return;
    const timer = setInterval(() => {
      const diff = new Date(deadline) - new Date();
      if (diff <= 0) {
        setTimeLeft("Overdue");
        setIsUrgent(true);
      } else {
        const h = Math.floor(diff / 36e5);
        const m = Math.floor((diff % 36e5) / 6e4);
        setTimeLeft(`${h}h ${m}m left`);
        if (diff < 36e5 * 2) setIsUrgent(true); // Red if < 2 hours
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  if (!deadline) return null;
  return (
    <div className={`mt-2 text-xs font-bold px-3 py-1 rounded inline-block ${isUrgent ? "bg-red-500 text-white animate-pulse" : "bg-green-100 text-green-700"}`}>
      SLA: {timeLeft}
    </div>
  );
};

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [agents, setAgents] = useState([]);
  const [comment, setComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    issue_title: "", description: "", priority: "", category: ""
  });
  const [permissions, setPermissions] = useState([]);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  
  // Timer State
  const [timerOn, setTimerOn] = useState(false);
  const [time, setTime] = useState(0); 
  const [timerStartRef, setTimerStartRef] = useState(null);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const isAdmin = user.role === "admin";

  useEffect(() => {
    fetchTicket();
    if (isAdmin) fetchAgents();
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      if (user.role !== 'admin') {
         const res = await axios.get(`${BASE}/api/admin/permissions`, { headers });
         setPermissions(res.data);
      }
    } catch (e) { console.error(e); }
  };

  const hasPermission = (key) => {
    if (user.role === 'admin') return true;
    return permissions.find(p => p.role === user.role && p.permission_key === key)?.is_enabled ?? true;
  };

  const fetchTicket = async () => {
    try {
      const res = await axios.get(`${BASE}/tickets/${id}`, { headers });
      setTicket(res.data);
      setEditForm({
        issue_title: res.data.issue_title,
        description: res.data.description,
        priority: res.data.priority,
        category: res.data.category || ""
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await axios.get(`${BASE}/agents`, { headers });
      setAgents(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (status) => {
    try {
      await axios.put(`${BASE}/tickets/${id}`,
        { status }, { headers });
      fetchTicket();
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const handleUpdateTicket = async () => {
    try {
      await axios.put(`${BASE}/tickets/${id}`, editForm, { headers });
      setIsEditing(false);
      fetchTicket();
    } catch (err) {
      alert("Failed to update ticket details");
    }
  };

  const handleAssignAgent = async (agent_id) => {
    try {
      await axios.put(`${BASE}/tickets/${id}`,
        { status: ticket.status, agent_id: Number(agent_id) }, { headers });
      fetchTicket();
    } catch (err) {
      alert("Failed to assign agent");
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await axios.post(`${BASE}/tickets/${id}/comments`,
        { message: comment, is_internal: isInternal }, { headers });
      setComment("");
      setIsInternal(false);
      fetchTicket();
    } catch (err) {
      alert("Failed to add comment");
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const formData = new FormData();
    Array.from(files).forEach(f => formData.append("attachments", f));
    try {
      await axios.post(`${BASE}/tickets/${id}/attachments`, formData, {
        headers: { ...headers, "Content-Type": "multipart/form-data" }
      });
      fetchTicket();
    } catch (err) {
      alert("Upload failed");
    }
  };

  // Timer Handlers
  useEffect(() => {
    let interval = null;
    if (timerOn) {
      interval = setInterval(() => setTime(prevTime => prevTime + 10), 10);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerOn]);

  const toggleTimer = async () => {
    if (!timerOn) {
      setTimerOn(true);
      setTimerStartRef(new Date());
    } else {
      setTimerOn(false);
      const endTime = new Date();
      const st = timerStartRef.toTimeString().slice(0,5);
      const et = endTime.toTimeString().slice(0,5);
      
      const desc = window.prompt("Timer stopped! Enter a quick description for this work log:");
      if (desc !== null) {
        try {
          // Send to worklog endpoint using standard calculation logic
          await axios.post(`${BASE}/worklog`, {
            ticket_id: ticket.id,
            start_time: st,
            end_time: et,
            description: desc || "Worked on ticket resolution."
          }, { headers });
          alert("✅ Work log seamlessly tracked and saved!");
        } catch (err) {
          alert("Error saving logged time.");
        }
      }
      fetchTicket();
      setTime(0);
      setTimerStartRef(null);
    }
  };

  const handleApprove = async () => {
    try {
      await axios.put(`${BASE}/tickets/${id}`, { 
        status: "Closed",
        rating: rating,
        rating_comment: ratingComment
      }, { headers });
      fetchTicket();
    } catch (err) { alert("Approval failed"); }
  };

  if (loading) return <div className="p-10 text-center font-bold text-blue-900">Scanning Ticket...</div>;

  if (!ticket) return (
    <div className="text-center py-20 text-gray-400">Ticket not found</div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/tickets")}
          className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition">
          <FiArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-blue-900">
            Ticket #{ticket.ticket_no}
          </h2>
          <p className="text-gray-400 text-sm">
            Created {new Date(ticket.created_at).toLocaleDateString()}
          </p>
          <SLATimer deadline={ticket.deadline} />
        </div>
        
        {/* Agent Live Timer Module */}
        {(user.role === 'admin' || user.role === 'agent') && (
          <div className="ml-auto flex items-center gap-4 bg-white px-5 py-3 rounded-2xl shadow border border-indigo-100">
             <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase font-bold text-gray-400">Live Tracker</span>
                <span className="text-xl font-mono font-bold text-indigo-700">
                  {("0" + Math.floor((time / 60000) % 60)).slice(-2)}:
                  {("0" + Math.floor((time / 1000) % 60)).slice(-2)}
                </span>
             </div>
             <button onClick={toggleTimer} 
               className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition transform hover:scale-105 ${timerOn ? 'bg-red-500 shadow-red-200' : 'bg-green-500 shadow-green-200'}`}>
                {timerOn ? <FiSquare size={18} /> : <FiPlay size={18} className="ml-1" />}
             </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left — Main Info */}
        <div className="col-span-2 flex flex-col gap-5">

          {/* Issue Details */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-start mb-2">
              {isEditing ? (
                <input
                  type="text"
                  className="font-bold text-gray-800 text-lg w-full border-b pb-1 outline-none mr-4"
                  value={editForm.issue_title}
                  onChange={(e) => setEditForm({ ...editForm, issue_title: e.target.value })}
                />
              ) : (
                <h3 className="font-bold text-gray-800 text-lg">{ticket.issue_title}</h3>
              )}
              
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-gray-400 hover:text-blue-600 transition"
                  title="Edit Ticket"
                >
                  <FiEdit2 size={18} />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={handleUpdateTicket} className="text-green-600 hover:bg-green-50 p-1 rounded"><FiCheck size={18}/></button>
                  <button onClick={() => {
                    setIsEditing(false);
                    setEditForm({
                      issue_title: ticket.issue_title,
                      description: ticket.description,
                      priority: ticket.priority,
                      category: ticket.category || ""
                    });
                  }} className="text-red-500 hover:bg-red-50 p-1 rounded"><FiX size={18}/></button>
                </div>
              )}
            </div>

            <div className="flex gap-2 mb-4">
              {isEditing ? (
                <>
                  <select
                    className="border rounded px-2 py-1 text-xs outline-none"
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Category"
                    className="border rounded px-2 py-1 text-xs outline-none"
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  />
                </>
              ) : (
                <>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${priorityColor[ticket.priority]}`}>
                    {ticket.priority}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor[ticket.status]}`}>
                    {ticket.status?.replace("_", " ")}
                  </span>
                  {ticket.category && (
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs">
                      {ticket.category}
                    </span>
                  )}
                </>
              )}
            </div>
            
            {isEditing ? (
              <textarea
                className="w-full border rounded-lg p-2 text-sm text-gray-600 outline-none"
                rows="4"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            ) : (
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
            )}
          </div>

          {/* Comments */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-blue-900 mb-4">
              Comments ({ticket.comments?.length || 0})
            </h3>

            <div className="flex flex-col gap-3 mb-5 max-h-96 overflow-y-auto pr-2">
              {ticket.comments?.length === 0 ? (
                <p className="text-gray-400 text-sm">No comments yet.</p>
              ) : (
                ticket.comments?.map((c) => (
                  <div key={c.id} className={`rounded-xl p-4 ${c.is_internal ? "bg-yellow-50 border border-yellow-100" : "bg-blue-50"}`}>
                    <div className="flex justify-between mb-1">
                      <span className={`font-medium text-sm flex items-center gap-2 ${c.is_internal ? "text-yellow-800" : "text-blue-800"}`}>
                        {c.user?.full_name || "Unknown"}
                        {c.is_internal && <span className="bg-yellow-200 text-yellow-900 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-tight">Internal Note</span>}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(c.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm">{c.message}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment */}
            {hasPermission('can_add_comment') && (
              <form onSubmit={handleComment} className="flex flex-col gap-2">
                <textarea
                  placeholder="Type your message..."
                  className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  rows="2"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)} />
                <div className="flex justify-between items-center">
                  {(user.role === 'admin' || user.role === 'agent') && (
                    <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                      <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                      Post as Internal Note
                    </label>
                  )}
                  <button type="submit"
                    className="bg-blue-700 text-white px-6 py-2 rounded-xl hover:bg-blue-800 transition flex items-center gap-2 text-sm font-medium ml-auto">
                    <FiSend size={14} /> Send
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Activity Timeline */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-blue-900 mb-4">Activity Timeline</h3>
            <div className="relative border-l-2 border-blue-50 ml-2 pl-6 flex flex-col gap-6">
              {ticket.audit_logs?.map((log) => (
                <div key={log.id} className="relative">
                  <div className="absolute -left-[31px] top-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></div>
                  <p className="text-sm font-bold text-gray-800">{log.action}</p>
                  <p className="text-xs text-gray-500 mb-1">{log.details}</p>
                  <p className="text-[10px] text-gray-400">
                    By {log.user?.full_name || "System"} • {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Actions */}
        <div className="flex flex-col gap-5">
          {/* Attachments */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-blue-900">Attachments</h3>
              <label className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg cursor-pointer transition">
                <FiPlus size={18} />
                <input type="file" multiple className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
            <div className="flex flex-col gap-2">
              {ticket.attachments?.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No files attached.</p>
              ) : (
                ticket.attachments?.map((atk) => (
                  <a key={atk.id} 
                    href={`${process.env.REACT_APP_URL}/uploads/${atk.file_path}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-2 p-2 rounded-lg border border-transparent hover:border-blue-200 hover:bg-blue-50 transition"
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center text-blue-600">
                      <FiFileText size={16} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-medium text-gray-800 truncate" title={atk.file_name}>{atk.file_name}</p>
                      <p className="text-[10px] text-gray-400 uppercase">{atk.file_type.split("/")[1]}</p>
                    </div>
                  </a>
                ))
              )}
            </div>
          </div>

          {/* Ticket Info */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-blue-900 mb-4">Ticket Info</h3>
            <div className="flex flex-col gap-3 text-sm">
              {[
                { label: "Customer", value: ticket.customer_name || "—" },
                { label: "Company", value: ticket.company || "—" },
                { label: "Project", value: ticket.project || "—" },
                { label: "Category", value: ticket.category || "—" },
                { label: "Source", value: ticket.source || "Web Portal" },
              ].map((info) => (
                <div key={info.label} className="flex justify-between">
                  <span className="text-gray-500">{info.label}:</span>
                  <span className="font-medium text-gray-800">{info.value}</span>
                </div>
              ))}
              {ticket.parent && (
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="text-gray-500">Related to:</span>
                  <button onClick={() => navigate(`/tickets/${ticket.parent.id}`)} className="text-blue-600 hover:underline font-bold">
                    #{ticket.parent.ticket_no}
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Linked Tickets (Children) */}
          {ticket.related?.length > 0 && (
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-semibold text-blue-900 mb-2">Linked Tickets</h3>
              <div className="flex flex-col gap-2">
                {ticket.related.map(rel => (
                  <button key={rel.id} onClick={() => navigate(`/tickets/${rel.id}`)}
                    className="text-left p-2 rounded border border-gray-100 hover:bg-gray-50 text-xs font-medium text-gray-700">
                    <span className="text-blue-600 block">#{rel.ticket_no}</span>
                    {rel.issue_title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Update Status — Admin & Agent only */}
          {(user.role === "admin" || user.role === "agent") ? (
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-semibold text-blue-900 mb-3">Update Status</h3>
              <div className="flex flex-col gap-2">
                {[
                  "Open", "In_Progress", "Waiting_on_Customer", 
                  "Waiting_on_Third_Party", "Escalated", "On_Hold", 
                  "Resolved", "Reopened", "Closed"
                ].map((s) => (
                  <button key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`py-2 px-3 rounded-lg text-left text-xs font-medium transition flex items-center justify-between
                      ${ticket.status === s
                        ? "bg-blue-700 text-white shadow-md shadow-blue-200"
                        : "bg-gray-50 text-gray-700 hover:bg-blue-50 hover:text-blue-700 border"}`}>
                    {s.replace(/_/g, " ")}
                    {ticket.status === s && <FiCheckCircle size={14} />}
                  </button>
                ))}
              </div>
            </div>
          ) : user.role === "client" && ticket.status === "Resolved" ? (
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-semibold text-blue-900 mb-3 text-center">Ticket Resolved</h3>
              <p className="text-xs text-gray-500 mb-4 text-center">The agent marked this as resolved. Does this solve your issue?</p>
              <div className="flex flex-col gap-2">
                {user.role === 'client' && ticket.status === 'Resolved' && (
                  <div className="bg-white rounded-2xl p-6 border-2 border-green-100 shadow-xl shadow-green-900/10 mb-4">
                     <h4 className="text-center font-black text-green-700 uppercase tracking-widest text-[10px] mb-4">Rate your Experience</h4>
                     <div className="flex justify-center gap-2 mb-4 text-2xl">
                        {[1,2,3,4,5].map(s => (
                           <button key={s} onClick={() => setRating(s)} className={rating >= s ? "text-yellow-400" : "text-gray-200"}>★</button>
                        ))}
                     </div>
                     <textarea 
                        className="w-full bg-gray-50 border-none rounded-xl p-3 text-xs outline-none mb-4" 
                        placeholder="Any feedback for the team?"
                        value={ratingComment}
                        onChange={e => setRatingComment(e.target.value)}
                     />
                     <button onClick={handleApprove} className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition shadow-lg shadow-green-100">
                        Approve & Close Ticket
                     </button>
                  </div>
                )}
                <button 
                  onClick={() => handleStatusChange("Reopened")}
                  className="bg-red-50 text-red-600 py-2 rounded-lg text-sm font-bold hover:bg-red-100 transition">
                  Not Resolved (Reopen)
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-semibold text-blue-900 mb-3">Status</h3>
              <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${statusColor[ticket.status]}`}>
                {ticket.status?.replace(/_/g, " ")}
              </span>
            </div>
          )}

          {/* Assign Agent — Admin only */}
          {isAdmin ? (
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-semibold text-blue-900 mb-3">Assign Agent</h3>
              <select
                className="w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                value={ticket.agent_id || ""}
                onChange={(e) => handleAssignAgent(e.target.value)}>
                <option value="">Unassigned</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.full_name}</option>
                ))}
              </select>
              {ticket.agent && (
                <p className="text-xs text-green-600 mt-2">
                  ✅ Assigned to: {ticket.agent.full_name}
                </p>
              )}
            </div>
          ) : ticket.agent ? (
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-semibold text-blue-900 mb-2">Assigned Agent</h3>
              <p className="text-sm text-green-700 font-medium">✅ {ticket.agent.full_name}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
