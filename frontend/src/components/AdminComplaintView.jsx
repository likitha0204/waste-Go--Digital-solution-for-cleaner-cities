import { useState, useEffect } from 'react';
import { getToken } from '../utils/auth';

const AdminComplaintView = ({ pendingCount = 0, onUpdate }) => {
  const [complaints, setComplaints] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const [cRes, dRes] = await Promise.all([
        fetch('http://localhost:5000/api/complaints/all', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/auth/drivers', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const cData = await cRes.json();
      const dData = await dRes.json();
      
      console.log('[AdminComplaintView] Fetched complaints:', cData);

      if (cRes.ok) setComplaints(cData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
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

  const assignDriver = async (complaintId, driverId) => {
    try {
      const token = getToken();
      const response = await fetch(`http://localhost:5000/api/complaints/${complaintId}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ driverId }),
      });
      if (response.ok) {
        fetchData();
      } else {
        const data = await response.json();
        alert(data.message || 'Assignment failed');
      }
    } catch (error) {
      console.error(error);
      alert('Error assigning driver');
    }
  };

  if (loading) return <div className="card">Loading complaints...</div>;
  if (error) return <div className="card" style={{ color: 'red' }}>{error}</div>;

  return (
    <div className="card">
      <h3 style={{ marginBottom: '20px' }}>Global Complaints</h3>
      {complaints.length === 0 ? <p style={{ color: '#888', fontStyle: 'italic', textAlign: 'center', padding: '40px' }}>No complaints found.</p> : (
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            
            {/* Active Complaints Section */}
            <h4 style={{ 
              margin: '10px 0 15px', 
              color: '#333', 
              borderBottom: '3px solid var(--primary-color)', 
              display: 'inline-block', 
              paddingBottom: '5px' 
            }}>
              Active Complaints
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
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '30px' }}>
              {complaints.filter(c => c.status !== 'Resolved').length === 0 ? <p style={{ color: '#888', fontStyle: 'italic', padding: '20px' }}>No active complaints.</p> : 
               complaints.filter(c => c.status !== 'Resolved').map(c => (
                  <li 
                    key={c._id} 
                    style={{ 
                      padding: '18px', 
                      borderBottom: '1px solid #f1f1f1', 
                      display: 'flex', 
                      gap: '15px', 
                      alignItems: 'center',
                      transition: 'all 0.3s ease',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      backgroundColor: '#fff'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fdf9';
                      e.currentTarget.style.transform = 'translateX(4px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(56, 102, 65, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#fff';
                      e.currentTarget.style.transform = 'translateX(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                      {c.image && <img src={`http://localhost:5000/${c.image}`} style={{ width: '70px', height: '70px', borderRadius: '12px', objectFit: 'cover', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }} alt="issue" />}
                      <div style={{ flex: 1, paddingRight: '15px' }}>
                          <p style={{ margin: '0 0 8px 0', fontWeight: '600', fontSize: '1rem' }}>{c.description}</p>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#666', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ fontSize: '1rem' }}>📍</span> {c.address}
                          </p>
                      </div>
                      
                      <div style={{ padding: '0 15px', minWidth: '160px', borderLeft: '1px solid #eee', borderRight: '1px solid #eee', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                         <span style={{ display: 'block', fontWeight: 'bold', fontSize: '0.9rem', color: '#333' }}>
                            {c.wasteType || 'General Waste'}
                         </span>
                         <span style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>
                            {c.wasteType?.includes('Bio') ? 'Requires Bio Van' : 
                             c.wasteType?.includes('Plastic') ? 'Requires Plastic Van' : 
                             c.wasteType?.includes('Glass') ? 'Requires Glass Van' : 
                             c.wasteType?.includes('Dry') ? 'Requires Dry Van' :
                             'Requires Standard Van'}
                         </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '140px', paddingLeft: '15px' }}>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: '600', 
                            padding: '5px 12px',
                            borderRadius: '20px',
                            backgroundColor: c.status === 'Pending' ? '#fef3c7' : c.status === 'Assigned' ? '#dbeafe' : '#d1fae5',
                            color: c.status === 'Pending' ? '#92400e' : c.status === 'Assigned' ? '#1e40af' : '#065f46',
                            textAlign: 'center'
                          }}>{c.status}</span>
                          <select 
                            value={c.assignedDriver?._id || ''} 
                            onChange={(e) => assignDriver(c._id, e.target.value)}
                            style={{ 
                              padding: '6px 10px', 
                              fontSize: '0.8rem',
                              borderRadius: '6px',
                              border: '2px solid #e5e7eb',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              backgroundColor: '#fff'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.borderColor = 'var(--primary-light)';
                              e.target.style.boxShadow = '0 0 0 3px rgba(106, 153, 78, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.borderColor = '#e5e7eb';
                              e.target.style.boxShadow = 'none';
                            }}
                          >
                            <option value="">Unassigned</option>
                            {drivers.map(d => {
                                const maxCap = d.maxCapacityKg || 100;
                                const current = d.currentWeightKg || 0;
                                const left = Math.max(0, maxCap - current).toFixed(1);
                                const isFull = current >= maxCap;

                                return (
                                <option 
                                    key={d._id} 
                                    value={d._id}
                                    disabled={d.isBusy || isFull}
                                    style={{
                                        color: d.isBusy ? '#9ca3af' : (current >= maxCap * 0.8 ? '#d97706' : 'black'),
                                        fontStyle: d.isBusy ? 'italic' : 'normal'
                                    }}
                                >
                                    {d.name} {d.vehicleType ? `(${d.vehicleType})` : ''} 
                                    {d.isBusy ? '(On Task)' : ` - ${current}/${maxCap} kg (${left} kg left)`}
                                </option>
                            )})}
                        </select>
                      </div>
                  </li>
              ))}
            </ul>

            {/* Resolved Complaints Section */}
            <h4 style={{ margin: '20px 0 15px', color: '#888', borderBottom: '3px solid #ccc', display: 'inline-block', paddingBottom: '5px' }}>Resolved History</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {complaints.filter(c => c.status === 'Resolved').length === 0 ? <p style={{ color: '#888', fontStyle: 'italic', padding: '20px' }}>No resolved complaints yet.</p> :
               complaints.filter(c => c.status === 'Resolved').map(c => (
                  <li key={c._id} style={{ 
                    padding: '15px', 
                    borderBottom: '1px solid #f1f1f1', 
                    display: 'flex', 
                    gap: '15px', 
                    alignItems: 'center', 
                    opacity: 0.75, 
                    backgroundColor: '#fafafa',
                    borderRadius: '8px',
                    marginBottom: '6px'
                  }}>
                      {c.image && <img src={`http://localhost:5000/${c.image}`} style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover', filter: 'grayscale(80%)', opacity: 0.8 }} alt="issue" />}
                      <div style={{ flex: 1 }}>
                          <p style={{ margin: '0 0 5px 0', fontWeight: '600', textDecoration: 'line-through', color: '#666', fontSize: '0.95rem' }}>{c.description}</p>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: '#888' }}>📍 {c.address}</p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', textAlign: 'right', minWidth: '120px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#10b981', padding: '4px 10px', backgroundColor: '#d1fae5', borderRadius: '15px' }}>✓ Resolved</span>
                          <span style={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic' }}>By: {c.assignedDriver?.name || 'N/A'}</span>
                      </div>
                  </li>
              ))}
            </ul>

          </div>
      )}
    </div>
  );
};

export default AdminComplaintView;
