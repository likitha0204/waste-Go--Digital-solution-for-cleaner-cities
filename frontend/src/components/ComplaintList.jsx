import { useState, useEffect } from 'react';
import { getToken } from '../utils/auth';
import API_URL from '../config';


const ComplaintList = ({ refreshTrigger }) => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/complaints/my-complaints`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setComplaints(data);
      } else {
        setError(data.message || 'Failed to fetch complaints');
      }
    } catch (err) {
      setError('Something went wrong. Please check your connection.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [refreshTrigger]);

  if (loading && complaints.length === 0) return <p>Loading complaints...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <>
      {complaints.length === 0 ? (
        <p>No complaints reported.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
            {complaints.map((complaint) => (
                <li key={complaint._id} style={{ borderBottom: '1px solid #eee', padding: '12px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p><strong>{complaint.description}</strong></p>
                            <p><small>Address: {complaint.address}</small></p>
                            <p><small>Status: <span style={{ color: complaint.status === 'Resolved' ? 'green' : 'orange' }}>{complaint.status}</span></small></p>
                            {complaint.image && (
                                <img 
                                    src={`${API_URL}/${complaint.image}`} 
                                    alt="Complaint" 
                                    style={{ width: '100px', height: '100px', objectFit: 'cover', marginTop: '5px', borderRadius: '8px' }} 
                                />
                            )}
                        </div>
                        

                    </div>
                </li>
            ))}
        </ul>
      )}
    </>
  );
};

export default ComplaintList;
