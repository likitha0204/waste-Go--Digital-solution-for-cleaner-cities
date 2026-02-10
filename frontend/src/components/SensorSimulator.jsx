import React, { useState, useEffect } from 'react';
import mqtt from 'mqtt';
import { MQTT_URL } from '../config';
import { FiActivity, FiWifi, FiWifiOff, FiTrash2 } from 'react-icons/fi';

const SensorSimulator = () => {
    const [client, setClient] = useState(null);
    const [bins, setBins] = useState([
        { id: '101', level: 45, location: 'Address 1' },
        { id: '102', level: 20, location: 'Address 2' },
        { id: '103', level: 30, location: 'Address 3' },
    ]);
    const [status, setStatus] = useState('Disconnected');

    useEffect(() => {
        // Force MQTT 3.1.1 (protocolVersion 4) to ensure Aedes compatibility
        const mqttClient = mqtt.connect(MQTT_URL, {
            protocolVersion: 4
        });


        mqttClient.on('connect', () => {
            setStatus('Connected');
            
            // Broadcast initial state with retained functionality
            // This ensures dashboard sees current values immediately upon connection
            bins.forEach(bin => {
                const topic = `bins/${bin.id}/level`;
                mqttClient.publish(topic, String(bin.level), { retain: true });
            });
        });

        mqttClient.on('error', (err) => {
            console.error('Connection error: ', err);
            setStatus('Error');
        });

        setClient(mqttClient);

        return () => {
            if (mqttClient) mqttClient.end();
        };
    }, []); // Removed 'bins' from specific dependency to avoid reconnection loops, we just send initial state once on connect

    const updateBinLevel = (id, newLevel) => {
        setBins(prevBins => prevBins.map(bin => bin.id === id ? { ...bin, level: newLevel } : bin));
        
        if (client && status === 'Connected') {
            const topic = `bins/${id}/level`;
            client.publish(topic, String(newLevel), { retain: true });
        }
    };


    return (
        <div style={{ 
            padding: '40px', 
            background: `linear-gradient(rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.8)), url('/iot_bg.png') no-repeat center center fixed`,
            backgroundSize: 'cover',
            minHeight: '100vh' 
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ 
                    backgroundColor: 'white', 
                    padding: '20px 30px', 
                    borderRadius: '12px', 
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    marginBottom: '40px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <FiActivity color="#10B981" />
                            IoT Sensor Network Simulator
                        </h1>
                        <p style={{ color: '#6b7280', marginTop: '5px' }}>Real-time waste level telemetry</p>
                    </div>
                    
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        padding: '8px 16px',
                        borderRadius: '9999px',
                        backgroundColor: status === 'Connected' ? '#ECFDF5' : '#FEF2F2',
                        color: status === 'Connected' ? '#047857' : '#B91C1C',
                        border: status === 'Connected' ? '1px solid #A7F3D0' : '1px solid #FECACA'
                    }}>
                        {status === 'Connected' ? <FiWifi /> : <FiWifiOff />}
                        <span style={{ fontWeight: '600', fontSize: '14px' }}>{status}</span>
                    </div>
                </div>

                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
                    gap: '30px' 
                }}>
                    {bins.map(bin => (
                        <div key={bin.id} style={{ 
                            backgroundColor: bin.level > 90 ? '#fff5f5' : 'white', 
                            padding: '30px', 
                            borderRadius: '12px', 
                            boxShadow: bin.level > 90 ? '0 0 0 2px #ef4444, 0 10px 15px -3px rgba(239, 68, 68, 0.2)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            border: bin.level > 90 ? '1px solid #ef4444' : '1px solid #e5e7eb',
                            transition: 'all 0.3s ease'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ 
                                        padding: '12px', 
                                        backgroundColor: '#ECFDF5', 
                                        color: '#047857', 
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <FiTrash2 size={24} />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>Bin #{bin.id}</h3>
                                        <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>{bin.location}</p>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ 
                                        fontSize: '30px', 
                                        fontWeight: 'bold', 
                                        color: bin.level > 90 ? '#EF4444' : bin.level > 75 ? '#F97316' : '#10B981'
                                    }}>
                                        {bin.level}%
                                    </span>
                                    <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Filled Capacity</div>
                                </div>
                            </div>
                            
                            <div style={{ marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '10px' }}>
                                    <span>Empty</span>
                                    <span>Critical</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={bin.level}
                                    onChange={(e) => updateBinLevel(bin.id, parseInt(e.target.value))}
                                    style={{
                                        width: '100%',
                                        height: '8px',
                                        borderRadius: '4px',
                                        outline: 'none',
                                        appearance: 'none',
                                        background: `linear-gradient(to right, 
                                            #10B981 0%, 
                                            #10B981 ${bin.level}%, 
                                            #e5e7eb ${bin.level}%, 
                                            #e5e7eb 100%)`
                                    }}
                                />
                            </div>

                            <div style={{ 
                                marginTop: '20px', 
                                borderTop: '1px solid #f3f4f6', 
                                paddingTop: '15px', 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                fontSize: '13px'
                            }}>
                                <code style={{ 
                                    fontFamily: 'monospace', 
                                    backgroundColor: '#f9fafb', 
                                    padding: '4px 8px', 
                                    borderRadius: '4px', 
                                    color: '#4b5563' 
                                }}>bins/{bin.id}/level</code>
                                <span style={{ 
                                    color: bin.level > 90 ? '#EF4444' : '#9CA3AF', 
                                    fontWeight: bin.level > 90 ? 'bold' : 'normal',
                                    animation: bin.level > 90 ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
                                }}>
                                    {bin.level > 90 ? `CRITICAL ALERT: ${bin.location}` : 'Status: Normal'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: .5; }
                }
                input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    height: 20px;
                    width: 20px;
                    border-radius: 50%;
                    background: #ffffff;
                    border: 2px solid #d1d5db;
                    cursor: pointer;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    margin-top: -6px; /* You need to specify a margin in Chrome, but in Firefox and IE it is automatic */
                }
                input[type=range]::-webkit-slider-runnable-track {
                    width: 100%;
                    height: 8px;
                    cursor: pointer;
                    background: transparent; /* Maintained by inline style gradient */
                    border-radius: 4px;
                }
            `}</style>
        </div>
    );
};

export default SensorSimulator;
