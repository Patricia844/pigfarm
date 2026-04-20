import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import API from '../services/api';

function Health() {
    const [activeTab, setActiveTab] = useState('overview');
    const [showHealthForm, setShowHealthForm] = useState(false);
    const [showVaccineForm, setShowVaccineForm] = useState(false);
    const [showQuarantineForm, setShowQuarantineForm] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterAnimal, setFilterAnimal] = useState('all');
    const [loading, setLoading] = useState(true);
    const [sows, setSows] = useState([]);

    // ── Real data state ──────────────────────────────────────────────────────
    const [healthRecords, setHealthRecords] = useState([]);
    const [upcomingVaccinations, setUpcomingVaccinations] = useState([]);
    const [vaccinationSchedule, setVaccinationSchedule] = useState([]);
    const [quarantine, setQuarantine] = useState([]);

    // ── Fetch functions ──────────────────────────────────────────────────────
    const fetchHealthRecords = useCallback(async () => {
        try {
            const res = await API.get('/health');
            setHealthRecords(res.data);
        } catch (err) {
            console.error('Health records error:', err);
        }
    }, []);

    const fetchUpcoming = useCallback(async () => {
        try {
            const res = await API.get('/health/upcoming');
            setUpcomingVaccinations(res.data);
        } catch (err) {
            console.error('Upcoming vaccinations error:', err);
        }
    }, []);

    const fetchSchedule = useCallback(async () => {
        try {
            const res = await API.get('/health/schedule');
            setVaccinationSchedule(res.data);
        } catch (err) {
            console.error('Schedule error:', err);
        }
    }, []);

    const fetchQuarantine = useCallback(async () => {
        try {
            const res = await API.get('/quarantine');
            setQuarantine(res.data);
        } catch (err) {
            console.error('Quarantine error:', err);
        }
    }, []);

    const fetchSows = useCallback(async () => {
        try {
            const res = await API.get('/sows');
            setSows(res.data);
        } catch (err) {
            console.error('Sows error:', err);
        }
    }, []);

    useEffect(() => {
        const loadAll = async () => {
            setLoading(true);
            await Promise.all([
                fetchHealthRecords(),
                fetchUpcoming(),
                fetchSchedule(),
                fetchQuarantine(),
                fetchSows(),
            ]);
            setLoading(false);
        };
        loadAll();
    }, [fetchHealthRecords, fetchUpcoming, fetchSchedule, fetchQuarantine, fetchSows]);

    // ── Derived stats from real data ─────────────────────────────────────────
    const recordsByType = healthRecords.reduce((acc, r) => {
        acc[r.record_type] = (acc[r.record_type] || 0) + 1;
        return acc;
    }, {});

    const overdueVaccinations = upcomingVaccinations.filter(v =>
        v.next_due_date && new Date(v.next_due_date) < new Date()
    );

    const healthStatusData = [
        { name: 'Vaccinations', value: recordsByType['vaccination'] || 0 },
        { name: 'Treatments', value: recordsByType['treatment'] || 0 },
        { name: 'Checkups', value: recordsByType['checkup'] || 0 },
        { name: 'Other', value: recordsByType['other'] || 0 },
    ].filter(d => d.value > 0);

    const PIE_COLORS = ['#4CAF50', '#ff9800', '#2196F3', '#888'];

    const filteredRecords = healthRecords.filter(r => {
        if (filterStatus !== 'all' && r.record_type !== filterStatus) return false;
        if (filterAnimal !== 'all' && r.animal_type !== filterAnimal) return false;
        return true;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'vaccination': return '#4CAF50';
            case 'treatment': return '#ff9800';
            case 'checkup': return '#2196F3';
            case 'active': return '#ff9800';
            case 'released': return '#4CAF50';
            default: return '#888';
        }
    };

    if (loading) return (
        <div style={{ color: '#ff1493', textAlign: 'center', padding: '60px', fontSize: '1.2em' }}>
            Loading health data...
        </div>
    );

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerTop}>
                    <h1 style={styles.title}>💉 Health Management</h1>
                    <div style={styles.headerButtons}>
                        <button onClick={() => setShowHealthForm(true)} style={styles.primaryButton}>
                            + Record Health
                        </button>
                        <button onClick={() => setShowVaccineForm(true)} style={styles.vaccineButton}>
                            💉 Record Vaccination
                        </button>
                    </div>
                </div>

                {/* Alert Banners — real data */}
                <div style={styles.alertsRow}>
                    {upcomingVaccinations.length > 0 && (
                        <div style={{ ...styles.alertBanner, backgroundColor: '#ff9800' }}>
                            <span style={{ fontSize: '1.2em', marginRight: '10px' }}>⚠️</span>
                            {upcomingVaccinations.length} vaccination{upcomingVaccinations.length !== 1 ? 's' : ''} due within 7 days
                        </div>
                    )}
                    {overdueVaccinations.length > 0 && (
                        <div style={{ ...styles.alertBanner, backgroundColor: '#f44336' }}>
                            <span style={{ fontSize: '1.2em', marginRight: '10px' }}>🔴</span>
                            {overdueVaccinations.length} vaccination{overdueVaccinations.length !== 1 ? 's' : ''} OVERDUE!
                        </div>
                    )}
                    {quarantine.length > 0 && (
                        <div style={{ ...styles.alertBanner, backgroundColor: '#2196F3' }}>
                            <span style={{ fontSize: '1.2em', marginRight: '10px' }}>🚫</span>
                            {quarantine.length} animal{quarantine.length !== 1 ? 's' : ''} in quarantine
                        </div>
                    )}
                    {upcomingVaccinations.length === 0 && overdueVaccinations.length === 0 && quarantine.length === 0 && (
                        <div style={{ ...styles.alertBanner, backgroundColor: '#4CAF50' }}>
                            <span style={{ fontSize: '1.2em', marginRight: '10px' }}>✅</span>
                            All clear — no urgent health alerts
                        </div>
                    )}
                </div>

                {/* Stats Cards */}
                <div style={styles.statsGrid}>
                    <StatCard icon="📋" value={healthRecords.length} label="Total Records" color="#ff1493" />
                    <StatCard icon="💉" value={recordsByType['vaccination'] || 0} label="Vaccinations" color="#4CAF50" />
                    <StatCard icon="💊" value={recordsByType['treatment'] || 0} label="Treatments" color="#ff9800" />
                    <StatCard icon="🩺" value={recordsByType['checkup'] || 0} label="Checkups" color="#2196F3" />
                    <StatCard icon="⚠️" value={upcomingVaccinations.length} label="Due This Week" color="#ff9800" />
                    <StatCard icon="🔴" value={overdueVaccinations.length} label="Overdue" color="#f44336" />
                    <StatCard icon="🚫" value={quarantine.length} label="In Quarantine" color="#888" />
                    <StatCard icon="📅" value={vaccinationSchedule.length} label="Schedule Items" color="#9C27B0" />
                </div>
            </div>

            {/* Tabs */}
            <div style={styles.tabContainer}>
                {[
                    ['overview', '📊 Overview'],
                    ['records', '📋 Health Records'],
                    ['vaccinations', '💉 Vaccinations'],
                    ['quarantine', '🚫 Quarantine'],
                    ['schedule', '📅 Schedule'],
                ].map(([tab, label]) => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        style={activeTab === tab ? styles.activeTab : styles.tab}>
                        {label}
                    </button>
                ))}
            </div>

            {/* Filter bar for records tab */}
            {activeTab === 'records' && (
                <div style={styles.filterBar}>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={styles.filterSelect}>
                        <option value="all">All Types</option>
                        <option value="vaccination">Vaccination</option>
                        <option value="treatment">Treatment</option>
                        <option value="checkup">Checkup</option>
                    </select>
                    <select value={filterAnimal} onChange={(e) => setFilterAnimal(e.target.value)}
                        style={{ ...styles.filterSelect, marginLeft: '10px' }}>
                        <option value="all">All Animals</option>
                        <option value="sow">Sows</option>
                        <option value="piglet">Piglets</option>
                        <option value="litter">Litters</option>
                    </select>
                </div>
            )}

            {/* Tab Content */}
            <div style={styles.tabContent}>

                {/* OVERVIEW */}
                {activeTab === 'overview' && (
                    <div>
                        <div style={styles.chartCard}>
                            <h3 style={styles.chartTitle}>Health Records by Type</h3>
                            {healthStatusData.length === 0 ? (
                                <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>
                                    No health records yet. Start by recording a vaccination or checkup.
                                </div>
                            ) : (
                                <div style={{ height: '300px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={healthStatusData} cx="50%" cy="50%" outerRadius={100}
                                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                labelLine={false} dataKey="value">
                                                {healthStatusData.map((_, i) => (
                                                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '2px solid #ff1493' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        {/* Upcoming vaccinations quick view */}
                        {upcomingVaccinations.length > 0 && (
                            <div style={styles.chartCard}>
                                <h3 style={styles.chartTitle}>⚠️ Upcoming Vaccinations (Next 7 Days)</h3>
                                <div style={styles.tableContainer}>
                                    <table style={styles.table}>
                                        <thead>
                                            <tr>
                                                {['Animal', 'Type', 'Medication', 'Due Date', 'Days Left'].map(h => (
                                                    <th key={h} style={thStyle}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {upcomingVaccinations.map(v => {
                                                const daysLeft = Math.ceil((new Date(v.next_due_date) - new Date()) / (1000 * 60 * 60 * 24));
                                                return (
                                                    <tr key={v.id}>
                                                        <td style={tdStyle}>{v.animal_tag || v.animal_id}</td>
                                                        <td style={tdStyle}>{v.animal_type}</td>
                                                        <td style={tdStyle}>{v.medication || v.record_type}</td>
                                                        <td style={tdStyle}>{v.next_due_date?.split('T')[0]}</td>
                                                        <td style={tdStyle}>
                                                            <span style={{ ...styles.statusBadge, backgroundColor: daysLeft <= 2 ? '#f44336' : '#ff9800' }}>
                                                                {daysLeft <= 0 ? 'OVERDUE' : `${daysLeft} days`}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* HEALTH RECORDS */}
                {activeTab === 'records' && (
                    <div>
                        <div style={styles.sectionHeader}>
                            <h2 style={styles.sectionTitle}>Health Records ({filteredRecords.length})</h2>
                            <button onClick={() => setShowHealthForm(true)} style={styles.smallButton}>+ Add Record</button>
                        </div>
                        {filteredRecords.length === 0 ? (
                            <div style={{ color: '#888', textAlign: 'center', padding: '60px', border: '2px dashed #333', borderRadius: '10px' }}>
                                No health records found. Click "+ Add Record" to get started.
                            </div>
                        ) : (
                            <div style={styles.tableContainer}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            {['Animal ID', 'Type', 'Record Type', 'Medication', 'Date', 'Next Due', 'Administered By', 'Notes'].map(h => (
                                                <th key={h} style={thStyle}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRecords.map(record => (
                                            <tr key={record.id}>
                                                <td style={tdStyle}><strong>{record.animal_tag || record.animal_id}</strong></td>
                                                <td style={tdStyle}>{record.animal_type}</td>
                                                <td style={tdStyle}>
                                                    <span style={{ ...styles.statusBadge, backgroundColor: getStatusColor(record.record_type) }}>
                                                        {record.record_type}
                                                    </span>
                                                </td>
                                                <td style={tdStyle}>{record.medication || record.diagnosis || '-'}</td>
                                                <td style={tdStyle}>{record.date_administered?.split('T')[0]}</td>
                                                <td style={tdStyle}>
                                                    {record.next_due_date ? (
                                                        <span style={{ color: new Date(record.next_due_date) < new Date() ? '#f44336' : '#ff9800' }}>
                                                            {record.next_due_date.split('T')[0]}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td style={tdStyle}>{record.administered_by || '-'}</td>
                                                <td style={tdStyle}>{record.notes || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* VACCINATIONS */}
                {activeTab === 'vaccinations' && (
                    <div>
                        <div style={styles.sectionHeader}>
                            <h2 style={styles.sectionTitle}>Vaccination Records</h2>
                            <button onClick={() => setShowVaccineForm(true)} style={styles.smallButton}>+ Record Vaccination</button>
                        </div>

                        {/* Overdue alert */}
                        {overdueVaccinations.length > 0 && (
                            <div style={{ ...styles.alertBanner, backgroundColor: '#f44336', marginBottom: '15px' }}>
                                🔴 {overdueVaccinations.length} vaccination{overdueVaccinations.length !== 1 ? 's' : ''} OVERDUE — action needed!
                            </div>
                        )}

                        {/* Vaccination records from DB */}
                        {healthRecords.filter(r => r.record_type === 'vaccination').length === 0 ? (
                            <div style={{ color: '#888', textAlign: 'center', padding: '60px', border: '2px dashed #333', borderRadius: '10px' }}>
                                No vaccinations recorded yet. Click "+ Record Vaccination" to add one.
                            </div>
                        ) : (
                            <div style={styles.tableContainer}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            {['Animal', 'Animal Type', 'Vaccine/Medication', 'Date Given', 'Next Due', 'Administered By', 'Notes'].map(h => (
                                                <th key={h} style={thStyle}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {healthRecords.filter(r => r.record_type === 'vaccination').map(v => (
                                            <tr key={v.id}>
                                                <td style={tdStyle}>{v.animal_tag || v.animal_id}</td>
                                                <td style={tdStyle}>{v.animal_type}</td>
                                                <td style={tdStyle}>{v.medication || '-'}</td>
                                                <td style={tdStyle}>{v.date_administered?.split('T')[0]}</td>
                                                <td style={tdStyle}>
                                                    {v.next_due_date ? (
                                                        <span style={{ color: new Date(v.next_due_date) < new Date() ? '#f44336' : '#4CAF50' }}>
                                                            {v.next_due_date.split('T')[0]}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td style={tdStyle}>{v.administered_by || '-'}</td>
                                                <td style={tdStyle}>{v.notes || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Standard schedule reference */}
                        {vaccinationSchedule.length > 0 && (
                            <div style={{ marginTop: '20px' }}>
                                <h3 style={styles.chartTitle}>📅 Standard Vaccination Schedule (Reference)</h3>
                                <div style={styles.tableContainer}>
                                    <table style={styles.table}>
                                        <thead>
                                            <tr>
                                                {['Animal Type', 'Age (days)', 'Vaccine', 'Frequency'].map(h => (
                                                    <th key={h} style={thStyle}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {vaccinationSchedule.map(s => (
                                                <tr key={s.id}>
                                                    <td style={tdStyle}>{s.animal_type}</td>
                                                    <td style={tdStyle}>{s.age_days ?? '-'}</td>
                                                    <td style={tdStyle}>{s.vaccine_name}</td>
                                                    <td style={tdStyle}>{s.frequency || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* QUARANTINE */}
                {activeTab === 'quarantine' && (
                    <div>
                        <div style={styles.sectionHeader}>
                            <h2 style={styles.sectionTitle}>🚫 Quarantine Management</h2>
                            <button onClick={() => setShowQuarantineForm(true)} style={styles.smallButton}>+ Add to Quarantine</button>
                        </div>
                        {quarantine.length === 0 ? (
                            <div style={{ color: '#888', textAlign: 'center', padding: '60px', border: '2px dashed #333', borderRadius: '10px' }}>
                                ✅ No animals currently in quarantine.
                            </div>
                        ) : (
                            <div style={styles.tableContainer}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            {['Animal ID', 'Type', 'Reason', 'Start Date', 'Location', 'Days in Q', 'Status', 'Action'].map(h => (
                                                <th key={h} style={thStyle}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {quarantine.map(item => {
                                            const daysInQ = Math.floor((new Date() - new Date(item.start_date)) / (1000 * 60 * 60 * 24));
                                            return (
                                                <tr key={item.id}>
                                                    <td style={tdStyle}><strong>{item.animal_id}</strong></td>
                                                    <td style={tdStyle}>{item.animal_type}</td>
                                                    <td style={tdStyle}>{item.reason}</td>
                                                    <td style={tdStyle}>{item.start_date?.split('T')[0]}</td>
                                                    <td style={tdStyle}>{item.location || '-'}</td>
                                                    <td style={tdStyle}>{daysInQ} days</td>
                                                    <td style={tdStyle}>
                                                        <span style={{ ...styles.statusBadge, backgroundColor: '#ff9800' }}>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <button
                                                            style={styles.actionButton}
                                                            onClick={() => handleRelease(item.id)}
                                                        >
                                                            Release
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* SCHEDULE */}
                {activeTab === 'schedule' && (
                    <div>
                        <h2 style={styles.sectionTitle}>📅 Upcoming Health Schedule</h2>
                        {upcomingVaccinations.length === 0 ? (
                            <div style={{ color: '#888', textAlign: 'center', padding: '60px', border: '2px dashed #333', borderRadius: '10px' }}>
                                ✅ No upcoming vaccinations in the next 7 days.
                            </div>
                        ) : (
                            <div style={styles.tableContainer}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            {['Due Date', 'Animal', 'Type', 'Medication', 'Days Left'].map(h => (
                                                <th key={h} style={thStyle}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {upcomingVaccinations.map(v => {
                                            const daysLeft = Math.ceil((new Date(v.next_due_date) - new Date()) / (1000 * 60 * 60 * 24));
                                            return (
                                                <tr key={v.id}>
                                                    <td style={tdStyle}>{v.next_due_date?.split('T')[0]}</td>
                                                    <td style={tdStyle}>{v.animal_tag || v.animal_id}</td>
                                                    <td style={tdStyle}>{v.animal_type}</td>
                                                    <td style={tdStyle}>{v.medication || '-'}</td>
                                                    <td style={tdStyle}>
                                                        <span style={{ ...styles.statusBadge, backgroundColor: daysLeft <= 2 ? '#f44336' : '#ff9800' }}>
                                                            {daysLeft <= 0 ? 'OVERDUE' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''}`}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modals */}
            {showHealthForm && (
                <AddHealthModal
                    sows={sows}
                    onClose={() => setShowHealthForm(false)}
                    onSuccess={() => { fetchHealthRecords(); fetchUpcoming(); }}
                />
            )}
            {showVaccineForm && (
                <AddVaccinationModal
                    sows={sows}
                    onClose={() => setShowVaccineForm(false)}
                    onSuccess={() => { fetchHealthRecords(); fetchUpcoming(); }}
                />
            )}
            {showQuarantineForm && (
                <AddQuarantineModal
                    sows={sows}
                    onClose={() => setShowQuarantineForm(false)}
                    onSuccess={fetchQuarantine}
                />
            )}
        </div>
    );

    async function handleRelease(id) {
        try {
            await API.put(`/quarantine/${id}/release`, {
                end_date: new Date().toISOString().split('T')[0]
            });
            toast.success('Animal released from quarantine');
            fetchQuarantine();
        } catch (err) {
            toast.error('Failed to release animal');
        }
    }
}

// ── Helper Components ────────────────────────────────────────────────────────

const StatCard = ({ icon, value, label, color }) => (
    <div style={{ backgroundColor: '#1a1a1a', border: `2px solid ${color}`, borderRadius: '10px', padding: '15px', textAlign: 'center' }}>
        <div style={{ fontSize: '2em', marginBottom: '5px' }}>{icon}</div>
        <div style={{ color, fontSize: '1.5em', fontWeight: 'bold' }}>{value}</div>
        <div style={{ color: '#fff', fontSize: '0.9em' }}>{label}</div>
    </div>
);

// ── Modals ───────────────────────────────────────────────────────────────────

const AddHealthModal = ({ sows, onClose, onSuccess }) => {
    const [form, setForm] = useState({
        animal_id: '',
        animal_type: 'sow',
        record_type: 'checkup',
        date_administered: new Date().toISOString().split('T')[0],
        next_due_date: '',
        diagnosis: '',
        medication: '',
        dosage: '',
        administered_by: '',
        cost: '',
        notes: '',
    });
    const [saving, setSaving] = useState(false);
    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await API.post('/health', form);
            toast.success('Health record added!');
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save record');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <h2 style={{ color: '#ff1493', marginBottom: '20px' }}>🩺 Add Health Record</h2>
                <form onSubmit={handleSubmit}>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Animal Type *</label>
                            <select name="animal_type" value={form.animal_type} onChange={handleChange} style={modalInput}>
                                <option value="sow">Sow</option>
                                <option value="piglet">Piglet</option>
                                <option value="litter">Litter</option>
                            </select>
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Animal ID *</label>
                            {form.animal_type === 'sow' ? (
                                <select name="animal_id" value={form.animal_id} onChange={handleChange} style={modalInput} required>
                                    <option value="">Select sow</option>
                                    {sows.map(s => <option key={s.id} value={s.id}>{s.tag_number} - {s.name}</option>)}
                                </select>
                            ) : (
                                <input name="animal_id" value={form.animal_id} onChange={handleChange} style={modalInput} placeholder="Animal ID" required />
                            )}
                        </div>
                    </div>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Record Type *</label>
                            <select name="record_type" value={form.record_type} onChange={handleChange} style={modalInput}>
                                <option value="checkup">Checkup</option>
                                <option value="treatment">Treatment</option>
                                <option value="vaccination">Vaccination</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Date *</label>
                            <input type="date" name="date_administered" value={form.date_administered} onChange={handleChange} style={modalInput} required />
                        </div>
                    </div>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Diagnosis / Condition</label>
                            <input name="diagnosis" value={form.diagnosis} onChange={handleChange} style={modalInput} placeholder="e.g. Scours, Respiratory" />
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Medication</label>
                            <input name="medication" value={form.medication} onChange={handleChange} style={modalInput} placeholder="Drug name" />
                        </div>
                    </div>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Dosage</label>
                            <input name="dosage" value={form.dosage} onChange={handleChange} style={modalInput} placeholder="e.g. 2ml/10kg" />
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Next Due Date</label>
                            <input type="date" name="next_due_date" value={form.next_due_date} onChange={handleChange} style={modalInput} />
                        </div>
                    </div>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Administered By</label>
                            <input name="administered_by" value={form.administered_by} onChange={handleChange} style={modalInput} placeholder="Vet or staff name" />
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Cost ($)</label>
                            <input type="number" step="0.01" name="cost" value={form.cost} onChange={handleChange} style={modalInput} placeholder="Optional" />
                        </div>
                    </div>
                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Notes</label>
                        <textarea name="notes" value={form.notes} onChange={handleChange} style={{ ...modalInput, minHeight: '80px' }} placeholder="Additional details..." />
                    </div>
                    <div style={modalButtonGroup}>
                        <button type="button" onClick={onClose} style={modalCancelButton}>Cancel</button>
                        <button type="submit" disabled={saving} style={{ ...modalSubmitButton, opacity: saving ? 0.7 : 1 }}>
                            {saving ? 'Saving...' : 'Save Record'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AddVaccinationModal = ({ sows, onClose, onSuccess }) => {
    const [form, setForm] = useState({
        animal_id: '',
        animal_type: 'sow',
        record_type: 'vaccination',
        date_administered: new Date().toISOString().split('T')[0],
        next_due_date: '',
        medication: '',
        dosage: '',
        administered_by: '',
        cost: '',
        notes: '',
    });
    const [saving, setSaving] = useState(false);
    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await API.post('/health', form);
            toast.success('Vaccination recorded!');
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save vaccination');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <h2 style={{ color: '#4CAF50', marginBottom: '20px' }}>💉 Record Vaccination</h2>
                <form onSubmit={handleSubmit}>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Animal Type *</label>
                            <select name="animal_type" value={form.animal_type} onChange={handleChange} style={modalInput}>
                                <option value="sow">Sow</option>
                                <option value="piglet">Piglet</option>
                                <option value="litter">Litter</option>
                            </select>
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Animal *</label>
                            {form.animal_type === 'sow' ? (
                                <select name="animal_id" value={form.animal_id} onChange={handleChange} style={modalInput} required>
                                    <option value="">Select sow</option>
                                    {sows.map(s => <option key={s.id} value={s.id}>{s.tag_number} - {s.name}</option>)}
                                </select>
                            ) : (
                                <input name="animal_id" value={form.animal_id} onChange={handleChange} style={modalInput} placeholder="Animal ID" required />
                            )}
                        </div>
                    </div>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Vaccine Name *</label>
                            <input name="medication" value={form.medication} onChange={handleChange} style={modalInput} placeholder="e.g. Parvovirus, E. coli" required />
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Dosage</label>
                            <input name="dosage" value={form.dosage} onChange={handleChange} style={modalInput} placeholder="e.g. 2ml" />
                        </div>
                    </div>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Date Given *</label>
                            <input type="date" name="date_administered" value={form.date_administered} onChange={handleChange} style={modalInput} required />
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Next Due Date</label>
                            <input type="date" name="next_due_date" value={form.next_due_date} onChange={handleChange} style={modalInput} />
                        </div>
                    </div>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Administered By</label>
                            <input name="administered_by" value={form.administered_by} onChange={handleChange} style={modalInput} placeholder="Vet or staff name" />
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Cost ($)</label>
                            <input type="number" step="0.01" name="cost" value={form.cost} onChange={handleChange} style={modalInput} />
                        </div>
                    </div>
                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Notes</label>
                        <textarea name="notes" value={form.notes} onChange={handleChange} style={{ ...modalInput, minHeight: '60px' }} placeholder="e.g. booster required in 6 months" />
                    </div>
                    <div style={modalButtonGroup}>
                        <button type="button" onClick={onClose} style={modalCancelButton}>Cancel</button>
                        <button type="submit" disabled={saving} style={{ ...modalSubmitButton, backgroundColor: '#4CAF50', opacity: saving ? 0.7 : 1 }}>
                            {saving ? 'Saving...' : 'Record Vaccination'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AddQuarantineModal = ({ sows, onClose, onSuccess }) => {
    const [form, setForm] = useState({
        animal_id: '',
        animal_type: 'sow',
        reason: '',
        start_date: new Date().toISOString().split('T')[0],
        location: '',
        notes: '',
    });
    const [saving, setSaving] = useState(false);
    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await API.post('/quarantine', form);
            toast.success('Animal added to quarantine');
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to add to quarantine');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <h2 style={{ color: '#ff9800', marginBottom: '20px' }}>🚫 Add to Quarantine</h2>
                <form onSubmit={handleSubmit}>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Animal Type *</label>
                            <select name="animal_type" value={form.animal_type} onChange={handleChange} style={modalInput}>
                                <option value="sow">Sow</option>
                                <option value="piglet">Piglet</option>
                                <option value="grower">Grower</option>
                            </select>
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Animal *</label>
                            {form.animal_type === 'sow' ? (
                                <select name="animal_id" value={form.animal_id} onChange={handleChange} style={modalInput} required>
                                    <option value="">Select sow</option>
                                    {sows.map(s => <option key={s.id} value={s.id}>{s.tag_number} - {s.name}</option>)}
                                </select>
                            ) : (
                                <input name="animal_id" value={form.animal_id} onChange={handleChange} style={modalInput} placeholder="Animal ID" required />
                            )}
                        </div>
                    </div>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Reason *</label>
                            <input name="reason" value={form.reason} onChange={handleChange} style={modalInput} placeholder="e.g. Respiratory symptoms" required />
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Start Date *</label>
                            <input type="date" name="start_date" value={form.start_date} onChange={handleChange} style={modalInput} required />
                        </div>
                    </div>
                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Location</label>
                        <input name="location" value={form.location} onChange={handleChange} style={modalInput} placeholder="e.g. Quarantine Pen 1" />
                    </div>
                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Notes</label>
                        <textarea name="notes" value={form.notes} onChange={handleChange} style={{ ...modalInput, minHeight: '80px' }} placeholder="Observations..." />
                    </div>
                    <div style={modalButtonGroup}>
                        <button type="button" onClick={onClose} style={modalCancelButton}>Cancel</button>
                        <button type="submit" disabled={saving} style={{ ...modalSubmitButton, backgroundColor: '#ff9800', opacity: saving ? 0.7 : 1 }}>
                            {saving ? 'Saving...' : 'Add to Quarantine'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ── Shared table cell styles ──────────────────────────────────────────────────
const thStyle = { textAlign: 'left', padding: '12px', color: '#ff1493', borderBottom: '2px solid #ff1493' };
const tdStyle = { padding: '10px', borderBottom: '1px solid #333' };

// ── Modal styles ─────────────────────────────────────────────────────────────
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalContentStyle = { backgroundColor: '#1a1a1a', border: '2px solid #ff1493', borderRadius: '20px', padding: '30px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' };
const modalFormGroup = { marginBottom: '15px', flex: 1 };
const modalRow = { display: 'flex', gap: '15px', marginBottom: '15px' };
const modalLabel = { color: '#ff1493', display: 'block', marginBottom: '5px', fontSize: '0.95em' };
const modalInput = { width: '100%', padding: '10px', backgroundColor: '#000', border: '2px solid #ff1493', borderRadius: '8px', color: '#fff', fontSize: '1em', boxSizing: 'border-box' };
const modalButtonGroup = { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' };
const modalCancelButton = { padding: '10px 20px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const modalSubmitButton = { padding: '10px 20px', backgroundColor: '#ff1493', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };

// ── Page styles ───────────────────────────────────────────────────────────────
const styles = {
    container: { padding: '20px', backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff', width: '100%', boxSizing: 'border-box' },
    header: { background: '#000', border: '2px solid #ff1493', borderRadius: '20px', padding: '20px', marginBottom: '20px' },
    headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    title: { color: '#ff1493', margin: 0, fontSize: '2em' },
    headerButtons: { display: 'flex', gap: '10px' },
    primaryButton: { backgroundColor: '#ff1493', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '50px', fontSize: '1em', fontWeight: 'bold', cursor: 'pointer' },
    vaccineButton: { backgroundColor: '#2196F3', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '50px', fontSize: '1em', fontWeight: 'bold', cursor: 'pointer' },
    alertsRow: { display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' },
    alertBanner: { padding: '10px 15px', borderRadius: '10px', color: '#000', fontWeight: 'bold', flex: 1, minWidth: '200px' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' },
    tabContainer: { display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ff1493', paddingBottom: '10px', flexWrap: 'wrap' },
    tab: { padding: '8px 16px', backgroundColor: 'transparent', color: '#888', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '0.95em' },
    activeTab: { padding: '8px 16px', backgroundColor: '#ff1493', color: '#000', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '0.95em', fontWeight: 'bold' },
    filterBar: { marginBottom: '20px', display: 'flex' },
    filterSelect: { padding: '10px 20px', backgroundColor: '#1a1a1a', border: '2px solid #ff1493', borderRadius: '50px', color: '#fff', fontSize: '1em', minWidth: '150px' },
    tabContent: { minHeight: '500px' },
    chartCard: { backgroundColor: '#1a1a1a', border: '2px solid #ff1493', borderRadius: '15px', padding: '20px', marginBottom: '20px' },
    chartTitle: { color: '#ff1493', marginBottom: '15px', fontSize: '1.2em' },
    sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
    sectionTitle: { color: '#ff1493', margin: 0, fontSize: '1.3em' },
    smallButton: { padding: '8px 16px', backgroundColor: '#ff1493', color: '#000', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' },
    tableContainer: { overflowX: 'auto', backgroundColor: '#1a1a1a', borderRadius: '10px', padding: '10px', marginBottom: '20px' },
    table: { width: '100%', borderCollapse: 'collapse' },
    statusBadge: { padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', color: '#000', display: 'inline-block' },
    actionButton: { padding: '4px 8px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' },
};

export default Health;