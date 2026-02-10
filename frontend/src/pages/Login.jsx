import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { saveAuth } from '../utils/auth';
import API_URL from '../config';
import { FiMail, FiLock } from 'react-icons/fi';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { email, password } = formData;

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        saveAuth(data, data.token);
        
        // Redirect based on role
        switch(data.role) {
            case 'admin':
                navigate('/admin');
                break;
            case 'driver':
                navigate('/driver');
                break;
            case 'organization':
                navigate('/organization');
                break;
            case 'user':
                navigate('/user');
                break;
            default:
                navigate('/');
        } 
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Something went wrong. Please check your connection.');
      console.error(err);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-overlay"></div>
      
      <div className="auth-content-wrapper">
        <div className="auth-quote">
            <h1>
                <span>Welcome</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '400' }}> - "Cleaner cities start with you."</span>
            </h1>
        </div>

        <div className="auth-card">
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <img src="/logo.png" alt="WasteGo Logo" style={{ height: '60px' }} />
            </div>
            <h2 style={{ textAlign: 'center', marginBottom: '15px', color: 'var(--primary-color)', fontSize: '1.5rem' }}>Sign In</h2>
            {error && <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>{error}</div>}
            
            <form onSubmit={onSubmit} autoComplete="off">
                <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                    <label style={{ display: 'block', color: '#000', fontWeight: '600' }}>Email Address</label>
                    <div className="input-wrapper">
                        <FiMail />
                        <input
                            type="email"
                            name="email"
                            value={email}
                            onChange={onChange}
                            required
                            placeholder="Enter Email"
                            autoComplete="off"
                        />
                    </div>
                </div>
                <div style={{ marginBottom: '25px', textAlign: 'left' }}>
                    <label style={{ display: 'block', color: '#000', fontWeight: '600' }}>Password</label>
                    <div className="input-wrapper">
                        <FiLock />
                        <input
                            type="password"
                            name="password"
                            value={password}
                            onChange={onChange}
                            required
                            placeholder="••••••••"
                            autoComplete="new-password"
                        />
                    </div>
                </div>
                <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', fontSize: '1.1rem' }}>
                    {loading ? 'Signing in...' : 'Login'}
                </button>
            </form>
            
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <p style={{ color: '#000', fontWeight: '500' }}>
                    Don't have an account? <Link to="/register" style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>Create Account</Link>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
