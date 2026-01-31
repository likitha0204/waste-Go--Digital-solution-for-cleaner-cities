import { Link, useNavigate } from 'react-router-dom';
import { isLoggedIn, logout, getUser, getRole } from '../utils/auth';
import { useState } from 'react';
import { FiMenu, FiX } from 'react-icons/fi';

const Navbar = () => {
  const navigate = useNavigate();
  const user = getUser();
  const role = getRole();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsMobileMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand" onClick={closeMenu}>
          <img src="/logo.png" alt="WasteGo Logo" style={{ height: '40px', marginRight: '10px' }} />
          Waste Go
        </Link>
        
        <button className="mobile-toggle" onClick={toggleMenu}>
          {isMobileMenuOpen ? <FiX /> : <FiMenu />}
        </button>

        <div className={`navbar-links ${isMobileMenuOpen ? 'active' : ''}`}>
          <Link to="/" onClick={closeMenu}>Home</Link>

          {isLoggedIn() ? (

            <>
              {role === 'user' && <Link to="/user" onClick={closeMenu}>Dashboard</Link>}
              {role === 'organization' && <Link to="/organization" onClick={closeMenu}>Dashboard</Link>}
              {role === 'driver' && <Link to="/driver" onClick={closeMenu}>Dashboard</Link>}
              {role === 'admin' && (
                <>
                    <Link to="/admin" onClick={closeMenu}>Dashboard</Link>
                    <Link to="/sensor-simulation" onClick={closeMenu} style={{ color: '#10B981' }}>IoT Simulation</Link>
                </>
              )}

              <button 
                onClick={handleLogout} 
                className="btn-logout"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={closeMenu}>Login</Link>
              <Link to="/register" onClick={closeMenu}>Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
