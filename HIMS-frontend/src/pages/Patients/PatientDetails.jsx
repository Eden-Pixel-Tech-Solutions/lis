import { useState, useEffect, useRef } from 'react';
import Alert from '../../components/Alert';
import { useAlert } from '../../hooks/useAlert';
import '../../assets/CSS/PatientRegistration.css';

const TITLES = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.'];
const GENDERS = ['Male', 'Female', 'Other'];
const MARITAL = ['Single', 'Married', 'Divorced', 'Widowed'];
const OCCS = ['Employed', 'Unemployed', 'Student', 'Retired', 'Self-employed'];
const LANGS = ['English', 'French', 'Spanish', 'Hindi', 'Other'];
const EDUS = ['Primary', 'High School', "Bachelor's", "Master's", 'PhD', 'Other'];
const RELS = ['Christian', 'Muslim', 'Hindu', 'Buddhist', 'None', 'Other'];
const CITIZENS = ['Ghana', 'Nigeria', 'US', 'UK', 'Canada', 'India', 'Other'];
const COUNTRIES = ['Ghana', 'Nigeria', 'US', 'UK', 'Canada', 'India', 'Other'];
const KIN_RELS = ['Spouse', 'Parent', 'Child', 'Sibling', 'Friend', 'Guardian', 'Other'];
const PAYERS = ['Self / Out of Pocket', 'Insurance', 'Government / NHIS', 'Employer'];

const INIT = {
  regNo: 'REG-' + Math.floor(10000 + Math.random() * 90000),
  regDate: new Date().toISOString().split('T')[0],
  isNewBorn: false,
  title: '', firstName: '', middleName: '', lastName: '',
  dob: '', ageYears: '', ageMonths: '', ageDays: '',
  gender: '', aadharNumber: '', abhaId: '', maritalStatus: '', occupation: '', language: '',
  educationLevel: '', religion: '', citizen: '', emailId: '', telephone: '', fileRequired: false,
  address: '', suburb: '', city: '', country: '', postalCode: '', postalAddress: false,
  kinSameAddress: false, kinName: '', kinRelation: '', kinTelephone: '',
  kinAddress: '', kinSuburb: '', kinCity: '', kinCountry: '', kinCode: '',
  payerType: '', insuranceProvider: '', policyNumber: '',
};

const Field = ({ label, children, span }) => (
  <div className={`preg-field ${span ? `preg-col-span-${span}` : ''}`}>
    <label className="preg-label">{label}</label>
    {children}
  </div>
);

const Input = (props) => <input className="preg-input" {...props} />;

const Select = ({ options, placeholder = 'Select', ...props }) => (
  <select className="preg-select" required {...props}>
    <option value="" disabled selected>{placeholder}</option>
    {options.map(o => <option key={o} value={o}>{o}</option>)}
  </select>
);

function PatientDetails({ onSaveSuccess }) {
  const { alert, showAlert, hideAlert } = useAlert();
  const [data, setData] = useState(INIT);
  const [photo, setPhoto] = useState(null);
  const [cam, setCam] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchType, setSearchType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!data.dob) return;
    const b = new Date(data.dob), now = new Date();
    let y = now.getFullYear() - b.getFullYear();
    let m = now.getMonth() - b.getMonth();
    let d = now.getDate() - b.getDate();
    if (d < 0) { m--; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
    if (m < 0) { y--; m += 12; }
    setData(p => ({ ...p, ageYears: y, ageMonths: m, ageDays: d }));
  }, [data.dob]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setCam(true);
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(s => {
            setStream(s);
            setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = s; }, 50);
          })
          .catch(() => { showAlert('Camera access denied.', 'error'); setCam(false); });
      }
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        document.querySelector('input[name="firstName"]')?.focus();
      }
      if (e.altKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        document.querySelector('input[name="address"]')?.focus();
      }
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        document.querySelector('input[name="address"]')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const ch = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'kinSameAddress' && checked) {
      setData(p => ({
        ...p, kinSameAddress: true,
        kinAddress: p.address, kinSuburb: p.suburb,
        kinCity: p.city, kinCountry: p.country, kinCode: p.postalCode,
      }));
      return;
    }
    setData(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  /* Camera */
  const openCam = async () => {
    setCam(true);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch { showAlert('Camera access denied.', 'error'); setCam(false); }
  };

  const closeCam = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null); setCam(false);
  };

  const capturePhoto = () => {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    setPhoto(c.toDataURL('image/png'));
    closeCam();
  };

  const handleSave = async () => {
    if (!data.firstName || !data.lastName || !data.dob || !data.gender || !data.telephone) {
      showAlert('First Name, Last Name, DOB, Gender and Phone Number are required!', 'warning');
      return;
    }

    try {
      const payload = {
        ...data,
        photo_base64: photo,
        branch_id: localStorage.getItem('branch_id')
      };

      const API_BASE = import.meta.env.VITE_API_URL || 'http://172.16.11.160:7005';
      const res = await fetch(`${API_BASE}/api/patients/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (result.success) {
        onSaveSuccess(data.regNo);
      } else {
        showAlert(result.message || 'Error saving patient.', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Network error while saving patient.', 'error');
    }
  };

  const handleSearchExecute = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const typeParam = searchType !== 'ALL' ? `&type=${searchType}` : '';
      const API_BASE = import.meta.env.VITE_API_URL || 'http://172.16.11.160:7005';
      const res = await fetch(`${API_BASE}/api/patients/search?q=${encodeURIComponent(searchQuery)}${typeParam}`);
      const result = await res.json();
      if (result.success) {
        setSearchResults(result.patients || []);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error(err);
      showAlert('Network error while searching.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const selectPatient = (patient) => {
    setShowSearchModal(false);
    showAlert(`Returning patient selected: ${patient.first_name} ${patient.last_name}`, 'success');
    if (onSaveSuccess) onSaveSuccess(patient.reg_no);
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
      <div className="preg-body" style={{ paddingBottom: '80px' }}>
        <div className="preg-card">
          <div className="preg-card-header">
            <span className="preg-card-title">Registration Info</span>
          </div>
          <div className="preg-card-body">
            <div className="preg-meta-strip">
              <div className="preg-meta-item">
                <span className="preg-meta-label">Reg. No.</span>
                <span className="preg-meta-value">{data.regNo}</span>
              </div>
              <div className="preg-meta-item">
                <span className="preg-meta-label">Date</span>
                <Input type="date" name="regDate" value={data.regDate} onChange={ch} style={{ height: 32, fontSize: 13 }} />
              </div>

              <button
                type="button"
                className="btn-ghost"
                style={{ marginLeft: 16 }}
                onClick={() => setShowSearchModal(true)}
              >
                Search Existing Patient
              </button>

              {/* Avatar */}
              <div className="preg-avatar" onClick={openCam} title="Add Photo (Alt + C)">
                {photo
                  ? <img src={photo} alt="patient" />
                  : <>
                    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 11c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" />
                      <path d="M4 20c0-3.31 3.58-6 8-6s8 2.69 8 6" />
                    </svg>
                    <span>Add Photo</span>
                  </>
                }
              </div>
            </div>
          </div>
        </div>

        {/* ── Personal Details ── */}
        <div className="preg-card">
          <div className="preg-card-header">
            <span className="preg-card-title">Personal Details</span>
          </div>
          <div className="preg-card-body">
            <div className="preg-grid">

              <Field label="Full Name *" span={2}>
                <div className="preg-inline">
                  <Select options={TITLES} name="title" value={data.title} onChange={ch} className="preg-select sm" style={{ flex: '0 0 72px' }} placeholder="Title" />
                  <Input name="firstName" value={data.firstName} onChange={ch} placeholder="First Name" />
                  <Input name="middleName" value={data.middleName} onChange={ch} placeholder="Middle" />
                  <Input name="lastName" value={data.lastName} onChange={ch} placeholder="Last Name" />
                </div>
              </Field>

              <Field label="Date of Birth">
                <Input type="date" name="dob" value={data.dob} onChange={ch} />
              </Field>

              <Field label="Age (Y / M / D)*">
                <div className="preg-age-group">
                  <Input value={data.ageYears} readOnly placeholder="Yrs" />
                  <Input value={data.ageMonths} readOnly placeholder="Mo" />
                  <Input value={data.ageDays} readOnly placeholder="Day" />
                </div>
              </Field>

              <Field label="Gender*">
                <Select options={GENDERS} name="gender" value={data.gender} onChange={ch} />
              </Field>

              <Field label="Marital Status">
                <Select options={MARITAL} name="maritalStatus" value={data.maritalStatus} onChange={ch} />
              </Field>

              <Field label="Occupation">
                <Select options={OCCS} name="occupation" value={data.occupation} onChange={ch} />
              </Field>

              <Field label="Language">
                <Select options={LANGS} name="language" value={data.language} onChange={ch} />
              </Field>

              <Field label="Aadhar Number" span={1}>
                <Input type="text" name="aadharNumber" value={data.aadharNumber} onChange={ch} placeholder="XXXX XXXX XXXX" />
              </Field>

              <Field label="ABHA ID" span={1}>
                <Input type="text" name="abhaId" value={data.abhaId} onChange={ch} placeholder="XX-XXXX-XXXX-XXXX" />
              </Field>

              <Field label="Education" span={1}>
                <Select name="educationLevel" value={data.educationLevel} onChange={ch} options={EDUS} />
              </Field>

              <Field label="Religion">
                <Select options={RELS} name="religion" value={data.religion} onChange={ch} />
              </Field>

              <Field label="Citizenship">
                <Select options={CITIZENS} name="citizen" value={data.citizen} onChange={ch} />
              </Field>

              <Field label="Email">
                <Input type="email" name="emailId" value={data.emailId} onChange={ch} placeholder="patient@email.com" />
              </Field>

              <Field label="Phone Number*">
                <div className="preg-phone-prefix">
                  <span className="country-code">+91</span>
                  <Input type="tel" name="telephone" value={data.telephone} onChange={ch} placeholder="12345 67890" />
                </div>
              </Field>

              <Field>
                <label className="preg-checkbox-row">
                  <input type="checkbox" name="isNewBorn" checked={data.isNewBorn} onChange={ch} />
                  New Born
                </label>
              </Field>

            </div>
          </div>
        </div>

        {/* ── Home Address ── */}
        <div className="preg-card">
          <div className="preg-card-header">
            <span className="preg-card-title">Home Address</span>
          </div>
          <div className="preg-card-body">
            <div className="preg-grid">
              <Field label="Street Address" span={2}>
                <Input name="address" value={data.address} onChange={ch} placeholder="House no. & street" />
              </Field>
              <Field label="Suburb / Area">
                <Input name="suburb" value={data.suburb} onChange={ch} />
              </Field>
              <Field label="City">
                <Input name="city" value={data.city} onChange={ch} />
              </Field>
              <Field label="Country">
                <Select options={COUNTRIES} name="country" value={data.country} onChange={ch} />
              </Field>
              <Field label="Postal Code">
                <Input name="postalCode" value={data.postalCode} onChange={ch} />
              </Field>
              <Field label="">
                <label className="preg-checkbox-row" style={{ paddingTop: 18 }}>
                  <input type="checkbox" name="postalAddress" checked={data.postalAddress} onChange={ch} />
                  Postal Address
                </label>
              </Field>
            </div>
          </div>
        </div>

        {/* ── Next of Kin ── */}
        <div className="preg-card">
          <div className="preg-card-header">
            <span className="preg-card-title">Next of Kin</span>
            <label className="preg-checkbox-row" style={{ fontSize: 12 }}>
              <input type="checkbox" name="kinSameAddress" checked={data.kinSameAddress} onChange={ch} />
              Same address as patient
            </label>
          </div>
          <div className="preg-card-body">
            <div className="preg-grid">
              <Field label="Full Name" span={2}>
                <Input name="kinName" value={data.kinName} onChange={ch} />
              </Field>
              <Field label="Relation">
                <Select options={KIN_RELS} name="kinRelation" value={data.kinRelation} onChange={ch} />
              </Field>
              <Field label="Telephone">
                <Input type="tel" name="kinTelephone" value={data.kinTelephone} onChange={ch} />
              </Field>
              <Field label="Address" span={2}>
                <Input name="kinAddress" value={data.kinAddress} onChange={ch} />
              </Field>
              <Field label="Suburb">
                <Input name="kinSuburb" value={data.kinSuburb} onChange={ch} />
              </Field>
              <Field label="City">
                <Input name="kinCity" value={data.kinCity} onChange={ch} />
              </Field>
              <Field label="Country">
                <Select options={COUNTRIES} name="kinCountry" value={data.kinCountry} onChange={ch} />
              </Field>
              <Field label="Code">
                <Input name="kinCode" value={data.kinCode} onChange={ch} />
              </Field>
            </div>
          </div>
        </div>

        {/* ── Payer ── */}
        <div className="preg-card">
          <div className="preg-card-header">
            <span className="preg-card-title">Payer Information</span>
          </div>
          <div className="preg-card-body">
            <div className="preg-grid preg-grid-3">
              <Field label="Payer Type">
                <Select options={PAYERS} name="payerType" value={data.payerType} onChange={ch} />
              </Field>
              <Field label="Insurance Provider">
                <Input name="insuranceProvider" value={data.insuranceProvider} onChange={ch} />
              </Field>
              <Field label="Policy Number">
                <Input name="policyNumber" value={data.policyNumber} onChange={ch} />
              </Field>
            </div>
          </div>
        </div>

      </div>

      {/* ── Sticky Action Bar ── */}
      <div className="preg-action-bar">
        <span style={{ fontSize: 12, color: 'var(--text-soft)', marginRight: 'auto' }}>
          Fields marked * are required
        </span>
        <button className="btn-ghost" onClick={() => window.history.back()}>Cancel</button>
        <button className="btn-primary" onClick={handleSave}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Save &amp; Continue
        </button>
      </div>

      {/* ── Camera Modal ── */}
      {cam && (
        <div className="camera-overlay">
          <div className="camera-box">
            <h3>Capture Patient Photo</h3>
            <div className="camera-video">
              <video ref={videoRef} autoPlay playsInline />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
            <div className="camera-actions">
              <button type="button" className="btn-ghost" onClick={closeCam}>Cancel</button>
              <button type="button" className="btn-primary" onClick={capturePhoto}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" /><path d="M3 9a2 2 0 012-2h1l2-3h8l2 3h1a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                Capture
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Search Existing Patient Modal ── */}
      {showSearchModal && (
        <div className="camera-overlay">
          <div className="search-modal-box">
            <h3>Search Existing Patient</h3>
            <form onSubmit={handleSearchExecute} className="search-form">
              <select
                className="preg-select search-type-select"
                value={searchType}
                onChange={e => setSearchType(e.target.value)}
              >
                <option value="ALL">All Fields</option>
                <option value="telephone">Phone</option>
                <option value="email_id">Email</option>
                <option value="aadhar_number">Aadhar</option>
                <option value="abha_id">ABHA ID</option>
              </select>
              <input
                type="text"
                className="preg-input search-query-input"
                placeholder="Search query (Phone, Email, Aadhar, etc...)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="btn-primary search-execute-btn" disabled={isSearching}>
                {isSearching ? '...' : 'Search'}
              </button>
            </form>

            <div className="search-results-container">
              {searchResults.length > 0 ? (
                <table className="search-results-table">
                  <thead>
                    <tr>
                      <th>Reg No</th>
                      <th>Name</th>
                      <th>Phone</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((p) => (
                      <tr key={p.id}>
                        <td>{p.reg_no}</td>
                        <td style={{ fontWeight: 600 }}>{p.first_name} {p.last_name}</td>
                        <td>{p.telephone || '-'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button type="button" className="select-btn-primary" style={{ height: 28, fontSize: 11 }} onClick={() => selectPatient(p)}>Select</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No matches found yet. Enter details above and click Search.
                </div>
              )}
            </div>

            <div className="camera-actions" style={{ marginTop: 24 }}>
              <button type="button" className="btn-ghost" onClick={() => setShowSearchModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PatientDetails;