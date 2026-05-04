import { useState, useEffect } from 'react';
import Alert from '../../components/Alert';
import { useAlert } from '../../hooks/useAlert';
import Select from 'react-select';
import { fetchWithBranchContext, appendBranchContext } from '../../utils/branchContext';
import '../../assets/CSS/InventoryVendors.css'; // Reusing glassmorphic CSS

const API_URL = import.meta.env.VITE_API_URL || 'http://172.16.11.160:7005';

function InventoryTransfers() {
  const { alert, showAlert, hideAlert } = useAlert();
  const [transfers, setTransfers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [items, setItems] = useState([]);
  const [batches, setBatches] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const initialFormState = {
    from_branch_id: '',
    to_branch_id: '',
    notes: '',
    items: [{ item_id: '', batch_id: '', quantity: '' }]
  };

  const [formData, setFormData] = useState(initialFormState);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const result = await fetchWithBranchContext('/api/v2/inventory/transfers');
      if (result.success) {
        setTransfers(result.data);
      }
    } catch {
      showAlert('error', 'Failed to fetch transfers');
    }
    setLoading(false);
  };

  const fetchDropdownData = async () => {
    try {
      const [infraRes, itemsRes, batchesRes] = await Promise.all([
        fetch(`${API_URL}/api/branches`),
        fetch(`${API_URL}/api/v2/inventory/items`),
        fetch(`${API_URL}/api/v2/inventory/batches`)
      ]);
      const infraData = await infraRes.json();
      const itemsData = await itemsRes.json();
      const batchesData = await batchesRes.json();
      
      if (infraData.success) {
        setBranches((infraData.branches || []).map(b => ({
          ...b,
          name: b.branch_name
        })));
      }
      if (itemsData.success) setItems(itemsData.data);
      if (batchesData.success) {
        // Sort batches by expiry date ASC to support FIFO suggestion
        const sortedBatches = batchesData.data.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
        setBatches(sortedBatches);
      }
    } catch {
      showAlert('error', 'Failed to load reference data');
    }
  };

  useEffect(() => {
    fetchTransfers();
    fetchDropdownData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/v2/inventory/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          created_by: 1 // Mock user ID for now
        })
      });

      const data = await response.json();
      if (data.success) {
        showAlert('success', 'Transfer request created successfully');
        setIsDrawerOpen(false);
        setFormData(initialFormState);
        fetchTransfers();
      } else {
        showAlert('error', data.message);
      }
    } catch {
      showAlert('error', 'Failed to create transfer');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const response = await fetch(`${API_URL}/api/v2/inventory/transfers/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, user_id: 1 })
      });
      const data = await response.json();
      if (data.success) {
        showAlert('success', `Transfer status updated to ${status}`);
        fetchTransfers();
      } else {
        showAlert('error', data.message);
      }
    } catch {
      showAlert('error', 'Failed to update transfer status');
    }
  };

  const handleAddNew = () => {
    setFormData(initialFormState);
    setIsDrawerOpen(true);
  };

  const addLineItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { item_id: '', batch_id: '', quantity: '' }]
    });
  };

  const updateLineItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    // Auto-select first available batch (FIFO) if item changes
    if (field === 'item_id') {
      const availableBatches = batches.filter(b => b.item_id === value && b.branch_id === formData.from_branch_id && b.status === 'Active');
      if (availableBatches.length > 0) {
        newItems[index].batch_id = availableBatches[0].id; // Suggest earliest expiry (since we sorted earlier)
      } else {
        newItems[index].batch_id = '';
      }
    }
    setFormData({ ...formData, items: newItems });
  };

  const removeLineItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const getStatusBadge = (status) => {
    const styles = {
      PENDING: { bg: '#fefce8', color: '#ca8a04' },
      APPROVED: { bg: '#dbeafe', color: '#2563eb' },
      IN_TRANSIT: { bg: '#f3e8ff', color: '#9333ea' },
      COMPLETED: { bg: '#dcfce7', color: '#166534' },
      CANCELLED: { bg: '#fee2e2', color: '#dc2626' }
    };
    const s = styles[status] || styles.PENDING;
    return <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, background: s.bg, color: s.color }}>{status}</span>;
  };

  const selectStyles = {
    control: (base) => ({
      ...base,
      background: 'var(--bg-input)',
      borderColor: 'var(--border-light)',
      borderRadius: 'var(--radius-sm)',
      padding: '2px',
      fontSize: '14px',
      boxShadow: 'none',
      '&:hover': { borderColor: 'var(--blue-primary)' }
    })
  };

  return (
    <div className="inv-vendor-page">
      {alert && <Alert type={alert.type} message={alert.message} onClose={hideAlert} />}
      
      <div className="inv-header">
        <div>
          <h1 className="inv-title">Stock Transfer Operations</h1>
          <p className="inv-subtitle">Manage internal supply chain across multiple lab branches</p>
        </div>
        <button className="btn-primary" onClick={handleAddNew}>
          + New Transfer Request
        </button>
      </div>

      <div className="inv-card">
        <table className="inv-table">
          <thead>
            <tr>
              <th>Transfer Ref #</th>
              <th>From Branch</th>
              <th>To Branch</th>
              <th>Status</th>
              <th>Requested By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{textAlign: 'center'}}>Loading transfers...</td></tr>
            ) : transfers.length === 0 ? (
              <tr><td colSpan="6" style={{textAlign: 'center'}}>No transfers found.</td></tr>
            ) : (
              transfers.map(txn => (
                <tr key={txn.id}>
                  <td>
                    <div style={{fontWeight: 600, color: 'var(--text-dark)'}}>{txn.transfer_number}</div>
                    <div style={{fontSize: '12px', color: 'var(--text-soft)'}}>{new Date(txn.created_at).toLocaleDateString()}</div>
                  </td>
                  <td><span style={{fontWeight: 600}}>{txn.from_branch_name}</span></td>
                  <td><span style={{fontWeight: 600}}>{txn.to_branch_name}</span></td>
                  <td>{getStatusBadge(txn.status)}</td>
                  <td>{txn.created_by_name}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {txn.status === 'PENDING' && (
                        <>
                          <button onClick={() => updateStatus(txn.id, 'APPROVED')} className="btn-primary" style={{padding: '4px 8px', fontSize: '12px'}}>Approve</button>
                          <button onClick={() => updateStatus(txn.id, 'CANCELLED')} className="btn-secondary" style={{padding: '4px 8px', fontSize: '12px', color: 'red'}}>Cancel</button>
                        </>
                      )}
                      {txn.status === 'APPROVED' && (
                        <button onClick={() => updateStatus(txn.id, 'IN_TRANSIT')} className="btn-primary" style={{padding: '4px 8px', fontSize: '12px', background: '#9333ea'}}>Dispatch</button>
                      )}
                      {txn.status === 'IN_TRANSIT' && (
                        <button onClick={() => updateStatus(txn.id, 'COMPLETED')} className="btn-primary" style={{padding: '4px 8px', fontSize: '12px', background: '#166534'}}>Receive</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Premium Centered Modal */}
      {isDrawerOpen && (
        <div className="sdm-overlay" onClick={() => setIsDrawerOpen(false)}>
          <div 
            className="sdm-modal" 
            style={{ maxWidth: '850px' }} 
            onClick={e => e.stopPropagation()}
          >
            <div className="sdm-header">
              <div className="sdm-header-accent"></div>
              <h2 className="sdm-title">New Stock Transfer Request</h2>
              <button className="sdm-close" onClick={() => setIsDrawerOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="sdm-body">
              <form id="transfer-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ marginBottom: '14px', fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Routing Information
                  </h4>
                  <div className="inv-grid-2">
                    <div className="sdm-field">
                      <label className="sdm-label">Source Branch (From) <span className="sdm-required">*</span></label>
                      <Select
                        options={branches.map(b => ({ value: b.id, label: b.name }))}
                        value={formData.from_branch_id ? { value: formData.from_branch_id, label: branches.find(b => b.id === formData.from_branch_id)?.name } : null}
                        onChange={(selected) => {
                          setFormData({...formData, from_branch_id: selected ? selected.value : '', items: [{ item_id: '', batch_id: '', quantity: '' }]});
                        }}
                        required
                        styles={selectStyles}
                      />
                    </div>

                    <div className="sdm-field">
                      <label className="sdm-label">Destination Branch (To) <span className="sdm-required">*</span></label>
                      <Select
                        options={branches.filter(b => b.id !== formData.from_branch_id).map(b => ({ value: b.id, label: b.name }))}
                        value={formData.to_branch_id ? { value: formData.to_branch_id, label: branches.find(b => b.id === formData.to_branch_id)?.name } : null}
                        onChange={(selected) => setFormData({...formData, to_branch_id: selected ? selected.value : ''})}
                        required
                        styles={selectStyles}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h4 style={{ fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Transfer Items
                    </h4>
                    <button 
                      type="button" 
                      onClick={addLineItem} 
                      style={{ 
                        background: '#eff6ff', 
                        color: '#2563eb', 
                        border: '1px solid #bfdbfe', 
                        padding: '6px 14px', 
                        borderRadius: '8px', 
                        cursor: 'pointer', 
                        fontWeight: 700, 
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Add Another Item
                    </button>
                  </div>

                  <div className="inv-table-wrapper" style={{ borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <table className="inv-table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th style={{ width: '35%', background: '#f8fafc' }}>Item</th>
                          <th style={{ width: '40%', background: '#f8fafc' }}>FIFO Batch (Available Qty)</th>
                          <th style={{ width: '15%', background: '#f8fafc' }}>Qty</th>
                          <th style={{ width: '10%', background: '#f8fafc' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.items.map((lineItem, index) => {
                          const availableBatches = batches.filter(b => b.item_id === lineItem.item_id && b.branch_id === formData.from_branch_id && b.status === 'Active');
                          return (
                            <tr key={index}>
                              <td>
                                <Select
                                  options={items.map(i => ({ value: i.id, label: i.item_name }))}
                                  value={lineItem.item_id ? { value: lineItem.item_id, label: items.find(i => i.id === lineItem.item_id)?.item_name } : null}
                                  onChange={(selected) => updateLineItem(index, 'item_id', selected ? selected.value : '')}
                                  required
                                  styles={selectStyles}
                                  isDisabled={!formData.from_branch_id}
                                />
                              </td>
                              <td>
                                <Select
                                  options={availableBatches.map(b => ({ value: b.id, label: `${b.batch_number} (Qty: ${b.quantity_available})` }))}
                                  value={lineItem.batch_id ? { value: lineItem.batch_id, label: availableBatches.find(b => b.id === lineItem.batch_id)?.batch_number + ' (Qty: ' + availableBatches.find(b => b.id === lineItem.batch_id)?.quantity_available + ')' } : null}
                                  onChange={(selected) => updateLineItem(index, 'batch_id', selected ? selected.value : '')}
                                  required
                                  styles={selectStyles}
                                  isDisabled={!lineItem.item_id}
                                  placeholder="Select Batch..."
                                />
                              </td>
                              <td>
                                <input 
                                  type="number" 
                                  className="sdm-input" 
                                  style={{ padding: '8px' }}
                                  min="1" 
                                  required 
                                  value={lineItem.quantity} 
                                  onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || '')} 
                                />
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <button 
                                  type="button" 
                                  onClick={() => removeLineItem(index)} 
                                  style={{ 
                                    background: '#fef2f2', 
                                    border: '1px solid #fee2e2', 
                                    color: '#ef4444', 
                                    cursor: 'pointer', 
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseOver={(e) => e.currentTarget.style.background = '#fee2e2'}
                                  onMouseOut={(e) => e.currentTarget.style.background = '#fef2f2'}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="sdm-field">
                  <label className="sdm-label">Notes / Justification</label>
                  <textarea 
                    className="sdm-input sdm-textarea" 
                    value={formData.notes} 
                    onChange={e => setFormData({...formData, notes: e.target.value})} 
                    placeholder="Provide a reason for this transfer request..." 
                  />
                </div>

              </form>
            </div>
            
            <div className="sdm-footer">
              <button type="button" className="sdm-btn-cancel" onClick={() => setIsDrawerOpen(false)}>
                Cancel
              </button>
              <button type="submit" form="transfer-form" className="sdm-btn-submit">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InventoryTransfers;
