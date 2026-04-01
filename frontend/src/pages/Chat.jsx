import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FiSend, FiUser, FiMessageCircle } from "react-icons/fi";
import { io } from "socket.io-client";

export default function Chat() {
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Admin only feature
  const [showGlobal, setShowGlobal] = useState(false);
  const [globalChats, setGlobalChats] = useState([]);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");
  const chatEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    fetchContacts();

    // Connect to socket
    const socketURL = process.env.REACT_APP_URL ? process.env.REACT_APP_URL.replace("/api", "") : "http://localhost:5000";
    socketRef.current = io(socketURL);
    
    if (user.id) {
      socketRef.current.emit("join", user.id);
    }

    socketRef.current.on("chat_message", (msg) => {
      setMessages(prev => {
        // Find if this new message belongs to our currently open window
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      scrollToBottom();
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off("chat_message");
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (activeContact) {
      fetchMessages(activeContact.id);
    }
  }, [activeContact]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchContacts = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_URL}/chat/contacts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContacts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMessages = async (contactId) => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_URL}/chat/${contactId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalChats = async () => {
    setLoading(true);
    setShowGlobal(true);
    setActiveContact(null);
    try {
      const res = await axios.get(`${process.env.REACT_APP_URL}/chat/admin/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGlobalChats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeContact) return;

    try {
      await axios.post(`${process.env.REACT_APP_URL}/chat/${activeContact.id}`, 
        { message: input },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setInput("");
      // Message is appended via socket, or we could fetchMessages(activeContact.id)
      // fetchMessages(activeContact.id);
    } catch (err) {
      alert("Failed to send message");
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex gap-4">
      {/* Contacts List */}
      <div className="w-1/3 bg-white rounded-xl shadow border overflow-hidden flex flex-col">
        <div className="p-4 border-b bg-blue-50">
          <h2 className="font-bold text-blue-900 text-lg flex items-center gap-2">
            <FiMessageCircle /> Direct Messages
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {contacts.length === 0 ? (
            <p className="p-4 text-center text-gray-400 text-sm">No contacts available.</p>
          ) : (
            contacts.map(c => (
              <button
                key={c.id}
                onClick={() => { setShowGlobal(false); setActiveContact(c); }}
                className={`w-full text-left p-4 border-b hover:bg-gray-50 flex items-center gap-3 transition ${activeContact?.id === c.id ? "bg-blue-50 border-l-4 border-l-blue-600" : ""}`}
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold relative">
                  {c.full_name?.charAt(0)}
                  {c.role === "admin" && <span className="absolute -bottom-1 -right-1 bg-red-500 w-3 h-3 rounded-full border-2 border-white" title="Admin"></span>}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{c.full_name}</p>
                  <p className="text-xs text-blue-600 capitalize">{c.role}</p>
                </div>
              </button>
            ))
          )}
        </div>
        
        {user.role === "admin" && (
          <div className="p-4 border-t bg-gray-50">
            <button 
              onClick={fetchGlobalChats}
              className="w-full bg-red-50 text-red-600 font-bold text-xs py-2 rounded-lg border border-red-200 hover:bg-red-100 transition"
            >
              Monitor All Global Chats
            </button>
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white rounded-xl shadow border overflow-hidden flex flex-col">
        {showGlobal ? (
          // GLOBAL CHATS (Admin Only)
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b bg-red-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-red-900">Global Chat History (Admin Monitor)</h3>
                <p className="text-xs text-red-600">Viewing recent messages across the entire system</p>
              </div>
              <button onClick={() => setShowGlobal(false)} className="text-sm font-bold text-red-600 hover:underline">Close</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {loading ? <p className="text-center text-gray-400 text-sm">Loading...</p> : 
               globalChats.length === 0 ? <p className="text-center text-gray-400 text-sm">No messages found.</p> :
               (
                 <div className="flex flex-col gap-3">
                   {globalChats.map(m => (
                     <div key={m.id} className="bg-white p-3 rounded-lg border shadow-sm text-sm">
                       <div className="flex justify-between items-center border-b pb-2 mb-2">
                         <span className="font-bold text-blue-800 shrink-0">{m.sender?.full_name} <span className="text-[10px] text-gray-400 font-normal ml-1">({m.sender?.role})</span></span>
                         <span className="text-xs text-gray-400 mx-2">▶</span>
                         <span className="font-bold text-green-800 shrink-0">{m.receiver?.full_name} <span className="text-[10px] text-gray-400 font-normal ml-1">({m.receiver?.role})</span></span>
                         <span className="text-xs text-gray-400 ml-auto">{new Date(m.created_at).toLocaleString()}</span>
                       </div>
                       <p className="text-gray-700 whitespace-pre-wrap">{m.message}</p>
                     </div>
                   ))}
                 </div>
               )
              }
            </div>
          </div>
        ) : activeContact ? (
          // ACTIVE DIRECT MESSAGE
          <>
            <div className="p-4 border-b bg-gray-50 flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  {activeContact.full_name?.charAt(0)}
               </div>
               <div>
                  <h3 className="font-bold text-gray-800">{activeContact.full_name}</h3>
                  <p className="text-xs text-gray-500 capitalize">{activeContact.role}</p>
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 flex flex-col gap-3">
              {loading ? (
                <p className="text-center text-gray-400 text-sm">Loading messages...</p>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                  No messages yet. Say hello!
                </div>
              ) : (
                // Filter messages to only show ones involving the active contact (due to socket broad appending)
                messages.filter(m => m.sender_id === activeContact.id || m.receiver_id === activeContact.id).map(m => {
                  const isMe = m.sender_id === user.id;
                  return (
                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] p-3 rounded-2xl shadow-sm text-sm whitespace-pre-wrap ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border rounded-tl-none'}`}>
                        {m.message}
                        <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-4 border-t bg-white flex gap-3">
              <input
                type="text"
                placeholder={`Message ${activeContact.full_name}...`}
                className="flex-1 border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
              >
                <FiSend size={18} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
             <FiMessageCircle size={48} className="text-gray-200 mb-3" />
             <p>Select a contact to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
