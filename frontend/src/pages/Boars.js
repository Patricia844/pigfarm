import React, { useState, useEffect, useCallback } from 'react';
import API from '../services/api';
import toast from 'react-hot-toast';

const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-ZA');
};

function Boars() {
    const [boars, setBoars] = useState([]);
    const [breeds, setBreeds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedBoar, setSelectedBoar] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const [newBoar, setNewBoar] = useState({
        tag_number: '',
        name: '',
        breed_id: '',
        birth_date: '',
        purchase_date: '',
        purchase_price: '',
        notes: '',
    });

    // ── Fetch functions ──────────────────────────────────────────────────────
    const fetchBoars = useCallback(async () => {
        try {
            const res = await API.get('/boars');
            setBoars(res.data);
        } catch (err) {
            console.error('Boars error:', err);
            toast.error('Failed to load boars');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchBreeds = useCallback(async () => {
        try {
            const res = await API.get('/breeds');
            setBreeds(res.data);
        } catch (err) {
            console.error('Breeds error:', err);
        }
    }, []);

    useEffect(() => {
        fetchBoars();
        fetchBreeds();
    }, [fetchBoars, fetchBreeds]);

    // ── Derived stats ────────────────────────────────────────────────────────
    const stats = {
        total: boars.length,
        active: boars.filter(b => b.status === 'active').length,
        resting: boars.filter(b => b.status === 'resting').length,
        sold: boars.filter(b => b.status === 'sold').length,
    };

    const filteredBoars = boars.filter(b => {
        const matchesFilter = filter === 'all' || b.status === filter;
        const matchesSearch = !searchTerm ||
            b.tag_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.breed_name?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleAddBoar = async (e) => {
        e.preventDefault();
        if (!newBoar.tag_number) { toast.error('Tag number is required'); return; }
        try {
            await API.post('/boars', newBoar);
            toast.success('Boar added successfully!');
            setShowAddForm(false);
            setNewBoar({ tag_number: '', name: '', breed_id: '', birth_date: '', purchase_date: '', purchase_price: '', notes: '' });
            fetchBoars();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to add boar');
        }
    };

    const handleStatusChange = async (id, status) => {
        try {
            await API.put(`/boars/${id}/status`, { status });
            toast.success('Status updated');
            fetchBoars();
            if (selectedBoar?.id === id) setSelectedBoar(prev => ({ ...prev, status }));
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return '#4CAF50';
            case 'resting': return '#2196F3';
            case 'sold': return '#ff9800';
            case 'deceased': return '#888';
            default: return '#888';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'active': return '✅';
            case 'resting': return '😴';
            case 'sold': return '💰';
            case 'deceased': return '💀';
            default: return '❓';
        }
    };

    const calculateAge = (birthDate) => {
        if (!birthDate) return 'Unknown';
        const birth = new Date(birthDate);
        const now = new Date();
        const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
        if (months < 12) return `${months} months`;
        return `${Math.floor(months / 12)} yr ${months % 12} mo`;
    };

    if (loading) return (
        <div style={{ color: '#ff1493', textAlign: 'center', padding: '60px', fontSize: '1.2em' }}>
            Loading boars...
        </div>
    );

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerTop}>
                    <h1 style={styles.title}>🐗 Boar Management</h1>
                    <button onClick={() => setShowAddForm(true)} style={styles.addButton}>
                        + Add Boar
                    </button>
                </div>

                {/* Stats */}
                <div style={styles.statsGrid}>
                    <StatCard icon="🐗" value={stats.total} label="Total Boars" color="#ff1493" />
                    <StatCard icon="✅" value={stats.active} label="Active" color="#4CAF50" />
                    <StatCard icon="😴" value={stats.resting} label="Resting" color="#2196F3" />
                    <StatCard icon="💰" value={stats.sold} label="Sold" color="#ff9800" />
                </div>
            </div>

            {/* Filters */}
            <div style={styles.filterBar}>
                <input
                    type="text"
                    placeholder="🔍 Search by tag, name or breed..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                />
                <div style={styles.filterButtons}>
                    {['all', 'active', 'resting', 'sold', 'deceased'].map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            style={{ ...styles.filterBtn, backgroundColor: filter === f ? '#ff1493' : 'transparent',
                                color: filter === f ? '#000' : '#888' }}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Boar Cards */}
            {filteredBoars.length === 0 ? (
                <div style={styles.emptyState}>
                    <div style={{ fontSize: '4em', marginBottom: '20px' }}>🐗</div>
                    <h3>No boars found</h3>
                    <p style={{ color: '#888' }}>
                        {boars.length === 0
                            ? 'Add your first boar to get started'
                            : 'No boars match your current filter'}
                    </p>
                    {boars.length === 0 && (
                        <button onClick={() => setShowAddForm(true)} style={styles.addButton}>
                            + Add First Boar
                        </button>
                    )}
                </div>
            ) : (
                <div style={styles.boarGrid}>
                    {filteredBoars.map(boar => (
                        <div key={boar.id} style={styles.boarCard}>
                            {/* Card Header */}
                            <div style={styles.cardHeader}>
                                <div>
                                    <div style={styles.tagNumber}>{boar.tag_number}</div>
                                    <div style={styles.boarName}>{boar.name || '—'}</div>
                                </div>
                                <span style={{ ...styles.statusBadge, backgroundColor: getStatusColor(boar.status) }}>
                                    {getStatusIcon(boar.status)} {boar.status?.toUpperCase()}
                                </span>
                            </div>

                            {/* Card Body */}
                            <div style={styles.cardBody}>
                                <InfoRow icon="🧬" label="Breed" value={boar.breed_name || 'Unknown'} />
                                <InfoRow icon="🎂" label="Age" value={calculateAge(boar.birth_date)} />
                                <InfoRow icon="📅" label="Purchased" value={formatDate(boar.purchase_date)} />
                                <InfoRow icon="💵" label="Purchase Price" value={boar.purchase_price ? formatCurrency(boar.purchase_price) : 'N/A'} />
                            </div>

                            {/* Notes */}
                            {boar.notes && (
                                <div style={styles.notes}>
                                    📝 {boar.notes}
                                </div>
                            )}

                            {/* Card Actions */}
                            <div style={styles.cardActions}>
                                <button
                                    onClick={() => { setSelectedBoar(boar); setShowDetails(true); }}
                                    style={styles.viewButton}
                                >
                                    View Details
                                </button>
                                <select
                                    value={boar.status}
                                    onChange={(e) => handleStatusChange(boar.id, e.target.value)}
                                    style={styles.statusSelect}
                                >
                                    <option value="active">Active</option>
                                    <option value="resting">Resting</option>
                                    <option value="sold">Sold</option>
                                    <option value="deceased">Deceased</option>
                                </select>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Boar Modal */}
            {showAddForm && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h2 style={{ color: '#ff1493', marginBottom: '20px' }}>🐗 Add New Boar</h2>
                        <form onSubmit={handleAddBoar}>
                            <div style={modalRow}>
                                <div style={modalFormGroup}>
                                    <label style={modalLabel}>Tag Number *</label>
                                    <input
                                        value={newBoar.tag_number}
                                        onChange={(e) => setNewBoar({ ...newBoar, tag_number: e.target.value })}
                                        style={modalInput} placeholder="e.g. B001" required
                                    />
                                </div>
                                <div style={modalFormGroup}>
                                    <label style={modalLabel}>Name</label>
                                    <input
                                        value={newBoar.name}
                                        onChange={(e) => setNewBoar({ ...newBoar, name: e.target.value })}
                                        style={modalInput} placeholder="e.g. Thor"
                                    />
                                </div>
                            </div>
                            <div style={modalRow}>
                                <div style={modalFormGroup}>
                                    <label style={modalLabel}>Breed</label>
                                    <select
                                        value={newBoar.breed_id}
                                        onChange={(e) => setNewBoar({ ...newBoar, breed_id: e.target.value })}
                                        style={modalInput}
                                    >
                                        <option value="">Select breed</option>
                                        {breeds.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={modalFormGroup}>
                                    <label style={modalLabel}>Birth Date</label>
                                    <input
                                        type="date"
                                        value={newBoar.birth_date}
                                        onChange={(e) => setNewBoar({ ...newBoar, birth_date: e.target.value })}
                                        style={modalInput}
                                    />
                                </div>
                            </div>
                            <div style={modalRow}>
                                <div style={modalFormGroup}>
                                    <label style={modalLabel}>Purchase Date</label>
                                    <input
                                        type="date"
                                        value={newBoar.purchase_date}
                                        onChange={(e) => setNewBoar({ ...newBoar, purchase_date: e.target.value })}
                                        style={modalInput}
                                    />
                                </div>
                                <div style={modalFormGroup}>
                                    <label style={modalLabel}>Purchase Price ($)</label>
                                    <input
                                        type="number" step="0.01"
                                        value={newBoar.purchase_price}
                                        onChange={(e) => setNewBoar({ ...newBoar, purchase_price: e.target.value })}
                                        style={modalInput} placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div style={modalFormGroup}>
                                <label style={modalLabel}>Notes</label>
                                <textarea
                                    value={newBoar.notes}
                                    onChange={(e) => setNewBoar({ ...newBoar, notes: e.target.value })}
                                    style={{ ...modalInput, minHeight: '80px' }}
                                    placeholder="Any additional information..."
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                                <button type="button" onClick={() => setShowAddForm(false)} style={modalCancelButton}>
                                    Cancel
                                </button>
                                <button type="submit" style={modalSubmitButton}>
                                    Add Boar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Boar Details Modal */}
            {showDetails && selectedBoar && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ color: '#ff1493', margin: 0 }}>
                                🐗 {selectedBoar.tag_number} — {selectedBoar.name || 'Unnamed'}
                            </h2>
                            <button onClick={() => setShowDetails(false)} style={{ ...modalCancelButton, padding: '6px 14px' }}>
                                ✕ Close
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                            <DetailItem label="Tag Number" value={selectedBoar.tag_number} />
                            <DetailItem label="Name" value={selectedBoar.name || '—'} />
                            <DetailItem label="Breed" value={selectedBoar.breed_name || 'Unknown'} />
                            <DetailItem label="Age" value={calculateAge(selectedBoar.birth_date)} />
                            <DetailItem label="Birth Date" value={formatDate(selectedBoar.birth_date)} />
                            <DetailItem label="Purchase Date" value={formatDate(selectedBoar.purchase_date)} />
                            <DetailItem label="Purchase Price" value={selectedBoar.purchase_price ? formatCurrency(selectedBoar.purchase_price) : 'N/A'} />
                            <DetailItem label="Status" value={
                                <span style={{ color: getStatusColor(selectedBoar.status), fontWeight: 'bold' }}>
                                    {getStatusIcon(selectedBoar.status)} {selectedBoar.status?.toUpperCase()}
                                </span>
                            } />
                        </div>

                        {selectedBoar.notes && (
                            <div style={{ backgroundColor: '#000', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                                <div style={{ color: '#ff1493', marginBottom: '5px', fontSize: '0.9em' }}>Notes</div>
                                <div style={{ color: '#fff' }}>{selectedBoar.notes}</div>
                            </div>
                        )}

                        <div style={{ backgroundColor: '#000', padding: '15px', borderRadius: '8px' }}>
                            <div style={{ color: '#ff1493', marginBottom: '10px', fontWeight: 'bold' }}>Update Status</div>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {['active', 'resting', 'sold', 'deceased'].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => handleStatusChange(selectedBoar.id, s)}
                                        style={{
                                            padding: '8px 16px',
                                            backgroundColor: selectedBoar.status === s ? getStatusColor(s) : '#333',
                                            color: selectedBoar.status === s ? '#000' : '#fff',
                                            border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold'
                                        }}
                                    >
                                        {getStatusIcon(s)} {s.charAt(0).toUpperCase() + s.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Helper Components ────────────────────────────────────────────────────────

const StatCard = ({ icon, value, label, color }) => (
    <div style={{ backgroundColor: '#1a1a1a', border: `2px solid ${color}`, borderRadius: '10px', padding: '15px', textAlign: 'center' }}>
        <div style={{ fontSize: '1.5em', marginBottom: '5px' }}>{icon}</div>
        <div style={{ color, fontSize: '1.8em', fontWeight: 'bold' }}>{value}</div>
        <div style={{ color: '#888', fontSize: '0.85em' }}>{label}</div>
    </div>
);

const InfoRow = ({ icon, label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #222' }}>
        <span style={{ color: '#888', fontSize: '0.9em' }}>{icon} {label}</span>
        <span style={{ color: '#fff', fontSize: '0.9em' }}>{value}</span>
    </div>
);

const DetailItem = ({ label, value }) => (
    <div style={{ backgroundColor: '#000', padding: '12px', borderRadius: '8px' }}>
        <div style={{ color: '#888', fontSize: '0.8em', marginBottom: '4px' }}>{label}</div>
        <div style={{ color: '#fff', fontWeight: 'bold' }}>{value}</div>
    </div>
);

// ── Modal styles ─────────────────────────────────────────────────────────────
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalContentStyle = { backgroundColor: '#1a1a1a', border: '2px solid #ff1493', borderRadius: '20px', padding: '30px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' };
const modalFormGroup = { marginBottom: '15px', flex: 1 };
const modalRow = { display: 'flex', gap: '15px', marginBottom: '5px' };
const modalLabel = { color: '#ff1493', display: 'block', marginBottom: '5px', fontSize: '0.95em' };
const modalInput = { width: '100%', padding: '10px', backgroundColor: '#000', border: '2px solid #ff1493', borderRadius: '8px', color: '#fff', fontSize: '1em', boxSizing: 'border-box' };
const modalCancelButton = { padding: '10px 20px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const modalSubmitButton = { padding: '10px 20px', backgroundColor: '#ff1493', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };

// ── Page styles ───────────────────────────────────────────────────────────────
const styles = {
    container: { padding: '20px', backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff', width: '100%', boxSizing: 'border-box' },
    header: { background: '#000', border: '2px solid #ff1493', borderRadius: '20px', padding: '20px', marginBottom: '20px' },
    headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    title: { color: '#ff1493', margin: 0, fontSize: '2em' },
    addButton: { backgroundColor: '#ff1493', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '50px', fontSize: '1em', fontWeight: 'bold', cursor: 'pointer' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '15px' },
    filterBar: { display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' },
    searchInput: { flex: 1, minWidth: '200px', padding: '12px 20px', backgroundColor: '#1a1a1a', border: '2px solid #ff1493', borderRadius: '50px', color: '#fff', fontSize: '1em' },
    filterButtons: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
    filterBtn: { padding: '8px 16px', border: '2px solid #ff1493', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9em' },
    boarGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
    boarCard: { backgroundColor: '#1a1a1a', border: '2px solid #ff1493', borderRadius: '15px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
    tagNumber: { color: '#ff1493', fontWeight: 'bold', fontSize: '1.3em' },
    boarName: { color: '#fff', fontSize: '1em', marginTop: '2px' },
    statusBadge: { padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', color: '#000' },
    cardBody: { display: 'flex', flexDirection: 'column', gap: '2px' },
    notes: { color: '#888', fontSize: '0.85em', backgroundColor: '#000', padding: '8px', borderRadius: '6px' },
    cardActions: { display: 'flex', gap: '10px', marginTop: '5px' },
    viewButton: { flex: 1, padding: '8px', backgroundColor: 'transparent', border: '2px solid #ff1493', color: '#ff1493', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
    statusSelect: { padding: '8px', backgroundColor: '#000', border: '2px solid #333', borderRadius: '8px', color: '#fff', cursor: 'pointer' },
    emptyState: { textAlign: 'center', padding: '80px 20px', color: '#fff' },
};

export default Boars;