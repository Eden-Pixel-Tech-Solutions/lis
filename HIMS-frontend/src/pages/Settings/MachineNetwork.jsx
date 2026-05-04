import React, { useState } from 'react';
import Alert from '../../components/Alert';
import { useAlert } from '../../hooks/useAlert';
import '../../assets/CSS/MachineNetwork.css';

const MACHINE_DATA = [
  {
    branchName: 'Central Hospital - Main Lab',
    machines: [
      { id: 'M-101', name: 'Merilyzer CliniQuant Micro', type: 'Semi automatic Biochemistry analyser', status: 'Online', testsDone: 1450 },
      { id: 'M-102', name: 'Merilyzer CelQuant Edge', type: '3 part hematology Analyser', status: 'Online', testsDone: 2340 },
      { id: 'M-103', name: 'Merilyzer CelQuant 5 Plus', type: '5 part Hematology Analyser', status: 'Maintenance', testsDone: 890 },
      { id: 'M-104', name: 'Merilyzer CliniQuant Micro', type: 'Semi automatic Biochemistry analyser', status: 'Online', testsDone: 1120 },
    ]
  },
  {
    branchName: 'South City Clinic',
    machines: [
      { id: 'S-201', name: 'Merilyzer CliniQuant Micro', type: 'Semi automatic Biochemistry analyser', status: 'Online', testsDone: 450 },
      { id: 'S-202', name: 'Merilyzer CelQuant Edge', type: '3 part hematology Analyser', status: 'Offline', testsDone: 120 },
    ]
  },
  {
    branchName: 'North Wing Specialty',
    machines: [
      { id: 'N-301', name: 'Merilyzer CelQuant 5 Plus', type: '5 part Hematology Analyser', status: 'Online', testsDone: 1850 },
      { id: 'N-302', name: 'Merilyzer CelQuant Edge', type: '3 part hematology Analyser', status: 'Online', testsDone: 1560 },
      { id: 'N-303', name: 'Merilyzer CliniQuant Micro', type: 'Semi automatic Biochemistry analyser', status: 'Online', testsDone: 920 },
    ]
  }
];

const MachineNetwork = () => {
  const { alert, showAlert, hideAlert } = useAlert();
  
  // Support Modal State
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [supportForm, setSupportForm] = useState({
    issueType: 'Machine Fault',
    description: ''
  });

  const [supportLogs, setSupportLogs] = useState([
    { id: 'TKT-1001', machineId: 'M-103', machineName: 'Merilyzer CelQuant 5 Plus', branch: 'Central Hospital - Main Lab', category: 'Maintenance Required', status: 'Pending', date: '2026-04-29', description: 'Monthly preventive calibration required.' }
  ]);

  // Compute basic stats
  let totalMachines = 0;
  let onlineMachines = 0;
  let totalTests = 0;

  MACHINE_DATA.forEach(branch => {
    branch.machines.forEach(m => {
      totalMachines++;
      if (m.status === 'Online') onlineMachines++;
      totalTests += m.testsDone;
    });
  });

  const handleOpenSupport = (machine, branchName) => {
    setSelectedMachine({ ...machine, branchName });
    setSupportForm({ issueType: 'Machine Fault', description: '' });
    setShowSupportModal(true);
  };

  const handleSupportSubmit = (e) => {
    e.preventDefault();
    if (!supportForm.description.trim()) {
      showAlert('error', 'Please provide a description of the issue.');
      return;
    }
    const newTicket = {
      id: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      machineId: selectedMachine.id,
      machineName: selectedMachine.name,
      branch: selectedMachine.branchName,
      category: supportForm.issueType,
      status: 'Open',
      date: new Date().toISOString().split('T')[0],
      description: supportForm.description
    };
    setSupportLogs([newTicket, ...supportLogs]);

    setShowSupportModal(false);
    showAlert('success', `Support ticket created for ${selectedMachine.name} (${selectedMachine.id}). Our technical team will review it shortly.`);
  };

  const triggerCSVDownload = (filename, csvRows) => {
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleExportCSV = () => {
    const headers = ['Ticket ID', 'Machine ID', 'Machine Name', 'Branch', 'Category', 'Status', 'Date', 'Description'];
    const csvRows = [headers.join(',')];

    supportLogs.forEach(log => {
      const values = [
        log.id,
        log.machineId,
        `"${log.machineName}"`,
        `"${log.branch}"`,
        log.category,
        log.status,
        log.date,
        `"${log.description.replace(/"/g, '""')}"`
      ];
      csvRows.push(values.join(','));
    });

    triggerCSVDownload('machine_support_logs.csv', csvRows);
  };

  const exportAllAnalyzers = () => {
    const headers = ['Branch Name', 'Machine ID', 'Model Name', 'Analyzer Type', 'Status', 'Tests Done (24h)'];
    const csvRows = [headers.join(',')];

    MACHINE_DATA.forEach(branch => {
      branch.machines.forEach(m => {
        csvRows.push(`"${branch.branchName}",${m.id},"${m.name}","${m.type}",${m.status},${m.testsDone}`);
      });
    });

    triggerCSVDownload('all_analyzers_network.csv', csvRows);
  };

  const exportBranchAnalyzers = (branchName, machines) => {
    const headers = ['Machine ID', 'Model Name', 'Analyzer Type', 'Status', 'Tests Done (24h)'];
    const csvRows = [headers.join(',')];

    machines.forEach(m => {
      csvRows.push(`${m.id},"${m.name}","${m.type}",${m.status},${m.testsDone}`);
    });

    triggerCSVDownload(`${branchName.replace(/\s+/g, '_')}_analyzers.csv`, csvRows);
  };

  return (
    <div className="machine-page">
      {alert && <Alert type={alert.type} message={alert.message} onClose={hideAlert} />}
      <div className="machine-header">
        <div>
          <h1>Machine Network Monitor</h1>
          <p>Real-time status of laboratory analyzers across all branches</p>
        </div>
        <div className="machine-header-actions">
          <button className="btn-primary" onClick={exportAllAnalyzers} style={{ background: '#10b981', color: 'white' }}>
            📥 Export All Analyzers
          </button>
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Refresh Data
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Connected Branches</span>
          <span className="stat-value">{MACHINE_DATA.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Analyzers</span>
          <span className="stat-value">{totalMachines}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Analyzers Online</span>
          <span className="stat-value" style={{ color: '#10b981' }}>{onlineMachines}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Tests Processed Today</span>
          <span className="stat-value">{totalTests.toLocaleString()}</span>
        </div>
      </div>

      <div className="machine-list">
        {MACHINE_DATA.map((branch, index) => (
          <div key={index} className="branch-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="branch-title" style={{ margin: 0 }}>{branch.branchName}</h3>
              <button 
                className="btn-ghost" 
                onClick={() => exportBranchAnalyzers(branch.branchName, branch.machines)}
                style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '12px', border: '1px solid var(--border-light)', cursor: 'pointer', background: 'white' }}
              >
                📥 Branch CSV
              </button>
            </div>
            <div className="machine-table-wrapper">
              <table className="machine-table">
                <thead>
                  <tr>
                    <th>Machine ID</th>
                    <th>Model Name</th>
                    <th>Analyzer Type</th>
                    <th>Status</th>
                    <th>Tests Done (24h)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branch.machines.map(machine => (
                    <tr key={machine.id}>
                      <td style={{ fontWeight: 'bold' }}>{machine.id}</td>
                      <td>{machine.name}</td>
                      <td>{machine.type}</td>
                      <td>
                        <span className={`status-badge status-${machine.status.toLowerCase()}`}>
                          {machine.status}
                        </span>
                      </td>
                      <td style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>
                        {machine.testsDone.toLocaleString()}
                      </td>
                      <td>
                        <button 
                          onClick={() => handleOpenSupport(machine, branch.branchName)}
                          className="btn-support-sm"
                          style={{ background: 'var(--blue-pale)', color: 'var(--blue-primary)', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          Create Support
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div className="branch-section" style={{ marginTop: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="branch-title" style={{ margin: 0 }}>Recent Support Logs</h3>
          <button 
            className="btn-primary" 
            onClick={handleExportCSV}
            style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '13px', background: '#10b981', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
          >
            📥 Export CSV
          </button>
        </div>
        
        <div className="machine-table-wrapper">
          {supportLogs.length > 0 ? (
            <table className="machine-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Date</th>
                  <th>Branch</th>
                  <th>Machine</th>
                  <th>Category</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {supportLogs.map(log => (
                  <tr key={log.id}>
                    <td style={{ fontWeight: 'bold' }}>{log.id}</td>
                    <td>{log.date}</td>
                    <td>{log.branch}</td>
                    <td>{log.machineId} - {log.machineName}</td>
                    <td>{log.category}</td>
                    <td>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                        background: log.status === 'Open' ? '#fee2e2' : '#fef3c7',
                        color: log.status === 'Open' ? '#991b1b' : '#92400e'
                      }}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', background: '#f8fafc', borderRadius: '8px', color: 'var(--text-soft)' }}>
              No support tickets created yet.
            </div>
          )}
        </div>
      </div>

      {/* Support Modal */}
      {showSupportModal && selectedMachine && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Create Support Ticket</h3>
              <button
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                onClick={() => setShowSupportModal(false)}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSupportSubmit}>
              <div className="modal-body">
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-mid)' }}><strong>Machine:</strong> {selectedMachine.name} ({selectedMachine.id})</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-soft)' }}><strong>Branch:</strong> {selectedMachine.branchName}</p>
                </div>
                
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-label)', marginBottom: '8px' }}>Support Category *</label>
                  <select 
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--bg-input)' }}
                    value={supportForm.issueType}
                    onChange={(e) => setSupportForm(p => ({ ...p, issueType: e.target.value }))}
                  >
                    <option value="Machine Fault">Machine Fault / Hardware Error</option>
                    <option value="Maintenance Required">Preventive Maintenance Required</option>
                    <option value="Software Help">Software / Integration Help</option>
                    <option value="Reagents Query">Reagents / Consumables Query</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-label)', marginBottom: '8px' }}>Detailed Description *</label>
                  <textarea 
                    rows="4"
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--bg-input)', resize: 'vertical' }}
                    placeholder="Describe the issue, error codes, or specific help needed..."
                    value={supportForm.description}
                    onChange={(e) => setSupportForm(p => ({ ...p, description: e.target.value }))}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" style={{ background: '#e2e8f0', color: '#475569', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => setShowSupportModal(false)}>Cancel</button>
                <button type="submit" style={{ background: 'var(--blue-primary)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Submit Request</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MachineNetwork;
