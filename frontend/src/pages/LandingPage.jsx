import { Link } from 'react-router-dom';
import { useState } from 'react';
import { FiInfo, FiHelpCircle, FiMessageSquare } from 'react-icons/fi';
import './LandingPage.css';

const LandingPage = () => {
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [messageStatus, setMessageStatus] = useState('');

  const handleSuggestionSubmit = async () => {
    if (!suggestion.trim()) return;

    setLoading(true);
    setMessageStatus('');

    try {
        const response = await fetch('http://localhost:5000/api/suggestions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: suggestion }),
        });

        if (response.ok) {
            setSuggestion('');
            setMessageStatus('Thank you! Your suggestion has been received.');
        } else {
            setMessageStatus('Failed to send suggestion. Please try again.');
        }
    } catch (error) {
        console.error(error);
        setMessageStatus('Error sending suggestion.');
    } finally {
        setLoading(false);
        setTimeout(() => setMessageStatus(''), 5000);
    }
  };

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <div className="landing-hero">
        <div className="landing-container">
            <h1 className="hero-title">
                Waste Go - Digital Solutions for Clean Cities
            </h1>
            <p className="hero-subtitle">
                Connect users, drivers and organizations. Request a pickup, schedule regular pickups, or assign drivers — all from one easy dashboard.
            </p>
        </div>
      </div>

      <div className="landing-container">
        
        {/* Section 1: About SmartWaste */}
        <div className="feature-section">
            <div className="section-header">
                <div className="icon-box green">
                    <FiInfo />
                </div>
                <div style={{ textAlign: 'left' }}>
                    <h2 className="section-title">About WasteGo</h2>
                    <p className="section-desc">
                        With rapid urbanization, fixed-schedule waste collection wastes fuel and creates overflow. WasteGo connects users, organizations and drivers to make pickups happen when they are needed.
                    </p>
                </div>
            </div>

            <div className="info-grid">
                <div className="info-card">
                    <h4>Public bins</h4>
                    <p>Report overflow & request pickup</p>
                </div>
                <div className="info-card">
                    <h4>Private bins</h4>
                    <p>Schedule home pickups</p>
                </div>
                <div className="info-card">
                    <h4>Organization bins</h4>
                    <p>Recurring schedules for offices & hospitals</p>
                </div>
            </div>
        </div>

        {/* Section 2: How to use */}
        <div className="usage-section">
            <div className="section-header">
                <div className="icon-box pink">
                    <FiHelpCircle />
                </div>
                <div>
                    <h2 className="section-title">How It Works</h2>
                    <p className="section-desc">Simple steps to a cleaner environment</p>
                </div>
            </div>
            
            <ol className="step-list">
                <li>Choose your role: User, Driver, Organization, or Admin from the header.</li>
                <li>Sign in or use demo sign-in to explore dashboards.</li>
                <li>Users: request or schedule pickups, save locations.</li>
                <li>Drivers: accept and complete pickups, update status.</li>
                <li>Organizations: manage locations and recurring pickups.</li>
            </ol>
        </div>

        {/* Section 3: Suggestions & Bugs */}
        <div className="suggestion-section">
            <div className="suggestion-header">
                 <div className="section-header" style={{ marginBottom: 0 }}>
                    <div className="icon-box blue">
                        <FiMessageSquare />
                    </div>
                    <div>
                        <h2 className="section-title">Suggestions & Bugs</h2>
                        <p className="section-desc">Found an issue or have an idea? We'd love to hear from you.</p>
                    </div>
                 </div>
                 <span className="meta">We read every message</span>
            </div>
            
            <div style={{ marginTop: '20px' }}>
                <textarea 
                    className="custom-textarea"
                    placeholder="Describe the bug or share your suggestion..." 
                    rows="5"
                    value={suggestion}
                    onChange={(e) => setSuggestion(e.target.value)}
                    maxLength={500}
                ></textarea>
                <div className="form-footer">
                    <span className="char-count">{suggestion.length}/500 characters</span>
                    <button 
                        className="btn-send"
                        onClick={handleSuggestionSubmit}
                        disabled={loading || !suggestion.trim()}
                    >
                        {loading ? 'Sending...' : 'Send Suggestion'}
                    </button>
                </div>
                {messageStatus && <p className="status-msg">{messageStatus}</p>}
            </div>
        </div>

      </div>
    </div>
  );
};

export default LandingPage;
