import { useState, useEffect } from 'react';
import { getToken } from '../utils/auth';

const AdminScheduleView = ({ pendingCount = 0, onUpdate }) => {
  const [schedules, setSchedules] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const [sRes, dRes] = await Promise.all([
          fetch('http://localhost:5000/api/schedules/all', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('http://localhost:5000/api/auth/drivers', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      const sData = await sRes.json();
      const dData = await dRes.json();

      if (sRes.ok) setSchedules(sData.sort((a, b) => new Date(b.pickupDate) - new Date(a.pickupDate)));
      if (dRes.ok) setDrivers(dData);
      
      // Notify parent to update counts
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
      setError('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const assignDriver = async (scheduleId, driverId) => {
      try {
          const token = getToken();
          const response = await fetch(`http://localhost:5000/api/schedules/${scheduleId}/assign`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ driverId })
          });
          if (response.ok) {
              fetchData();
          } else {
              const data = await response.json();
              console.error('Assignment failed:', data);
              alert(data.message || 'Assignment failed');
          }
      } catch (error) {
          console.error(error);
          alert('Error assigning driver');
      }
  };

  if (loading) return <div className="card">Loading pickups...</div>;
  if (error) return <div className="card" style={{ color: 'red' }}>{error}</div>;

  return (
    <div className="card">
      <h3 style={{ marginBottom: '20px' }}>All Pickup Schedules</h3>
      <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
          
          {/* Active Pickups */}
          <h4 style={{ 
            margin: '15px 0 10px', 
            color: '#333', 
            borderBottom: '3px solid var(--primary-color)', 
            display: 'inline-block', 
            paddingBottom: '5px' 
          }}>
            Active Tasks
            <span style={{
              marginLeft: '12px',
              backgroundColor: '#ef4444',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 'bold'
            }}>
              {pendingCount}
            </span>
          </h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
            <thead>
                <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left', background: 'linear-gradient(to right, #f8f9fa, #fff)' }}>
                    <th style={{ padding: '16px 12px', fontWeight: '600', color: '#555', fontSize: '0.9rem' }}>Date</th>
                    <th style={{ padding: '16px 12px', fontWeight: '600', color: '#555', fontSize: '0.9rem' }}>Waste Type</th>
                    <th style={{ padding: '16px 12px', fontWeight: '600', color: '#555', fontSize: '0.9rem' }}>Customer</th>
                    <th style={{ padding: '16px 12px', fontWeight: '600', color: '#555', fontSize: '0.9rem' }}>Address</th>
                    <th style={{ padding: '16px 12px', fontWeight: '600', color: '#555', fontSize: '0.9rem' }}>Status</th>
                    <th style={{ padding: '16px 12px', fontWeight: '600', color: '#555', fontSize: '0.9rem' }}>Assigned Driver</th>
                </tr>
            </thead>
            <tbody>
                {schedules.filter(s => s.status !== 'Completed' && s.status !== 'Cancelled').map((s) => {
                  // Smart Routing Logic
                  const requiredVan = s.wasteType?.includes('Bio') ? 'Bio Van' : 
                                      s.wasteType?.includes('Plastic') ? 'Plastic Van' : 
                                      s.wasteType?.includes('Glass') ? 'Glass Van' : 
                                      s.wasteType?.includes('Dry') ? 'Dry Van' : 'Standard Van';

                  const recommendedDrivers = drivers.filter(d => {
                      if (!d.vehicleType) return false;
                      const vType = d.vehicleType.toLowerCase();
                      const wType = (s.wasteType || '').toLowerCase();
                      
                      // Match specialized vans
                      if(wType.includes('bio') && (vType.includes('bio') || vType.includes('organic'))) return true;
                      if((wType.includes('plastic') || wType.includes('bottle')) && vType.includes('plastic')) return true;
                      if(wType.includes('glass') && vType.includes('glass')) return true;
                      if(wType.includes('mixed') && (vType.includes('mixed') || vType.includes('general'))) return true;
                      if(wType.includes('dry') && (vType.includes('dry') || vType.includes('recycling'))) return true;
                      
                      return false;
                  });

                  return (
                <tr 
                  key={s._id} 
                  style={{ 
                    borderBottom: '1px solid #f1f1f1', 
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fdf9';
                    e.currentTarget.style.transform = 'scale(1.01)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(56, 102, 65, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                    <td style={{ padding: '14px 12px', fontSize: '0.9rem' }}>{new Date(s.pickupDate).toLocaleDateString()}</td>
                    <td style={{ padding: '14px 12px', fontWeight: '500' }}>
                        <span style={{ display: 'block' }}>{s.wasteType}</span>
                        <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: 'normal' }}>
                            {s.wasteType?.includes('Bio') ? 'Requires Bio Van' : 
                             s.wasteType?.includes('Plastic') ? 'Requires Plastic Van' : 
                             s.wasteType?.includes('Glass') ? 'Requires Glass Van' : 'Requires Standard Van'}
                        </span>
                    </td>
                    <td style={{ padding: '14px 12px' }}>{s.name || s.user?.name}</td>
                    <td style={{ padding: '14px 12px' }}>{s.address}</td>
                    <td style={{ padding: '14px 12px' }}>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          padding: '5px 12px', 
                          borderRadius: '20px', 
                          backgroundColor: s.status === 'Pending' ? '#fef3c7' : s.status === 'Assigned' ? '#dbeafe' : '#d1fae5',
                          color: s.status === 'Pending' ? '#92400e' : s.status === 'Assigned' ? '#1e40af' : '#065f46',
                          fontWeight: '600',
                          display: 'inline-block',
                          transition: 'all 0.3s ease',
                          animation: s.status === 'On the way' ? 'pulse 2s infinite' : 'none'
                        }}>
                            {s.status}
                        </span>
                    </td>
                    <td style={{ padding: '14px 12px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#e11d48', marginBottom: '4px' }}>
                            Req: {requiredVan}
                        </div>
                        <select 
                            value={s.assignedDriver?._id || ''}  
                            onChange={(e) => assignDriver(s._id, e.target.value)}
                            style={{ 
                              padding: '6px 10px', 
                              fontSize: '0.85rem',
                              borderRadius: '6px',
                              border: '2px solid #e5e7eb',
                              transition: 'all 0.2s ease',
                              cursor: 'pointer',
                              backgroundColor: '#fff',
                              maxWidth: '220px'
                            }}
                        >
                            <option value="">Unassigned</option>
                                    {drivers.map(d => {
                                        const isRecommended = recommendedDrivers.some(rd => rd._id === d._id);
                                        const maxCap = d.maxCapacityKg || 100;
                                        const current = d.currentWeightKg || 0;
                                        const left = Math.max(0, maxCap - current).toFixed(1);
                                        const isFull = current >= maxCap;

                                        // Date-Specific Availability Check
                                        let isDateBusy = false;
                                        if (d.busyDates && s.pickupDate) {
                                            const scheduleDate = new Date(s.pickupDate);
                                            scheduleDate.setHours(0,0,0,0);
                                            const scheduleDateStr = scheduleDate.toISOString();
                                            isDateBusy = d.busyDates.includes(scheduleDateStr);
                                        } else {
                                            // Fallback if no dates logic on backend yet or invalid date
                                            isDateBusy = d.isBusy; 
                                        }

                                        return (
                                            <option 
                                                key={d._id} 
                                                value={d._id} 
                                                disabled={isDateBusy || isFull}
                                                style={{ 
                                                    color: isDateBusy ? '#9ca3af' : (current >= maxCap * 0.8 ? '#d97706' : (isRecommended ? 'green' : 'black')), 
                                                    fontWeight: isRecommended ? 'bold' : 'normal',
                                                    fontStyle: isDateBusy ? 'italic' : 'normal'
                                                }}
                                            >
                                                {d.name} ({d.vehicleType || 'Van'}) 
                                                {isDateBusy ? ' - Busy on Date' : ` - ${current}/${maxCap} kg (${left} kg left)`} {isRecommended ? '⭐' : ''}
                                            </option>
                                        );
                                    })}
                        </select>
                    </td>
                </tr>
                )})}
            </tbody>
          </table>

          {/* Completed Pickups */}
          <h4 style={{ margin: '20px 0 10px', color: '#888', borderBottom: '3px solid #ccc', display: 'inline-block', paddingBottom: '5px' }}>Completed History</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', opacity: 0.8 }}>
            <thead>
                <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left', color: '#777', background: '#fafafa' }}>
                    <th style={{ padding: '14px 12px', fontSize: '0.85rem' }}>Date</th>
                    <th style={{ padding: '14px 12px', fontSize: '0.85rem' }}>Waste Type</th>
                    <th style={{ padding: '14px 12px', fontSize: '0.85rem' }}>Customer</th>
                    <th style={{ padding: '14px 12px', fontSize: '0.85rem' }}>Address</th>
                    <th style={{ padding: '14px 12px', fontSize: '0.85rem' }}>Status</th>
                    <th style={{ padding: '14px 12px', fontSize: '0.85rem' }}>Driver</th>
                </tr>
            </thead>
            <tbody>
                {schedules.filter(s => s.status === 'Completed' || s.status === 'Cancelled').map((s) => (
                <tr key={s._id} style={{ borderBottom: '1px solid #f5f5f5', backgroundColor: '#fafafa' }}>
                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>{new Date(s.pickupDate).toLocaleDateString()}</td>
                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>{s.wasteType}</td>
                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>{s.name || s.user?.name}</td>
                    <td style={{ padding: '12px', fontSize: '0.85rem' }}>{s.address}</td>
                    <td style={{ padding: '12px' }}>
                        <span style={{ 
                            fontSize: '0.75rem', 
                            padding: '4px 10px', 
                            borderRadius: '15px', 
                            backgroundColor: s.status === 'Completed' ? '#d1fae5' : '#fee2e2',
                            color: s.status === 'Completed' ? '#065f46' : '#991b1b',
                            fontWeight: '600'
                        }}>
                            {s.status === 'Completed' ? '✓ ' : '✗ '}{s.status}
                        </span>
                    </td>
                    <td style={{ padding: '12px', fontStyle: 'italic', color: '#666', fontSize: '0.85rem' }}>
                        {s.assignedDriver?.name || 'N/A'}
                    </td>
                </tr>
                ))}
            </tbody>
          </table>
      </div>
    </div>
  );
};

export default AdminScheduleView;
