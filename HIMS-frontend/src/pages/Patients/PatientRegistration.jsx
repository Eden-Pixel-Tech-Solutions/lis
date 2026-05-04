//patientRegistration.jsx
import { useState, useEffect } from 'react';
import Alert from '../../components/Alert';
import { useAlert } from '../../hooks/useAlert';
import PatientDetails from './PatientDetails';
import AppointmentBooking from '../Billing/AppointmentBooking';
import Billing from '../Billing/Billing';
import '../../assets/CSS/PatientRegistration.css';

const TABS = [
  { id: 'details', label: 'Patient Details', num: '1' },
  { id: 'appointment', label: 'Appointment Booking', num: '2' },
  { id: 'billing', label: 'Billing', num: '3' },
];

function PatientRegistration() {
  const { alert, showAlert, hideAlert } = useAlert();
  const [activeTab, setActiveTab] = useState('details');
  const [isPatientSaved, setIsPatientSaved] = useState(false);
  const [patientRegNo, setPatientRegNo] = useState(null);
  const [bookingData, setBookingData] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Global Tab Switching Shortcuts (Alt+1, Alt+2, Alt+3)
  useEffect(() => {
    const handleTabSwitch = (e) => {
      if (e.altKey) {
        if (e.key === '1') { e.preventDefault(); setActiveTab('details'); }
        if (e.key === '2' && isPatientSaved) { e.preventDefault(); setActiveTab('appointment'); }
        if (e.key === '3' && isPatientSaved) { e.preventDefault(); setActiveTab('billing'); }
      }
    };
    window.addEventListener('keydown', handleTabSwitch);
    return () => window.removeEventListener('keydown', handleTabSwitch);
  }, [isPatientSaved]);

  const handlePatientSaved = (regNo) => {
    setPatientRegNo(regNo);
    setIsPatientSaved(true);
    setActiveTab('appointment');
  };

  const handleAppointmentSaved = (data) => {
    setBookingData(data);
    setActiveTab('billing');
  };

  const executeSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://172.16.11.160:7005';
      const res = await fetch(`${API_BASE}/api/patients/search?q=${encodeURIComponent(searchQuery)}`);
      const result = await res.json();

      if (result.success) {
        setPatientRegNo(result.patient.reg_no);
        setIsPatientSaved(true); // Treat as saved since they exist
        setActiveTab('appointment'); // Jump them to appointment
        showAlert(`Found returning patient: ${result.patient.first_name} ${result.patient.last_name}`, 'success');
      } else {
        showAlert('No patient found. Please proceed with new registration.', 'warning');
      }
    } catch (err) {
      console.error(err);
      showAlert('Error searching for patient.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

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
      <div className="preg-page">
        {/* ── App Bar ── */}
        <header className="preg-appbar">
          <br />
          <div className="preg-appbar-top">
            <div className="preg-title-group">
              <h1>Patient Registration & Context {patientRegNo && <span style={{ color: 'var(--brand-blue)', fontWeight: 'bold' }}>{patientRegNo}</span>}</h1>
              <span>Complete sections or search for an existing patient</span>
            </div>

            <button className="preg-back-btn" onClick={() => window.history.back()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Exit
            </button>
          </div>

          {/* ── Tabs ── */}
          <nav className="preg-tabs">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`preg-tab ${activeTab === t.id ? 'active' : ''}`}
                onClick={() => setActiveTab(t.id)}
                disabled={t.id !== 'details' && !isPatientSaved}
                title={t.id !== 'details' && !isPatientSaved ? 'Save patient details first' : ''}
              >
                <span className="preg-tab-badge">{t.num}</span>
                {t.label}
              </button>
            ))}
          </nav>
        </header>

        {/* ── Content ── */}
        <div style={{ display: activeTab === 'details' ? 'contents' : 'none' }}>
          <PatientDetails onSaveSuccess={handlePatientSaved} />
        </div>
        {activeTab === 'appointment' && <AppointmentBooking regNo={patientRegNo} onSaveSuccess={handleAppointmentSaved} />}
        {activeTab === 'billing' && <Billing regNo={patientRegNo} bookingData={bookingData} onFinish={() => window.location.reload()} />}

      </div>
    </>
  );
}

export default PatientRegistration;
