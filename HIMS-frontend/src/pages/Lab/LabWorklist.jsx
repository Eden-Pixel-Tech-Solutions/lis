import { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import '../../assets/CSS/LabWorklist.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://172.16.11.160:7005';

const DEPARTMENTS = [
  { id: 'all', name: 'All Departments', icon: '🏥' },
  { id: 'hematology', name: 'Hematology', icon: '🩸' },
  { id: 'biochemistry', name: 'Biochemistry', icon: '🧪' },
  { id: 'serology', name: 'Serology', icon: '🔬' },
  { id: 'microbiology', name: 'Microbiology', icon: '🦠' }
];

const STATUS_COLORS = {
  'Pending': '#f59e0b',
  'Collected': '#3b82f6',
  'In Progress': '#8b5cf6',
  'Test Done': '#06b6d4',
  'Completed': '#22c55e'
};

export default function LabWorklist() {
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [worklist, setWorklist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [printLabel, setPrintLabel] = useState(null);
  const [viewResults, setViewResults] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const barcodeRef = useRef(null);
  const printLabelRef = useRef(null);

  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(localStorage.getItem('branch_id') || '1');
  const userRole = localStorage.getItem('role_level') || 'Branch';

  // Fetch branches for Central users
  useEffect(() => {
    if (userRole === 'Central' || userRole === 'Sub-Central') {
      fetch(`${API_BASE}/api/branches`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const mapped = (data.branches || []).map(b => ({
              ...b,
              name: b.branch_name
            }));
            setBranches(mapped);
          }
        })
        .catch(console.error);
    }
  }, [userRole]);

  // Fetch worklist when department changes
  useEffect(() => {
    const fetchWorklist = async () => {
      if (!selectedDepartment) return;
      setLoading(true);
      try {
        const role_level = userRole;
        const res = await fetch(`${API_BASE}/api/lab/worklist?department=${selectedDepartment}&branch_id=${selectedBranch}&role_level=${role_level}`);
        const data = await res.json();
        if (data.success) {
          setWorklist(data.worklist || []);
        }
      } catch (error) {
        console.error('Error fetching worklist:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchWorklist();
  }, [selectedDepartment, selectedBranch]);

  // Generate barcode when print label is set
  useEffect(() => {
    if (printLabel && barcodeRef.current) {
      JsBarcode(barcodeRef.current, printLabel.sampleId, {
        format: 'CODE128',
        width: 2,
        height: 50,
        displayValue: true,
        fontSize: 14,
        font: 'monospace',
        margin: 10
      });

      // Auto print after barcode is generated
      setTimeout(() => {
        printLabelRef.current = printLabel;
        handlePrint();
      }, 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printLabel]);

  const refreshWorklist = async () => {
    setLoading(true);
    try {
      const role_level = userRole;
      const res = await fetch(`${API_BASE}/api/lab/worklist?department=${selectedDepartment}&branch_id=${selectedBranch}&role_level=${role_level}`);
      const data = await res.json();
      if (data.success) {
        setWorklist(data.worklist || []);
      }
    } catch (error) {
      console.error('Error fetching worklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (item) => {
    try {
      // Generate sample ID: LAB-{YYYYMMDD}-{AUTO_INCREMENT}
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

      // Get next sequence number for today
      const res = await fetch(`${API_BASE}/api/lab/generate-sample-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr })
      });
      const data = await res.json();

      if (data.success) {
        const sampleId = `LAB-${dateStr}-${data.sequence.toString().padStart(4, '0')}`;

        // Update status to Collected
        const updateRes = await fetch(`${API_BASE}/api/lab/acknowledge-test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bill_item_id: item.bill_item_id,
            sample_id: sampleId,
            status: 'Collected'
          })
        });

        const updateData = await updateRes.json();
        if (updateData.success) {
          // Set print label data
          setPrintLabel({
            sampleId,
            queueNumber: item.lab_queue_number || '1',
            patientName: item.patient_name,
            testName: item.test_name,
            sampleType: item.sample_type,
            department: item.department
          });

          // Refresh worklist
          refreshWorklist();
        }
      }
    } catch (error) {
      console.error('Error acknowledging test:', error);
      alert('Failed to acknowledge test. Please try again.');
    }
  };

  const handleViewResults = async (item) => {
    try {
      const res = await fetch(`${API_BASE}/api/lab/test-results/${item.sample_id}`);
      const data = await res.json();
      if (data.success) {
        setTestResults(data.results || []);
        setViewResults(item);
      } else {
        alert('No results found for this test');
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      alert('Failed to fetch test results');
    }
  };

  const handleCompleteTest = async (item) => {
    try {
      const res = await fetch(`${API_BASE}/api/lab/update-test-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bill_item_id: item.bill_item_id,
          status: 'Completed'
        })
      });
      const data = await res.json();
      if (data.success) {
        setViewResults(null);
        refreshWorklist();
      }
    } catch (error) {
      console.error('Error acknowledging test:', error);
      alert('Failed to acknowledge test. Please try again.');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print labels');
      return;
    }

    const labelHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sample Label - ${printLabel.sampleId}</title>
        <style>
          @page { size: 80mm 50mm; margin: 0; }
          body { 
            margin: 0; 
            padding: 5mm; 
            font-family: Arial, sans-serif;
            width: 70mm;
          }
          .label-container {
            border: 1px solid #000;
            padding: 3mm;
            text-align: center;
          }
          .sample-id {
            font-size: 10px;
            font-weight: bold;
            margin-bottom: 2mm;
          }
          .barcode svg {
            max-width: 100%;
            height: auto;
          }
          .patient-name {
            font-size: 9px;
            margin-top: 2mm;
            font-weight: bold;
          }
          .test-name {
            font-size: 8px;
            margin-top: 1mm;
            color: #666;
          }
          .dept-info {
            font-size: 7px;
            margin-top: 1mm;
            color: #999;
          }
        </style>
      </head>
      <body>
        <div class="label-container">
          <div class="sample-id">Token: #${printLabel.queueNumber} | ${printLabel.sampleId}</div>
          <div class="barcode">
            <svg id="barcode"></svg>
          </div>
          <div class="patient-name">${printLabel.patientName}</div>
          <div class="test-name">${printLabel.testName}</div>
          <div class="dept-info">${printLabel.department} | ${printLabel.sampleType}</div>
        </div>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <script>
          JsBarcode("#barcode", "${printLabel.sampleId}", {
            format: "CODE128",
            width: 2,
            height: 40,
            displayValue: false,
            margin: 0
          });
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(labelHtml);
    printWindow.document.close();
  };

  const getDepartmentName = (deptId) => {
    const dept = DEPARTMENTS.find(d => d.id === deptId);
    return dept ? dept.name : deptId;
  };

  return (
    <div className="lab-worklist-page">
      {/* Header */}
      <div className="worklist-header">
        <div>
          <h1>🧪 Laboratory Worklist & Sample Collection</h1>
          <p>Select department to view pending tests</p>
        </div>
        {(userRole === 'Central' || userRole === 'Sub-Central') && (
          <div className="branch-selector-wrapper">
            <label>View Network Branch:</label>
            <select 
              value={selectedBranch} 
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="branch-select"
            >
              <option value="all">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Department Selection */}
      <div className="department-section">
        <h3>Select Department</h3>
        <div className="department-grid">
          {DEPARTMENTS.map(dept => (
            <button
              key={dept.id}
              className={`dept-card ${selectedDepartment === dept.id ? 'active' : ''}`}
              onClick={() => setSelectedDepartment(dept.id)}
            >
              <span className="dept-icon">{dept.icon}</span>
              <span className="dept-name">{dept.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Now Serving Banner */}
      {!loading && worklist.length > 0 && (
        <div className="now-serving-banner">
          <div className="now-serving-info">
            <h2>Next Patient to Call</h2>
            <div className="now-serving-patient">
              <span className="token-badge">
                Token #{(() => {
                  const firstPending = worklist.find(w => w.status === 'Pending') || worklist[0];
                  return firstPending.lab_queue_number || 1;
                })()}
              </span>
              <span className="patient-name-large">
                {(worklist.find(w => w.status === 'Pending') || worklist[0]).patient_name}
              </span>
            </div>
          </div>
          <div className="total-pending-box">
            <div className="pending-label">Total Pending</div>
            <div className="pending-count">
              {worklist.filter(w => w.status === 'Pending').length}
            </div>
          </div>
        </div>
      )}

      {/* Worklist Table */}
      <div className="worklist-section">
        <div className="worklist-header-bar">
          <h3>
            {getDepartmentName(selectedDepartment)} Worklist
            <span className="count-badge">{worklist.length} pending</span>
          </h3>
          <div className="worklist-actions">
            <button
              className="btn-primary tv-mode-btn"
              onClick={() => window.open('/lab-tv', '_blank')}
            >
              📺 Open TV Mode
            </button>
            <button className="refresh-btn" onClick={refreshWorklist}>
              🔄 Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading worklist...</div>
        ) : worklist.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📋</span>
            <p>No pending tests for {getDepartmentName(selectedDepartment)}</p>
          </div>
        ) : (
          <div className="worklist-table-container">
            <table className="worklist-table">
              <thead>
                <tr>
                  <th>Queue No.</th>
                  <th>Patient</th>
                  <th>Patient ID</th>
                  <th>Test Name</th>
                  <th>Sample Type</th>
                  <th>Container</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {worklist.map((item, index) => (
                  <tr key={index} className={`status-${item.status?.toLowerCase().replace(' ', '-')}`}>
                    <td className="queue-number">
                      <strong>#{item.lab_queue_number || index + 1}</strong>
                    </td>
                    <td>
                      <div className="patient-info">
                        <span className="patient-name">{item.patient_name}</span>
                        <span className="patient-reg">{item.reg_no}</span>
                      </div>
                    </td>
                    <td>{item.patient_id}</td>
                    <td className="test-name-cell">{item.test_name}</td>
                    <td>{item.sample_type}</td>
                    <td>{item.tube_color || 'N/A'}</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{ backgroundColor: STATUS_COLORS[item.status] || '#999' }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td>
                      {item.status === 'Pending' ? (
                        <button
                          className="acknowledge-btn"
                          onClick={() => handleAcknowledge(item)}
                        >
                          ✓ Acknowledge
                        </button>
                      ) : item.status === 'Test Done' ? (
                        <button
                          className="view-results-btn"
                          onClick={() => handleViewResults(item)}
                        >
                          📊 View Results
                        </button>
                      ) : (
                        <span className="sample-id-text">{item.sample_id}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Hidden Barcode for Preview (optional) */}
      {printLabel && (
        <div className="print-preview-overlay" onClick={() => setPrintLabel(null)}>
          <div className="print-preview-modal" onClick={e => e.stopPropagation()}>
            <h3>Sample Label Preview</h3>
            <div className="label-preview">
              <div className="sample-id">Token: #{printLabel.queueNumber} | {printLabel.sampleId}</div>
              <svg ref={barcodeRef}></svg>
              <div className="patient-name">{printLabel.patientName}</div>
              <div className="test-name">{printLabel.testName}</div>
              <div className="dept-info">{printLabel.department} | {printLabel.sampleType}</div>
            </div>
            <div className="preview-actions">
              <button className="print-again-btn" onClick={handlePrint}>
                🖨️ Print Again
              </button>
              <button className="close-btn" onClick={() => setPrintLabel(null)}>
                ✕ Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Results Modal */}
      {viewResults && (
        <div className="print-preview-overlay" onClick={() => setViewResults(null)}>
          <div className="results-modal" onClick={e => e.stopPropagation()}>
            <h3>🧪 Test Results</h3>
            <div className="results-header">
              <p><strong>Patient:</strong> {viewResults.patient_name}</p>
              <p><strong>Test:</strong> {viewResults.test_name}</p>
              <p><strong>Sample ID:</strong> {viewResults.sample_id}</p>
              <p><strong>Barcode:</strong> {viewResults.lab_barcode}</p>
            </div>
            <table className="results-table">
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Result</th>
                  <th>Unit</th>
                  <th>Reference Range</th>
                  <th>Flag</th>
                </tr>
              </thead>
              <tbody>
                {testResults.map((result, idx) => (
                  <tr key={idx} className={`flag-${result.result_flag}`}>
                    <td>{result.parameter_name}</td>
                    <td className="result-value">{result.result_value}</td>
                    <td>{result.unit}</td>
                    <td>{result.reference_range}</td>
                    <td>
                      <span className={`flag-badge ${result.result_flag}`}>
                        {result.result_flag}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="preview-actions">
              <button className="complete-btn" onClick={() => handleCompleteTest(viewResults)}>
                ✓ Mark Complete
              </button>
              <button className="close-btn" onClick={() => setViewResults(null)}>
                ✕ Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
