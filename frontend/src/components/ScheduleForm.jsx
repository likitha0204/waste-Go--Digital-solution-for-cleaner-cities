import { useState } from 'react';
import { FiMapPin } from 'react-icons/fi';
import { getToken, getUser } from '../utils/auth';
import API_URL from '../config';
import WasteClassifier from './WasteClassifier';

const ScheduleForm = ({ onScheduleCreated }) => {
  const user = getUser();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    contactNumber: '',
    wasteType: '',
    quantity: '',
    pickupDate: '',
    time: '',
    address: '',
    driverSuggestions: '',
    latitude: '',
    longitude: '',
  });
  const [image, setImage] = useState(null); // Add image state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const { name, contactNumber, wasteType, quantity, pickupDate, time, address, driverSuggestions, latitude, longitude } = formData;

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  // ... (getLocation remains same)
  const getLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prevState) => ({
          ...prevState,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setLocationLoading(false);
      },
      (err) => {
        setLocationLoading(false);
        console.error(err);
        let msg = 'Unable to retrieve your location';
        if (err.code === 1) msg = 'Location permission denied.';
        else if (err.code === 2) msg = 'Location unavailable. Ensure GPS is on.';
        else if (err.code === 3) msg = 'Location request timed out.';
        setError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      }
    );
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const data = new FormData();
    Object.keys(formData).forEach(key => {
        if(formData[key]) data.append(key, formData[key]);
    });
    if (image) data.append('image', image);

    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/schedules`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // No Content-Type for FormData
        },
        body: data,
      });

      const resData = await response.json();

      if (response.ok) {
        setFormData({
            name: user?.name || '',
            contactNumber: '',
            wasteType: '',
            quantity: '',
            pickupDate: '',
            time: '',
            address: '',
            driverSuggestions: '',
            latitude: '',
            longitude: '',
        });
        setImage(null);
        if (onScheduleCreated) onScheduleCreated();
      } else {
        setError(resData.message || 'Failed to create schedule');
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
      {/* AI Scanner Section */}
      <div style={{ marginBottom: '20px' }}>
          <WasteClassifier 
              onClassify={(type) => {
                  setFormData(prev => ({ ...prev, wasteType: type }));
              }}
              onImageSelected={(file) => setImage(file)}
          />
      </div>

      {error && <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>{error}</div>}
      
      <form onSubmit={onSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem', color: '#555' }}>Name</label>
                <input
                    type="text"
                    name="name"
                    value={name}
                    onChange={onChange}
                    placeholder="Your Name / Org Name"
                    required
                />
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem', color: '#555' }}>Contact Number</label>
                <input
                    type="tel"
                    name="contactNumber"
                    value={contactNumber}
                    onChange={onChange}
                    placeholder="+91 XXXXXXXXXX"
                    required
                />
            </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem', color: '#555' }}>Waste Type</label>
                <input
                    type="text"
                    name="wasteType"
                    value={wasteType}
                    onChange={onChange}
                    placeholder="e.g. Plastic, Organic"
                    required
                />
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem', color: '#555' }}>Quantity</label>
                <input
                    type="text"
                    name="quantity"
                    value={quantity}
                    onChange={onChange}
                    placeholder="e.g. 5kg, 2 bags"
                    required
                />
            </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem', color: '#555' }}>Pickup Date</label>
                <input
                    type="date"
                    name="pickupDate"
                    value={pickupDate}
                    onChange={onChange}
                    min={new Date().toISOString().split('T')[0]}
                    required
                />
            </div>
            <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem', color: '#555' }}>Preferred Time</label>
                <input
                    type="time"
                    name="time"
                    value={time}
                    onChange={onChange}
                    required
                />
            </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem', color: '#555' }}>Address</label>
            <textarea
              name="address"
              value={address}
              onChange={onChange}
              placeholder="Full pickup address..."
              required
              rows="2"
            />
        </div>

        <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem', color: '#555' }}>Suggestions for Driver</label>
            <textarea
              name="driverSuggestions"
              value={driverSuggestions}
              onChange={onChange}
              placeholder="Any specific instructions (e.g. ring bell, near gate)..."
              rows="2"
            />
        </div>
        
        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8fdf9', borderRadius: '10px', border: '1px solid #d1fae5' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '600', fontSize: '0.85rem', color: '#065f46' }}>
              <FiMapPin /> Location Options
            </label>
            
            <div style={{ marginBottom: '8px' }}>
              <button 
                  type="button" 
                  onClick={getLocation} 
                  disabled={locationLoading} 
                  style={{ 
                      backgroundColor: latitude && longitude ? 'var(--primary-color)' : '#eaf4e6', 
                      color: latitude && longitude ? '#fff' : 'var(--primary-color)',
                      border: '2px solid var(--primary-color)',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.85rem',
                      padding: '8px', 
                      width: '100%',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                  }}
              >
                  {locationLoading ? <> <FiMapPin className="spin"/> Detecting... </> : latitude && longitude ? <> <FiMapPin /> GPS Locked </> : <> <FiMapPin /> Use GPS Location </>}
              </button>
            </div>

            {latitude && longitude && (
                <div style={{ 
                  marginTop: '8px', 
                  fontSize: '0.8rem', 
                  color: '#065f46', 
                  backgroundColor: '#d1fae5',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                    <span style={{ fontSize: '1rem' }}>✅</span>
                    <div>
                      <strong>Ready</strong><br/>
                      <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                        {latitude.toFixed(4)}, {longitude.toFixed(4)}
                      </span>
                    </div>
                </div>
            )}
        </div>

        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', fontSize: '0.95rem' }}>
          {loading ? 'Processing...' : 'Schedule Now'}
        </button>
      </form>
    </div>
  );
};

export default ScheduleForm;
