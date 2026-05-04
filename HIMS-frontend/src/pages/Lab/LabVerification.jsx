import { useState, useEffect } from 'react';
import '../../assets/CSS/LabVerification.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://172.16.11.160:7005';

const LabVerification = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState(null);
  const [verificationNote, setVerificationNote] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchPendingVerifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const fetchPendingVerifications = async () => {
    try {
      setLoading(true);
      const url = `${API_BASE}/api/lab/pending-verifications${filterStatus !== 'all' ? `?status=${filterStatus}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setTests(data.tests || []);
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (testId, sampleId) => {
    try {
      const doctorId = JSON.parse(localStorage.getItem('user'))?.id || 1;

      const res = await fetch(`${API_BASE}/api/lab/verify-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_result_id: testId,
          sample_id: sampleId,
          verified_by: doctorId,
          notes: verificationNote,
          status: 'Verified'
        })
      });

      const data = await res.json();
      if (data.success) {
        alert('Test verified successfully!');
        setSelectedTest(null);
        setVerificationNote('');
        fetchPendingVerifications();
      } else {
        alert('Failed to verify test');
      }
    } catch (error) {
      console.error('Error verifying test:', error);
      alert('Error verifying test');
    }
  };

  const handleApprove = async (testId, sampleId) => {
    if (!window.confirm('Are you sure you want to approve this test?')) return;

    try {
      const doctorId = JSON.parse(localStorage.getItem('user'))?.id || 1;

      const res = await fetch(`${API_BASE}/api/lab/verify-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_result_id: testId,
          sample_id: sampleId,
          verified_by: doctorId,
          status: 'Approved',
          notes: verificationNote
        })
      });

      const data = await res.json();
      if (data.success) {
        alert('Test approved successfully!');
        setSelectedTest(null);
        setVerificationNote('');
        fetchPendingVerifications();
      }
    } catch (error) {
      console.error('Error approving test:', error);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const colors = {
      'Test Done': '#06b6d4',
      'Verified': '#8b5cf6',
      'Approved': '#22c55e'
    };
    return (
      <span className="status-badge" style={{ background: colors[status] || '#6b7280' }}>
        {status}
      </span>
    );
  };

  return (
    <div className="lab-verification-page">
      <div className="verification-header">
        <h1>Lab Head Doctor - Test Verification</h1>
        <div className="filter-section">
          <label>Filter by Status:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Pending</option>
            <option value="Test Done">Test Done (Pending Verification)</option>
            <option value="Verified">Verified (Pending Approval)</option>
            <option value="Approved">Approved</option>
          </select>
          <button className="refresh-btn" onClick={fetchPendingVerifications}>Refresh</button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading tests...</div>
      ) : (
        <div className="tests-table-container">
          <table className="tests-table">
            <thead>
              <tr>
                <th>Sample ID</th>
                <th>Patient Name</th>
                <th>Test Name</th>
                <th>Machine No</th>
                <th>Tested At</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="no-data">No tests pending verification</td>
                </tr>
              ) : (
                tests.map((test) => (
                  <tr key={test.id} className={`status-${test.status?.toLowerCase().replace(' ', '-')}`}>
                    <td className="sample-id">{test.sample_id}</td>
                    <td>{test.patient_name}</td>
                    <td>{test.test_name}</td>
                    <td>{test.machine_no || 'N/A'}</td>
                    <td>{formatDateTime(test.tested_at)}</td>
                    <td>{getStatusBadge(test.status)}</td>
                    <td>
                      {test.status === 'Test Done' && (
                        <button
                          className="verify-btn"
                          onClick={() => setSelectedTest(test)}
                        >
                          ✓ Verify
                        </button>
                      )}
                      {test.status === 'Verified' && (
                        <button
                          className="approve-btn"
                          onClick={() => handleApprove(test.id, test.sample_id)}
                        >
                          ✓ Approve
                        </button>
                      )}
                      {test.status === 'Approved' && (
                        <span className="approved-text">Approved ✓</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Verification Modal */}
      {selectedTest && (
        <div className="modal-overlay" onClick={() => setSelectedTest(null)}>
          <div className="verification-modal" onClick={e => e.stopPropagation()}>
            <h2>Verify Test Results</h2>

            <div className="test-details">
              <p><strong>Sample ID:</strong> {selectedTest.sample_id}</p>
              <p><strong>Patient:</strong> {selectedTest.patient_name}</p>
              <p><strong>Test:</strong> {selectedTest.test_name}</p>
              <p><strong>Machine:</strong> {selectedTest.machine_no || 'N/A'}</p>
              <p><strong>Tested At:</strong> {formatDateTime(selectedTest.tested_at)}</p>
            </div>

            <div className="results-section">
              <h3>Test Results</h3>
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
                  {selectedTest.results?.map((result, idx) => (
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
            </div>

            <div className="verification-notes">
              <label>Verification Notes (Optional):</label>
              <textarea
                value={verificationNote}
                onChange={(e) => setVerificationNote(e.target.value)}
                placeholder="Add any notes about this verification..."
                rows="3"
              />
            </div>

            <div className="modal-actions">
              <button className="verify-submit-btn" onClick={() => handleVerify(selectedTest.id, selectedTest.sample_id)}>
                ✓ Mark as Verified
              </button>
              <button className="close-btn" onClick={() => setSelectedTest(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabVerification;
