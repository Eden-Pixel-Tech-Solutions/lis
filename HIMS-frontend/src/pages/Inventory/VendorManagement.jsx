import { useState, useEffect } from 'react';
import Alert from '../../components/Alert';
import { useAlert } from '../../hooks/useAlert';
import '../../assets/CSS/InventoryVendors.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function VendorManagement() {
  const { alert, showAlert, hideAlert } = useAlert();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    vendor_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    gst_number: '',
    payment_terms: '',
    lead_time_days: 7,
    status: 'Active'
  });

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await fetch(`${API_URL}/api/inventory/vendors?${params}`);
      const data = await response.json();
      if (data.success) {
        setVendors(data.data);
      }
    } catch {
      showAlert('error', 'Failed to fetch vendors');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    fetchVendors();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingVendor 
        ? `${API_URL}/api/inventory/vendors/${editingVendor.id}`
        : `${API_URL}/api/inventory/vendors`;
      const method = editingVendor ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        showAlert('success', editingVendor ? 'Vendor updated successfully' : 'Vendor created successfully');
        setShowModal(false);
        resetForm();
        fetchVendors();
      } else {
        showAlert('error', data.message);
      }
    } catch {
      showAlert('error', 'Failed to save vendor');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/inventory/vendors/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        showAlert('success', 'Vendor deleted successfully');
        fetchVendors();
      } else {
        showAlert('error', data.message);
      }
    } catch {
      showAlert('error', 'Failed to delete vendor');
    }
  };

  const handleEdit = (vendor) => {
    setEditingVendor(vendor);
    setFormData({
      vendor_name: vendor.vendor_name,
      contact_person: vendor.contact_person || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      address: vendor.address || '',
      gst_number: vendor.gst_number || '',
      payment_terms: vendor.payment_terms || '',
      lead_time_days: vendor.lead_time_days || 7,
      status: vendor.status
    });
    setShowModal(true);
  };

  const handleAddNew = () => {
    setEditingVendor(null);
    resetForm();
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      vendor_name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      gst_number: '',
      payment_terms: '',
      lead_time_days: 7,
      status: 'Active'
    });
  };

  return (
    <div className="inventory-master">
      {alert && <Alert type={alert.type} message={alert.message} onClose={hideAlert} />}
      
      <div className="inv-header">
        <div className="inv-header-content">
          <h1 className="inv-title">Vendor Management</h1>
          <p className="inv-subtitle">Manage supplier profiles, contact details, and procurement terms</p>
        </div>
        <button className="btn-primary" onClick={handleAddNew}>
          + Add New Vendor
        </button>
      </div>

      <div className="inv-toolbar">
        <div className="inv-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-soft)" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="btn-primary" onClick={handleSearch} style={{ padding: '8px 16px' }}>Search</button>
      </div>

      <div className="inv-card">
        <div className="inv-table-wrapper">
          {loading ? (
            <div className="loading" style={{ padding: '40px', textAlign: 'center' }}>Loading vendors...</div>
          ) : (
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Vendor Code</th>
                  <th>Name</th>
                  <th>Contact Person</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>GST Number</th>
                  <th>Lead Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map(vendor => (
                  <tr key={vendor.id}>
                    <td><strong style={{ color: 'var(--blue-primary)' }}>{vendor.vendor_code}</strong></td>
                    <td><div style={{ fontWeight: 600 }}>{vendor.vendor_name}</div></td>
                    <td>{vendor.contact_person || '-'}</td>
                    <td>{vendor.phone || '-'}</td>
                    <td>{vendor.email || '-'}</td>
                    <td>{vendor.gst_number || '-'}</td>
                    <td>{vendor.lead_time_days} days</td>
                    <td>
                      <span className={`inv-badge ${vendor.status.toLowerCase()}`}>
                        {vendor.status}
                      </span>
                    </td>
                    <td>
                      <button className="action-btn" onClick={() => handleEdit(vendor)} title="Edit">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      </button>
                      <button className="action-btn" onClick={() => handleDelete(vendor.id)} title="Delete" style={{ marginLeft: '8px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Premium Centered Modal */}
      {showModal && (
        <div className="sdm-overlay" onClick={() => setShowModal(false)}>
          <div className="sdm-modal" style={{ maxWidth: '750px' }} onClick={e => e.stopPropagation()}>
            <div className="sdm-header">
              <div className="sdm-header-accent"></div>
              <h2 className="sdm-title">{editingVendor ? 'Edit Vendor Profile' : 'Add New Vendor'}</h2>
              <button className="sdm-close" onClick={() => setShowModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="sdm-body">
              <form id="vendor-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: 0 }}>
                <div className="inv-grid-2">
                  <div className="sdm-field">
                    <label className="sdm-label">Vendor Name <span className="sdm-required">*</span></label>
                    <input 
                      type="text" 
                      className="sdm-input"
                      value={formData.vendor_name}
                      onChange={(e) => setFormData({...formData, vendor_name: e.target.value})}
                      required
                      placeholder="Enter legal business name"
                    />
                  </div>
                  <div className="sdm-field">
                    <label className="sdm-label">Contact Person</label>
                    <input 
                      type="text" 
                      className="sdm-input"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                      placeholder="Main point of contact"
                    />
                  </div>
                </div>

                <div className="inv-grid-2">
                  <div className="sdm-field">
                    <label className="sdm-label">Phone Number</label>
                    <input 
                      type="tel" 
                      className="sdm-input"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                  <div className="sdm-field">
                    <label className="sdm-label">Email Address</label>
                    <input 
                      type="email" 
                      className="sdm-input"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="vendor@example.com"
                    />
                  </div>
                </div>

                <div className="sdm-field">
                  <label className="sdm-label">Full Address</label>
                  <textarea 
                    className="sdm-input sdm-textarea"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Enter complete office or warehouse address"
                  />
                </div>

                <div className="inv-grid-2">
                  <div className="sdm-field">
                    <label className="sdm-label">GST/Tax Number</label>
                    <input 
                      type="text" 
                      className="sdm-input"
                      value={formData.gst_number}
                      onChange={(e) => setFormData({...formData, gst_number: e.target.value})}
                      placeholder="Enter GSTIN"
                    />
                  </div>
                  <div className="sdm-field">
                    <label className="sdm-label">Payment Terms</label>
                    <input 
                      type="text" 
                      className="sdm-input"
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({...formData, payment_terms: e.target.value})}
                      placeholder="e.g., Net 30, Advance"
                    />
                  </div>
                </div>

                <div className="inv-grid-2">
                  <div className="sdm-field">
                    <label className="sdm-label">Standard Lead Time (days)</label>
                    <input 
                      type="number" 
                      className="sdm-input"
                      value={formData.lead_time_days}
                      onChange={(e) => setFormData({...formData, lead_time_days: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="sdm-field">
                    <label className="sdm-label">Status</label>
                    <select 
                      className="sdm-input"
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>

            <div className="sdm-footer">
              <button type="button" className="sdm-btn-cancel" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button type="submit" form="vendor-form" className="sdm-btn-submit">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                {editingVendor ? 'Save Changes' : 'Create Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VendorManagement;
