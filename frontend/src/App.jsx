import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import LandingPage from './pages/LandingPage';
import Unauthorized from './pages/Unauthorized';
// Dashboards
import UserDashboard from './pages/dashboards/UserDashboard';
import OrganizationDashboard from './pages/dashboards/OrganizationDashboard';
import DriverDashboard from './pages/dashboards/DriverDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import SensorSimulator from './components/SensorSimulator';


import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HelperBot from './components/HelperBot';
import './index.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/sensor-simulation" element={<SensorSimulator />} />


          {/* User Routes */}
          <Route
            path="/user"
            element={
              <ProtectedRoute allowedRoles={['user']}>
                <UserDashboard />
              </ProtectedRoute>
            }
          />

          {/* Organization Routes */}
          <Route
            path="/organization"
            element={
              <ProtectedRoute allowedRoles={['organization']}>
                <OrganizationDashboard />
              </ProtectedRoute>
            }
          />

          {/* Driver Routes */}
          <Route
            path="/driver"
            element={
              <ProtectedRoute allowedRoles={['driver']}>
                <DriverDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
        <HelperBot />
        <Footer />
      </div>
    </Router>
  );
}

export default App;
