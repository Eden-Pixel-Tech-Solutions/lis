import React, { useState, useEffect } from 'react';
import '../../assets/CSS/LabTestManagement.css';

const LabTestManagement = () => {
  const [activeTab, setActiveTab] = useState('tests');
  const [tests, setTests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [containers, setContainers] = useState([]);
  const [sampleTypes, setSampleTypes] = useState([]);
  const [labs, setLabs] = useState([]);
  const [showAddTestModal, setShowAddTestModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddContainerModal, setShowAddContainerModal] = useState(false);
  const [showAddSampleTypeModal, setShowAddSampleTypeModal] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [formData, setFormData] = useState({
    test_code: '',
    test_name: '',
    category_id: '',
    lab_id: '',
    sample_type: '',
    tube_color: '',
    storage_conditions: '',
    methodology: '',
    price: '',
    parameters: []
  });
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: ''
  });
  const [containerFormData, setContainerFormData] = useState({
    container_name: '',
    tube_color: '',
    volume_ml: '',
    additives: '',
    storage_temperature: '',
    special_instructions: ''
  });
  const [sampleTypeFormData, setSampleTypeFormData] = useState({
    type_name: '',
    description: ''
  });

  const CLINIQUANT_TESTS = [
    { id: 1, name: "RBC", unit: "10^6/µL" }, { id: 2, name: "HEMOGLOBIN", unit: "g/dL" },
    { id: 3, name: "HEMATOCRIT", unit: "%" }, { id: 4, name: "MCV", unit: "fL" },
    { id: 5, name: "MCH", unit: "pg" }, { id: 6, name: "MCHC", unit: "g/dL" },
    { id: 7, name: "RDW", unit: "%" }, { id: 8, name: "WBC", unit: "10^3/µL" },
    { id: 9, name: "NEUTROPHILS", unit: "%" }, { id: 10, name: "LYMPHOCYTES", unit: "%" },
    { id: 11, name: "MONOCYTES", unit: "%" }, { id: 12, name: "EOSINOPHILS", unit: "%" },
    { id: 13, name: "BASOPHILS", unit: "%" }, { id: 14, name: "PLATELETS", unit: "10^3/µL" },
    { id: 15, name: "MPV", unit: "fL" }, { id: 16, name: "PCT", unit: "%" },
    { id: 17, name: "PDW", unit: "fL" }, { id: 18, name: "NRBC", unit: "%" },
    // Biochemistry defaults from PDF
    { id: 101, name: "GLU", unit: "mg/dL" }, { id: 112, name: "UREA", unit: "mg/dL" },
    { id: 113, name: "URIC-ACID", unit: "mg/dL" }
  ];

  const [selectedAnalyzer, setSelectedAnalyzer] = useState(''); // 'CliniQuant Micro' or ''

  useEffect(() => {
    fetchCategories();
    fetchContainers();
    fetchSampleTypes();
    fetchLabs();
    if (activeTab === 'tests') {
      fetchTests();
    }
  }, [activeTab]);

  const fetchTests = async () => {
    try {
      const response = await fetch('/api/lab/tests');
      const data = await response.json();
      if (data.success) {
        setTests(data.tests);
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/lab/categories');
      const data = await response.json();
      if (data.success) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchContainers = async () => {
    try {
      const response = await fetch('/api/lab/containers');
      const data = await response.json();
      if (data.success) {
        setContainers(data.containers);
      }
    } catch (error) {
      console.error('Error fetching containers:', error);
    }
  };

  const fetchSampleTypes = async () => {
    try {
      const response = await fetch('/api/lab/sample-types');
      const data = await response.json();
      if (data.success) {
        setSampleTypes(data.sampleTypes);
      }
    } catch (error) {
      console.error('Error fetching sample types:', error);
    }
  };

  const fetchLabs = async () => {
    try {
      const response = await fetch('/api/lab/labs');
      const data = await response.json();
      if (data.success) {
        setLabs(data.labs);
      }
    } catch (error) {
      console.error('Error fetching labs:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      test_code: '',
      test_name: '',
      category_id: '',
      sample_type: '',
      tube_color: '',
      storage_conditions: '',
      methodology: '',
      price: '',
      parameters: []
    });
    setEditingTest(null);
  };

  const handleSubmitTest = async (e) => {
    e.preventDefault();
    try {
      const url = editingTest ? `/api/lab/tests/${editingTest.id}` : '/api/lab/tests';
      const method = editingTest ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...formData, analyzer_name: selectedAnalyzer })
      });

      const data = await response.json();
      if (data.success) {
        setShowAddTestModal(false);
        resetForm();
        fetchTests();
      } else {
        alert(data.message || 'Error saving test');
      }
    } catch (error) {
      console.error('Error saving test:', error);
      alert('Error saving test');
    }
  };

  const handleEditTest = async (testId) => {
    try {
      const response = await fetch(`/api/lab/tests/${testId}`);
      const data = await response.json();
      if (data.success) {
        setFormData({
          test_code: data.test.test_code,
          test_name: data.test.test_name,
          category_id: data.test.category_id,
          sample_type: data.test.sample_type,
          tube_color: data.test.tube_color || '',
          storage_conditions: data.test.storage_conditions || '',
          methodology: data.test.methodology || '',
          price: data.test.price || '',
          parameters: data.parameters
        });
        setEditingTest(data.test);
        setSelectedAnalyzer(data.test.analyzer_name || '');
        setShowAddTestModal(true);
      }
    } catch (error) {
      console.error('Error fetching test details:', error);
    }
  };

  const handleDeleteTest = async (testId) => {
    if (!confirm('Are you sure you want to delete this test?')) return;
    
    try {
      const response = await fetch(`/api/lab/tests/${testId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        fetchTests();
      } else {
        alert(data.message || 'Error deleting test');
      }
    } catch (error) {
      console.error('Error deleting test:', error);
      alert('Error deleting test');
    }
  };

  const handleSubmitCategory = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/lab/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(categoryFormData)
      });

      const data = await response.json();
      if (data.success) {
        setShowAddCategoryModal(false);
        setCategoryFormData({ name: '', description: '' });
        fetchCategories();
      } else {
        alert(data.message || 'Error adding category');
      }
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Error adding category');
    }
  };

  const handleSubmitContainer = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/lab/containers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(containerFormData)
      });

      const data = await response.json();
      if (data.success) {
        setShowAddContainerModal(false);
        setContainerFormData({
          container_name: '',
          tube_color: '',
          volume_ml: '',
          additives: '',
          storage_temperature: '',
          special_instructions: ''
        });
        fetchContainers();
      } else {
        alert(data.message || 'Error adding container');
      }
    } catch (error) {
      console.error('Error adding container:', error);
      alert('Error adding container');
    }
  };

  const handleSubmitSampleType = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/lab/sample-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sampleTypeFormData)
      });

      const data = await response.json();
      if (data.success) {
        setShowAddSampleTypeModal(false);
        setSampleTypeFormData({ type_name: '', description: '' });
        fetchSampleTypes();
      } else {
        alert(data.message || 'Error adding sample type');
      }
    } catch (error) {
      console.error('Error adding sample type:', error);
      alert('Error adding sample type');
    }
  };

  return (
    <div className="lab-test-management">
      <div className="header">
        <h1>Laboratory Test Management</h1>
        <div className="tabs">
          <button 
            className={activeTab === 'tests' ? 'active' : ''}
            onClick={() => setActiveTab('tests')}
          >
            Lab Tests
          </button>
          <button 
            className={activeTab === 'categories' ? 'active' : ''}
            onClick={() => setActiveTab('categories')}
          >
            Categories
          </button>
          <button 
            className={activeTab === 'containers' ? 'active' : ''}
            onClick={() => setActiveTab('containers')}
          >
            Sample Containers
          </button>
          <button 
            className={activeTab === 'sample-types' ? 'active' : ''}
            onClick={() => setActiveTab('sample-types')}
          >
            Sample Types
          </button>
        </div>
      </div>

      {activeTab === 'tests' && (
        <div className="tests-section">
          <div className="section-header">
            <h2>Lab Tests</h2>
            <button 
              className="btn-primary"
              onClick={() => {
                resetForm();
                setShowAddTestModal(true);
              }}
            >
              Add New Test
            </button>
          </div>
          
          <div className="tests-grid">
            {tests.map(test => (
              <div key={test.id} className="test-card">
                <div className="test-header">
                  <h3>{test.test_name}</h3>
                  <span className="test-code">{test.test_code}</span>
                </div>
                <div className="test-details">
                  <p><strong>Category:</strong> {test.category_name}</p>
                  {test.lab_name && <p><strong>Lab:</strong> {test.lab_name}</p>}
                  <p><strong>Sample Type:</strong> {test.sample_type}</p>
                  <p><strong>Tube Color:</strong> {test.tube_color || 'N/A'}</p>
                  {test.price && <p><strong>Price:</strong> ₹{test.price}</p>}
                </div>
                <div className="test-actions">
                  <button onClick={() => handleEditTest(test.id)} className="btn-edit">
                    Edit
                  </button>
                  <button onClick={() => handleDeleteTest(test.id)} className="btn-delete">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="categories-section">
          <div className="section-header">
            <h2>Lab Test Categories</h2>
            <button 
              className="btn-primary"
              onClick={() => setShowAddCategoryModal(true)}
            >
              Add Category
            </button>
          </div>
          
          <div className="categories-grid">
            {categories.map(category => (
              <div key={category.id} className="category-card">
                <h3>{category.name}</h3>
                {category.description && <p>{category.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'containers' && (
        <div className="containers-section">
          <div className="section-header">
            <h2>Sample Containers</h2>
            <button 
              className="btn-primary"
              onClick={() => setShowAddContainerModal(true)}
            >
              Add Container
            </button>
          </div>
          
          <div className="containers-grid">
            {containers.map(container => (
              <div key={container.id} className="container-card">
                <h3>{container.container_name}</h3>
                <div className="container-details">
                  <p><strong>Tube Color:</strong> {container.tube_color || 'N/A'}</p>
                  <p><strong>Volume:</strong> {container.volume_ml || 'N/A'} ml</p>
                  <p><strong>Additives:</strong> {container.additives || 'N/A'}</p>
                  <p><strong>Storage:</strong> {container.storage_temperature || 'N/A'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'sample-types' && (
        <div className="sample-types-section">
          <div className="section-header">
            <h2>Sample Types</h2>
            <button 
              className="btn-primary"
              onClick={() => setShowAddSampleTypeModal(true)}
            >
              Add Sample Type
            </button>
          </div>
          
          <div className="categories-grid">
            {sampleTypes.map(type => (
              <div key={type.id} className="category-card">
                <h3>{type.type_name}</h3>
                {type.description && <p>{type.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Test Modal */}
      {showAddTestModal && (
        <div className="sdm-overlay" onClick={() => { setShowAddTestModal(false); resetForm(); }}>
          <div className="sdm-modal" style={{ maxWidth: '900px' }} onClick={e => e.stopPropagation()}>
            <div className="sdm-header">
              <div className="sdm-header-accent"></div>
              <h3 className="sdm-title">{editingTest ? 'Edit Lab Test Definition' : 'Configure New Lab Test'}</h3>
              <button className="sdm-close" onClick={() => { setShowAddTestModal(false); resetForm(); }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmitTest}>
              <div className="sdm-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px' }}>
                  <div className="sdm-field">
                    <label className="sdm-label">Test Code <span className="sdm-required">*</span></label>
                    <input type="text" className="sdm-input" value={formData.test_code} onChange={(e) => setFormData(prev => ({ ...prev, test_code: e.target.value }))} required placeholder="e.g. CBC001" />
                  </div>
                  <div className="sdm-field">
                    <label className="sdm-label">Test Name <span className="sdm-required">*</span></label>
                    <input type="text" className="sdm-input" value={formData.test_name} onChange={(e) => setFormData(prev => ({ ...prev, test_name: e.target.value }))} required placeholder="e.g. Complete Blood Count" />
                  </div>
                  <div className="sdm-field">
                    <label className="sdm-label">Category <span className="sdm-required">*</span></label>
                    <select className="sdm-input" value={formData.category_id} onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))} required>
                      <option value="">Select Category</option>
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px' }}>
                  <div className="sdm-field">
                    <label className="sdm-label">Assigned Lab <span className="sdm-required">*</span></label>
                    <select className="sdm-input" value={formData.lab_id} onChange={(e) => setFormData(prev => ({ ...prev, lab_id: e.target.value }))} required>
                      <option value="">Select Lab</option>
                      {labs.map(lab => <option key={lab.id} value={lab.id}>{lab.name} {lab.block ? `(${lab.block})` : ''}</option>)}
                    </select>
                  </div>
                  <div className="sdm-field">
                    <label className="sdm-label">Sample Type <span className="sdm-required">*</span></label>
                    <select className="sdm-input" value={formData.sample_type} onChange={(e) => e.target.value === '__add_new__' ? setShowAddSampleTypeModal(true) : setFormData(prev => ({ ...prev, sample_type: e.target.value }))} required>
                      <option value="">Select Type</option>
                      {sampleTypes.map(type => <option key={type.id} value={type.type_name}>{type.type_name}</option>)}
                      <option value="__add_new__">+ Add New Type</option>
                    </select>
                  </div>
                  <div className="sdm-field">
                    <label className="sdm-label">Sample Container</label>
                    <select className="sdm-input" value={formData.tube_color} onChange={(e) => e.target.value === '__add_new__' ? setShowAddContainerModal(true) : setFormData(prev => ({ ...prev, tube_color: e.target.value }))}>
                      <option value="">Select Container</option>
                      {containers.map(container => <option key={container.id} value={container.tube_color}>{container.container_name} ({container.tube_color})</option>)}
                      <option value="__add_new__">+ Add New Container</option>
                    </select>
                  </div>
                </div>

                <div className="sdm-field">
                  <label className="sdm-label">Test Price (INR)</label>
                  <input type="number" step="0.01" className="sdm-input" value={formData.price} onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))} placeholder="0.00" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
                  <div className="sdm-field">
                    <label className="sdm-label">Storage Conditions</label>
                    <textarea className="sdm-input sdm-textarea" value={formData.storage_conditions} onChange={(e) => setFormData(prev => ({ ...prev, storage_conditions: e.target.value }))} placeholder="e.g., Refrigerated at 2-8°C" />
                  </div>
                  <div className="sdm-field">
                    <label className="sdm-label">Methodology</label>
                    <textarea className="sdm-input sdm-textarea" value={formData.methodology} onChange={(e) => setFormData(prev => ({ ...prev, methodology: e.target.value }))} placeholder="e.g., Automated chemistry analyzer" />
                  </div>
                </div>

                <div className="analyzer-setup-card" style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1.5px solid #e2e8f0' }}>
                  <div className="sdm-field">
                    <label className="sdm-label" style={{ color: 'var(--blue-600)' }}>Select Integrated Analyzer *</label>
                    <select className="sdm-input" value={selectedAnalyzer} onChange={(e) => { setSelectedAnalyzer(e.target.value); setFormData(prev => ({ ...prev, parameters: [] })); }} required>
                      <option value="">Select Analyzer</option>
                      <option value="CliniQuant Micro">Merilyzer CliniQuant Micro</option>
                    </select>
                  </div>

                  {selectedAnalyzer === 'CliniQuant Micro' && (
                    <div style={{ marginTop: '20px' }}>
                      <label className="sdm-label">Integrated CBC Parameters</label>
                      <div className="machine-tests-grid" style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: '10px', maxHeight: '300px', overflowY: 'auto',
                        padding: '15px', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '10px', marginTop: '10px'
                      }}>
                        {CLINIQUANT_TESTS.map(mTest => (
                          <label key={mTest.id} style={{
                            display: 'flex', alignItems: 'center', gap: '10px', padding: '10px',
                            border: '1.5px solid #f1f5f9', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s'
                          }} className="parameter-checkbox-label">
                            <input type="checkbox" style={{ width: '16px', height: '16px' }}
                              checked={formData.parameters.some(p => p.machine_parameter_code === mTest.id.toString())}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData(prev => ({ ...prev, parameters: [...prev.parameters, { parameter_name: mTest.name, parameter_unit: mTest.unit, machine_parameter_code: mTest.id.toString(), result_type: 'numeric', display_order: prev.parameters.length }] }));
                                } else {
                                  setFormData(prev => ({ ...prev, parameters: prev.parameters.filter(p => p.machine_parameter_code !== mTest.id.toString()) }));
                                }
                              }}
                            />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e2937' }}>{mTest.name}</div>
                              <div style={{ fontSize: '11px', color: '#94a3b8' }}>{mTest.unit}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="sdm-footer">
                <button type="button" className="sdm-btn-cancel" onClick={() => { setShowAddTestModal(false); resetForm(); }}>Cancel</button>
                <button type="submit" className="sdm-btn-submit">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  {editingTest ? 'Update Test Definition' : 'Save Lab Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Add Lab Category</h2>
              <button onClick={() => {
                setShowAddCategoryModal(false);
                setCategoryFormData({ name: '', description: '' });
              }} className="close-btn">&times;</button>
            </div>
            
            <form onSubmit={handleSubmitCategory} className="category-form">
              <div className="form-group">
                <label>Category Name *</label>
                <input
                  type="text"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={categoryFormData.description}
                  onChange={(e) => setCategoryFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              
              <div className="form-actions">
                <button type="button" onClick={() => {
                  setShowAddCategoryModal(false);
                  setCategoryFormData({ name: '', description: '' });
                }} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Container Modal */}
      {showAddContainerModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Add Sample Container</h2>
              <button onClick={() => {
                setShowAddContainerModal(false);
                setContainerFormData({
                  container_name: '',
                  tube_color: '',
                  volume_ml: '',
                  additives: '',
                  storage_temperature: '',
                  special_instructions: ''
                });
              }} className="close-btn">&times;</button>
            </div>

            <form onSubmit={handleSubmitContainer} className="container-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Container Name *</label>
                  <input
                    type="text"
                    value={containerFormData.container_name}
                    onChange={(e) => setContainerFormData(prev => ({ ...prev, container_name: e.target.value }))}
                    placeholder="e.g., EDTA Tube, Serum Tube"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Tube Color</label>
                  <input
                    type="text"
                    value={containerFormData.tube_color}
                    onChange={(e) => setContainerFormData(prev => ({ ...prev, tube_color: e.target.value }))}
                    placeholder="e.g., Lavender, Red, Blue"
                  />
                </div>

                <div className="form-group">
                  <label>Volume (ml)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={containerFormData.volume_ml}
                    onChange={(e) => setContainerFormData(prev => ({ ...prev, volume_ml: e.target.value }))}
                    placeholder="e.g., 5.0"
                  />
                </div>

                <div className="form-group">
                  <label>Additives</label>
                  <input
                    type="text"
                    value={containerFormData.additives}
                    onChange={(e) => setContainerFormData(prev => ({ ...prev, additives: e.target.value }))}
                    placeholder="e.g., EDTA, Heparin, None"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Storage Temperature</label>
                <input
                  type="text"
                  value={containerFormData.storage_temperature}
                  onChange={(e) => setContainerFormData(prev => ({ ...prev, storage_temperature: e.target.value }))}
                  placeholder="e.g., Room Temperature, 2-8°C, -20°C"
                />
              </div>

              <div className="form-group">
                <label>Special Instructions</label>
                <textarea
                  value={containerFormData.special_instructions}
                  onChange={(e) => setContainerFormData(prev => ({ ...prev, special_instructions: e.target.value }))}
                  placeholder="e.g., Mix gently by inverting 8-10 times, Protect from light"
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => {
                  setShowAddContainerModal(false);
                  setContainerFormData({
                    container_name: '',
                    tube_color: '',
                    volume_ml: '',
                    additives: '',
                    storage_temperature: '',
                    special_instructions: ''
                  });
                }} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Container
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Sample Type Modal */}
      {showAddSampleTypeModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Add Sample Type</h2>
              <button onClick={() => {
                setShowAddSampleTypeModal(false);
                setSampleTypeFormData({ type_name: '', description: '' });
              }} className="close-btn">&times;</button>
            </div>

            <form onSubmit={handleSubmitSampleType} className="category-form">
              <div className="form-group">
                <label>Type Name *</label>
                <input
                  type="text"
                  value={sampleTypeFormData.type_name}
                  onChange={(e) => setSampleTypeFormData(prev => ({ ...prev, type_name: e.target.value }))}
                  placeholder="e.g., Blood, Urine, Tissue"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={sampleTypeFormData.description}
                  onChange={(e) => setSampleTypeFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g., Whole blood samples for hematology tests"
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => {
                  setShowAddSampleTypeModal(false);
                  setSampleTypeFormData({ type_name: '', description: '' });
                }} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Sample Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabTestManagement;
