import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import m1 from '../assets/m1.png';
import m2 from '../assets/m2.png';
import m3 from '../assets/m3.png';
import merilLogo from '../assets/meril.png';
import '../assets/CSS/Login.css';

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    { image: m1, text: 'Innovation for better healthcare' },
    { image: m2, text: 'State-of-the-art diagnostic facilities' },
    { image: m3, text: 'Serving humanity with care' }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleChange = (e) => {
    setError('');
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://172.16.11.160:7005';
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store token and Multi-Branch context
      if (data.token) localStorage.setItem('hims_token', data.token);
      if (data.branch_id) localStorage.setItem('branch_id', data.branch_id);
      if (data.hospital_code) localStorage.setItem('hospital_code', data.hospital_code);
      if (data.role_level) localStorage.setItem('role_level', data.role_level);
      if (data.role) localStorage.setItem('role', data.role);
      if (data.district_id) localStorage.setItem('district_id', data.district_id);

      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* ── Left Panel: Carousel ── */}
      <aside className="auth-aside" aria-hidden="true">
        <div className="carousel-container">
          {slides.map((slide, index) => (
            <div 
              key={index} 
              className={`carousel-slide ${index === currentSlide ? 'active' : ''}`}
              style={{ backgroundImage: `url(${slide.image})` }}
            >
              <div className="carousel-content">
                <div className="carousel-badge">
                  <span className="carousel-badge-dot"></span>
                  Meril LIS — Live System
                </div>
                <p className="carousel-text">{slide.text}</p>
              </div>
            </div>
          ))}
          <div className="carousel-indicators">
            {slides.map((_, index) => (
              <div 
                key={index} 
                className={`indicator ${index === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(index)}
              />
            ))}
          </div>
        </div>
      </aside>

      {/* ── Right Panel: Form ── */}
      <main className="auth-main">
        <div className="auth-card-container">
          {/* Brand Logo in Card */}
          <div className="brand-header">
            <img src={merilLogo} alt="Meril Logo" className="brand-logo-img" />
            <span className="product-name">Meril LIS</span>
            <p className="brand-motto">Laboratory Information System</p>
          </div>

          <div className="auth-card">
            <header className="auth-header">
              <h1 className="auth-title">Welcome Back!</h1>
              <p className="auth-subtitle">Sign in to your Meril LIS account</p>
            </header>

            {error && (
              <div className="alert alert-error" role="alert">
                {error}
              </div>
            )}

            <form id="login-form" className="auth-form" onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label className="field-label">Email</label>
                <input
                  type="email"
                  name="email"
                  className="field-input"
                  placeholder="admin@test.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group" style={{ marginTop: '20px' }}>
                <label className="field-label">Password</label>
                <div className="input-with-toggle">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    className="field-input"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <button 
                    type="button" 
                    className="toggle-eye"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="form-options">
                <label className="remember-me">
                  <input type="checkbox" /> Remember Me
                </label>
                <Link to="/forgot-password" style={{ color: '#4F46E5', fontWeight: '600', textDecoration: 'none', fontSize: '14px' }}>
                  Forgot Password?
                </Link>
              </div>

              <button
                type="submit"
                className="btn-login-new"
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <p className="auth-footer">
              Don't have an account?{' '}
              <Link to="/register" style={{ color: '#4F46E5', fontWeight: '600', textDecoration: 'none' }}>Register</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Login;
