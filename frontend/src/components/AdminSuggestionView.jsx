import { useState, useEffect } from 'react';
import { getToken } from '../utils/auth';

const AdminSuggestionView = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const token = getToken();
        const response = await fetch('http://localhost:5000/api/suggestions', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        setSuggestions(data);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, []);

  if (loading) return <p>Loading suggestions...</p>;

  return (
    <div>
      <h2 style={{ color: '#2b2b2b' }}>User Suggestions & Bugs</h2>
      {suggestions.length === 0 ? (
        <p>No suggestions yet.</p>
      ) : (
        <div style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '5px' }}>
            <div style={{ display: 'grid', gap: '15px' }}>
                {suggestions.map((suggestion) => (
                    <div key={suggestion._id} className="card" style={{ padding: '15px', backgroundColor: '#fff', borderLeft: '5px solid #ff4081' }}>
                        <p style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: '#333' }}>"{suggestion.message}"</p>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#888' }}>
                            Received: {new Date(suggestion.createdAt).toLocaleString()}
                        </p>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminSuggestionView;
