import React, { useState, useEffect, useCallback } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
    BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';

// Stable references — defined outside component to avoid re-creation on every render
const COLORS = ['#ff1493', '#ff0000', '#4CAF50', '#2196F3', '#ff9800'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// FIX Bug 6: Fixed fallback values instead of Math.random() — random values
// cause the chart to jump on every mount/hot-reload, which breaks testing
const FALLBACK_MONTHLY = MONTHS.map((month, i) => ({
    month,
    income:  [8000, 6500, 9200, 7800, 11000, 8400, 9700, 10200, 7600, 8900, 12000, 9500][i],
    expense: [5000, 4800, 6100, 5200,  7000, 5600, 6300,  6800, 5100, 5800,  8000, 6200][i],
    profit:  [3000, 1700, 3100, 2600,  4000, 2800, 3400,  3400, 2500, 3100,  4000, 3300][i],
}));

const FALLBACK_STAGES = [
    { name: 'Piglet',   value: 12 },
    { name: 'Weaner',   value: 8  },
    { name: 'Grower',   value: 5  },
    { name: 'Finisher', value: 3  },
    { name: 'Sow',      value: 4  },
];

function Dashboard() {
    const { user } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [stats, setStats] = useState({
        activeSows:     0,
        totalPiglets:   0,
        totalLitters:   0,
        recentLitters:  [],
        totalFeed:      0,
        feedValue:      0,
        monthlyIncome:  0,
        monthlyExpense: 0,
        monthlyProfit:  0,
    });
    const [activities, setActivities]   = useState([]);
    const [monthlyData, setMonthlyData] = useState([]);
    const [pigsByStage, setPigsByStage] = useState([]);
    const [loading, setLoading]         = useState(true);

    const fetchDashboardData = useCallback(async () => {
        try {
            const res = await API.get('/dashboard');
            setStats(res.data);
        } catch (error) {
            console.error('Error fetching dashboard:', error);
        }
    }, []);

    const fetchActivities = useCallback(async () => {
        try {
            const [littersRes, healthRes, feedRes] = await Promise.all([
                API.get('/litters?limit=5'),
                API.get('/health?limit=5'),
                API.get('/feed/consumption?limit=5'),
            ]);

            const allActivities = [
                // FIX Bug 1: Use correct field names from backend
                // Backend returns: total_born, born_alive, sow_tag, farrowing_date
                ...littersRes.data.map(l => ({
                    id:      `litter-${l.id}`,
                    title:   `New litter from sow ${l.sow_tag}`,
                    time:    l.farrowing_date,
                    type:    'litter',
                    icon:    '🐷',
                    details: `${l.total_born} born, ${l.born_alive} alive`,
                })),
                // Backend returns: record_type, animal_tag, date_administered, medication
                ...healthRes.data.map(h => ({
                    id:      `health-${h.id}`,
                    title:   `${h.record_type} for ${h.animal_tag || 'animal'}`,
                    time:    h.date_administered,
                    type:    'health',
                    icon:    '💉',
                    details: h.medication || h.record_type,
                })),
                // FIX Bug 1: Backend returns allocation_date, not consumption_date
                // Also returns: feed_type, quantity_kg, allocated_to_name, allocated_to_type
                ...feedRes.data.map(f => ({
                    id:      `feed-${f.id}`,
                    title:   `Feeding: ${f.feed_type}`,
                    time:    f.allocation_date,
                    type:    'feed',
                    icon:    '🌾',
                    details: `${f.quantity_kg}kg for ${f.allocated_to_name || f.allocated_to_type}`,
                })),
            ]
                .sort((a, b) => new Date(b.time) - new Date(a.time))
                .slice(0, 10);

            setActivities(allActivities);
        } catch (error) {
            console.error('Error fetching activities:', error);
        }
    }, []);

    const fetchMonthlyData = useCallback(async () => {
        try {
            const res = await API.get('/finance/monthly');
            if (res.data && res.data.length > 0) {
                setMonthlyData(res.data);
            } else {
                setMonthlyData(FALLBACK_MONTHLY);
            }
        } catch (error) {
            console.error('Error fetching monthly data:', error);
            setMonthlyData(FALLBACK_MONTHLY);
        }
    }, []);

    const fetchPigsByStage = useCallback(async () => {
        try {
            const res = await API.get('/pigs/stages');
            setPigsByStage(res.data);
        } catch (error) {
            console.error('Error fetching pig stages:', error);
            setPigsByStage(FALLBACK_STAGES);
        }
    }, []);

    // All fetches run in parallel; loading resolves only after ALL complete
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);

        const loadAll = async () => {
            try {
                await Promise.all([
                    fetchDashboardData(),
                    fetchActivities(),
                    fetchMonthlyData(),
                    fetchPigsByStage(),
                ]);
            } finally {
                setLoading(false);
            }
        };

        loadAll();
        return () => clearInterval(timer);
    }, [fetchDashboardData, fetchActivities, fetchMonthlyData, fetchPigsByStage]);

    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    // Guard for invalid dates before formatting
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid date';
        return date.toLocaleString('en-ZA', {
            year:   'numeric',
            month:  '2-digit',
            day:    '2-digit',
            hour:   '2-digit',
            minute: '2-digit',
        });
    };

    // FIX Bug 3: Use ZAR currency formatting consistent with en-ZA locale
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-ZA', {
            style:    'currency',
            currency: 'ZAR',
        }).format(amount || 0);
    };

    // Safe survival rate with division-by-zero guard
    const getSurvivalRate = (alive, born) => {
        if (!born || born === 0) return 0;
        return Math.round((alive / born) * 100);
    };

    const totalPigs = pigsByStage.reduce((sum, i) => sum + i.value, 0);

    if (loading) {
        return (
            <div style={{
                display:         'flex',
                justifyContent:  'center',
                alignItems:      'center',
                height:          '100vh',
                color:           '#ff1493',
                backgroundColor: '#000',
                flexDirection:   'column',
                gap:             '12px',
            }}>
                <span style={{ fontSize: '2em' }}>🐷</span>
                <span>Loading dashboard...</span>
            </div>
        );
    }

    return (
        <div style={{ padding: '30px', backgroundColor: '#000', minHeight: '100vh', color: '#fff' }}>

            {/* ── Top Bar ── */}
            <div style={{
                display:         'flex',
                justifyContent:  'space-between',
                alignItems:      'center',
                marginBottom:    '30px',
                backgroundColor: '#1a1a1a',
                padding:         '15px 25px',
                borderRadius:    '10px',
                border:          '2px solid #ff1493',
                boxShadow:       '0 4px 6px rgba(255,20,147,0.2)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <h1 style={{ color: '#ff1493', fontSize: '24px', margin: 0 }}>🐷 PigFarm Manager</h1>
                    <span style={{
                        backgroundColor: user?.role === 'admin' ? '#ff0000' : '#ff1493',
                        color:           '#000',
                        padding:         '4px 8px',
                        borderRadius:    '4px',
                        fontSize:        '12px',
                        fontWeight:      'bold',
                    }}>
                        {user?.role?.toUpperCase() || 'WORKER'}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#ff1493', fontSize: '14px', fontWeight: 'bold' }}>
                            {currentTime.toLocaleDateString('en-ZA', {
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                            })}
                        </div>
                        <div style={{ color: '#fff', fontSize: '16px', fontFamily: 'monospace' }}>
                            {currentTime.toLocaleTimeString('en-ZA')}
                        </div>
                    </div>
                    <span style={{ color: '#fff' }}>
                        Welcome, <strong style={{ color: '#ff1493' }}>{user?.name?.split(' ')[0] || 'Farmer'}</strong>
                    </span>
                </div>
            </div>

            {/* ── Greeting ── */}
            <div style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '28px', marginBottom: '5px', color: '#fff' }}>
                    {getGreeting()}, <span style={{ color: '#ff1493' }}>{user?.name || 'Farmer'}</span>!
                </h2>
                <p style={{ color: '#888' }}>Here's what's happening across your farm.</p>
            </div>

            {/* ── Stats Cards ── */}
            <div style={{
                display:             'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap:                 '20px',
                marginBottom:        '30px',
            }}>
                {[
                    {
                        label: 'Active sows',
                        value: stats.activeSows,
                        sub:   null,
                    },
                    {
                        label: 'Total piglets',
                        value: stats.totalPiglets,
                        sub:   null,
                    },
                    {
                        label: 'Total litters',
                        value: stats.totalLitters,
                        sub:   null,
                    },
                    {
                        // FIX Bug 3: ZAR currency formatting, not '$'
                        label: 'Feed stock',
                        value: `${stats.totalFeed} kg`,
                        sub:   `Value: ${formatCurrency(stats.feedValue)}`,
                    },
                ].map(({ label, value, sub }) => (
                    <div key={label} style={{
                        backgroundColor: '#1a1a1a',
                        border:          '2px solid #ff1493',
                        borderRadius:    '10px',
                        padding:         '20px',
                        textAlign:       'center',
                    }}>
                        <h3 style={{ color: '#ff1493', marginBottom: '10px' }}>{label}</h3>
                        <p style={{ fontSize: '2em', fontWeight: 'bold', color: '#fff', margin: 0 }}>{value}</p>
                        {sub && <p style={{ color: '#888', fontSize: '0.9em', marginTop: '6px' }}>{sub}</p>}
                    </div>
                ))}
            </div>

            {/* ── Chart + Activity Feed ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '25px', marginBottom: '30px' }}>
                <div style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '10px', border: '2px solid #ff1493' }}>
                    {/* FIX Bug 2: Chart now uses real finance fields (income/expense/profit)
                        instead of the non-existent 'piglets' field. Title updated to match. */}
                    <h3 style={{ marginBottom: '20px', color: '#ff1493' }}>Monthly income vs expenses</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="month" stroke="#888" />
                            <YAxis stroke="#888" tickFormatter={(v) => `R${(v/1000).toFixed(0)}k`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1a1a1a', border: '2px solid #ff1493', color: '#fff' }}
                                formatter={(value) => [formatCurrency(value)]}
                            />
                            <Bar dataKey="income"  fill="#4CAF50" name="Income" />
                            <Bar dataKey="expense" fill="#ff1493" name="Expenses" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '10px', border: '2px solid #ff1493' }}>
                    <h3 style={{ marginBottom: '20px', color: '#ff1493' }}>📋 What's happening</h3>
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {activities.length === 0 ? (
                            <p style={{ color: '#888', textAlign: 'center', padding: '20px' }}>
                                No recent activities found.
                            </p>
                        ) : (
                            activities.map(activity => (
                                <div
                                    key={activity.id}
                                    style={{
                                        padding:      '12px',
                                        borderBottom: '1px solid #333',
                                        cursor:       'pointer',
                                        transition:   'background-color 0.2s',
                                        borderRadius: '5px',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#ff1493';
                                        e.currentTarget.style.color = '#000';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.color = '#fff';
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '1.2em' }}>{activity.icon}</span>
                                        <div>
                                            <p style={{ fontWeight: 'bold', marginBottom: '4px', margin: 0 }}>
                                                {activity.title}
                                            </p>
                                            <p style={{ fontSize: '0.9em', color: 'inherit', margin: '4px 0' }}>
                                                {activity.details}
                                            </p>
                                            <p style={{ fontSize: '0.8em', color: 'inherit', margin: 0, opacity: 0.7 }}>
                                                {formatDate(activity.time)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* ── Pigs by Stage ── */}
            <div style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '10px', border: '2px solid #ff1493', marginBottom: '30px' }}>
                <h3 style={{ marginBottom: '20px', color: '#ff1493' }}>🐷 Pigs by stage</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px' }}>
                    <div style={{ flex: '1', minWidth: '300px' }}>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={pigsByStage}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    dataKey="value"
                                >
                                    {pigsByStage.map((entry, index) => (
                                        <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '2px solid #ff1493' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ flex: '1', minWidth: '300px' }}>
                        {pigsByStage.map((item, index) => (
                            <div key={item.name} style={{ marginBottom: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                    <span style={{ color: COLORS[index % COLORS.length] }}>{item.name}</span>
                                    <span style={{ fontWeight: 'bold' }}>{item.value}</span>
                                </div>
                                <div style={{ height: '10px', backgroundColor: '#333', borderRadius: '5px', overflow: 'hidden' }}>
                                    <div style={{
                                        width:           `${totalPigs > 0 ? (item.value / totalPigs) * 100 : 0}%`,
                                        height:          '100%',
                                        backgroundColor: COLORS[index % COLORS.length],
                                    }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Recent Litters ── */}
            <div style={{ backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '10px', border: '2px solid #ff1493', marginBottom: '30px' }}>
                <h3 style={{ marginBottom: '20px', color: '#ff1493' }}>📋 Recent litters</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #ff1493' }}>
                            {['Sow tag', 'Survival', 'Farrowing date', 'Action'].map(h => (
                                <th key={h} style={{ padding: '12px', textAlign: 'left', color: '#ff1493' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {stats.recentLitters.length > 0 ? (
                            stats.recentLitters.map(litter => {
                                // FIX Bug 4: Backend joins as sow_tag, not tag_number
                                // FIX Bug 5: Backend returns born_alive and total_born, not piglets_alive/piglets_born
                                const rate = getSurvivalRate(litter.born_alive, litter.total_born);
                                return (
                                    <tr key={litter.id} style={{ borderBottom: '1px solid #333' }}>
                                        <td style={{ padding: '12px' }}>{litter.sow_tag}</td>
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '100px', height: '8px', backgroundColor: '#333', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div style={{
                                                        width:           `${rate}%`,
                                                        height:          '100%',
                                                        backgroundColor: rate >= 85 ? '#4CAF50' : rate >= 70 ? '#ff9800' : '#ff0000',
                                                    }} />
                                                </div>
                                                <span>{rate}%</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            {new Date(litter.farrowing_date).toLocaleDateString('en-ZA')}
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            {/* FIX Bug 7: View button now has an onClick handler */}
                                            <button
                                                onClick={() => {
                                                    // TODO: replace with navigation when router is set up
                                                    // e.g. navigate(`/litters/${litter.id}`)
                                                    console.log('View litter:', litter.id);
                                                }}
                                                style={{
                                                    backgroundColor: '#ff1493',
                                                    color:           '#000',
                                                    border:          'none',
                                                    padding:         '5px 15px',
                                                    borderRadius:    '3px',
                                                    cursor:          'pointer',
                                                    fontWeight:      'bold',
                                                }}
                                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ff0000')}
                                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ff1493')}
                                            >
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                                    No recent litters found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Footer ── */}
            <div style={{ textAlign: 'center', color: '#888', fontSize: '0.9em', borderTop: '2px solid #ff1493', paddingTop: '20px' }}>
                Developed by <span style={{ color: '#ff1493', fontWeight: 'bold' }}>Patricia Mukunza</span>
            </div>
        </div>
    );
}

export default Dashboard;
