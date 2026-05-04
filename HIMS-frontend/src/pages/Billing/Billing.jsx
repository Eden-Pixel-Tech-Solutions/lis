//billing.jsx
import { useState, useEffect, useRef } from 'react';
import Alert from '../../components/Alert';
import { useAlert } from '../../hooks/useAlert';
import JsBarcode from 'jsbarcode';
import '../../assets/CSS/PatientRegistration.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://172.16.11.160:7005';

const QRPlaceholder = ({ value, size = 120 }) => (
  <svg width={size} height={size} viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg"
    style={{ imageRendering: 'pixelated', display: 'block' }}>
    <rect width="21" height="21" fill="white" />
    {[0, 14].map(ox => [0, 14].map(oy => (
      <g key={`${ox}-${oy}`}>
        <rect x={ox} y={oy} width="7" height="7" fill="#1e293b" />
        <rect x={ox + 1} y={oy + 1} width="5" height="5" fill="white" />
        <rect x={ox + 2} y={oy + 2} width="3" height="3" fill="#1e293b" />
      </g>
    )))}
    {Array.from({ length: 9 }, (_, r) =>
      Array.from({ length: 9 }, (_, c) => {
        const hash = (value.charCodeAt((r * 9 + c) % value.length) + r * 7 + c * 13) % 3;
        return hash === 0 ? <rect key={`${r}-${c}`} x={8 + c * 1.4} y={r * 1.4} width="1.2" height="1.2" fill="#1e293b" /> : null;
      })
    )}
    <text x="10.5" y="20" textAnchor="middle" fontSize="1.8" fill="#64748b" fontFamily="monospace">{value.slice(-8)}</text>
  </svg>
);

// ── patientId is needed so we can pass it to /billing/create ──
function Billing({ regNo, patientId, bookingData, onFinish }) {
  const { alert, showAlert, hideAlert } = useAlert();
  const printRef = useRef(null);

  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState('');
  const [labs, setLabs] = useState([]); // for lab assignment

  const [items, setItems] = useState([]);

  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState('Cash');
  const [status, setStatus] = useState('Pending');

  const [invoice, setInvoice] = useState(null);
  const [showModify, setShowModify] = useState(false);
  const [generating, setGenerating] = useState(false);

  // ── Resolve patient ID: prop → regNo lookup ──
  const [resolvedPatientId, setResolvedPatientId] = useState(patientId || null);

  useEffect(() => {
    if (patientId) {
      setResolvedPatientId(patientId);
      return;
    }
    // Fall back: look up patient by regNo
    if (regNo) {
      fetch(`${API_BASE}/api/billing/patients/list`)
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            const match = d.data.find(
              p => p.reg_no === regNo || String(p.id) === String(regNo)
            );
            if (match) setResolvedPatientId(match.id);
          }
        })
        .catch(console.error);
    }
  }, [patientId, regNo]);

  // ── Fetch labs for workload-aware assignment ──
  useEffect(() => {
    fetch(`${API_BASE}/api/lab/labs`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const sorted = (d.labs || []).sort(
            (a, b) => (parseFloat(a.workload_score) || 0) - (parseFloat(b.workload_score) || 0)
          );
          setLabs(sorted);
        }
      })
      .catch(console.error);
  }, []);

  // ── Populate items from bookingData ──
  useEffect(() => {
    if (!bookingData) {
      setItems([
        { id: 1, name: 'Consultation Fee', amount: 35.00, service_type: 'Appointment' },
        { id: 2, name: 'Registration Fee', amount: 15.00, service_type: 'Other' },
        { id: 3, name: 'Lab Test', amount: 0.00, service_type: 'Laboratory' },
        { id: 4, name: 'Medication', amount: 0.00, service_type: 'Other' },
      ]);
      return;
    }

    const newItems = [];
    let idCounter = 1;

    // Registration fee
    newItems.push({
      id: idCounter++,
      name: 'Registration Fee',
      amount: 15.00,
      service_type: 'Other',
      quantity: 1,
    });

    // Doctor appointment
    if (bookingData.appointment?.doctor) {
      const { doctor, department, priority, price } = bookingData.appointment;
      newItems.push({
        id: idCounter++,
        name: `Consultation — ${doctor}${department ? ` (${department})` : ''}${priority && priority !== 'Routine' ? ` [${priority}]` : ''}`,
        amount: parseFloat(price || 35.00),
        service_type: 'Appointment',
        quantity: 1,
        // preserve original id if available so backend can link it
        service_id: bookingData.appointment.serviceId || null,
      });
    }

    // Lab tests — auto-assign fastest lab
    if (bookingData.labTests?.length > 0) {
      const fastestLab = labs[0] || null;
      bookingData.labTests.forEach(test => {
        newItems.push({
          id: idCounter++,
          name: test.name,
          amount: parseFloat(test.price || test.selling_price || 0),
          service_type: 'Laboratory',
          quantity: 1,
          service_id: test.id,
          lab_id: fastestLab?.id || null,
          lab_name: fastestLab?.name || null,
        });
      });
    }

    setItems(newItems);
  }, [bookingData, labs]);

  // ── fetch packages ──
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/billing-packages?is_active=true`);
        const data = await res.json();
        if (data.success) {
          setPackages(data.packages.map(pkg => ({
            id: pkg.package_id,
            name: pkg.name,
            department: pkg.department,
            items: Array.isArray(pkg.items) ? pkg.items : JSON.parse(pkg.items),
            discountPercent: parseFloat(pkg.discount_percent),
          })));
        }
      } catch (e) { console.error(e); }
    })();
  }, []);

  // ── computed totals ──
  const subtotal = items.reduce((s, i) => s + (i.amount || 0), 0);
  const discAmt = subtotal * (discount / 100);
  const total = subtotal - discAmt;

  // ── handlers ──
  const handlePackageSelect = (pkgId) => {
    setSelectedPackage(pkgId);
    if (!pkgId) return;
    const pkg = packages.find(p => p.id === pkgId);
    if (pkg) {
      setItems(pkg.items.map((item, i) => ({
        id: i + 1,
        name: item.name,
        amount: item.amount,
        service_type: 'Other',
        quantity: 1,
      })));
      setDiscount(pkg.discountPercent);
      showAlert(`Package "${pkg.name}" loaded`, 'success');
    }
  };

  const handleAddItem = () => setItems(p => [...p, { id: Date.now(), name: '', amount: 0, service_type: 'Other', quantity: 1 }]);
  const handleClearItems = () => { setItems([{ id: 1, name: '', amount: 0, service_type: 'Other', quantity: 1 }]); setDiscount(0); setSelectedPackage(''); };
  const handleRemoveItem = (i) => {
    if (items.length === 1) { setItems([{ id: 1, name: '', amount: 0, service_type: 'Other', quantity: 1 }]); return; }
    setItems(p => p.filter((_, idx) => idx !== i));
  };
  const handleItemChange = (i, field, val) =>
    setItems(p => p.map((it, idx) =>
      idx === i ? { ...it, [field]: field === 'amount' ? parseFloat(val) || 0 : val } : it
    ));

  // ── generate invoice — now calls /billing/create matching lab-billings payload ──
  const handleGenerate = async (overwriteParam = false) => {
    const overwriteDuplicates = typeof overwriteParam === 'boolean' ? overwriteParam : false;

    const validItems = items.filter(i => i.name.trim() && i.amount > 0);
    if (!validItems.length) {
      showAlert('Add at least one item with a name and amount.', 'warning');
      return;
    }
    if (!resolvedPatientId) {
      showAlert('Could not resolve patient — please check the registration number.', 'error');
      return;
    }

    setGenerating(true);
    try {
      // ── Map items to the shape /billing/create expects ──
      const mappedItems = validItems.map(item => ({
        service_id: item.service_id || null,
        service_type: item.service_type || 'Other',
        service_name: item.name,
        unit_price: item.amount,
        quantity: item.quantity || 1,
        total_price: (item.amount) * (item.quantity || 1),
        lab_id: item.lab_id || null,
        lab_name: item.lab_name || null,
      }));

      const res = await fetch(`${API_BASE}/api/billing/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: resolvedPatientId,
          patient_name: regNo,          // backend may use this for display
          items: mappedItems,
          discount_amount: discAmt,
          payment_method: method,
          notes: status,                   // pass payment status as notes or add a dedicated field if your schema supports it
          overwrite_duplicates: overwriteDuplicates
        }),
      });

      if (res.status === 409) {
        const conflictResult = await res.json();
        if (conflictResult.requires_confirmation) {
          const confirmOverwrite = window.confirm(conflictResult.message);
          if (confirmOverwrite) {
            setGenerating(false);
            return handleGenerate(true); // retry with overwrite flag
          } else {
            setGenerating(false);
            return; // user cancelled
          }
        }
      }

      const result = await res.json();

      if (result.success) {
        const billId = result.data?.bill_id || result.data?.bill_number || result.billingId;
        setInvoice({ billingId: billId, generatedAt: new Date().toLocaleString() });
        setShowModify(false);
        showAlert(`Invoice #${billId} generated successfully!`, 'success');
        if (onFinish) onFinish(result.data);
      } else {
        showAlert(result.message || 'Error generating invoice.', 'error');
      }
    } catch (e) {
      console.error(e);
      showAlert('Network error while generating invoice.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleModify = () => {
    setShowModify(true);
    setInvoice(null);
    showAlert('Invoice unlocked for editing.', 'info');
  };

  const handlePrintReceipt = () => window.print();

  const handlePrintBarcode = () => {
    const barcodeData = `INV-${invoice?.billingId}-${regNo}`;
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, barcodeData, { format: "CODE128", width: 2, height: 80, displayValue: false, margin: 10 });
    const barcodeDataUrl = canvas.toDataURL('image/png');
    const w = window.open('', '_blank', 'width=500,height=320');
    w.document.write(`
      <html><head><title>Barcode — ${invoice?.billingId}</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:monospace;background:#fff;margin:0;}
      img{display:block;margin:0 auto;}p{font-size:14px;letter-spacing:2px;margin-top:12px;color:#1e293b;}</style></head>
      <body>
        <div style="text-align:center">
          <img src="${barcodeDataUrl}" width="350" height="100" alt="Barcode"/>
          <p>${barcodeData}</p>
        </div>
        <script>window.onload=()=>{setTimeout(()=>{window.print();window.close();},500);}<\/script>
      </body></html>
    `);
    w.document.close();
  };

  const handlePrintQR = () => {
    const w = window.open('', '_blank', 'width=320,height=320');
    w.document.write(`
      <html><head><title>QR — ${invoice?.billingId}</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#fff;font-family:monospace;}
      p{margin-top:12px;font-size:13px;}</style></head>
      <body>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${invoice?.billingId}-REG-${regNo}" width="200" height="200"/>
        <p>${invoice?.billingId} · ${regNo}</p>
        <script>window.onload=()=>{window.print();window.close();}<\/script>
      </body></html>
    `);
    w.document.close();
  };

  const isLocked = !!invoice && !showModify;

  return (
    <>
      {alert && <Alert message={alert.message} type={alert.type} onClose={hideAlert} duration={4000} />}

      <main className="bil-page" ref={printRef}>

        {/* ══ Invoice confirmed banner ══ */}
        {invoice && (
          <div className="bil-confirmed-banner">
            <div className="bil-confirmed-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <div className="bil-confirmed-title">Invoice Generated</div>
              <div className="bil-confirmed-sub">
                <span className="bil-inv-chip">{invoice.billingId}</span>
                &nbsp;·&nbsp; {invoice.generatedAt} &nbsp;·&nbsp; Reg: {regNo}
              </div>
            </div>
            <div className="bil-confirmed-qr">
              <QRPlaceholder value={`${invoice.billingId}-${regNo}`} size={64} />
            </div>
          </div>
        )}

        {/* ── Booking summary strip ── */}
        {bookingData && !invoice && (
          <div style={{
            display: 'flex', gap: '12px', flexWrap: 'wrap',
            padding: '10px 16px', marginBottom: '16px',
            background: '#eff6ff', border: '1px solid #bfdbfe',
            borderRadius: '8px', fontSize: '13px', color: '#1e40af'
          }}>
            <span style={{ fontWeight: 600 }}>Booked:</span>
            {bookingData.appointment?.doctor && (
              <span>
                👤 {bookingData.appointment.doctor}
                {bookingData.appointment.department && ` · ${bookingData.appointment.department}`}
                {` · ${bookingData.appointment.apptDate} ${bookingData.appointment.apptTime}`}
              </span>
            )}
            {bookingData.labTests?.length > 0 && (
              <span>🧪 {bookingData.labTests.length} lab test{bookingData.labTests.length > 1 ? 's' : ''}: {bookingData.labTests.map(t => t.name).join(', ')}</span>
            )}
          </div>
        )}

        {/* ── Patient ID warning ── */}
        {!resolvedPatientId && (
          <div style={{
            padding: '10px 16px', marginBottom: '12px',
            background: '#fef3c7', border: '1px solid #fcd34d',
            borderRadius: '8px', fontSize: '13px', color: '#92400e'
          }}>
            ⚠️ Resolving patient record for <strong>{regNo}</strong>… If this persists, the patient may not exist in the billing system yet.
          </div>
        )}

        <div className="bil-layout">

          {/* ══ LEFT — Line Items ══ */}
          <div className="bil-main">
            <div className="bil-card">
              <div className="bil-card-head">
                <div className="bil-card-title">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  Invoice Items
                  <span className="bil-item-count">{items.filter(i => i.name.trim()).length} items</span>
                </div>
                {!isLocked && (
                  <div className="bil-card-actions">
                    {packages.length > 0 && (
                      <select className="bil-pkg-select" value={selectedPackage} onChange={e => handlePackageSelect(e.target.value)}>
                        <option value="">⊕ Load Package</option>
                        {packages.map(p => (
                          <option key={p.id} value={p.id}>{p.name} — {p.department}</option>
                        ))}
                      </select>
                    )}
                    <button className="bil-btn-sm bil-btn-add" onClick={handleAddItem}>+ Item</button>
                    <button className="bil-btn-sm bil-btn-clear" onClick={handleClearItems}>Clear</button>
                  </div>
                )}
              </div>

              <div className="bil-card-body">
                <table className="bil-items-table">
                  <thead>
                    <tr>
                      <th className="bil-th-no">#</th>
                      <th>Description</th>
                      <th style={{ width: '80px', textAlign: 'center', fontSize: '11px', color: '#9ca3af' }}>Type</th>
                      <th className="bil-th-amt">Amount (₹)</th>
                      {!isLocked && <th className="bil-th-del"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={item.id} className={`bil-item-row ${!item.name.trim() && !isLocked ? 'bil-row-empty' : ''}`}>
                        <td className="bil-td-no">{i + 1}</td>
                        <td>
                          {isLocked ? (
                            <span className="bil-locked-text">{item.name || '—'}</span>
                          ) : (
                            <input
                              className="bil-inline-input"
                              type="text"
                              value={item.name}
                              onChange={e => handleItemChange(i, 'name', e.target.value)}
                              placeholder="Item description…"
                            />
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {/* Lab assignment for lab items */}
                          {!isLocked && item.service_type === 'Laboratory' && labs.length > 0 ? (
                            <select
                              style={{ fontSize: '11px', padding: '2px 4px', border: '1px solid #d1d5db', borderRadius: '4px', maxWidth: '120px' }}
                              value={item.lab_id || ''}
                              onChange={e => {
                                const lab = labs.find(l => l.id === parseInt(e.target.value));
                                handleItemChange(i, 'lab_id', lab?.id || null);
                                handleItemChange(i, 'lab_name', lab?.name || null);
                              }}
                            >
                              {labs.map(lab => (
                                <option key={lab.id} value={lab.id}>
                                  {lab.name} ({lab.pending_tasks || 0})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span style={{
                              fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
                              background: item.service_type === 'Laboratory' ? '#dbeafe' : item.service_type === 'Appointment' ? '#dcfce7' : '#f3f4f6',
                              color: item.service_type === 'Laboratory' ? '#1d4ed8' : item.service_type === 'Appointment' ? '#166534' : '#6b7280',
                            }}>
                              {item.service_type || 'Other'}
                            </span>
                          )}
                        </td>
                        <td className="bil-td-amt">
                          {isLocked ? (
                            <span className="bil-locked-amt">₹{item.amount.toFixed(2)}</span>
                          ) : (
                            <input
                              className="bil-inline-input bil-input-num"
                              type="number"
                              value={item.amount}
                              min="0"
                              step="0.01"
                              onChange={e => handleItemChange(i, 'amount', e.target.value)}
                            />
                          )}
                        </td>
                        {!isLocked && (
                          <td className="bil-td-del">
                            <button className="bil-del-btn" onClick={() => handleRemoveItem(i)} title="Remove">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="bil-subtotal-row">
                  <span>Subtotal</span>
                  <strong>₹{subtotal.toFixed(2)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* ══ RIGHT — Payment summary ══ */}
          <aside className="bil-aside">
            <div className="bil-card bil-payment-card">
              <div className="bil-card-head">
                <div className="bil-card-title">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                  Payment
                </div>
              </div>
              <div className="bil-card-body bil-payment-body">

                <div className="bil-pay-field">
                  <label className="bil-pay-label">Discount (%)</label>
                  <input
                    className="bil-pay-input"
                    type="number" min="0" max="100"
                    value={discount}
                    onChange={e => setDiscount(+e.target.value)}
                    disabled={isLocked}
                  />
                </div>

                <div className="bil-pay-field">
                  <label className="bil-pay-label">Payment Method</label>
                  <select className="bil-pay-select" value={method} onChange={e => setMethod(e.target.value)} disabled={isLocked}>
                    {['Cash', 'Credit Card', 'Debit Card', 'Insurance', 'Mobile Money', 'UPI'].map(m =>
                      <option key={m}>{m}</option>
                    )}
                  </select>
                </div>

                <div className="bil-pay-field">
                  <label className="bil-pay-label">Status</label>
                  <select
                    className={`bil-pay-select bil-status-select bil-status-${status.toLowerCase()}`}
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    disabled={isLocked}
                  >
                    <option>Pending</option>
                    <option>Completed</option>
                    <option>Waived</option>
                  </select>
                </div>

                <div className="bil-divider" />

                <div className="bil-summary-rows">
                  <div className="bil-sum-row">
                    <span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="bil-sum-row bil-sum-disc">
                      <span>Discount ({discount}%)</span>
                      <span>− ₹{discAmt.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="bil-total-box">
                  <span className="bil-total-label">Total Due</span>
                  <span className="bil-total-val">₹{total.toFixed(2)}</span>
                </div>

                <div className="bil-method-badge">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                  {method}
                </div>
              </div>
            </div>

            <div className="bil-ref-card">
              <div className="bil-ref-row">
                <span className="bil-ref-label">Registration No.</span>
                <span className="bil-ref-val">{regNo || '—'}</span>
              </div>
              {resolvedPatientId && (
                <div className="bil-ref-row">
                  <span className="bil-ref-label">Patient ID</span>
                  <span className="bil-ref-val">{resolvedPatientId}</span>
                </div>
              )}
              {bookingData?.appointment && (
                <div className="bil-ref-row">
                  <span className="bil-ref-label">Doctor</span>
                  <span className="bil-ref-val">{bookingData.appointment.doctor}</span>
                </div>
              )}
              {bookingData?.appointment?.apptDate && (
                <div className="bil-ref-row">
                  <span className="bil-ref-label">Appt. Date</span>
                  <span className="bil-ref-val">{bookingData.appointment.apptDate} {bookingData.appointment.apptTime}</span>
                </div>
              )}
              {labs.length > 0 && bookingData?.labTests?.length > 0 && (
                <div className="bil-ref-row">
                  <span className="bil-ref-label">Lab Assigned</span>
                  <span className="bil-ref-val" style={{ color: '#166534' }}>⚡ {labs[0].name}</span>
                </div>
              )}
              {invoice && (
                <div className="bil-ref-row">
                  <span className="bil-ref-label">Invoice No.</span>
                  <span className="bil-ref-val bil-inv-no">{invoice.billingId}</span>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      {/* ══ STICKY ACTION BAR ══ */}
      <div className="bil-action-bar">
        {invoice ? (
          <div className="bil-post-actions">
            <button className="bil-action-btn bil-action-modify" onClick={handleModify}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Modify Invoice
            </button>
            <div className="bil-action-divider" />
            <button className="bil-action-btn bil-action-barcode" onClick={handlePrintBarcode}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 5v14M7 5v14M13 5v14M17 5v14M21 5v14M11 5v6M11 13v6" />
              </svg>
              Print Barcode
            </button>
            <button className="bil-action-btn bil-action-qr" onClick={handlePrintQR}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="5" y="5" width="3" height="3" /><rect x="16" y="5" width="3" height="3" />
                <rect x="5" y="16" width="3" height="3" />
              </svg>
              Print QR Code
            </button>
            <button className="bil-action-btn bil-action-print" onClick={handlePrintReceipt}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print Receipt
            </button>
          </div>
        ) : (
          <div className="bil-pre-actions">
            <button className="bil-action-btn bil-action-ghost" onClick={handlePrintReceipt}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print Draft
            </button>
            <button
              className="bil-action-btn bil-action-primary"
              onClick={handleGenerate}
              disabled={generating || !resolvedPatientId}
              style={{ opacity: (!resolvedPatientId || generating) ? 0.6 : 1 }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {generating ? 'Generating…' : 'Confirm & Generate Invoice'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default Billing;