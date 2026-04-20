import React, { useState, useEffect } from 'react';
import API from '../services/api';
import toast from 'react-hot-toast';
import { 
    LineChart, Line, BarChart, Bar, XAxis, YAxis, 
    CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

function Litters() {
    const [litters, setLitters] = useState([]);
    const [selectedLitter, setSelectedLitter] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [showMortalityForm, setShowMortalityForm] = useState(false);
    const [showWeightForm, setShowWeightForm] = useState(false);
    const [showHealthForm, setShowHealthForm] = useState(false);
    const [showFosteringForm, setShowFosteringForm] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [sows, setSows] = useState([]);
    const [stats, setStats] = useState({
        totalLitters: 0,
        activeLitters: 0,
        weanedLitters: 0,
        totalPiglets: 0,
        avgLitterSize: 0,
        avgSurvivalRate: 0,
        totalMortality: 0
    });

    useEffect(() => {
        fetchLitters();
        fetchStats();
        fetchSows();
    }, []);

    const fetchLitters = async () => {
        try {
            const res = await API.get('/litters');
            setLitters(res.data);
        } catch (error) {
            console.error('Error fetching litters:', error);
            toast.error('Failed to load litters');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await API.get('/litters/stats');
            setStats(res.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchSows = async () => {
        try {
            const res = await API.get('/sows');
            setSows(res.data);
        } catch (error) {
            console.error('Error fetching sows:', error);
        }
    };

    const fetchLitterDetails = async (id) => {
        try {
            const res = await API.get(`/litters/${id}`);
            setSelectedLitter(res.data);
            setShowDetails(true);
        } catch (error) {
            toast.error('Failed to load litter details');
        }
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'active': return '#4CAF50';
            case 'weaned': return '#2196F3';
            default: return '#888';
        }
    };

    const getAlertColor = (level) => {
        switch(level) {
            case 'green': return '#4CAF50';
            case 'yellow': return '#ff9800';
            case 'red': return '#f44336';
            default: return '#888';
        }
    };

    const getEventIcon = (event) => {
        switch(event) {
            case 'birth': return '🐖';
            case 'death': return '💔';
            case 'weight': return '⚖️';
            case 'treatment': return '💉';
            case 'vaccination': return '🩹';
            case 'weaning': return '🍼';
            case 'fostering': return '🔄';
            case 'alert': return '⚠️';
            default: return '📌';
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatDateTime = (dateTimeString) => {
        return new Date(dateTimeString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredLitters = litters
        .filter(litter => filter === 'all' || litter.status === filter)
        .filter(litter => 
            (litter.litter_id?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (litter.sow_tag?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (litter.sow_name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
        );

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.loadingText}>Loading litters...</div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header with Stats */}
            <div style={styles.header}>
                <div style={styles.headerTop}>
                    <h1 style={styles.title}>🐖 Litter Management</h1>
                    <button
                        onClick={() => setShowAddForm(true)}
                        style={styles.addButton}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#ff0000'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#ff1493'}
                    >
                        + Record New Litter
                    </button>
                </div>

                {/* Stats Cards */}
                <div style={styles.statsGrid}>
                    <StatCard icon="📋" value={stats.totalLitters} label="Total Litters" color="#ff1493" />
                    <StatCard icon="✅" value={stats.activeLitters} label="Active" color="#4CAF50" />
                    <StatCard icon="🍼" value={stats.weanedLitters} label="Weaned" color="#2196F3" />
                    <StatCard icon="🐷" value={stats.totalPiglets} label="Total Piglets" color="#ff9800" />
                    <StatCard icon="📊" value={stats.avgLitterSize} label="Avg Litter Size" color="#9C27B0" />
                    <StatCard icon="💚" value={stats.avgSurvivalRate + '%'} label="Avg Survival" color="#4CAF50" />
                    <StatCard icon="💔" value={stats.totalMortality} label="Total Deaths" color="#f44336" />
                </div>
            </div>

            {/* Search and Filter */}
            <div style={styles.searchFilter}>
                <input
                    type="text"
                    placeholder="🔍 Search by Litter ID, Sow ID or Name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                />
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    style={styles.filterSelect}
                >
                    <option value="all">All Litters</option>
                    <option value="active">Active</option>
                    <option value="weaned">Weaned</option>
                </select>
            </div>

            {/* Quick Action Buttons */}
            <div style={styles.quickActions}>
                <QuickActionButton 
                    icon="➕" 
                    label="New Litter" 
                    onClick={() => setShowAddForm(true)}
                    color="#ff1493"
                />
                <QuickActionButton 
                    icon="💔" 
                    label="Add Mortality" 
                    onClick={() => {
                        if (selectedLitter) setShowMortalityForm(true);
                        else toast.error('Please select a litter first');
                    }}
                    color="#f44336"
                />
                <QuickActionButton 
                    icon="⚖️" 
                    label="Record Weight" 
                    onClick={() => {
                        if (selectedLitter) setShowWeightForm(true);
                        else toast.error('Please select a litter first');
                    }}
                    color="#4CAF50"
                />
                <QuickActionButton 
                    icon="💉" 
                    label="Health Record" 
                    onClick={() => {
                        if (selectedLitter) setShowHealthForm(true);
                        else toast.error('Please select a litter first');
                    }}
                    color="#2196F3"
                />
                <QuickActionButton 
                    icon="🔄" 
                    label="Cross Foster" 
                    onClick={() => {
                        if (selectedLitter) setShowFosteringForm(true);
                        else toast.error('Please select a litter first');
                    }}
                    color="#ff9800"
                />
                <QuickActionButton 
                    icon="📊" 
                    label="Performance" 
                    onClick={() => {}}
                    color="#9C27B0"
                />
                <QuickActionButton 
                    icon="📄" 
                    label="Export PDF" 
                    onClick={() => {}}
                    color="#795548"
                />
            </div>

            {/* Litters Grid */}
            {filteredLitters.length === 0 ? (
                <EmptyState onAddClick={() => setShowAddForm(true)} />
            ) : (
                <div style={styles.littersGrid}>
                    {filteredLitters.map(litter => (
                        <LitterCard 
                            key={litter.id}
                            litter={litter}
                            onView={() => fetchLitterDetails(litter.id)}
                            formatDate={formatDate}
                            getStatusColor={getStatusColor}
                            getAlertColor={getAlertColor}
                        />
                    ))}
                </div>
            )}

            {/* Add Litter Form Modal */}
            {showAddForm && (
                <AddLitterModal
                    sows={sows}
                    onClose={() => setShowAddForm(false)}
                    onLitterAdded={() => {
                        fetchLitters();
                        fetchStats();
                    }}
                />
            )}

            {/* Mortality Form Modal */}
            {showMortalityForm && selectedLitter && (
                <MortalityModal
                    litter={selectedLitter}
                    onClose={() => setShowMortalityForm(false)}
                    onMortalityAdded={() => {
                        fetchLitterDetails(selectedLitter.id);
                        fetchStats();
                    }}
                />
            )}

            {/* Weight Form Modal */}
            {showWeightForm && selectedLitter && (
                <WeightModal
                    litter={selectedLitter}
                    onClose={() => setShowWeightForm(false)}
                    onWeightAdded={() => {
                        fetchLitterDetails(selectedLitter.id);
                    }}
                />
            )}

            {/* Health Form Modal */}
            {showHealthForm && selectedLitter && (
                <HealthModal
                    litter={selectedLitter}
                    onClose={() => setShowHealthForm(false)}
                    onHealthAdded={() => {
                        fetchLitterDetails(selectedLitter.id);
                    }}
                />
            )}

            {/* Cross Fostering Modal */}
            {showFosteringForm && selectedLitter && (
                <FosteringModal
                    litter={selectedLitter}
                    litters={litters}
                    onClose={() => setShowFosteringForm(false)}
                    onFosteringAdded={() => {
                        fetchLitterDetails(selectedLitter.id);
                    }}
                />
            )}

            {/* Litter Details Modal */}
            {showDetails && selectedLitter && (
                <LitterDetailsModal
                    litter={selectedLitter}
                    onClose={() => {
                        setShowDetails(false);
                        setSelectedLitter(null);
                    }}
                    formatDate={formatDate}
                    formatDateTime={formatDateTime}
                    getEventIcon={getEventIcon}
                    getAlertColor={getAlertColor}
                    onAction={(action) => {
                        setShowDetails(false);
                        if (action === 'mortality') setShowMortalityForm(true);
                        if (action === 'weight') setShowWeightForm(true);
                        if (action === 'health') setShowHealthForm(true);
                        if (action === 'foster') setShowFosteringForm(true);
                        if (action === 'wean') {
                            // Handle weaning
                            toast.success('Litter marked as weaned');
                        }
                    }}
                />
            )}
        </div>
    );
}

// ============= HELPER COMPONENTS =============

const StatCard = ({ icon, value, label, color }) => (
    <div style={{
        backgroundColor: '#000',
        border: `2px solid ${color}`,
        borderRadius: '10px',
        padding: '15px',
        textAlign: 'center'
    }}>
        <div style={{ fontSize: '1.8em', marginBottom: '5px' }}>{icon}</div>
        <div style={{ color: color, fontSize: '1.5em', fontWeight: 'bold' }}>{value}</div>
        <div style={{ color: '#fff', fontSize: '0.9em' }}>{label}</div>
    </div>
);

const QuickActionButton = ({ icon, label, onClick, color }) => (
    <button
        onClick={onClick}
        style={{
            flex: 1,
            minWidth: '100px',
            padding: '10px',
            backgroundColor: color,
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.3s'
        }}
        onMouseEnter={(e) => {
            e.target.style.filter = 'brightness(1.1)';
            e.target.style.transform = 'scale(1.02)';
        }}
        onMouseLeave={(e) => {
            e.target.style.filter = 'brightness(1)';
            e.target.style.transform = 'scale(1)';
        }}
    >
        <span style={{ fontSize: '1.2em' }}>{icon}</span>
        {label}
    </button>
);

const LitterCard = ({ litter, onView, formatDate, getStatusColor, getAlertColor }) => (
    <div 
        style={{
            backgroundColor: '#1a1a1a',
            border: `2px solid ${getAlertColor(litter.alert_level || 'green')}`,
            borderRadius: '15px',
            padding: '20px',
            cursor: 'pointer',
            transition: 'all 0.3s',
            position: 'relative'
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = `0 10px 30px ${getAlertColor(litter.alert_level || 'green')}40`;
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
        }}
        onClick={onView}
    >
        {/* Alert Badge */}
        {litter.alerts?.length > 0 && (
            <div style={{
                position: 'absolute',
                top: '-10px',
                right: '-10px',
                backgroundColor: '#f44336',
                color: '#fff',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '14px',
                border: '2px solid #fff'
            }}>
                !
            </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div>
                <h3 style={{ color: '#ff1493', margin: 0, fontSize: '1.3em' }}>
                    {litter.litter_id || `LIT-${String(litter.id).padStart(3, '0')}`}
                </h3>
                <p style={{ color: '#fff', margin: '5px 0 0 0' }}>
                    Sow: {litter.sow_tag} - {litter.sow_name || ''}
                </p>
            </div>
            <span style={{
                backgroundColor: getStatusColor(litter.status),
                color: '#000',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 'bold'
            }}>
                {litter.status?.toUpperCase() || 'ACTIVE'}
            </span>
        </div>

        {/* Basic Info */}
        <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '10px',
            backgroundColor: '#000',
            padding: '15px',
            borderRadius: '10px',
            marginBottom: '15px'
        }}>
            <InfoItem label="Farrowing" value={formatDate(litter.farrowing_date)} />
            <InfoItem label="Parity" value={litter.parity_number || 1} />
            <InfoItem label="Born/Alive" value={`${litter.total_born || 0}/${litter.born_alive || 0}`} />
            <InfoItem label="Current Alive" value={litter.current_alive || 0} />
        </div>

        {/* Stats Row */}
        <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '10px',
            marginBottom: '15px'
        }}>
            <StatPill label="Survival" value={(litter.survival_rate || 0) + '%'} color="#4CAF50" />
            <StatPill label="Mortality" value={(litter.mortality_rate || 0) + '%'} color="#f44336" />
            <StatPill label="Performance" value={litter.performance_score || 0} color="#ff1493" />
        </div>

        {/* Progress Bar */}
        {litter.status === 'active' && (
            <div style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ color: '#888', fontSize: '12px' }}>Weaning Progress</span>
                    <span style={{ color: '#fff', fontSize: '12px' }}>
                        {Math.floor((new Date() - new Date(litter.farrowing_date)) / (1000 * 60 * 60 * 24))} / 28 days
                    </span>
                </div>
                <div style={{ 
                    height: '8px', 
                    backgroundColor: '#333',
                    borderRadius: '4px',
                    overflow: 'hidden'
                }}>
                    <div style={{ 
                        width: `${Math.min(100, (new Date() - new Date(litter.farrowing_date)) / (1000 * 60 * 60 * 24) / 28 * 100)}%`,
                        height: '100%',
                        backgroundColor: '#ff1493',
                        borderRadius: '4px'
                    }} />
                </div>
            </div>
        )}

        {/* Quick Stats */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
            <SmallStat icon="⚖️" value={(litter.current_weight_avg || 0) + 'kg'} label="Avg Weight" />
            <SmallStat icon="💔" value={litter.total_deaths || 0} label="Deaths" />
            <SmallStat icon="📊" value={litter.performance_score || 0} label="Score" />
        </div>
    </div>
);

const InfoItem = ({ label, value }) => (
    <div>
        <span style={{ color: '#888', fontSize: '0.85em' }}>{label}:</span>
        <span style={{ color: '#fff', marginLeft: '5px', fontWeight: 'bold' }}>{value}</span>
    </div>
);

const StatPill = ({ label, value, color }) => (
    <div style={{ textAlign: 'center' }}>
        <span style={{ color: '#888', fontSize: '11px' }}>{label}</span>
        <div style={{ color: color, fontWeight: 'bold', fontSize: '14px' }}>{value}</div>
    </div>
);

const SmallStat = ({ icon, value, label }) => (
    <div style={{ textAlign: 'center', flex: 1 }}>
        <div style={{ fontSize: '1.2em' }}>{icon}</div>
        <div style={{ color: '#fff', fontWeight: 'bold' }}>{value}</div>
        <div style={{ color: '#888', fontSize: '10px' }}>{label}</div>
    </div>
);

const EmptyState = ({ onAddClick }) => (
    <div style={{
        backgroundColor: '#1a1a1a',
        border: '2px dashed #ff1493',
        borderRadius: '20px',
        padding: '80px 50px',
        textAlign: 'center'
    }}>
        <div style={{ fontSize: '5em', marginBottom: '20px' }}>🐖</div>
        <h2 style={{ color: '#ff1493', marginBottom: '10px' }}>No Litters Recorded</h2>
        <p style={{ color: '#888', fontSize: '1.2em', marginBottom: '30px' }}>
            Start by recording your first litter
        </p>
        <button
            onClick={onAddClick}
            style={{
                backgroundColor: '#ff1493',
                color: '#000',
                border: 'none',
                padding: '15px 40px',
                borderRadius: '50px',
                fontSize: '1.2em',
                fontWeight: 'bold',
                cursor: 'pointer'
            }}
        >
            + Record First Litter
        </button>
    </div>
);

// ============= MODAL COMPONENTS =============

const AddLitterModal = ({ sows, onClose, onLitterAdded }) => {
    const [formData, setFormData] = useState({
        sow_id: '',
        farrowing_date: new Date().toISOString().split('T')[0],
        total_born: '',
        born_alive: '',
        stillborn: '0',
        mummified: '0',
        birth_weight: '',
        parity_number: '1',
        notes: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await API.post('/litters', formData);
            toast.success('Litter recorded successfully');
            onLitterAdded();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to record litter');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <h2 style={{ color: '#ff1493', marginBottom: '20px' }}>🐖 Record New Litter</h2>
                <form onSubmit={handleSubmit}>
                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Select Sow *</label>
                        <select
                            value={formData.sow_id}
                            onChange={(e) => setFormData({...formData, sow_id: e.target.value})}
                            style={modalInput}
                            required
                        >
                            <option value="">Select Sow</option>
                            {sows.map(sow => (
                                <option key={sow.id} value={sow.id}>
                                    {sow.tag_number} - {sow.name || ''} ({sow.status})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Farrowing Date *</label>
                            <input
                                type="date"
                                value={formData.farrowing_date}
                                onChange={(e) => setFormData({...formData, farrowing_date: e.target.value})}
                                style={modalInput}
                                required
                            />
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Parity Number</label>
                            <input
                                type="number"
                                value={formData.parity_number}
                                onChange={(e) => setFormData({...formData, parity_number: e.target.value})}
                                style={modalInput}
                                placeholder="e.g., 1"
                            />
                        </div>
                    </div>

                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Total Born *</label>
                            <input
                                type="number"
                                value={formData.total_born}
                                onChange={(e) => setFormData({...formData, total_born: e.target.value})}
                                style={modalInput}
                                required
                            />
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Born Alive *</label>
                            <input
                                type="number"
                                value={formData.born_alive}
                                onChange={(e) => setFormData({...formData, born_alive: e.target.value})}
                                style={modalInput}
                                required
                            />
                        </div>
                    </div>

                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Stillborn</label>
                            <input
                                type="number"
                                value={formData.stillborn}
                                onChange={(e) => setFormData({...formData, stillborn: e.target.value})}
                                style={modalInput}
                            />
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Mummified</label>
                            <input
                                type="number"
                                value={formData.mummified}
                                onChange={(e) => setFormData({...formData, mummified: e.target.value})}
                                style={modalInput}
                            />
                        </div>
                    </div>

                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Average Birth Weight (kg)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={formData.birth_weight}
                            onChange={(e) => setFormData({...formData, birth_weight: e.target.value})}
                            style={modalInput}
                            placeholder="e.g., 1.2"
                        />
                    </div>

                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                            style={{...modalInput, minHeight: '80px'}}
                            placeholder="Any observations..."
                        />
                    </div>

                    <div style={modalButtonGroup}>
                        <button type="button" onClick={onClose} style={modalCancelButton} disabled={submitting}>Cancel</button>
                        <button type="submit" style={modalSubmitButton} disabled={submitting}>
                            {submitting ? 'Saving...' : 'Record Litter'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Mortality Modal
const MortalityModal = ({ litter, onClose, onMortalityAdded }) => {
    const [formData, setFormData] = useState({
        death_date: new Date().toISOString().split('T')[0],
        number_died: '1',
        cause: 'unknown',
        notes: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await API.post(`/litters/${litter.id}/mortality`, formData);
            toast.success('Mortality recorded');
            onMortalityAdded();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to record mortality');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <h2 style={{ color: '#f44336', marginBottom: '20px' }}>💔 Record Mortality</h2>
                <p style={{ color: '#fff', marginBottom: '15px' }}>
                    Litter: {litter.litter_id || `LIT-${String(litter.id).padStart(3, '0')}`} - Sow {litter.sow_tag}
                </p>
                <form onSubmit={handleSubmit}>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Death Date *</label>
                            <input
                                type="date"
                                value={formData.death_date}
                                onChange={(e) => setFormData({...formData, death_date: e.target.value})}
                                style={modalInput}
                                required
                            />
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Number Died *</label>
                            <input
                                type="number"
                                min="1"
                                value={formData.number_died}
                                onChange={(e) => setFormData({...formData, number_died: e.target.value})}
                                style={modalInput}
                                required
                            />
                        </div>
                    </div>

                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Cause *</label>
                        <select
                            value={formData.cause}
                            onChange={(e) => setFormData({...formData, cause: e.target.value})}
                            style={modalInput}
                            required
                        >
                            <option value="crushing">Crushing</option>
                            <option value="disease">Disease</option>
                            <option value="starvation">Starvation</option>
                            <option value="unknown">Unknown</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                            style={{...modalInput, minHeight: '80px'}}
                            placeholder="Additional details..."
                        />
                    </div>

                    <div style={modalButtonGroup}>
                        <button type="button" onClick={onClose} style={modalCancelButton} disabled={submitting}>Cancel</button>
                        <button type="submit" style={{...modalSubmitButton, backgroundColor: '#f44336'}} disabled={submitting}>
                            {submitting ? 'Saving...' : 'Record Mortality'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Weight Modal
const WeightModal = ({ litter, onClose, onWeightAdded }) => {
    const [formData, setFormData] = useState({
        weight_date: new Date().toISOString().split('T')[0],
        weight_kg: '',
        weight_type: 'current',
        notes: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await API.post(`/litters/${litter.id}/weight`, formData);
            toast.success('Weight recorded');
            onWeightAdded();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to record weight');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <h2 style={{ color: '#4CAF50', marginBottom: '20px' }}>⚖️ Record Weight</h2>
                <p style={{ color: '#fff', marginBottom: '15px' }}>
                    Litter: {litter.litter_id || `LIT-${String(litter.id).padStart(3, '0')}`} - Current avg: {litter.current_weight_avg || 0}kg
                </p>
                <form onSubmit={handleSubmit}>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Weight Date *</label>
                            <input
                                type="date"
                                value={formData.weight_date}
                                onChange={(e) => setFormData({...formData, weight_date: e.target.value})}
                                style={modalInput}
                                required
                            />
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Weight (kg) *</label>
                            <input
                                type="number"
                                step="0.1"
                                value={formData.weight_kg}
                                onChange={(e) => setFormData({...formData, weight_kg: e.target.value})}
                                style={modalInput}
                                required
                            />
                        </div>
                    </div>

                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Weight Type</label>
                        <select
                            value={formData.weight_type}
                            onChange={(e) => setFormData({...formData, weight_type: e.target.value})}
                            style={modalInput}
                        >
                            <option value="birth">Birth Weight</option>
                            <option value="current">Current Weight</option>
                            <option value="weaning">Weaning Weight</option>
                            <option value="interim">Interim Check</option>
                        </select>
                    </div>

                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                            style={{...modalInput, minHeight: '80px'}}
                            placeholder="Additional notes..."
                        />
                    </div>

                    <div style={modalButtonGroup}>
                        <button type="button" onClick={onClose} style={modalCancelButton} disabled={submitting}>Cancel</button>
                        <button type="submit" style={{...modalSubmitButton, backgroundColor: '#4CAF50'}} disabled={submitting}>
                            {submitting ? 'Saving...' : 'Record Weight'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Health Modal
const HealthModal = ({ litter, onClose, onHealthAdded }) => {
    const [formData, setFormData] = useState({
        record_date: new Date().toISOString().split('T')[0],
        record_type: 'treatment',
        diagnosis: '',
        medication: '',
        dosage: '',
        administered_by: '',
        notes: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await API.post(`/litters/${litter.id}/health`, formData);
            toast.success('Health record added');
            onHealthAdded();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to add health record');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <h2 style={{ color: '#2196F3', marginBottom: '20px' }}>💉 Health Record</h2>
                <p style={{ color: '#fff', marginBottom: '15px' }}>
                    Litter: {litter.litter_id || `LIT-${String(litter.id).padStart(3, '0')}`}
                </p>
                <form onSubmit={handleSubmit}>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Date *</label>
                            <input
                                type="date"
                                value={formData.record_date}
                                onChange={(e) => setFormData({...formData, record_date: e.target.value})}
                                style={modalInput}
                                required
                            />
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Type *</label>
                            <select
                                value={formData.record_type}
                                onChange={(e) => setFormData({...formData, record_type: e.target.value})}
                                style={modalInput}
                                required
                            >
                                <option value="treatment">Treatment</option>
                                <option value="vaccination">Vaccination</option>
                                <option value="checkup">Checkup</option>
                            </select>
                        </div>
                    </div>

                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Diagnosis</label>
                        <input
                            type="text"
                            value={formData.diagnosis}
                            onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
                            style={modalInput}
                            placeholder="e.g., Scours, Respiratory"
                        />
                    </div>

                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Medication</label>
                            <input
                                type="text"
                                value={formData.medication}
                                onChange={(e) => setFormData({...formData, medication: e.target.value})}
                                style={modalInput}
                                placeholder="Medication name"
                            />
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Dosage</label>
                            <input
                                type="text"
                                value={formData.dosage}
                                onChange={(e) => setFormData({...formData, dosage: e.target.value})}
                                style={modalInput}
                                placeholder="e.g., 2ml"
                            />
                        </div>
                    </div>

                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Administered By</label>
                        <input
                            type="text"
                            value={formData.administered_by}
                            onChange={(e) => setFormData({...formData, administered_by: e.target.value})}
                            style={modalInput}
                            placeholder="Staff name"
                        />
                    </div>

                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                            style={{...modalInput, minHeight: '80px'}}
                            placeholder="Additional notes..."
                        />
                    </div>

                    <div style={modalButtonGroup}>
                        <button type="button" onClick={onClose} style={modalCancelButton} disabled={submitting}>Cancel</button>
                        <button type="submit" style={{...modalSubmitButton, backgroundColor: '#2196F3'}} disabled={submitting}>
                            {submitting ? 'Saving...' : 'Save Record'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Fostering Modal
const FosteringModal = ({ litter, litters, onClose, onFosteringAdded }) => {
    const [formData, setFormData] = useState({
        fostering_date: new Date().toISOString().split('T')[0],
        piglets_count: '1',
        fostering_type: 'add',
        target_litter: '',
        reason: '',
        notes: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await API.post(`/litters/${litter.id}/fostering`, formData);
            toast.success('Cross fostering recorded');
            onFosteringAdded();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to record fostering');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <h2 style={{ color: '#ff9800', marginBottom: '20px' }}>🔄 Cross Fostering</h2>
                <p style={{ color: '#fff', marginBottom: '15px' }}>
                    Current Litter: {litter.litter_id || `LIT-${String(litter.id).padStart(3, '0')}`} (Alive: {litter.current_alive || 0})
                </p>
                <form onSubmit={handleSubmit}>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Date *</label>
                            <input
                                type="date"
                                value={formData.fostering_date}
                                onChange={(e) => setFormData({...formData, fostering_date: e.target.value})}
                                style={modalInput}
                                required
                            />
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Piglets *</label>
                            <input
                                type="number"
                                min="1"
                                value={formData.piglets_count}
                                onChange={(e) => setFormData({...formData, piglets_count: e.target.value})}
                                style={modalInput}
                                required
                            />
                        </div>
                    </div>

                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Action *</label>
                        <select
                            value={formData.fostering_type}
                            onChange={(e) => setFormData({...formData, fostering_type: e.target.value})}
                            style={modalInput}
                            required
                        >
                            <option value="add">Add Piglets to this Litter</option>
                            <option value="remove">Remove Piglets from this Litter</option>
                        </select>
                    </div>

                    {formData.fostering_type === 'add' && (
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>From Litter</label>
                            <select
                                value={formData.target_litter}
                                onChange={(e) => setFormData({...formData, target_litter: e.target.value})}
                                style={modalInput}
                            >
                                <option value="">Select Source Litter</option>
                                {litters.filter(l => l.id !== litter.id).map(l => (
                                    <option key={l.id} value={l.id}>
                                        {l.litter_id || `LIT-${String(l.id).padStart(3, '0')}`} - Sow {l.sow_tag} (Alive: {l.current_alive || 0})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {formData.fostering_type === 'remove' && (
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>To Litter</label>
                            <select
                                value={formData.target_litter}
                                onChange={(e) => setFormData({...formData, target_litter: e.target.value})}
                                style={modalInput}
                            >
                                <option value="">Select Destination Litter</option>
                                {litters.filter(l => l.id !== litter.id).map(l => (
                                    <option key={l.id} value={l.id}>
                                        {l.litter_id || `LIT-${String(l.id).padStart(3, '0')}`} - Sow {l.sow_tag} (Alive: {l.current_alive || 0})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Reason</label>
                        <input
                            type="text"
                            value={formData.reason}
                            onChange={(e) => setFormData({...formData, reason: e.target.value})}
                            style={modalInput}
                            placeholder="e.g., Equalize litter size"
                        />
                    </div>

                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                            style={{...modalInput, minHeight: '80px'}}
                            placeholder="Additional notes..."
                        />
                    </div>

                    <div style={modalButtonGroup}>
                        <button type="button" onClick={onClose} style={modalCancelButton} disabled={submitting}>Cancel</button>
                        <button type="submit" style={{...modalSubmitButton, backgroundColor: '#ff9800'}} disabled={submitting}>
                            {submitting ? 'Saving...' : 'Record Fostering'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Litter Details Modal
const LitterDetailsModal = ({ litter, onClose, formatDate, formatDateTime, getEventIcon, getAlertColor, onAction }) => {
    const [activeTab, setActiveTab] = useState('overview');

    return (
        <div style={modalOverlayStyle}>
            <div style={{...modalContentStyle, maxWidth: '900px'}}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                        <h2 style={{ color: '#ff1493', margin: 0 }}>
                            {litter.litter_id || `LIT-${String(litter.id).padStart(3, '0')}`} - Sow {litter.sow_tag}
                        </h2>
                        <p style={{ color: '#888', margin: '5px 0 0 0' }}>
                            Farrowed: {formatDate(litter.farrowing_date)} | Parity: {litter.parity_number || 1}
                        </p>
                    </div>
                    <button onClick={onClose} style={closeButtonStyle}>×</button>
                </div>

                {/* Alert Banner */}
                {litter.alerts?.length > 0 && (
                    <div style={{
                        backgroundColor: '#f44336',
                        padding: '10px',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <span style={{ fontSize: '1.5em' }}>⚠️</span>
                        <div>
                            {litter.alerts.map((alert, idx) => (
                                <p key={idx} style={{ color: '#fff', margin: 0 }}>{alert.alert_message}</p>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quick Stats Cards */}
                <div style={styles.statsGrid}>
                    <StatCard icon="🐖" value={litter.total_born || 0} label="Total Born" color="#ff1493" />
                    <StatCard icon="✅" value={litter.born_alive || 0} label="Born Alive" color="#4CAF50" />
                    <StatCard icon="💔" value={litter.stillborn || 0} label="Stillborn" color="#f44336" />
                    <StatCard icon="📦" value={litter.mummified || 0} label="Mummified" color="#888" />
                    <StatCard icon="💚" value={(litter.survival_rate || 0) + '%'} label="Survival Rate" color="#4CAF50" />
                    <StatCard icon="📊" value={litter.performance_score || 0} label="Performance" color="#ff1493" />
                </div>

                {/* Tabs */}
                <div style={styles.tabContainer}>
                    <button
                        onClick={() => setActiveTab('overview')}
                        style={activeTab === 'overview' ? styles.activeTab : styles.tab}
                    >
                        📊 Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('mortality')}
                        style={activeTab === 'mortality' ? styles.activeTab : styles.tab}
                    >
                        💔 Mortality
                    </button>
                    <button
                        onClick={() => setActiveTab('weights')}
                        style={activeTab === 'weights' ? styles.activeTab : styles.tab}
                    >
                        ⚖️ Weights
                    </button>
                    <button
                        onClick={() => setActiveTab('health')}
                        style={activeTab === 'health' ? styles.activeTab : styles.tab}
                    >
                        💉 Health
                    </button>
                    <button
                        onClick={() => setActiveTab('timeline')}
                        style={activeTab === 'timeline' ? styles.activeTab : styles.tab}
                    >
                        🕒 Timeline
                    </button>
                </div>

                {/* Tab Content */}
                <div style={{ marginTop: '20px', maxHeight: '400px', overflowY: 'auto' }}>
                    {activeTab === 'overview' && (
                        <div>
                            {/* Birth Details */}
                            <div style={styles.detailSection}>
                                <h3 style={styles.detailSectionTitle}>Birth Details</h3>
                                <div style={styles.detailGrid}>
                                    <DetailBox label="Total Born" value={litter.total_born || 0} color="#ff1493" />
                                    <DetailBox label="Born Alive" value={litter.born_alive || 0} color="#4CAF50" />
                                    <DetailBox label="Stillborn" value={litter.stillborn || 0} color="#f44336" />
                                    <DetailBox label="Mummified" value={litter.mummified || 0} color="#888" />
                                    <DetailBox label="Birth Weight" value={(litter.birth_weight_avg || 0) + ' kg'} color="#ff9800" />
                                    <DetailBox label="Current Alive" value={litter.current_alive || 0} color="#4CAF50" />
                                </div>
                            </div>

                            {/* Live Status */}
                            <div style={styles.detailSection}>
                                <h3 style={styles.detailSectionTitle}>Live Status</h3>
                                <div style={styles.detailGrid}>
                                    <DetailBox label="Current Alive" value={litter.current_alive || 0} color="#4CAF50" />
                                    <DetailBox label="Total Deaths" value={litter.total_deaths || 0} color="#f44336" />
                                    <DetailBox label="Survival Rate" value={(litter.survival_rate || 0) + '%'} color="#4CAF50" />
                                    <DetailBox label="Mortality Rate" value={(litter.mortality_rate || 0) + '%'} color="#f44336" />
                                </div>
                            </div>

                            {/* Weight Info */}
                            <div style={styles.detailSection}>
                                <h3 style={styles.detailSectionTitle}>Weight Tracking</h3>
                                <div style={styles.detailGrid}>
                                    <DetailBox label="Birth Weight" value={(litter.birth_weight_avg || 0) + ' kg'} color="#ff9800" />
                                    <DetailBox label="Current Weight" value={(litter.current_weight_avg || 0) + ' kg'} color="#4CAF50" />
                                    {litter.weaning_weight_avg && (
                                        <DetailBox label="Weaning Weight" value={litter.weaning_weight_avg + ' kg'} color="#2196F3" />
                                    )}
                                </div>

                                {/* Weight Chart */}
                                {litter.weights?.length > 1 && (
                                    <div style={{ height: '200px', marginTop: '20px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={litter.weights}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                                <XAxis dataKey="weight_date" stroke="#888" />
                                                <YAxis stroke="#888" />
                                                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '2px solid #ff1493' }} />
                                                <Line type="monotone" dataKey="weight_kg" stroke="#ff1493" strokeWidth={2} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>

                            {/* Weaning Section */}
                            {litter.status === 'weaned' && (
                                <div style={styles.detailSection}>
                                    <h3 style={styles.detailSectionTitle}>Weaning Details</h3>
                                    <div style={styles.detailGrid}>
                                        <DetailBox label="Weaning Date" value={formatDate(litter.weaning_date)} color="#2196F3" />
                                        <DetailBox label="Number Weaned" value={litter.number_weaned || 0} color="#4CAF50" />
                                        <DetailBox label="Weaning Weight" value={(litter.weaning_weight_avg || 0) + ' kg'} color="#ff9800" />
                                        <DetailBox label="Lost Before Weaning" value={(litter.total_born || 0) - (litter.number_weaned || 0)} color="#f44336" />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'mortality' && (
                        <div>
                            <div style={styles.detailSection}>
                                <h3 style={styles.detailSectionTitle}>Mortality Records</h3>
                                {litter.mortality?.length > 0 ? (
                                    litter.mortality.map((death, idx) => (
                                        <div key={idx} style={styles.recordItem}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: '#f44336', fontWeight: 'bold' }}>
                                                    {formatDate(death.death_date)} - {death.number_died} piglet(s)
                                                </span>
                                                <span style={{ color: '#888' }}>Cause: {death.cause}</span>
                                            </div>
                                            {death.notes && (
                                                <p style={{ color: '#888', marginTop: '5px' }}>{death.notes}</p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ color: '#888' }}>No mortality records</p>
                                )}
                            </div>

                            {/* Mortality Chart */}
                            {litter.mortality?.length > 0 && (
                                <div style={{ height: '200px', marginTop: '20px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Crushing', value: litter.mortality.filter(d => d.cause === 'crushing').length },
                                                    { name: 'Disease', value: litter.mortality.filter(d => d.cause === 'disease').length },
                                                    { name: 'Starvation', value: litter.mortality.filter(d => d.cause === 'starvation').length },
                                                    { name: 'Unknown', value: litter.mortality.filter(d => d.cause === 'unknown').length }
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                outerRadius={80}
                                                dataKey="value"
                                            >
                                                <Cell fill="#f44336" />
                                                <Cell fill="#ff9800" />
                                                <Cell fill="#ff1493" />
                                                <Cell fill="#888" />
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '2px solid #ff1493' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'weights' && (
                        <div>
                            <div style={styles.detailSection}>
                                <h3 style={styles.detailSectionTitle}>Weight Records</h3>
                                {litter.weights?.length > 0 ? (
                                    litter.weights.map((weight, idx) => (
                                        <div key={idx} style={styles.recordItem}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>
                                                    {formatDate(weight.weight_date)} - {weight.weight_kg} kg
                                                </span>
                                                <span style={{ color: '#888', textTransform: 'capitalize' }}>
                                                    {weight.weight_type}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ color: '#888' }}>No weight records</p>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'health' && (
                        <div>
                            <div style={styles.detailSection}>
                                <h3 style={styles.detailSectionTitle}>Health Records</h3>
                                {litter.health?.length > 0 ? (
                                    litter.health.map((record, idx) => (
                                        <div key={idx} style={styles.recordItem}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: '#2196F3', fontWeight: 'bold' }}>
                                                    {formatDate(record.record_date)} - {record.record_type}
                                                </span>
                                            </div>
                                            {record.diagnosis && (
                                                <p style={{ color: '#fff', marginTop: '5px' }}>Diagnosis: {record.diagnosis}</p>
                                            )}
                                            {record.medication && (
                                                <p style={{ color: '#888' }}>Medication: {record.medication} {record.dosage || ''}</p>
                                            )}
                                            {record.notes && (
                                                <p style={{ color: '#888', fontSize: '0.9em' }}>{record.notes}</p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ color: '#888' }}>No health records</p>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'timeline' && (
                        <div>
                            <div style={styles.detailSection}>
                                <h3 style={styles.detailSectionTitle}>Activity Timeline</h3>
                                <div style={{ position: 'relative', paddingLeft: '20px' }}>
                                    {litter.timeline?.map((event, idx) => (
                                        <div key={idx} style={{
                                            position: 'relative',
                                            paddingBottom: '20px',
                                            borderLeft: '2px solid #ff1493',
                                            paddingLeft: '20px',
                                            marginLeft: '10px'
                                        }}>
                                            <div style={{
                                                position: 'absolute',
                                                left: '-10px',
                                                top: '0',
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '50%',
                                                backgroundColor: '#ff1493',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '12px'
                                            }}>
                                                {getEventIcon(event.event_type)}
                                            </div>
                                            <div style={{ marginBottom: '5px' }}>
                                                <span style={{ color: '#ff1493', fontWeight: 'bold' }}>
                                                    {formatDateTime(event.event_date)}
                                                </span>
                                            </div>
                                            <h4 style={{ color: '#fff', margin: '0 0 5px 0' }}>{event.event_title}</h4>
                                            <p style={{ color: '#888', margin: 0 }}>{event.event_description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div style={styles.actionButtonGroup}>
                    <ActionButton icon="💔" label="Add Mortality" onClick={() => onAction('mortality')} color="#f44336" />
                    <ActionButton icon="⚖️" label="Record Weight" onClick={() => onAction('weight')} color="#4CAF50" />
                    <ActionButton icon="💉" label="Health Record" onClick={() => onAction('health')} color="#2196F3" />
                    <ActionButton icon="🔄" label="Cross Foster" onClick={() => onAction('foster')} color="#ff9800" />
                    {litter.status === 'active' && (
                        <ActionButton icon="🍼" label="Mark Weaned" onClick={() => onAction('wean')} color="#9C27B0" />
                    )}
                    <ActionButton icon="📄" label="Export PDF" onClick={() => {}} color="#795548" />
                </div>
            </div>
        </div>
    );
};

const DetailBox = ({ label, value, color }) => (
    <div style={{
        backgroundColor: '#000',
        border: `1px solid ${color}`,
        borderRadius: '8px',
        padding: '10px',
        textAlign: 'center'
    }}>
        <div style={{ color: color, fontSize: '1.2em', fontWeight: 'bold' }}>{value}</div>
        <div style={{ color: '#888', fontSize: '0.8em' }}>{label}</div>
    </div>
);

const ActionButton = ({ icon, label, onClick, color }) => (
    <button
        onClick={onClick}
        style={{
            flex: 1,
            padding: '10px',
            backgroundColor: color,
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '14px'
        }}
    >
        <span>{icon}</span>
        {label}
    </button>
);

// Modal styles
const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(5px)'
};

const modalContentStyle = {
    backgroundColor: '#1a1a1a',
    border: '2px solid #ff1493',
    borderRadius: '20px',
    padding: '30px',
    width: '90%',
    maxWidth: '900px',
    maxHeight: '90vh',
    overflowY: 'auto'
};

const modalFormGroup = {
    marginBottom: '15px',
    flex: 1
};

const modalRow = {
    display: 'flex',
    gap: '15px',
    marginBottom: '15px'
};

const modalLabel = {
    color: '#ff1493',
    display: 'block',
    marginBottom: '5px',
    fontSize: '0.95em'
};

const modalInput = {
    width: '100%',
    padding: '10px',
    backgroundColor: '#000',
    border: '2px solid #ff1493',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '1em'
};

const modalButtonGroup = {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    marginTop: '20px'
};

const modalCancelButton = {
    padding: '10px 20px',
    backgroundColor: '#333',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    disabled: {
        opacity: 0.5,
        cursor: 'not-allowed'
    }
};

const modalSubmitButton = {
    padding: '10px 20px',
    backgroundColor: '#ff1493',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer'
};

const closeButtonStyle = {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '2em',
    cursor: 'pointer'
};

// Styles object
const styles = {
    container: {
        padding: '20px',
        margin: 0,
        backgroundColor: '#0a0a0a',
        minHeight: '100vh',
        color: '#fff',
        width: '100%',
        boxSizing: 'border-box'
    },
    loadingContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        marginLeft: '280px',
        backgroundColor: '#000'
    },
    loadingText: {
        color: '#ff1493',
        fontSize: '1.2em'
    },
    header: {
        background: '#000',
        border: '2px solid #ff1493',
        borderRadius: '20px',
        padding: '20px',
        marginBottom: '20px'
    },
    headerTop: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
    },
    title: {
        color: '#ff1493',
        margin: 0,
        fontSize: '2em'
    },
    addButton: {
        backgroundColor: '#ff1493',
        color: '#000',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '50px',
        fontSize: '1em',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.3s'
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '10px'
    },
    searchFilter: {
        display: 'flex',
        gap: '10px',
        marginBottom: '20px'
    },
    searchInput: {
        flex: 1,
        padding: '12px',
        backgroundColor: '#1a1a1a',
        border: '2px solid #ff1493',
        borderRadius: '50px',
        color: '#fff',
        fontSize: '1em'
    },
    filterSelect: {
        padding: '12px 20px',
        backgroundColor: '#1a1a1a',
        border: '2px solid #ff1493',
        borderRadius: '50px',
        color: '#fff',
        fontSize: '1em'
    },
    quickActions: {
        display: 'flex',
        gap: '10px',
        marginBottom: '30px',
        flexWrap: 'wrap'
    },
    littersGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
        gap: '20px'
    },
    tabContainer: {
        display: 'flex',
        gap: '10px',
        marginTop: '20px',
        borderBottom: '2px solid #ff1493',
        paddingBottom: '10px'
    },
    tab: {
        padding: '8px 16px',
        backgroundColor: 'transparent',
        color: '#888',
        border: 'none',
        borderRadius: '20px',
        cursor: 'pointer',
        fontSize: '0.95em'
    },
    activeTab: {
        padding: '8px 16px',
        backgroundColor: '#ff1493',
        color: '#000',
        border: 'none',
        borderRadius: '20px',
        cursor: 'pointer',
        fontSize: '0.95em',
        fontWeight: 'bold'
    },
    detailSection: {
        backgroundColor: '#000',
        borderRadius: '10px',
        padding: '15px',
        marginBottom: '15px'
    },
    detailSectionTitle: {
        color: '#ff1493',
        fontSize: '1.1em',
        marginBottom: '10px',
        borderBottom: '1px solid #333',
        paddingBottom: '5px'
    },
    detailGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '10px'
    },
    recordItem: {
        backgroundColor: '#1a1a1a',
        padding: '10px',
        borderRadius: '8px',
        marginBottom: '8px',
        border: '1px solid #333'
    },
    actionButtonGroup: {
        display: 'flex',
        gap: '10px',
        marginTop: '20px',
        flexWrap: 'wrap'
    }
};

export default Litters;