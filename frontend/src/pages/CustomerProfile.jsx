import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { FiArrowLeft, FiMail, FiPhone, FiBriefcase, FiTag, FiClock, FiCheckCircle, FiPlus, FiTrash2, FiX, FiServer } from "react-icons/fi";
import axios from "axios";

export default function CustomerProfile() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAssetModal, setShowAssetModal] = useState(false);
  const [assetForm, setAssetForm] = useState({
    asset_name: "", asset_type: "Domain", purchase_date: "", expiry_date: "", cost: "", supplier: "", notes: ""
  });

  const token = localStorage.getItem("token");

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_URL}/customers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomer(res.data);
    } catch (err) {
      setError("Failed to load customer profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line
  }, [id, token]);

  const handleAddAsset = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${process.env.REACT_APP_URL}/customers/${id}/assets`, assetForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowAssetModal(false);
      setAssetForm({ asset_name: "", asset_type: "Domain", purchase_date: "", expiry_date: "", cost: "", supplier: "", notes: "" });
      fetchProfile();
    } catch (err) {
      alert("Failed to add renewal asset");
    }
  };

  const handleDeleteAsset = async (assetId) => {
    if (!window.confirm("Delete this asset permanently?")) return;
    try {
      await axios.delete(`${process.env.REACT_APP_URL}/customers/assets/${assetId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchProfile();
    } catch (err) {
      alert("Failed to delete asset");
    }
  };

  const handleInvitePortal = async () => {
    try {
      const res = await axios.post(`${process.env.REACT_APP_URL}/customers/${id}/invite-portal`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`✅ Portal Access Created!\nTemp Password: ${res.data.generatedPassword}\n\nPlease share this with the customer.`);
      fetchProfile();
    } catch (err) {
      alert("Failed to create portal access");
    }
  };

  if (loading) return <div className="p-8 text-center text-blue-600">Loading profile...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!customer) return <div className="p-8 text-center text-gray-500">Customer not found.</div>;

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/customers" className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition">
          <FiArrowLeft size={20} />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-blue-900">Customer Profile</h2>
          <p className="text-gray-400 text-sm">Account details, tickets, and history</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Contact Info & Status */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">{customer.name}</h3>
                <span className={`px-2 py-1 mt-1 inline-block rounded-full text-xs font-medium ${
                  customer.status === 'Active' ? 'bg-green-100 text-green-700' :
                  customer.status === 'Churned' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {customer.status || "Active"}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <FiBriefcase className="text-gray-400" />
                <span>{customer.company || "No Company Link"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <FiMail className="text-gray-400" />
                <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">{customer.email || "—"}</a>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <FiPhone className="text-gray-400" />
                <span>{customer.phone || "—"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <FiTag className="text-gray-400" />
                <span>Type: <span className="font-medium">{customer.type}</span></span>
              </div>
            </div>

            {(customer.notes) && (
              <div className="mt-6 pt-6 border-t">
                <h4 className="text-sm font-bold text-gray-700 mb-2">Internal Notes</h4>
                <p className="text-xs text-gray-600 leading-relaxed bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                  {customer.notes}
                </p>
              </div>
            )}
            
            {customer.user ? (
              <div className="mt-6 pt-6 border-t flex items-center gap-2 text-sm text-green-700 font-medium">
                <FiCheckCircle size={16} /> Portal Login Enabled
              </div>
            ) : (
              <div className="mt-6 pt-6 border-t">
                 <button onClick={handleInvitePortal} className="w-full bg-blue-50 text-blue-600 font-bold py-2.5 rounded-xl hover:bg-blue-100 transition text-xs uppercase tracking-widest shadow-inner">
                    Provision Portal Access
                 </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Tickets, AMCs, Billing */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Active AMC / Contracts */}
          {customer.contracts && customer.contracts.length > 0 && (
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FiClock /> Active Contracts & AMCs
              </h3>
              <div className="space-y-3">
                {customer.contracts.map(contract => (
                  <div key={contract.id} className="border rounded-lg p-4 flex justify-between items-center text-sm">
                    <div>
                      <p className="font-bold text-gray-700">Contract #{contract.id}</p>
                      <p className="text-gray-500 text-xs mt-1">
                        {new Date(contract.start_date).toLocaleDateString()} to {new Date(contract.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-800">{contract.hours_used} / {contract.monthly_hours} hrs used</p>
                      <p className="text-xs text-blue-600 font-medium mt-1">{contract.priority_sla} SLA</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tickets History */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">Recent Tickets</h3>
              <Link to={`/tickets?customer=${customer.id}`} className="text-sm text-blue-600 hover:underline">
                View All
              </Link>
            </div>
            <div className="p-0">
              {!customer.tickets || customer.tickets.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">No tickets found for this customer.</div>
              ) : (
                <div className="divide-y">
                  {customer.tickets.slice(0, 5).map(ticket => (
                    <Link to={`/tickets/${ticket.id}`} key={ticket.id} className="block p-4 hover:bg-blue-50 transition">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-blue-900 text-sm">{ticket.ticket_no}</span>
                        <span className="text-xs text-gray-500">{new Date(ticket.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-gray-800 text-sm font-medium mb-2">{ticket.issue_title}</p>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border
                          ${ticket.status === 'Open' ? 'bg-green-50 text-green-700 border-green-200' : 
                            ticket.status === 'Closed' ? 'bg-gray-50 text-gray-600 border-gray-200' : 
                            'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                          {ticket.status}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium border bg-blue-50 text-blue-700 border-blue-200">
                          {ticket.priority}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Renewal Assets */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FiServer /> Renewal Assets
              </h3>
              <button 
                onClick={() => setShowAssetModal(true)}
                className="text-sm bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition font-medium flex items-center gap-1">
                <FiPlus /> Add Asset
              </button>
            </div>
            <div className="p-0">
              {!customer.renewal_assets || customer.renewal_assets.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm border-dashed">
                  No renewal assets currently linked to this customer account.
                </div>
              ) : (
                <div className="divide-y relative">
                  {customer.renewal_assets.map(asset => (
                    <div key={asset.id} className="p-4 hover:bg-gray-50 transition flex justify-between items-center">
                      <div>
                         <p className="font-bold text-gray-800 text-sm">{asset.asset_name}</p>
                         <p className="text-xs text-gray-500 mt-1">
                           <span className="font-medium text-gray-700">{asset.asset_type}</span>
                           {asset.supplier && ` • ${asset.supplier}`}
                         </p>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Expires</p>
                          <p className={`text-sm font-bold ${new Date(asset.expiry_date) < new Date() ? 'text-red-600' : 'text-green-600'}`}>
                            {new Date(asset.expiry_date).toLocaleDateString()}
                          </p>
                        </div>
                        <button onClick={() => handleDeleteAsset(asset.id)} className="text-red-400 hover:text-red-600 p-1 transition" title="Delete Asset">
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Billing History */}
          {customer.billing && customer.billing.length > 0 && (
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Billing History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600 text-xs">
                    <tr>
                      <th className="px-4 py-2">Month</th>
                      <th className="px-4 py-2">Hours Used</th>
                      <th className="px-4 py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.billing.slice(0, 5).map(bill => (
                      <tr key={bill.id} className="border-t">
                        <td className="px-4 py-3">{bill.month}</td>
                        <td className="px-4 py-3">{bill.hours_used}</td>
                        <td className="px-4 py-3">${bill.total_amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Asset Modal */}
      {showAssetModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-blue-900">Add Renewal Asset</h3>
              <button onClick={() => setShowAssetModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleAddAsset} className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Asset Name *</label>
                <input type="text" required placeholder="e.g. example.com" className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-blue-400" value={assetForm.asset_name} onChange={e => setAssetForm({...assetForm, asset_name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Asset Type</label>
                  <select className="w-full border rounded-lg px-3 py-2 text-sm outline-none" value={assetForm.asset_type} onChange={e => setAssetForm({...assetForm, asset_type: e.target.value})}>
                    <option value="Domain">Domain</option>
                    <option value="Hosting">Hosting</option>
                    <option value="SSL Certificate">SSL Certificate</option>
                    <option value="Software License">Software License</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Cost / Amount</label>
                  <input type="number" step="0.01" placeholder="0.00" className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-blue-400" value={assetForm.cost} onChange={e => setAssetForm({...assetForm, cost: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Purchase Date</label>
                  <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm outline-none" value={assetForm.purchase_date} onChange={e => setAssetForm({...assetForm, purchase_date: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Expiry Date *</label>
                  <input type="date" required className="w-full border rounded-lg px-3 py-2 text-sm outline-none" value={assetForm.expiry_date} onChange={e => setAssetForm({...assetForm, expiry_date: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Supplier / Vendor</label>
                <input type="text" placeholder="e.g. GoDaddy" className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-blue-400" value={assetForm.supplier} onChange={e => setAssetForm({...assetForm, supplier: e.target.value})} />
              </div>
              <button type="submit" className="w-full bg-blue-700 text-white font-medium py-2.5 rounded-lg hover:bg-blue-800 transition">Save Asset</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
