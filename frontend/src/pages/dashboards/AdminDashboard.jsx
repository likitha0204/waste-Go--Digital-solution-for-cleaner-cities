import { useState, useEffect } from 'react';
import { logout, getUser, getToken } from '../../utils/auth';
import { FiCheckCircle } from 'react-icons/fi';
import AdminScheduleView from '../../components/AdminScheduleView';
import AdminComplaintView from '../../components/AdminComplaintView';
import AdminSuggestionView from '../../components/AdminSuggestionView';
import AnalyticsBoard from '../../components/AnalyticsBoard';
import ChatWindow from '../../components/ChatWindow';
import io from 'socket.io-client';
import mqtt from 'mqtt';

import { FiShield, FiPieChart, FiTrash2, FiAlertTriangle, FiTruck, FiMessageSquare, FiLifeBuoy, FiRadio } from 'react-icons/fi';
import './UserDashboard.css';

const BIN_ADDRESSES = {
  '101': 'Address 1',
  '102': 'Address 2',
  '103': 'Address 3',
  '104': 'Address 4'
};

const AdminDashboard = () => {
  const user = getUser();
  const [activeTab, setActiveTab] = useState('overview');
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [socket, setSocket] = useState(null);
  const [broadcastMode, setBroadcastMode] = useState(false);
  const [pendingPickupsCount, setPendingPickupsCount] = useState(0);
  const [pendingComplaintsCount, setPendingComplaintsCount] = useState(0);
  const [criticalBins, setCriticalBins] = useState([]);
  const [activeSchedules, setActiveSchedules] = useState([]);
  const [recentCompletions, setRecentCompletions] = useState([]);
  const [alertDriverSelections, setAlertDriverSelections] = useState({});

  const handleAssignFromAlert = async (binId, address) => {
      const driverId = alertDriverSelections[binId];
      if (!driverId) {
          alert('Please select a driver first');
          return;
      }

      try {
          const token = getToken();
          
          // 1. Create Schedule Task
          const scheduleRes = await fetch('http://localhost:5000/api/schedules', {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}` 
              },
              body: JSON.stringify({
                  wasteType: 'Mixed Waste (Bin Overflow)',
                  quantity: '100% Full',
                  pickupDate: new Date().toISOString().split('T')[0],
                  time: new Date().toLocaleTimeString(),
                  address: address,
                  name: `System Alert - Bin #${binId}`,
                  contactNumber: 'N/A',
                  driverSuggestions: 'Urgent Pickup Required',
                  latitude: '', 
                  longitude: ''
              })
          });

          if (!scheduleRes.ok) throw new Error('Failed to create task');
          const scheduleData = await scheduleRes.json();

          // 2. Assign Driver
          const assignRes = await fetch(`http://localhost:5000/api/schedules/${scheduleData._id}/assign`, {
              method: 'PUT',
              headers: { 
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}` 
              },
              body: JSON.stringify({ driverId })
          });

          if (!assignRes.ok) throw new Error('Failed to assign driver');

          // alert('Driver assigned successfully!'); // Removed per user request
          fetchPendingCounts(); // Refresh counts
          
          // Clear selection
          setAlertDriverSelections(prev => {
              const next = { ...prev };
              delete next[binId];
              return next;
          });

      } catch (err) {
          console.error(err);
          alert('Error dispatching driver: ' + err.message);
      }
  };



  useEffect(() => {
    const newSocket = io.connect('http://localhost:5000');
    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, []);

  // MQTT Connection for Sensor Alerts
  // MQTT Connection for Sensor Alerts
  // MQTT Connection for Sensor Alerts
  useEffect(() => {
    // Force MQTT 3.1.1 (protocolVersion 4)
    const client = mqtt.connect('ws://localhost:8888', {
        protocolVersion: 4
    });


    client.on('connect', () => {
        console.log('Admin Dashboard connected to MQTT');
        client.subscribe('bins/+/level');
    });

    client.on('message', (topic, message) => {
        const msgStr = message.toString();
        
        try {
            const level = parseInt(msgStr);
            const binId = topic.split('/')[1];
            
            // Update bin levels state
            setCriticalBins(prev => {
                const existing = prev.find(b => b.id === binId);
                if (existing) return prev.map(b => b.id === binId ? { ...b, level } : b);
                return [...prev, { id: binId, level }];
            });
        } catch (e) {
            console.error('Error parsing MQTT message:', e);
        }
    });



    return () => {
        if (client) client.end();
    };
  }, []);



  const fetchDrivers = async () => {
      try {
          const token = getToken();
          const response = await fetch('http://localhost:5000/api/auth/drivers', {
              headers: { Authorization: `Bearer ${token}` },
          });
          const data = await response.json();
          if (response.ok) setDrivers(data);
      } catch (err) {
          console.error('Error fetching drivers', err);
      }
  };

  const fetchPendingCounts = async () => {
      try {
          const token = getToken();
          const [schedulesRes, complaintsRes] = await Promise.all([
              fetch('http://localhost:5000/api/schedules/all', { headers: { Authorization: `Bearer ${token}` } }),
              fetch('http://localhost:5000/api/complaints/all', { headers: { Authorization: `Bearer ${token}` } })
          ]);
          
          if (schedulesRes.ok) {
              const schedules = await schedulesRes.json();
              const pending = schedules.filter(s => s.status === 'Pending').length;
              setPendingPickupsCount(pending);
              
              // Store active schedules to check for assignments
              const active = schedules.filter(s => ['Assigned', 'Accepted', 'On the way'].includes(s.status));
              setActiveSchedules(active);

              // Identify recently completed tasks (e.g., last 30 seconds) to suppress alerts briefly
              // This gives the user time to lower the simulator slider without the alert popping back instantly
              const suppressionTime = new Date(Date.now() - 30 * 1000);
              const recent = schedules.filter(s => 
                  s.status === 'Completed' && 
                  new Date(s.updatedAt || s.createdAt) > suppressionTime
              );
              setRecentCompletions(recent);
          }
          
          if (complaintsRes.ok) {
              const complaints = await complaintsRes.json();
              const pending = complaints.filter(c => c.status === 'Pending').length;
              setPendingComplaintsCount(pending);
          }
      } catch (err) {
          console.error('Error fetching counts', err);
      }
  };

  useEffect(() => {
    fetchDrivers();
    fetchPendingCounts();
    
    // Refresh counts every 30 seconds
    const interval = setInterval(fetchPendingCounts, 30000);
    return () => clearInterval(interval);
  }, []);

  const joinChat = (driver) => {
      setSelectedDriver(driver);
      setBroadcastMode(false);
      setShowChat(true);
      if (socket) {
          console.log(`Admin joining conversation with: ${driver._id}`);
          socket.emit('join_room', driver._id);
      }
  };

  const startBroadcast = () => {
      setBroadcastMode(true);
      setSelectedDriver(null);
      setShowChat(true);
  };

  return (
    <div className="dashboard-layout admin-bg">
      <aside className="sidebar">
          <div className="user-profile" style={{ marginBottom: '30px', textAlign: 'center' }}>
               <div style={{ marginBottom: '10px', color: 'var(--primary-color)' }}>
                  <FiShield size={48} />
              </div>
              <h3 style={{ margin: 0, color: 'var(--text-color)' }}>{user?.name}</h3>
              <p style={{ opacity: 0.7, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Administrator</p>
          </div>
          
          <nav className="sidebar-nav">
              <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}><FiPieChart /> Overview</button>
              <button className={activeTab === 'pickups' ? 'active' : ''} onClick={() => setActiveTab('pickups')}><FiTrash2 /> Pickups</button>
              <button className={activeTab === 'complaints' ? 'active' : ''} onClick={() => setActiveTab('complaints')}><FiAlertTriangle /> Complaints</button>
              <button className={activeTab === 'drivers' ? 'active' : ''} onClick={() => setActiveTab('drivers')}><FiTruck /> Drivers</button>
              <button className={activeTab === 'chat' ? 'active' : ''} onClick={() => setActiveTab('chat')}><FiMessageSquare /> Messenger</button>
              <button className={activeTab === 'suggestions' ? 'active' : ''} onClick={() => setActiveTab('suggestions')}><FiLifeBuoy /> Suggestions</button>
          </nav>
      </aside>

      <main className="dashboard-content">
          <header style={{ marginBottom: '30px' }}>
              <h1 style={{ margin: 0, color: 'var(--primary-color)' }}>Admin Control Center</h1>
              <p style={{ color: '#666' }}>Full system oversight and coordination.</p>
              
              {/* Critical Alerts Section */}
              {activeTab === 'pickups' && (
                  <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '15px', marginTop: '16px' }}>
                      {criticalBins.filter(b => {
                          if (b.level <= 90) return false;
                          // Check if suppressed (recently completed)
                          const addr = BIN_ADDRESSES[b.id];
                          const isRecentlyCompleted = recentCompletions.some(s => s.address === addr);
                          return !isRecentlyCompleted;
                      }).map(bin => (
                          <div key={bin.id} className="animate-pulse" style={{ 
                              backgroundColor: '#fff5f5', 
                              border: '1px solid #fecaca', 
                              borderLeft: '5px solid #ef4444',
                              color: '#dc2626', 
                              padding: '12px 20px', 
                              borderRadius: '8px', 
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                              display: 'flex', 
                              alignItems: 'center',
                              minWidth: '350px',
                              flex: '1 1 auto'
                          }}>
                              <FiAlertTriangle style={{ fontSize: '1.5rem', marginRight: '12px', flexShrink: 0 }} />
                              <div style={{ flex: 1 }}>
                                  <span style={{ fontWeight: 'bold', fontSize: '1rem', display: 'block' }}>
                                      CRITICAL ALERT: {BIN_ADDRESSES[bin.id] || `Bin #${bin.id}`}
                                  </span>
                                  <span style={{ fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>
                                      {bin.level}% Full - Immediate collection required.
                                  </span>
                                  
                                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                      {(() => {
                                          // Check if this bin address already has an active task
                                          const binAddress = BIN_ADDRESSES[bin.id];
                                          const assignedTask = activeSchedules.find(s => s.address === binAddress);

                                          if (assignedTask) {
                                              return (
                                                  <div style={{ 
                                                      padding: '6px 12px', 
                                                      backgroundColor: '#d1fae5', 
                                                      color: '#065f46', 
                                                      borderRadius: '4px', 
                                                      fontSize: '0.9rem',
                                                      fontWeight: '600',
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      gap: '6px',
                                                      width: '100%'
                                                  }}>
                                                      <FiCheckCircle /> Assigned to {assignedTask.assignedDriver?.name || 'Driver'}
                                                  </div>
                                              );
                                          }

                                          return (
                                              <>
                                                  <select
                                                      value={alertDriverSelections[bin.id] || ''}
                                                      onChange={(e) => setAlertDriverSelections(prev => ({ ...prev, [bin.id]: e.target.value }))}
                                                      style={{
                                                          padding: '6px',
                                                          borderRadius: '4px',
                                                          border: '1px solid #fca5a5',
                                                          fontSize: '0.85rem',
                                                          backgroundColor: '#fff',
                                                          color: '#333'
                                                      }}
                                                  >
                                                      <option value="">Select Driver...</option>
                                                      {drivers.filter(d => !d.isBusy).map(d => (
                                                          <option 
                                                              key={d._id} 
                                                              value={d._id}
                                                              style={{
                                                                  color: d.currentWeightKg >= (d.maxCapacityKg || 100) * 0.8 ? 'orange' : 'black'
                                                              }}
                                                          >
                                                              {d.name} ({d.vehicleType || 'Van'}) - {d.currentWeightKg || 0}/{d.maxCapacityKg || 100} kg
                                                          </option>
                                                      ))}
                                                  </select>
                                                  <button
                                                      onClick={() => handleAssignFromAlert(bin.id, BIN_ADDRESSES[bin.id] || `Bin #${bin.id}`)}
                                                      style={{
                                                          padding: '6px 12px',
                                                          backgroundColor: '#dc2626',
                                                          color: 'white',
                                                          border: 'none',
                                                          borderRadius: '4px',
                                                          cursor: 'pointer',
                                                          fontWeight: 'bold',
                                                          fontSize: '0.85rem'
                                                      }}
                                                  >
                                                      Assign
                                                  </button>
                                              </>
                                          );
                                      })()}
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              )}

              {/* Live IoT Data Section */}
              {activeTab === 'pickups' && criticalBins.length > 0 && (
                  <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#475569', fontSize: '0.9rem', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
                          <FiRadio style={{ marginRight: '6px' }}/> Live Sensor Feed (Active Bins)
                      </h4>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          {criticalBins.map(bin => (
                              <div key={bin.id} style={{ 
                                  padding: '6px 12px', 
                                  borderRadius: '20px', 
                                  backgroundColor: 'white', 
                                  border: '1px solid #cbd5e1',
                                  fontSize: '0.85rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                              }}>
                                  <span style={{ fontWeight: '600' }}>#{bin.id}</span>
                                  <span style={{ 
                                      color: bin.level > 90 ? '#DC2626' : bin.level > 70 ? '#D97706' : '#059669', 
                                      fontWeight: 'bold' 
                                  }}>
                                      {bin.level}%
                                  </span>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
          </header>



          <div className="tab-pane">
              {activeTab === 'overview' && <AnalyticsBoard />}

              {activeTab === 'pickups' && <AdminScheduleView pendingCount={pendingPickupsCount} onUpdate={fetchPendingCounts} />}

              {activeTab === 'complaints' && <AdminComplaintView pendingCount={pendingComplaintsCount} onUpdate={fetchPendingCounts} />}

              {activeTab === 'drivers' && (
                  <div className="card">
                      <h3>Driver Fleet</h3>
                      <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                              <thead>
                                  <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                                      <th style={{ padding: '12px' }}>Name</th>
                                      <th style={{ padding: '12px' }}>Email</th>
                                      <th style={{ padding: '12px' }}>Contact</th>
                                      <th style={{ padding: '12px' }}>Vehicle</th>
                                      <th style={{ padding: '12px' }}>Capacity (kg)</th>
                                      <th style={{ padding: '12px' }}>Address</th>
                                      <th style={{ padding: '12px' }}>Actions</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {drivers.map(driver => (
                                      <tr key={driver._id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                          <td style={{ padding: '12px' }}>{driver.name}</td>
                                          <td style={{ padding: '12px' }}>{driver.email}</td>
                                          <td style={{ padding: '12px' }}>{driver.contactNumber || 'N/A'}</td>
                                          <td style={{ padding: '12px' }}>
                                              <select
                                                  value={driver.vehicleType || ''}
                                                  onChange={(e) => {
                                                      const newType = e.target.value;
                                                      const updateDriver = async () => {
                                                          try {
                                                              const token = getToken();
                                                              const res = await fetch(`http://localhost:5000/api/auth/users/${driver._id}`, {
                                                                  method: 'PUT',
                                                                  headers: { 
                                                                      'Content-Type': 'application/json',
                                                                      Authorization: `Bearer ${token}` 
                                                                  },
                                                                  body: JSON.stringify({ vehicleType: newType })
                                                              });
                                                              if(res.ok) {
                                                                  fetchDrivers();
                                                              } else {
                                                                  alert('Failed to update driver');
                                                              }
                                                          } catch(e) {
                                                              console.error(e);
                                                              alert('Error updating driver');
                                                          }
                                                      };
                                                      updateDriver();
                                                  }}
                                                  style={{
                                                      padding: '6px',
                                                      borderRadius: '6px',
                                                      border: '1px solid #ccc',
                                                      fontSize: '0.85rem',
                                                      width: '100%'
                                                  }}
                                              >
                                                  <option value="">Select Van Type...</option>
                                                  <option value="Plastic garbage Van">Plastic garbage Van</option>
                                                  <option value="Bio-degradable Waste Van">Bio-degradable Waste Van</option>
                                                  <option value="Glass Waste Van">Glass Waste Van</option>
                                                  <option value="Dry Waste Van">Dry Waste Van</option>
                                                  <option value="Mixed Waste Van">Mixed Waste Van</option>
                                                  <option value="General Van">General Van</option>
                                              </select>
                                          </td>
                                          <td style={{ padding: '12px' }}>
                                              {(driver.currentWeightKg || 0)} / {(driver.maxCapacityKg || 100)}
                                              <div style={{ width: '100%', height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', marginTop: '5px' }}>
                                                  <div style={{ 
                                                      width: `${Math.min(((driver.currentWeightKg || 0) / (driver.maxCapacityKg || 100)) * 100, 100)}%`, 
                                                      height: '100%', 
                                                      backgroundColor: driver.currentWeightKg >= (driver.maxCapacityKg || 100) ? '#ef4444' : '#10b981', 
                                                      borderRadius: '3px' 
                                                  }}></div>
                                              </div>
                                          </td>
                                          <td style={{ padding: '12px' }}>{driver.address || 'N/A'}</td>
                                          <td style={{ padding: '12px' }}>
                                              <button 
                                                onClick={() => { setActiveTab('chat'); joinChat(driver); }}
                                                style={{ 
                                                    fontSize: '0.8rem', 
                                                    padding: '6px 12px', 
                                                    cursor: 'pointer', 
                                                    borderRadius: '6px', 
                                                    border: '1px solid #d1d5db', 
                                                    background: '#fff',
                                                    color: '#374151',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    fontWeight: '500'
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
                                              >
                                                  <FiMessageSquare /> Contact
                                              </button>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}

              <div style={{ display: activeTab === 'chat' ? 'block' : 'none' }}>
                  <div className="admin-chat-layout">
                        {/* Sidebar */}
                        <div className="chat-sidebar">
                            <div className="chat-sidebar-header">
                                <button 
                                    onClick={startBroadcast}
                                    style={{ 
                                        width: '100%', 
                                        padding: '12px',
                                        backgroundColor: broadcastMode ? '#EF4444' : '#10B981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        marginBottom: '0'
                                    }}
                                >
                                    {broadcastMode ? 'Stop Broadcast' : <><FiRadio /> Broadcast to All</>}
                                </button>
                            </div>
                            <ul className="chat-sidebar-list">
                                {drivers.map(driver => (
                                    <li key={driver._id}>
                                        <button 
                                            className={`driver-item ${selectedDriver?._id === driver._id && !broadcastMode ? 'active' : ''}`}
                                            onClick={() => joinChat(driver)}
                                        >
                                            <span style={{fontSize: '1.2rem', display: 'flex'}}><FiTruck /></span>
                                            <span>{driver.name}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Main Chat Area */}
                        <div className="chat-main">
                            {showChat && socket ? (
                                <ChatWindow 
                                    socket={socket} 
                                    username={user.name} 
                                    currentUserId={user?._id}
                                    room={broadcastMode ? 'broadcast' : selectedDriver?._id} 
                                    broadcast={broadcastMode}
                                    chatTitle={broadcastMode ? 'Global Broadcast' : `Chat with ${selectedDriver?.name}`}
                                />
                            ) : (
                                <div style={{ 
                                    height: '100%', 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    color: '#9CA3AF' 
                                }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}><FiMessageSquare /></div>
                                    <p>Select a driver to start chatting</p>
                                </div>
                            )}
                        </div>
                  </div>
              </div>

              {activeTab === 'suggestions' && <AdminSuggestionView />}
          </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
