import { useState } from 'react';
import { FiMapPin } from 'react-icons/fi';
import { getToken } from '../utils/auth';
import WasteClassifier from './WasteClassifier';

const ComplaintForm = ({ onComplaintCreated }) => {
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [image, setImage] = useState(null);
  const [location, setLocation] = useState({ latitude: '', longitude: '' });
  const [wasteType, setWasteType] = useState(''); // New state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const getLocation = () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationLoading(false);
        },
        (error) => {
          console.error(error);
          setLocationLoading(false);
          let msg = 'Unable to retrieve your location';
          if (error.code === 1) msg = 'Location permission denied.';
          else if (error.code === 2) msg = 'Location unavailable. Ensure GPS is on.';
          else if (error.code === 3) msg = 'Location request timed out.';
          alert(msg);
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0
        }
      );
    } else {
      setLocationLoading(false);
      alert('Geolocation is not supported by your browser');
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData();
    formData.append('description', description);
    formData.append('address', address);
    if (wasteType) formData.append('wasteType', wasteType); // Append wasteType
    if (image) {
      formData.append('image', image);
    }
    // ...

    if (location.latitude && location.longitude) {
        formData.append('latitude', location.latitude);
        formData.append('longitude', location.longitude);
    }

    try {
      const token = getToken();
      const response = await fetch('http://localhost:5000/api/complaints', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            // 'Content-Type': 'multipart/form-data', // Do NOT set this manually with fetch/FormData
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setDescription('');
        setAddress('');
        setImage(null);
        setLocation({ latitude: '', longitude: '' });
        if (onComplaintCreated) onComplaintCreated();
      } else {
        setError(data.message || 'Failed to submit complaint');
      }
    } catch (err) {
      setError('Something went wrong. Please check your connection.');
      console.error(err);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div style={{ paddingBottom: '20px' }}>
      {/* Header provided by modal */}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={onSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label>Description:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            style={{ width: '100%' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
            <label>Address/Location:</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              style={{ width: '100%' }}
            />
        </div>
        <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '8px' }}>Upload Image & AI Scan:</label>
            <WasteClassifier 
                onClassify={(type) => {
                    setWasteType(type); // Store specific type for backend
                    setDescription(prev => {
                        const newText = `Found: ${type}.`;
                        return prev ? prev + '\n' + newText : newText;
                    });
                }}
                onImageSelected={(file) => setImage(file)}
            />
        </div>

        <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f8fdf9', borderRadius: '8px', border: '1px solid #d1fae5' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '600', fontSize: '0.85rem', color: '#065f46' }}>
              <FiMapPin /> Location Options
            </label>
            
            <div style={{ marginBottom: '8px' }}>
              <button 
                type="button" 
                onClick={getLocation} 
                disabled={locationLoading} 
                style={{ 
                  width: '100%', 
                  backgroundColor: location.latitude && location.longitude ? 'var(--primary-color)' : '#4CAF50', 
                  color: 'white',
                  padding: '8px', 
                  fontSize: '0.85rem',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {locationLoading ? <><FiMapPin className="spin"/> Detecting...</> : location.latitude && location.longitude ? <><FiMapPin/> GPS Locked</> : <><FiMapPin/> Use GPS Location</>}
              </button>
            </div>

            {location.latitude && location.longitude && (
                <div style={{ 
                  marginTop: '6px', 
                  fontSize: '0.8rem', 
                  color: '#065f46', 
                  backgroundColor: '#d1fae5',
                  padding: '6px',
                  borderRadius: '6px'
                }}>
                    ✅ <strong>Ready:</strong> {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </div>
            )}
        </div>

        <button type="submit" disabled={loading} style={{ padding: '10px', width: '100%', fontSize: '0.9rem', marginTop: '5px' }}>
          {loading ? 'Submitting...' : 'Submit Complaint'}
        </button>
      </form>
    </div>
  );
};

export default ComplaintForm;
