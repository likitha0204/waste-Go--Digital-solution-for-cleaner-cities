import { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';
import { getToken } from '../utils/auth';
import API_URL from '../config';
import { FiPieChart, FiTrash2, FiLoader, FiCheckCircle, FiAlertTriangle, FiFileText, FiCheckSquare } from 'react-icons/fi';

const AnalyticsBoard = () => {
    const [scheduleStats, setScheduleStats] = useState(null);
    const [complaintStats, setComplaintStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = getToken();
                const [sRes, cRes] = await Promise.all([
                    fetch(`${API_URL}/api/schedules/analytics`, { headers: { Authorization: `Bearer ${token}` } }),
                    fetch(`${API_URL}/api/complaints/analytics`, { headers: { Authorization: `Bearer ${token}` } })
                ]);
                
                const sData = await sRes.json();
                const cData = await cRes.json();
                
                setScheduleStats(sData);
                setComplaintStats(cData);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div>Loading Analytics...</div>;

    const chartData = (scheduleStats?.dailyStats || []).map((item, index) => ({
        date: item._id,
        pickups: item.count,
        complaints: (complaintStats?.dailyStats || []).find(c => c._id === item._id)?.count || 0
    }));

    const pendingPickups = (scheduleStats?.total || 0) - (scheduleStats?.completed || 0);

    return (
        <div style={{ marginBottom: '40px' }}>
            {/* Chart Header */}
            <div className="card" style={{ marginBottom: '20px', padding: '15px' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiPieChart /> Date-wise Analytics (Last 7 Days)
                </h3>
            </div>

            {/* Main Chart */}
            <div className="card" style={{ height: '450px', padding: '25px', marginBottom: '40px' }}>
                {chartData.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999' }}>
                        <p>No data available for the selected period</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="90%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                            <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 12 }}
                                stroke="#666"
                            />
                            <YAxis 
                                tick={{ fontSize: 12 }}
                                stroke="#666"
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: 'white', 
                                    border: '1px solid #ccc',
                                    borderRadius: '8px',
                                    padding: '10px'
                                }}
                            />
                            <Legend 
                                wrapperStyle={{ paddingTop: '20px' }}
                                iconType="square"
                            />
                            <Bar dataKey="pickups" fill="#4CAF50" name="Pickups" radius={[8, 8, 0, 0]} />
                            <Bar dataKey="complaints" fill="#FF9800" name="Complaints" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Unified Stats Grid */}
            <div className="stats-grid">
                {/* Pickups Row */}
                <div className="stat-card stat-card-green">
                    <div className="stat-icon"><FiTrash2 /></div>
                    <div className="stat-content">
                        <div className="stat-value">{scheduleStats?.total || 0}</div>
                        <div className="stat-label">Total Pickups</div>
                    </div>
                </div>

                <div className="stat-card stat-card-purple">
                    <div className="stat-icon"><FiLoader /></div>
                    <div className="stat-content">
                        <div className="stat-value">{pendingPickups}</div>
                        <div className="stat-label">Pending Pickups</div>
                    </div>
                </div>

                <div className="stat-card stat-card-blue">
                     <div className="stat-icon"><FiCheckCircle /></div>
                    <div className="stat-content">
                        <div className="stat-value">{scheduleStats?.completed || 0}</div>
                        <div className="stat-label">Completed</div>
                    </div>
                </div>

                {/* Complaints Row */}
                <div className="stat-card stat-card-orange">
                    <div className="stat-icon"><FiFileText /></div>
                    <div className="stat-content">
                        <div className="stat-value">{complaintStats?.total || 0}</div>
                        <div className="stat-label">Total Complaints</div>
                    </div>
                </div>

                <div className="stat-card stat-card-red">
                    <div className="stat-icon"><FiAlertTriangle /></div>
                    <div className="stat-content">
                        <div className="stat-value">{complaintStats?.pending || 0}</div>
                        <div className="stat-label">Pending Issues</div>
                    </div>
                </div>

                <div className="stat-card stat-card-pink">
                    <div className="stat-icon"><FiCheckSquare /></div>
                    <div className="stat-content">
                        <div className="stat-value">{complaintStats?.resolved || 0}</div>
                        <div className="stat-label">Resolved Issues</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsBoard;
