import { useState, useEffect } from 'react';
import { getToken, getUser } from '../utils/auth';
import API_URL from '../config';
import { FiMapPin, FiUser, FiCalendar, FiMap, FiCheck, FiCheckCircle, FiClock, FiTruck, FiCheckSquare } from 'react-icons/fi';

const DriverTaskList = ({ schedules = [], complaints = [], onUpdate, viewMode = 'active', socket }) => {
  const [taskType, setTaskType] = useState('pickups'); // pickups, complaints
  const [loading, setLoading] = useState(false); // Controlled by parent now effectively
  const [error, setError] = useState('');
  const currentUser = getUser();
  
  const sortTasks = (tasks) => {
      return [...tasks].sort((a, b) => {
          // Priority Order: Assigned (1) -> Accepted (2) -> On the way (3) -> Completed/Resolved (4)
          const getPriority = (status) => {
              if (status === 'Assigned') return 1;
              if (status === 'Pending') return 1; // Just in case
              if (status === 'Accepted') return 2;
              if (status === 'On the way') return 3;
              if (status === 'Completed' || status === 'Resolved') return 4;
              return 5;
          };

          const priorityA = getPriority(a.status);
          const priorityB = getPriority(b.status);

          if (priorityA !== priorityB) {
              return priorityA - priorityB;
          }

          // If same priority, sort by date (Newest first)
          // Pickups have pickupDate, Complaints might have createdAt or date
          const dateA = new Date(a.pickupDate || a.createdAt);
          const dateB = new Date(b.pickupDate || b.createdAt);
          return dateB - dateA;
      });
  };

  const sortedSchedules = sortTasks(schedules);
  const sortedComplaints = sortTasks(complaints);

  const updateStatus = async (id, type, status, collectedWeight = 0) => {
    try {
      const token = getToken();
      const endpoint = type === 'pickup' ? `/api/schedules/${id}/status` : `/api/complaints/${id}/status`;
      console.log(`Updating ${type} ${id} to ${status}`);
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, collectedWeight }),
      });

      if (response.ok) {
        if (onUpdate) onUpdate(); // Trigger parent refresh

        // --- Socket Emission for Start Trip (With ETA Calc) ---
        if (status === 'On the way' && socket) {
             const list = type === 'pickup' ? schedules : complaints;
             const task = list.find(t => t._id === id);
             const userId = task?.user?._id || task?.user || task?.userId;
             
             if (userId) {
                 // FORCE DEMO: If task has no coords, assume Bangalore Center (so ETA works)
                 const targetUserLat = task?.latitude || 12.9716;
                 const targetUserLng = task?.longitude || 77.5946;

                 const emitData = (coords = {}) => {
                    socket.emit('driver_started_trip', {
                        userId: userId,
                        taskType: type,
                        taskId: id,
                        driverName: currentUser?.name,
                        driverPhone: currentUser?.email, 
                        userLat: targetUserLat,
                        userLng: targetUserLng,
                        ...coords
                    });
                 };

                 // Always force an emission with coordinates
                 if (navigator.geolocation) {
                     navigator.geolocation.getCurrentPosition(
                         (pos) => emitData({ driverLat: pos.coords.latitude, driverLng: pos.coords.longitude }),
                         (err) => {
                             console.warn("Geolocation failed. Using DEMO Driver location.", err);
                             // Mock Driver: 3km away from User
                             emitData({ 
                                 driverLat: Number(targetUserLat) - 0.03, 
                                 driverLng: Number(targetUserLng) - 0.03 
                             });
                         },
                         { timeout: 7000 }
                     );
                 } else {
                     // No Geo support, Mock Driver
                     emitData({ 
                         driverLat: Number(targetUserLat) - 0.03, 
                         driverLng: Number(targetUserLng) - 0.03 
                     });
                 }
             }
        }
      } else {
        const errData = await response.json();
        console.error('Update failed', errData);
        alert(`Failed to update status: ${errData.message}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error updating status');
    }
  };
  
  const handleWeightSubmit = () => {
      if (!selectedTask) return;
      if (!weightInput || isNaN(weightInput) || parseFloat(weightInput) < 0) {
          alert("Please enter a valid weight (kg).");
          return;
      }
      
      const status = taskType === 'pickups' ? 'Completed' : 'Resolved';
      updateStatus(selectedTask.id, selectedTask.type, status, parseFloat(weightInput));
      setShowWeightModal(false);
      setWeightInput('');
      setSelectedTask(null);
  };

  const renderTaskCard = (task, type) => {
      const isPickup = type === 'pickup';
      
      // Create Google Maps URL - prefer coordinates, fallback to address
      let googleMapsUrl;
      if (task.latitude && task.longitude) {
        const destination = `${task.latitude},${task.longitude}`;
        googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
      } else if (task.address) {
        // Fallback to address-based navigation
        googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(task.address)}`;
      }

      return (
          <div key={task._id} className="card" style={{ marginBottom: '15px', borderLeft: `5px solid ${isPickup ? '#386641' : '#bc4749'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ flex: '1 1 300px' }}>
                      <h4 style={{ margin: '0 0 10px 0' }}>{isPickup ? task.wasteType : task.description}</h4>
                      <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}><FiMapPin /> {task.address}</p>
                      <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: '#666', display: 'flex', alignItems: 'center', gap: '8px' }}><FiUser /> {isPickup ? task.name : task.user?.name}</p>
                      {isPickup && <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: 'var(--primary-color)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}><FiCalendar /> {new Date(task.pickupDate).toLocaleDateString()} at {task.time}</p>}
                  </div>
                  <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                      <span style={{ 
                          padding: '4px 10px', 
                          borderRadius: '20px', 
                          fontSize: '0.75rem', 
                          backgroundColor: '#f2e8cf',
                          color: 'var(--primary-color)',
                          fontWeight: 'bold',
                          display: 'inline-block'
                      }}>
                          {task.status}
                      </span>
                  </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap' }}>
                  {/* Only show navigation for non-completed tasks */}
                  {task.status !== 'Completed' && task.status !== 'Resolved' && (
                      <button 
                        onClick={(e) => {
                            e.preventDefault();
                            if (!task.latitude && !task.longitude && !task.address) return;

                            let url = 'https://www.google.com/maps/dir/?api=1';
                            
                            // We do NOT need to fetch origin manually. Google Maps handles "Current Location" automatically if origin is omitted.
                            // This avoids popup blockers and permissions delays.

                            if (task.latitude && task.longitude) {
                                url += `&destination=${task.latitude},${task.longitude}`;
                            } else {
                                url += `&destination=${encodeURIComponent(task.address)}`;
                            }
                            
                            window.open(url, '_blank');
                        }}
                        style={{ 
                          background: task.latitude && task.longitude 
                            ? 'linear-gradient(135deg, #6a994e 0%, #386641 100%)' 
                            : 'linear-gradient(135deg, #7fb069 0%, #52734d 100%)',
                          color: 'white',
                          textDecoration: 'none', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          padding: '12px 20px',
                          borderRadius: '10px',
                          fontWeight: '600',
                          fontSize: '0.95rem',
                          boxShadow: '0 4px 12px rgba(56, 102, 65, 0.3)',
                          transition: 'all 0.3s ease',
                          border: 'none',
                          cursor: 'pointer',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 20px rgba(56, 102, 65, 0.45)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(56, 102, 65, 0.3)';
                        }}
                      >
                          <span style={{ fontSize: '1.2rem', display: 'flex' }}><FiMap /></span>
                          <span>Navigate to Location</span>
                          {!task.latitude && !task.longitude && (
                            <span style={{ 
                              fontSize: '0.7rem', 
                              backgroundColor: 'rgba(255, 255, 255, 0.3)', 
                              padding: '3px 8px', 
                              borderRadius: '12px',
                              marginLeft: '6px',
                              fontWeight: '500',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}>
                              Address Mode
                            </span>
                          )}
                      </button>
                  )}
                  
                  {/* Show completion indicator for completed tasks */}
                  {(task.status === 'Completed' || task.status === 'Resolved') && (
                      <div style={{ 
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        padding: '12px 20px',
                        borderRadius: '10px',
                        fontWeight: '600',
                        fontSize: '0.95rem',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                      }}>
                          <span style={{ fontSize: '1.2rem', display: 'flex' }}><FiCheck /></span>
                          <span>Task Completed</span>
                      </div>
                  )}

                  {task.status === 'Assigned' && (
                      <button onClick={() => updateStatus(task._id, type, 'Accepted')} style={{ backgroundColor: '#6a994e' }}>Confirm Receipt</button>
                  )}
                  {task.status === 'Accepted' && (
                      <button onClick={() => updateStatus(task._id, type, 'On the way')} style={{ backgroundColor: '#2196F3' }}>Start Trip</button>
                  )}
                  {task.status === 'On the way' && (
                      <button onClick={() => {
                          // Auto-extract weight logic
                          let weight = 0;
                          if (task.quantity) {
                              const match = task.quantity.match(/(\d+(\.\d+)?)/);
                              if (match) {
                                  weight = parseFloat(match[0]);
                              }
                          }
                          
                          const status = taskType === 'pickups' ? 'Completed' : 'Resolved';
                          updateStatus(task._id, type, status, weight);
                      }} style={{ backgroundColor: '#386641' }}>Mark Finished</button>
                  )}
                  {(task.status === 'Completed' || task.status === 'Resolved') && (
                      <span style={{ color: '#386641', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <FiCheckCircle /> Job Completed
                      </span>
                  )}
              </div>
          </div>
      );
  };

  const activeSchedules = sortedSchedules.filter(t => ['Assigned', 'Accepted', 'On the way', 'Pending'].includes(t.status));
  const historySchedules = sortedSchedules.filter(t => ['Completed', 'Resolved'].includes(t.status));
  
  const activeComplaints = sortedComplaints.filter(t => ['Assigned', 'Accepted', 'On the way', 'Pending'].includes(t.status));
  const historyComplaints = sortedComplaints.filter(t => ['Completed', 'Resolved'].includes(t.status));

  const scheduleCount = viewMode === 'active' ? activeSchedules.length : historySchedules.length;
  const complaintCount = viewMode === 'active' ? activeComplaints.length : historyComplaints.length;

  return (
    <div>
      <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid #eee', marginBottom: '20px' }}>
          <button 
            onClick={() => setTaskType('pickups')}
            style={{ background: 'none', padding: '10px 0', border: 'none', color: taskType === 'pickups' ? 'var(--primary-color)' : '#999', borderBottom: taskType === 'pickups' ? '3px solid var(--primary-color)' : 'none', borderRadius: 0, boxShadow: 'none' }}
          >
              Pickups ({scheduleCount}) 
          </button>
          <button 
            onClick={() => setTaskType('complaints')}
            style={{ background: 'none', padding: '10px 0', border: 'none', color: taskType === 'complaints' ? 'var(--primary-color)' : '#999', borderBottom: taskType === 'complaints' ? '3px solid var(--primary-color)' : 'none', borderRadius: 0, boxShadow: 'none' }}
          >
              Complaints ({complaintCount})
          </button>
      </div>

      {loading ? <p>Syncing tasks...</p> : (
          <div>
              {(() => {
                  const currentList = taskType === 'pickups' ? sortedSchedules : sortedComplaints;
                  const type = taskType === 'pickups' ? 'pickup' : 'complaint';
                  
                  let tasksToShow = [];
                  let title = "";

                  if (viewMode === 'active') {
                      tasksToShow = currentList.filter(t => 
                          ['Assigned', 'Accepted', 'On the way', 'Pending'].includes(t.status)
                      );
                      title = <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}><FiTruck /> Active Tasks ({tasksToShow.length})</span>;
                  } else {
                      tasksToShow = currentList.filter(t => 
                          ['Completed', 'Resolved'].includes(t.status)
                      );
                      title = <span style={{display: 'flex', alignItems: 'center', gap: '8px'}}><FiClock /> History / Completed ({tasksToShow.length})</span>;
                  }

                  return (
                      <div style={{ marginBottom: '40px' }}>
                          <h3 style={{ borderBottom: `2px solid ${viewMode === 'active' ? '#386641' : '#666'}`, paddingBottom: '10px', marginBottom: '20px', color: viewMode === 'active' ? '#386641' : '#666' }}>
                              {title}
                          </h3>
                          {tasksToShow.length > 0 ? (
                              tasksToShow.map(task => renderTaskCard(task, type))
                          ) : (
                              <div className="card" style={{ textAlign: 'center', padding: '30px', color: '#999', background: '#f9f9f9', border: '1px dashed #ccc' }}>
                                  {viewMode === 'active' ? 'No active tasks at the moment.' : 'No completed history yet.'}
                              </div>
                          )}
                      </div>
                  );
              })()}
          </div>
      )}

      

    </div>
  );
};


export default DriverTaskList;
