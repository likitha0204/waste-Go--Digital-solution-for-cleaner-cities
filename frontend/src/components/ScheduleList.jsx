import { useState, useEffect } from 'react';
import { getToken } from '../utils/auth';
import { FiCalendar, FiX } from 'react-icons/fi';

const ScheduleList = ({ refreshTrigger, taskEtas = {} }) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Reschedule State
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [rescheduleData, setRescheduleData] = useState({ pickupDate: '', time: '' });
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch('http://localhost:5000/api/schedules/my-schedules', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setSchedules(data);
      } else {
        setError(data.message || 'Failed to fetch schedules');
      }
    } catch (err) {
      setError('Something went wrong. Please check your connection.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [refreshTrigger]);

  // Reschedule Handlers
  const openRescheduleModal = (schedule) => {
    // Format date for input type="date" (YYYY-MM-DD)
    const dateObj = new Date(schedule.pickupDate);
    const dateStr = dateObj.toISOString().split('T')[0];

    setSelectedSchedule(schedule);
    setRescheduleData({
        pickupDate: dateStr,
        time: schedule.time
    });
    setRescheduleError('');
    setRescheduleModalOpen(true);
  };

  const closeRescheduleModal = () => {
    setRescheduleModalOpen(false);
    setSelectedSchedule(null);
    setRescheduleError('');
  };

  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    setRescheduleLoading(true);
    setRescheduleError('');

    try {
        const token = getToken();
        const response = await fetch(`http://localhost:5000/api/schedules/${selectedSchedule._id}/reschedule`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(rescheduleData)
        });

        const data = await response.json();

        if (response.ok) {
            // Success
            alert('Pickup rescheduled successfully!');
            closeRescheduleModal();
            fetchSchedules(); // Refresh list to show new status/time
        } else {
            setRescheduleError(data.message || 'Failed to reschedule');
        }

    } catch (err) {
        console.error(err);
        setRescheduleError('Network error. Please try again.');
    } finally {
        setRescheduleLoading(false);
    }
  };

  if (loading && schedules.length === 0) return <p>Loading schedules...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <>
      {schedules.length === 0 ? (
        <p>No schedules found.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
            {schedules.map((schedule) => (
                <li key={schedule._id} style={{ borderBottom: '1px solid #eee', padding: '12px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <strong>{schedule.wasteType}</strong> 
                            <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: '6px' }}>
                                ({schedule.wasteType?.includes('Bio') ? 'Bio Van' : 
                                  schedule.wasteType?.includes('Plastic') ? 'Plastic Van' : 
                                  schedule.wasteType?.includes('Glass') ? 'Glass Van' : 'Standard Van'})
                            </span> 
                            - {schedule.quantity} <br />
                            <small>Date: {new Date(schedule.pickupDate).toLocaleDateString()} | Time: {schedule.time}</small> <br />
                            <small>Status: <span style={{ color: schedule.status === 'Completed' ? 'green' : 'orange' }}>{schedule.status}</span></small>
                            
                            {/* Live ETA Message */}
                            {schedule.status === 'On the way' && taskEtas[schedule._id] && (
                                <div style={{ 
                                    marginTop: '6px', 
                                    fontSize: '0.85rem', 
                                    color: '#38b2ac', 
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    backgroundColor: '#e6fffa',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    width: 'fit-content'
                                }}>
                                   {taskEtas[schedule._id]}
                                </div>
                            )}
                        </div>
                        
                        {/* Reschedule Button */}
                        {['Pending', 'Assigned', 'Accepted'].includes(schedule.status) && (
                            <button 
                                onClick={() => openRescheduleModal(schedule)}
                                style={{
                                    backgroundColor: '#f3f4f6',
                                    border: '1px solid #d1d5db',
                                    color: '#4b5563',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.background = '#e5e7eb'}
                                onMouseLeave={(e) => e.target.style.background = '#f3f4f6'}
                            >
                                <FiCalendar /> Reschedule
                            </button>
                        )}
                    </div>
                </li>
            ))}
        </ul>
      )}

      {/* Reschedule Modal */}
      {rescheduleModalOpen && (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '25px',
                borderRadius: '10px',
                width: '90%',
                maxWidth: '400px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, color: 'var(--primary-color)' }}>Reschedule Pickup</h3>
                    <button onClick={closeRescheduleModal} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>
                        <FiX />
                    </button>
                </div>

                {rescheduleError && (
                    <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '0.9rem' }}>
                        {rescheduleError}
                    </div>
                )}
                
                <div style={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '0.85rem', color: '#c2410c' }}>
                    <strong>Note:</strong> Rescheduling will reset the status to "Pending" and unassign any driver.
                </div>

                <form onSubmit={handleRescheduleSubmit}>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: '500' }}>New Date</label>
                        <input 
                            type="date"
                            value={rescheduleData.pickupDate}
                            onChange={(e) => setRescheduleData({...rescheduleData, pickupDate: e.target.value})}
                            required
                            min={new Date().toISOString().split('T')[0]}
                            style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: '500' }}>New Preferred Time</label>
                        <input 
                            type="time"
                            value={rescheduleData.time}
                            onChange={(e) => setRescheduleData({...rescheduleData, time: e.target.value})}
                            required
                            style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button 
                            type="button" 
                            onClick={closeRescheduleModal}
                            style={{ flex: 1, padding: '10px', background: '#e5e7eb', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', color: '#374151' }}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={rescheduleLoading}
                            style={{ flex: 1, padding: '10px', background: 'var(--primary-color, #047857)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', color: 'white' }}
                        >
                            {rescheduleLoading ? 'Processing...' : 'Confirm'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </>
  );
};

export default ScheduleList;
