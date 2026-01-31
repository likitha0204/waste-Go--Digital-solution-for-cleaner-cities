import { useState, useEffect } from 'react';
import { logout, getUser, getToken } from '../../utils/auth';
import ScheduleForm from '../../components/ScheduleForm';
import ScheduleList from '../../components/ScheduleList';
import ComplaintForm from '../../components/ComplaintForm';
import ComplaintList from '../../components/ComplaintList';
import './UserDashboard.css'; // Reusing the same premium styles
import { FiLayout, FiTrash2, FiAlertCircle, FiLoader, FiPackage, FiCheckCircle, FiFileText, FiCheckSquare, FiMessageSquare, FiTruck, FiClock, FiPhone, FiMapPin, FiX } from 'react-icons/fi';
import io from 'socket.io-client';

const OrganizationDashboard = () => {
  // ... (keep logic same)
  const user = getUser();
  // ... (keep other state hooks same until return)
  const [refreshSchedules, setRefreshSchedules] = useState(false);
  const [refreshComplaints, setRefreshComplaints] = useState(false);
  const [stats, setStats] = useState({
    totalPickups: 0,
    completedPickups: 0,
    pendingPickups: 0,
    totalComplaints: 0,
    resolvedComplaints: 0,
    pendingComplaints: 0
  });
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showComplaintForm, setShowComplaintForm] = useState(false);

  // Messaging & Notifications - Removed per request, keeping socket for Alert only
  // const [showMessages, setShowMessages] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
     const newSocket = io('http://localhost:5000');
     setSocket(newSocket);
     
     if (user) {
         newSocket.emit('join_room', user._id);
     }

     newSocket.on('trip_started_notification', (data) => {
         // Real-time Popup Alert
         alert(`🔔 NOTIFICATION: ${data.message}`);
     });

     return () => newSocket.disconnect();
  }, []);

  const handleScheduleCreated = () => {
    setRefreshSchedules(!refreshSchedules);
    setShowScheduleForm(false);
    fetchStats();
  };

  const handleComplaintCreated = () => {
    setRefreshComplaints(!refreshComplaints);
    setShowComplaintForm(false);
    fetchStats();
  };

  const fetchStats = async () => {
    try {
      const token = getToken();
      
      // Fetch schedules
      const schedulesRes = await fetch('http://localhost:5000/api/schedules/my-schedules', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const schedulesData = await schedulesRes.json();
      
      // Fetch complaints
      const complaintsRes = await fetch('http://localhost:5000/api/complaints/my-complaints', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const complaintsData = await complaintsRes.json();

      if (schedulesRes.ok && complaintsRes.ok) {
        const completed = schedulesData.filter(s => s.status === 'Completed').length;
        const pending = schedulesData.filter(s => s.status !== 'Completed').length;
        const resolved = complaintsData.filter(c => c.status === 'Resolved').length;
        const pendingC = complaintsData.filter(c => c.status !== 'Resolved').length;

        setStats({
          totalPickups: schedulesData.length,
          completedPickups: completed,
          pendingPickups: pending,
          totalComplaints: complaintsData.length,
          resolvedComplaints: resolved,
          pendingComplaints: pendingC
        });
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [refreshSchedules, refreshComplaints]);

  return (
    <div className="dashboard-layout user-org-bg">
      <div className="sidebar">
          <div className="user-profile" style={{ marginBottom: '30px', textAlign: 'center' }}>
              <div style={{ marginBottom: '10px', color: 'var(--primary-color)' }}>
                  <FiLayout size={48} />
              </div>
              <h3 style={{ margin: 0, color: 'var(--text-color)' }}>{user?.name}</h3>
              <p style={{ opacity: 0.7, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Organization Account</p>
          </div>
          
          <nav className="sidebar-nav">
              <button onClick={() => {
                setShowScheduleForm(true);
                setShowComplaintForm(false);
                setShowMessages(false);
              }}>
                <FiTrash2 /> Schedule Pickup
              </button>
              <button onClick={() => {
                setShowComplaintForm(true);
                setShowScheduleForm(false);
                setShowMessages(false);
              }}>
                <FiAlertCircle /> Report Issue
              </button>

          </nav>
      </div>

      <main className="dashboard-content">
          <header style={{ marginBottom: '30px' }}>
              <h1 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '2rem' }}>Organization Dashboard</h1>
              <p style={{ color: '#666', marginTop: '8px' }}>Manage recurring waste pickups and report overflowing public bins.</p>
          </header>

          {/* Stats Overview */}
          <div className="stats-grid">
            {/* Pickups Group - Reordered */}
            <div className="stat-card stat-card-purple">
              <div className="stat-icon"><FiLoader /></div>
              <div className="stat-content">
                <div className="stat-value">{stats.pendingPickups}</div>
                <div className="stat-label">Pending Pickups</div>
              </div>
            </div>

            <div className="stat-card stat-card-green">
              <div className="stat-icon"><FiPackage /></div>
              <div className="stat-content">
                <div className="stat-value">{stats.totalPickups}</div>
                <div className="stat-label">Total Pickups</div>
              </div>
            </div>

            <div className="stat-card stat-card-blue">
              <div className="stat-icon"><FiCheckCircle /></div>
              <div className="stat-content">
                <div className="stat-value">{stats.completedPickups}</div>
                <div className="stat-label">Completed Pickups</div>
              </div>
            </div>

            {/* Complaints Group - Reordered */}
            <div className="stat-card stat-card-red">
              <div className="stat-icon"><FiAlertCircle /></div>
              <div className="stat-content">
                <div className="stat-value">{stats.pendingComplaints}</div>
                <div className="stat-label">Pending Issues</div>
              </div>
            </div>

            <div className="stat-card stat-card-orange">
              <div className="stat-icon"><FiFileText /></div>
              <div className="stat-content">
                <div className="stat-value">{stats.totalComplaints}</div>
                <div className="stat-label">Total Complaints</div>
              </div>
            </div>

            <div className="stat-card stat-card-pink">
              <div className="stat-icon"><FiCheckSquare /></div>
              <div className="stat-content">
                <div className="stat-value">{stats.resolvedComplaints}</div>
                <div className="stat-label">Resolved Issues</div>
              </div>
            </div>
          </div>

          {/* Forms Section */}
          {(showScheduleForm || showComplaintForm) && (
            <div className="form-modal">
              <div className="form-container">
                <button 
                  className="close-btn"
                  onClick={() => {
                    setShowScheduleForm(false);
                    setShowComplaintForm(false);
                  }}
                >
                  <FiX size={24} />
                </button>
                
                {showScheduleForm && (
                  <div>
                    <h2 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>
                      Schedule New Pickup
                    </h2>
                    <ScheduleForm onScheduleCreated={handleScheduleCreated} />
                  </div>
                )}
                
                {showComplaintForm && (
                  <div>
                    <h2 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>
                      Report New Issue
                    </h2>
                    <ComplaintForm onComplaintCreated={handleComplaintCreated} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Lists Section */}
          <div className="lists-container">
            <section className="list-section">
              <h3 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>
                Active Pickup Schedules
              </h3>
              <ScheduleList refreshTrigger={refreshSchedules} />
            </section>

            <section className="list-section">
              <h3 style={{ marginBottom: '20px', color: 'var(--primary-color)' }}>
                Our Reports
              </h3>
              <ComplaintList refreshTrigger={refreshComplaints} />
            </section>
          </div>
          
      </main>
    </div>
  );
};

export default OrganizationDashboard;
