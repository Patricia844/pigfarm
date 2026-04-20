import React, { useState, useEffect, useCallback } from 'react';
import API from '../services/api';
import toast from 'react-hot-toast';

const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-ZA');
};

function Sales() {
    const [sales, setSales] = useState([]);
    const [stats, setStats] = useState({
        total_sales: 0,
        total_revenue: 0,
        total_animals_sold: 0,
        avg_sale_value: 0,
        biggest_sale: 0,
    });
    const [sows, setSows] = useState([]);
    const [boars, setBoars] = useState([]);
    const [litters, setLitters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const [form, setForm] = useState({
        sale_date: new Date().toISOString().split('T')[0],
        animal_type: 'weaner',
        quantity: '',
        weight_kg: '',
        price_per_kg: '',
        price_per_head: '',
        total_amount: '',
        buyer_name: '',
        buyer_contact: '',
        payment_method: 'cash',
        payment_status: 'paid',
        litter_id: '',
        sow_id: '',
        boar_id: '',
        notes: '',
    });
    const [saving, setSaving] = useState(false);

    // ── Fetch functions ──────────────────────────────────────────────────────
    const fetchSales = useCallback(async () => {
        try {
            const res = await API.get('/sales');
            setSales(res.data);
        } catch (err) {
            console.error('Sales error:', err);
            toast.error('Failed to load sales');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchStats = useCallback(async () => {
        try {
            const res = await API.get('/sales/stats');
            setStats(res.data);
        } catch (err) {
            console.error('Stats error:', err);
        }
    }, []);

    const fetchReferenceData = useCallback(async () => {
        try {
            const [sowsRes, boarsRes, littersRes] = await Promise.all([
                API.get('/sows'),
                API.get('/boars'),
                API.get('/litters'),
            ]);
            setSows(sowsRes.data);
            setBoars(boarsRes.data);
            setLitters(littersRes.data);
        } catch (err) {
            console.error('Reference data error:', err);
        }
    }, []);

    useEffect(() => {
        const loadAll = async () => {
            setLoading(true);
            await Promise.all([fetchSales(), fetchStats(), fetchReferenceData()]);
            setLoading(false);
        };
        loadAll();
    }, [fetchSales, fetchStats, fetchReferenceData]);

    // ── Auto-calculate total ─────────────────────────────────────────────────
    useEffect(() => {
        const qty = parseFloat(form.quantity) || 0;
        const perHead = parseFloat(form.price_per_head) || 0;
        const weight = parseFloat(form.weight_kg) || 0;
        const perKg = parseFloat(form.price_per_kg) || 0;

        if (qty && perHead) {
            setForm(f => ({ ...f, total_amount: (qty * perHead).toFixed(2) }));
        } else if (weight && perKg) {
            setForm(f => ({ ...f, total_amount: (weight * perKg).toFixed(2) }));
        }
    }, [form.quantity, form.price_per_head, form.weight_kg, form.price_per_kg]);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.total_amount || parseFloat(form.total_amount) <= 0) {
            toast.error('Please enter a valid total amount');
            return;
        }
        setSaving(true);
        try {
            await API.post('/sales', form);
            toast.success('Sale recorded! Income updated automatically.');
            setShowAddForm(false);
            setForm({
                sale_date: new Date().toISOString().split('T')[0],
                animal_type: 'weaner', quantity: '', weight_kg: '',
                price_per_kg: '', price_per_head: '', total_amount: '',
                buyer_name: '', buyer_contact: '', payment_method: 'cash',
                payment_status: 'paid', litter_id: '', sow_id: '', boar_id: '', notes: '',
            });
            fetchSales();
            fetchStats();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to record sale');
        } finally {
            setSaving(false);
        }
    };

    // ── Filtered sales ───────────────────────────────────────────────────────
    const filteredSales = sales.filter(s => {
        const matchesType = filterType === 'all' || s.animal_type === filterType;
        const matchesStatus = filterStatus === 'all' || s.payment_status === filterStatus;
        const matchesSearch = !searchTerm ||
            s.buyer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.animal_type?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesType && matchesStatus && matchesSearch;
    });

    const getAnimalIcon = (type) => {
        switch (type) {
            case 'sow': return '🐷';
            case 'boar': return '🐗';
            case 'piglet': return '🐽';
            case 'weaner': return '🐖';
            case 'grower': return '🐖';
            case 'finisher': return '🐷';
            default: return '🐖';
        }
    };

    const getPaymentColor = (status) => {
        switch (status) {
            case 'paid': return '#4CAF50';
            case 'pending': return '#ff9800';
            case 'partial': return '#2196F3';
            default: return '#888';
        }
    };

    if (loading) return (
        <div style={{ color: '#ff1493', textAlign: 'center', padding: '60px', fontSize: '1.2em' }}>
            Loading sales...
        </div>
    );

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerTop}>
                    <h1 style={styles.title}>💵 Sales Records</h1>
                    <button onClick={() => setShowAddForm(true)} style={styles.addButton}>
                        + Record Sale
                    </button>
                </div>

                {/* Stats */}
                <div style={styles.statsGrid}>
                    <StatCard icon="🧾" value={stats.total_sales || 0} label="Total Sales" color="#ff1493" />
                    <StatCard icon="💰" value={formatCurrency(stats.total_revenue)} label="Total Revenue" color="#4CAF50" />
                    <StatCard icon="🐖" value={stats.total_animals_sold || 0} label="Animals Sold" color="#2196F3" />
                    <StatCard icon="📊" value={formatCurrency(stats.avg_sale_value)} label="Avg Sale Value" color="#ff9800" />
                    <StatCard icon="🏆" value={formatCurrency(stats.biggest_sale)} label="Biggest Sale" color="#9C27B0" />
                </div>
            </div>

            {/* Filters */}
            <div style={styles.filterBar}>
                <input
                    type="text"
                    placeholder="🔍 Search by buyer or animal type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                />
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={styles.filterSelect}>
                    <option value="all">All Types</option>
                    <option value="sow">Sow</option>
                    <option value="boar">Boar</option>
                    <option value="piglet">Piglet</option>
                    <option value="weaner">Weaner</option>
                    <option value="grower">Grower</option>
                    <option value="finisher">Finisher</option>
                </select>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={styles.filterSelect}>
                    <option value="all">All Payments</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="partial">Partial</option>
                </select>
            </div>

            {/* Sales Table */}
            {filteredSales.length === 0 ? (
                <div style={styles.emptyState}>
                    <div style={{ fontSize: '4em', marginBottom: '20px' }}>💵</div>
                    <h3>{sales.length === 0 ? 'No sales recorded yet' : 'No sales match your filter'}</h3>
                    <p style={{ color: '#888' }}>
                        {sales.length === 0 ? 'Record your first sale to get started' : 'Try changing your filters'}
                    </p>
                    {sales.length === 0 && (
                        <button onClick={() => setShowAddForm(true)} style={styles.addButton}>
                            + Record First Sale
                        </button>
                    )}
                </div>
            ) : (
                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                {['Date', 'Animal Type', 'Qty', 'Weight', 'Total', 'Buyer', 'Payment', 'Status', 'Notes'].map(h => (
                                    <th key={h} style={thStyle}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSales.map(sale => (
                                <tr key={sale.id} style={{ borderBottom: '1px solid #222' }}>
                                    <td style={tdStyle}>{formatDate(sale.sale_date)}</td>
                                    <td style={tdStyle}>
                                        <span style={styles.typeBadge}>
                                            {getAnimalIcon(sale.animal_type)} {sale.animal_type}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>{sale.quantity}</td>
                                    <td style={tdStyle}>{sale.weight_kg ? `${sale.weight_kg} kg` : '-'}</td>
                                    <td style={{ ...tdStyle, color: '#4CAF50', fontWeight: 'bold' }}>
                                        {formatCurrency(sale.total_amount)}
                                    </td>
                                    <td style={tdStyle}>
                                        <div>{sale.buyer_name || '-'}</div>
                                        {sale.buyer_contact && (
                                            <div style={{ color: '#888', fontSize: '11px' }}>{sale.buyer_contact}</div>
                                        )}
                                    </td>
                                    <td style={tdStyle}>{sale.payment_method}</td>
                                    <td style={tdStyle}>
                                        <span style={{ ...styles.statusBadge, backgroundColor: getPaymentColor(sale.payment_status) }}>
                                            {sale.payment_status}
                                        </span>
                                    </td>
                                    <td style={{ ...tdStyle, color: '#888', fontSize: '12px' }}>{sale.notes || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pending payments alert */}
            {sales.filter(s => s.payment_status === 'pending').length > 0 && (
                <div style={styles.pendingAlert}>
                    ⚠️ You have {sales.filter(s => s.payment_status === 'pending').length} pending payment(s) totalling{' '}
                    <strong>
                        {formatCurrency(
                            sales.filter(s => s.payment_status === 'pending')
                                .reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0)
                        )}
                    </strong>
                </div>
            )}

            {/* Add Sale Modal */}
            {showAddForm && (
                <div style={modalOverlayStyle}>
                    <div style={modalContentStyle}>
                        <h2 style={{ color: '#4CAF50', marginBottom: '20px' }}>💵 Record Sale</h2>
                        <form onSubmit={handleSubmit}>
                            <div style={modalRow}>
                                <div style={modalFormGroup}>
                                    <label style={modalLabel}>Sale Date *</label>
                                    <input type="date" name="sale_date" value={form.sale_date}
                                        onChange={handleChange} style={modalInput} required />
                                </div>
                                <div style={modalFormGroup}>
                                    <label style={modalLabel}>Animal Type *</label>
                                    <select name="animal_type" value={form.animal_type}
                                        onChange={handleChange} style={modalInput} required>
                                        <option value="piglet">Piglet</option>
                                        <option value="weaner">Weaner</option>
                                        <option value="grower">Grower</option>
                                        <option value="finisher">Finisher</option>
                                        <option value="sow">Sow</option>
                                        <option value="boar">Boar</option>
                                    </select>
                                </div>
                            </div>

                            <div style={modalRow}>
                                <div style={modalFormGroup}>
                                    <label style={modalLabel}>Quantity *</label>
                                    <input type="number" name="quantity" value={form.quantity}
                                        onChange={handleChange} style={modalInput} placeholder="e.g. 5" required />
                                </div>
                                <div style={modalFormGroup}>
                                    <label style={modalLabel}>Total Weight (kg)</label>
                                    <input type="number" step="0.01" name="weight_kg" value={form.weight_kg}
                                        onChange={handleChange} style={modalInput} placeholder="e.g. 250" />
                                </div>
                            </div>

                            <div style={modalRow}>
                                <div style={modalFormGroup}>
                                    <label style={modalLabel}>Price per Head ($)</label>
                                    <input type="number" step="0.01" name="price_per_head" value={form.price_per_head}
                                        onChange={handleChange} style={modalInput} placeholder="e.g. 120" />
                                </div>
                                <div style={modalFormGroup}>
                                    <label style={modalLabel}>Price per kg ($)</label>
                                    <input type="number" step="0.01" name="price_per_kg" value={form.price_per_kg}
                                        onChange={handleChange} style={modalInput} placeholder="e.g. 2.50" />
                                </div>
                            </div>

                            <div style={modalFormGroup}>
                                <label style={{ ...modalLabel, color: '#4CAF50', fontSize: '1em' }}>
                                    Total Amount ($) * — auto-calculated
                                </label>
                                <input type="number" step="0.01" name="total_amount" value={form.total_amount}
                                    onChange={handleChange}
                                    style={{ ...modalInput, borderColor: '#4CAF50', fontSize: '1.1em' }}
                                    placeholder="0.00" required />
                            </div>

                            <div style={modalRow}>
                                <div style={modalFormGroup}>
                                    <label style={modalLabel}>Buyer Name</label>
                                    <input name="buyer_name" value={form.buyer_name}
                                        onChange={handleChange} style={modalInput} placeholder="e.g. ABC Meats" />
                                </div>
                                <div style={modalFormGroup}>
                                    <label style={modalLabel}>Buyer Contact</label>
                                    <input name="buyer_contact" value={form.buyer_contact}
                                        onChange={handleChange} style={modalInput} placeholder="Phone or email" />
                                </div>
                            </div>

                            <div style={modalRow}>
                                <div style={modalFormGroup}>
                                    <label style={modalLabel}>Payment Method</label>
                                    <select name="payment_method" value={form.payment_method}
                                        onChange={handleChange} style={modalInput}>
                                        <option value="cash">Cash</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="mobile_money">Mobile Money</option>
                                        <option value="credit">Credit</option>
                                    </select>
                                </div>
                                <div style={modalFormGroup}>
                                    <label style={modalLabel}>Payment Status</label>
                                    <select name="payment_status" value={form.payment_status}
                                        onChange={handleChange} style={modalInput}>
                                        <option value="paid">Paid</option>
                                        <option value="pending">Pending</option>
                                        <option value="partial">Partial</option>
                                    </select>
                                </div>
                            </div>

                            {/* Link to animal — show relevant selector based on type */}
                            {(form.animal_type === 'sow') && (
                                <div style={modalFormGroup}>
                                    <label style={modalLabel}>Link to Sow (optional)</label>
                                    <select name="sow_id" value={form.sow_id} onChange={handleChange} style={modalInput}>
                                        <option value="">Select sow</option>
                                        {sows.map(s => (
                                            <option key={s.id} value={s.id}>{s.tag_number} - {s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {(form.animal_type === 'boar') && (
                                <div style={modalFormGroup}>
                                    <label style={modalLabel}>Link to Boar (optional)</label>
                                    <select name="boar_id" value={form.boar_id} onChange={handleChange} style={modalInput}>
                                        <option value="">Select boar</option>
                                        {boars.map(b => (
                                            <option key={b.id} value={b.id}>{b.tag_number} - {b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {(form.animal_type === 'piglet' || form.animal_type === 'weaner') && (
                                <div style={modalFormGroup}>
                                    <label style={modalLabel}>Link to Litter (optional)</label>
                                    <select name="litter_id" value={form.litter_id} onChange={handleChange} style={modalInput}>
                                        <option value="">Select litter</option>
                                        {litters.map(l => (
                                            <option key={l.id} value={l.id}>
                                                {l.id} — Sow {l.sow_tag} ({l.born_alive} born)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div style={modalFormGroup}>
                                <label style={modalLabel}>Notes</label>
                                <textarea name="notes" value={form.notes} onChange={handleChange}
                                    style={{ ...modalInput, minHeight: '70px' }}
                                    placeholder="Any additional details..." />
                            </div>

                            <div style={{ backgroundColor: '#000', padding: '12px', borderRadius: '8px', marginBottom: '15px' }}>
                                <span style={{ color: '#888', fontSize: '0.9em' }}>
                                    ✅ This sale will automatically create an income entry in Finance
                                </span>
                            </div>

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setShowAddForm(false)} style={modalCancelButton}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving}
                                    style={{ ...modalSubmitButton, backgroundColor: '#4CAF50', opacity: saving ? 0.7 : 1 }}>
                                    {saving ? 'Recording...' : '💵 Record Sale'}
                                </button>
                            </div>
                        </form>
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
        <div style={{ color, fontSize: '1.4em', fontWeight: 'bold' }}>{value}</div>
        <div style={{ color: '#888', fontSize: '0.85em' }}>{label}</div>
    </div>
);

// ── Shared styles ────────────────────────────────────────────────────────────
const thStyle = { textAlign: 'left', padding: '12px', color: '#ff1493', borderBottom: '2px solid #ff1493', whiteSpace: 'nowrap' };
const tdStyle = { padding: '10px 12px', verticalAlign: 'middle' };

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalContentStyle = { backgroundColor: '#1a1a1a', border: '2px solid #4CAF50', borderRadius: '20px', padding: '30px', width: '90%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto' };
const modalFormGroup = { marginBottom: '15px', flex: 1 };
const modalRow = { display: 'flex', gap: '15px', marginBottom: '5px' };
const modalLabel = { color: '#ff1493', display: 'block', marginBottom: '5px', fontSize: '0.9em' };
const modalInput = { width: '100%', padding: '10px', backgroundColor: '#000', border: '2px solid #ff1493', borderRadius: '8px', color: '#fff', fontSize: '1em', boxSizing: 'border-box' };
const modalCancelButton = { padding: '10px 20px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const modalSubmitButton = { padding: '10px 20px', backgroundColor: '#ff1493', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };

const styles = {
    container: { padding: '20px', backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff', width: '100%', boxSizing: 'border-box' },
    header: { background: '#000', border: '2px solid #ff1493', borderRadius: '20px', padding: '20px', marginBottom: '20px' },
    headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    title: { color: '#ff1493', margin: 0, fontSize: '2em' },
    addButton: { backgroundColor: '#4CAF50', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '50px', fontSize: '1em', fontWeight: 'bold', cursor: 'pointer' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '15px' },
    filterBar: { display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' },
    searchInput: { flex: 1, minWidth: '200px', padding: '12px 20px', backgroundColor: '#1a1a1a', border: '2px solid #ff1493', borderRadius: '50px', color: '#fff', fontSize: '1em' },
    filterSelect: { padding: '12px 20px', backgroundColor: '#1a1a1a', border: '2px solid #ff1493', borderRadius: '50px', color: '#fff', fontSize: '1em', minWidth: '150px' },
    tableContainer: { backgroundColor: '#1a1a1a', border: '2px solid #ff1493', borderRadius: '15px', padding: '10px', overflowX: 'auto', marginBottom: '20px' },
    table: { width: '100%', borderCollapse: 'collapse' },
    typeBadge: { backgroundColor: '#333', padding: '3px 8px', borderRadius: '12px', fontSize: '12px' },
    statusBadge: { padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', color: '#000' },
    emptyState: { textAlign: 'center', padding: '80px 20px', color: '#fff' },
    pendingAlert: { backgroundColor: 'rgba(255,152,0,0.15)', border: '2px solid #ff9800', borderRadius: '10px', padding: '15px 20px', color: '#ff9800', fontWeight: 'bold' },
};

export default Sales;