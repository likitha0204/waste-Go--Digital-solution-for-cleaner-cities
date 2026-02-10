import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { saveAuth } from '../utils/auth';
import API_URL from '../config';
import { FiUser, FiLayout, FiTruck, FiShield, FiMail, FiLock, FiPhone, FiMapPin } from 'react-icons/fi';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user', // Default role
    contactNumber: '',
    address: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { name, email, password, role } = formData;

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  const handleRoleSelect = (selectedRole) => {
      setFormData((prevState) => ({
          ...prevState,
          role: selectedRole
      }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
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
        setError(data.message || 'Registration failed');
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
            <h2 style={{ textAlign: 'center', marginBottom: '15px', color: 'var(--primary-color)', fontSize: '1.5rem' }}>Create Account</h2>
            {error && <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>{error}</div>}
            
            <form onSubmit={onSubmit} autoComplete="off">
                <div style={{ marginBottom: '15px' }}>
                    <div className="role-selection-grid">
                        <div 
                            className={`role-card ${role === 'user' ? 'selected' : ''}`}
                            onClick={() => handleRoleSelect('user')}
                        >
                            <FiUser className="role-icon" size={24} />
                            <span>User</span>
                        </div>
                        <div 
                            className={`role-card ${role === 'organization' ? 'selected' : ''}`}
                            onClick={() => handleRoleSelect('organization')}
                        >
                            <FiLayout className="role-icon" size={24} />
                            <span>Org</span>
                        </div>
                        <div 
                            className={`role-card ${role === 'driver' ? 'selected' : ''}`}
                            onClick={() => handleRoleSelect('driver')}
                        >
                            <FiTruck className="role-icon" size={24} />
                            <span>Driver</span>
                        </div>
                        <div 
                            className={`role-card ${role === 'admin' ? 'selected' : ''}`}
                            onClick={() => handleRoleSelect('admin')}
                        >
                            <FiShield className="role-icon" size={24} />
                            <span>Admin</span>
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: '15px', textAlign: 'left' }}>
                    <label style={{ display: 'block', color: '#000', fontWeight: '600' }}>Full Name</label>
                    <div className="input-wrapper">
                        <FiUser />
                        <input
                            type="text"
                            name="name"
                            value={name}
                            onChange={onChange}
                            required
                            placeholder="Enter Name"
                            autoComplete="off"
                        />
                    </div>
                </div>
                <div style={{ marginBottom: '15px', textAlign: 'left' }}>
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
                <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                    <label style={{ display: 'block', color: '#000', fontWeight: '600' }}>Password</label>
                    <div className="input-wrapper">
                        <FiLock />
                        <input
                            type="password"
                            name="password"
                            value={password}
                            onChange={onChange}
                            required
                            placeholder="Create a strong password"
                            autoComplete="new-password"
                        />
                    </div>
                </div>

                {role === 'driver' && (
                    <>
                        <div style={{ marginBottom: '15px', textAlign: 'left' }}>
                            <label style={{ display: 'block', color: '#000', fontWeight: '600' }}>Contact Number</label>
                            <div className="input-wrapper">
                                <FiPhone />
                                <input
                                    type="tel"
                                    name="contactNumber"
                                    value={formData.contactNumber}
                                    onChange={onChange}
                                    required
                                    placeholder="+91 XXXXXXXXXX"
                                />
                            </div>
                        </div>
                        <div style={{ marginBottom: '15px', textAlign: 'left' }}>
                            <label style={{ display: 'block', color: '#000', fontWeight: '600' }}>Permanent Address</label>
                            <div className="input-wrapper" style={{ alignItems: 'flex-start', padding: '12px 16px' }}>
                                <FiMapPin style={{ marginTop: '4px' }} />
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={onChange}
                                    required
                                    placeholder="Enter your full address"
                                    style={{ minHeight: '80px', padding: 0 }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '15px', textAlign: 'left' }}>
                            <label style={{ display: 'block', color: '#000', fontWeight: '600' }}>Vehicle Type</label>
                            <div className="input-wrapper">
                                <FiTruck />
                                <select
                                    name="vehicleType"
                                    value={formData.vehicleType || ''}
                                    onChange={onChange}
                                    required
                                    style={{ border: 'none', width: '100%', outline: 'none' }}
                                >
                                    <option value="" disabled>Select Vehicle Type</option>
                                    <option value="Organic Waste Van">Organic Waste Van</option>
                                    <option value="Recycling Truck">Recycling Truck</option>
                                    <option value="Hazardous Material Van">Hazardous Material Van</option>
                                    <option value="General Waste Truck">General Waste Truck</option>
                                </select>
                            </div>
                        </div>
                    </>
                )}

                <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', fontSize: '1.1rem' }}>
                    {loading ? 'Creating Account...' : 'Register'}
                </button>
            </form>
            
            <div style={{ textAlign: 'center', marginTop: '15px' }}>
                <p style={{ color: '#000', fontWeight: '500' }}>
                    Already have an account? <Link to="/login" style={{ fontWeight: 'bold' }}>Sign In</Link>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
