import { useState, useEffect } from 'react';
import { getToken, getUser } from '../../utils/auth';
import DriverTaskList from '../../components/DriverTaskList';
import ChatWindow from '../../components/ChatWindow';
import io from 'socket.io-client';
import { FiTruck, FiList, FiClock, FiMessageSquare, FiTrash2, FiCheckCircle, FiAlertCircle, FiCheckSquare, FiMenu, FiX } from 'react-icons/fi';
import './UserDashboard.css';

const DriverDashboard = () => {
  const user = getUser();
  const [activeTab, setActiveTab] = useState('tasks');
  const [socket, setSocket] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false); // Mobile sidebar state
  
  // Data State
  const [schedules, setSchedules] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  const fetchUserProfile = async () => {
    try {
        const token = getToken();
        if (!token) return;
        const res = await fetch('http://localhost:5000/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            setCurrentUserProfile(data);
        }
    } catch (err) {
        console.error("Error fetching user profile", err);
    }
  };



  const fetchDriverTasks = async () => {
    try {
      setLoading(true);
      const token = getToken();
      
      const [sRes, cRes] = await Promise.all([
        fetch('http://localhost:5000/api/schedules/driver-tasks', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/complaints/driver-tasks', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (sRes.ok) setSchedules(await sRes.json());
      if (cRes.ok) setComplaints(await cRes.json());
    } catch (err) {
      console.error('Error fetching driver tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverTasks();
    fetchUserProfile();
  }, [refreshTrigger]);

  useEffect(() => {
     const newSocket = io.connect('http://localhost:5000');
     setSocket(newSocket);

     newSocket.on('connect', () => {
        console.log('[DriverDashboard] Socket connected:', newSocket.id);
        if (user) {
            console.log(`[DriverDashboard] Joining room: ${user._id}`);
            newSocket.emit('join_room', user._id);
            newSocket.emit('join_room', 'broadcast');
        }
     });

     return () => newSocket.disconnect();
  }, []);

  // Stats Calculation
  const activePickups = schedules.filter(s => ['Assigned', 'Accepted', 'On the way'].includes(s.status)).length;
  const completedPickups = schedules.filter(s => s.status === 'Completed').length;
  const activeComplaints = complaints.filter(c => ['Assigned', 'Accepted', 'On the way'].includes(c.status)).length;
  const completedComplaints = complaints.filter(c => c.status === 'Resolved').length;

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="dashboard-layout driver-dashboard">
        <div className={`sidebar-overlay ${isMobileSidebarOpen ? 'active' : ''}`} onClick={closeMobileSidebar}></div>

        <aside className={`sidebar ${isMobileSidebarOpen ? 'mobile-open' : ''}`}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '10px' }} className="mobile-only-close">
                 {/* Only visible on mobile inside sidebar if needed, but overlay click handles it too */}
                 <button onClick={closeMobileSidebar} style={{ background: 'transparent', border: 'none', color: '#666', padding: 0, display: isMobileSidebarOpen ? 'block' : 'none' }}>
                    <FiX size={24} />
                 </button>
            </div>
            <div className="user-profile" style={{ marginBottom: '30px', textAlign: 'center' }}>
                 <div style={{ marginBottom: '10px', color: 'var(--primary-color)' }}>
                    <FiTruck size={48} />
                </div>
                <h3 style={{ margin: 0, color: 'var(--text-color)' }}>{user?.name}</h3>
                <p style={{ opacity: 0.7, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Professional Driver</p>
            </div>
            
            <nav className="sidebar-nav">
                <button 
                  className={activeTab === 'tasks' ? 'active' : ''} 
                  onClick={() => { setActiveTab('tasks'); closeMobileSidebar(); }}
                >
                    <FiList /> My Tasks
                </button>
                <button 
                  className={activeTab === 'history' ? 'active' : ''} 
                  onClick={() => { setActiveTab('history'); closeMobileSidebar(); }}
                >
                    <FiClock /> History
                </button>
                <button 
                  className={activeTab === 'chat' ? 'active' : ''} 
                  onClick={() => { setActiveTab('chat'); closeMobileSidebar(); }}
                >
                    <FiMessageSquare /> Chat with Admin
                </button>
            </nav>
        </aside>

        <main className="dashboard-content">
            {/* Mobile Header */}
            <header className="mobile-header">
                <div>
                   <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary-color)' }}>Driver Console</h2>
                </div>
                <button className="mobile-menu-btn" onClick={toggleMobileSidebar}>
                    <FiMenu />
                </button>
            </header>

            <header style={{ marginBottom: '30px' }} className="desktop-header">
                <h1 style={{ margin: 0, color: 'var(--primary-color)' }}>Driver Console</h1>
                <p style={{ color: '#666' }}>Manage your pickups and stay connected with dispatch.</p>
            </header>

            <div className="tab-pane">
                {activeTab === 'tasks' && (
                    <>
                        {/* Stats Grid - Visible only in My Tasks */}
                        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                            <div className="stat-card stat-card-purple">
                                <div className="stat-icon"><FiTrash2 /></div>
                                <div className="stat-content">
                                    <div className="stat-value">{activePickups}</div>
                                    <div className="stat-label">Active Pickups</div>
                                </div>
                            </div>

                            <div className="stat-card stat-card-green">
                                <div className="stat-icon"><FiCheckCircle /></div>
                                <div className="stat-content">
                                    <div className="stat-value">{completedPickups}</div>
                                    <div className="stat-label">Completed Pickups</div>
                                </div>
                            </div>

                            <div className="stat-card stat-card-orange">
                                <div className="stat-icon"><FiAlertCircle /></div>
                                <div className="stat-content">
                                    <div className="stat-value">{activeComplaints}</div>
                                    <div className="stat-label">Active Issues</div>
                                </div>
                            </div>

                            <div className="stat-card stat-card-blue">
                                <div className="stat-icon"><FiCheckSquare /></div>
                                <div className="stat-content">
                                    <div className="stat-value">{completedComplaints}</div>
                                    <div className="stat-label">Resolved Issues</div>
                                </div>
                            </div>
                        </div>
                        

                        


                        {/* Vehicle Capacity Status (Read-Only) */}
                        <div style={{ 
                            backgroundColor: 'white', 
                            padding: '20px', 
                            borderRadius: '12px', 
                            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                            marginBottom: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '20px',
                            border: '1px solid #e5e7eb'
                        }}>
                             <div style={{ 
                                 width: '50px', 
                                 height: '50px', 
                                 borderRadius: '10px', 
                                 backgroundColor: '#f0fdf4', 
                                 color: '#16a34a',
                                 display: 'flex', 
                                 alignItems: 'center', 
                                 justifyContent: 'center',
                                 fontSize: '1.5rem'
                             }}>
                                <FiTruck />
                             </div>
                             <div style={{ flex: 1 }}>
                                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                     <span style={{ fontWeight: '600', color: '#1f2937' }}>{currentUserProfile?.vehicleType || 'Van'} Capacity Status</span>
                                     <span style={{ 
                                         fontWeight: 'bold', 
                                         color: (currentUserProfile?.currentWeightKg || 0) > 90 ? '#dc2626' : '#059669' 
                                     }}>
                                         {(currentUserProfile?.currentWeightKg || 0)} / {(currentUserProfile?.maxCapacityKg || 100)} kg
                                     </span>
                                 </div>
                                 
                                 {/* Progress Bar */}
                                 <div style={{
                                     width: '100%',
                                     height: '10px',
                                     backgroundColor: '#e5e7eb',
                                     borderRadius: '5px',
                                     overflow: 'hidden'
                                 }}>
                                     <div style={{
                                         width: `${Math.min(((currentUserProfile?.currentWeightKg || 0) / (currentUserProfile?.maxCapacityKg || 100)) * 100, 100)}%`,
                                         height: '100%',
                                         backgroundColor: (currentUserProfile?.currentWeightKg || 0) > 90 ? '#dc2626' : '#10b981',
                                         borderRadius: '5px',
                                         transition: 'width 0.5s ease-in-out'
                                     }}></div>
                                 </div>

                                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6b7280', marginTop: '4px' }}>
                                     <span>Empty</span>
                                     <span>Auto-resets at 100kg</span>
                                 </div>
                             </div>
                        </div>

                        <DriverTaskList 
                          schedules={schedules} 
                          complaints={complaints} 
                          onUpdate={() => setRefreshTrigger(prev => prev + 1)}
                          viewMode="active"
                          socket={socket}
                        />
                    </>
                )}

                {activeTab === 'history' && (
                    <DriverTaskList 
                      schedules={schedules} 
                      complaints={complaints} 
                      onUpdate={() => setRefreshTrigger(prev => prev + 1)}
                      viewMode="history"
                      // socket removed
                    />
                )}

                <div style={{ display: activeTab === 'chat' ? 'block' : 'none', maxWidth: '600px', margin: '0 auto' }}>
                    {socket && (
                        <ChatWindow 
                            socket={socket} 
                            username={user?.name} 
                            currentUserId={user?._id}
                            room={user?._id} 
                        />
                    )}
                </div>
            </div>
        </main>
    </div>
  );
};

export default DriverDashboard;
