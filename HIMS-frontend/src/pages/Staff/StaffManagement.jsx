import { useState, useEffect } from 'react';
import Alert from '../../components/Alert';
import { useAlert } from '../../hooks/useAlert';
import '../../assets/CSS/StaffManagement.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://172.16.11.160:7005';

const ROLES = ['Doctor', 'Receptionist', 'HR', 'Admin', 'Lab Technician'];

function StaffManagement() {
  const { alert, showAlert, hideAlert } = useAlert();
  const [stats, setStats] = useState({});
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'Doctor',
    department: '',
    staffId: 'STF-' + Math.floor(1000 + Math.random() * 9000),
    password: 'password123' // Default password for now
  });

  // Fetch departments from backend
  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/departments?is_active=true`);
      const data = await res.json();
      if (data.success) {
        const deptNames = data.departments.map(d => d.name);
        setDepartments(deptNames);
        // Set default department to first one
        setFormData(prev => ({ ...prev, department: deptNames[0] || '' }));
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchStats();
    fetchStaff();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/staff/stats`);
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (err) { console.error('Error fetching stats:', err); }
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/staff/list`);
      const data = await res.json();
      if (data.success) setStaff(data.staff);
    } catch (err) { console.error('Error fetching staff list:', err); }
    finally { setLoading(false); }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/staff/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        showAlert('Staff member added successfully!', 'success');
        setShowAddModal(false);
        setFormData({
          firstName: '', lastName: '', email: '', phone: '',
          role: 'Doctor', department: departments[0] || '',
          staffId: 'STF-' + Math.floor(1000 + Math.random() * 9000),
          password: 'password123'
        });
        fetchStats();
        fetchStaff();
      } else {
        showAlert(data.message || 'Error adding staff', 'error');
      }
    } catch (err) {
      console.error('Error:', err);
      showAlert('Network error adding staff.', 'error');
    }
  };

  const filteredStaff = staff.filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.staff_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {alert && (
        <Alert
          message={alert.message}
          type={alert.type}
          onClose={hideAlert}
          duration={4000}
        />
      )}
      <div className="staff-page">
        <div className="staff-header">
          <div>
            <h1>Employee Management</h1>
            <p>Manage hospital personnel and monitor role distribution</p>
          </div>
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add New Staff
          </button>
        </div>

        {/* Stats Section */}
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Staff</span>
            <span className="stat-value">{staff.length}</span>
          </div>
          {ROLES.map(role => (
            <div className="stat-card" key={role}>
              <span className="stat-label">{role}s</span>
              <span className="stat-value">{stats[role] || 0}</span>
            </div>
          ))}
        </div>

        {/* Staff Directory Table */}
        <div className="staff-table-card">
          <div className="table-toolbar">
            <div className="search-input-wrapper">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="preg-input"
                placeholder="Search by name, email or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="staff-table-wrapper">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Full Name</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Email</th>
                  <th>Joined Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>Loading staff records...</td></tr>
                ) : filteredStaff.length > 0 ? (
                  filteredStaff.map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 600, color: 'var(--brand-blue)' }}>{s.staff_id}</td>
                      <td>{s.first_name} {s.last_name}</td>
                      <td>
                        <span className={`role-badge role-${s.role.toLowerCase().replace(' ', '-')}`}>
                          {s.role}
                        </span>
                      </td>
                      <td>{s.department}</td>
                      <td>{s.email}</td>
                      <td>{new Date(s.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>No staff members found matching your search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Staff Modal */}
        {showAddModal && (
          <div className="sdm-overlay" onClick={() => setShowAddModal(false)}>
            <div className="sdm-modal" onClick={e => e.stopPropagation()}>
              <div className="sdm-header">
                <div className="sdm-header-accent"></div>
                <h3 className="sdm-title">Create New Staff Member</h3>
                <button className="sdm-close" onClick={() => setShowAddModal(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleAddStaff}>
                <div className="sdm-body">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="sdm-field">
                      <label className="sdm-label">First Name <span className="sdm-required">*</span></label>
                      <input type="text" className="sdm-input" name="firstName" value={formData.firstName} onChange={handleInputChange} required placeholder="e.g. John" />
                    </div>
                    <div className="sdm-field">
                      <label className="sdm-label">Last Name <span className="sdm-required">*</span></label>
                      <input type="text" className="sdm-input" name="lastName" value={formData.lastName} onChange={handleInputChange} required placeholder="e.g. Doe" />
                    </div>
                  </div>
                  
                  <div className="sdm-field">
                    <label className="sdm-label">Staff ID (Manual/Auto) <span className="sdm-required">*</span></label>
                    <input type="text" className="sdm-input" name="staffId" value={formData.staffId} onChange={handleInputChange} required />
                  </div>

                  <div className="sdm-field">
                    <label className="sdm-label">Official Email <span className="sdm-required">*</span></label>
                    <div className="sdm-input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                      </svg>
                      <input type="email" className="sdm-input sdm-input-padded" name="email" value={formData.email} onChange={handleInputChange} required placeholder="john.doe@hospital.com" />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="sdm-field">
                      <label className="sdm-label">Designation / Role <span className="sdm-required">*</span></label>
                      <select className="sdm-input" name="role" value={formData.role} onChange={handleInputChange}>
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="sdm-field">
                      <label className="sdm-label">Department <span className="sdm-required">*</span></label>
                      <select className="sdm-input" name="department" value={formData.department} onChange={handleInputChange}>
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="sdm-field">
                    <label className="sdm-label">Initial Password <span className="sdm-required">*</span></label>
                    <input type="text" className="sdm-input" name="password" value={formData.password} onChange={handleInputChange} required />
                  </div>
                </div>
                <div className="sdm-footer">
                  <button type="button" className="sdm-btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button type="submit" className="sdm-btn-submit">
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                     </svg>
                     Register Staff
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default StaffManagement;
