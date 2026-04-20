import React, { useState, useEffect, useCallback } from 'react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import toast from 'react-hot-toast';
import API from '../services/api';

// FIX Bug 1: COLORS defined outside component — stable reference, no re-creation on every render
const COLORS = ['#ff1493', '#4CAF50', '#2196F3', '#ff9800', '#9C27B0'];

// FIX Bug 2: Currency formatter — use ZAR (R) to match your locale, not '$'
const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(amount || 0);

function Feed() {
    // FIX Bug 3: loading should start true — component should show loading state
    // while API data is being fetched, not false from the start
    const [loading, setLoading]               = useState(true);
    const [activeTab, setActiveTab]           = useState('inventory');
    const [showAddForm, setShowAddForm]       = useState(false);
    const [showAllocateForm, setShowAllocateForm] = useState(false);
    const [showRestockForm, setShowRestockForm]   = useState(false);
    const [filterType, setFilterType]         = useState('all');
    const [selectedFeed, setSelectedFeed]     = useState(null);

    // FIX Bug 4: All data starts empty — populated from API, not hardcoded.
    // Hardcoded sample data is fine for local dev only, but it masks real API
    // bugs and means forms (Add/Restock/Allocate) never actually update the UI.
    const [inventory, setInventory]   = useState([]);
    const [allocations, setAllocations] = useState([]);
    const [purchases, setPurchases]   = useState([]);
    const [alerts, setAlerts]         = useState([]);
    const [timeline, setTimeline]     = useState([]);
    const [stats, setStats]           = useState({
        totalStock:      0,
        totalValue:      0,
        usedToday:       0,
        usedThisWeek:    0,
        lowStockCount:   0,
        monthlyCost:     0,
    });

    // Chart data derived from real inventory state (not a separate hardcoded array)
    // FIX Bug 5: feedTypeData was a separate hardcoded array that didn't update
    // when inventory changed. Now it's derived directly from state.
    const feedTypeData = inventory.map(f => ({
        name:  f.feed_type_category,
        value: f.quantity_kg,
    }));

    // FIX Bug 6: usageTrendData should come from the API trends endpoint.
    // Start empty; populated in fetchTrends below.
    const [usageTrendData, setUsageTrendData] = useState([]);

    // FIX Bug 7: Monthly cost chart data from API, not hardcoded Jan/Feb/Mar
    const [monthlyCostData, setMonthlyCostData] = useState([]);

    // ── Data fetching ──────────────────────────────────────────────────────────

    const fetchInventory = useCallback(async () => {
        try {
            const res = await API.get('/feed');
            setInventory(res.data);
        } catch (err) {
            console.error('Error fetching inventory:', err);
            toast.error('Failed to load feed inventory');
        }
    }, []);

    const fetchOverview = useCallback(async () => {
        try {
            const res = await API.get('/feed/overview');
            setStats(res.data);
        } catch (err) {
            console.error('Error fetching overview:', err);
        }
    }, []);

    const fetchAllocations = useCallback(async () => {
        try {
            const res = await API.get('/feed/consumption');
            setAllocations(res.data);
        } catch (err) {
            console.error('Error fetching allocations:', err);
        }
    }, []);

    const fetchAlerts = useCallback(async () => {
        try {
            const res = await API.get('/feed/alerts');
            setAlerts(res.data);
        } catch (err) {
            console.error('Error fetching alerts:', err);
        }
    }, []);

    const fetchTimeline = useCallback(async () => {
        try {
            const res = await API.get('/feed/timeline');
            setTimeline(res.data);
        } catch (err) {
            console.error('Error fetching timeline:', err);
        }
    }, []);

    const fetchTrends = useCallback(async () => {
        try {
            const res = await API.get('/feed/trends');
            // Backend returns: { date, daily_total, daily_cost }
            // Map to chart-friendly shape
            setUsageTrendData(
                res.data.map(row => ({
                    day:    new Date(row.date).toLocaleDateString('en-ZA', { weekday: 'short' }),
                    amount: row.daily_total,
                    cost:   row.daily_cost,
                }))
            );
            // Build monthly cost data from same trends (group by month)
            const byMonth = {};
            res.data.forEach(row => {
                const month = new Date(row.date).toLocaleDateString('en-ZA', { month: 'short' });
                byMonth[month] = (byMonth[month] || 0) + row.daily_cost;
            });
            setMonthlyCostData(
                Object.entries(byMonth).map(([month, cost]) => ({ month, cost }))
            );
        } catch (err) {
            console.error('Error fetching trends:', err);
        }
    }, []);

    // FIX Bug 8: No useEffect existed at all — data was never fetched from the API.
    // All data fetches run in parallel; loading clears when all complete.
    useEffect(() => {
        const loadAll = async () => {
            try {
                await Promise.all([
                    fetchInventory(),
                    fetchOverview(),
                    fetchAllocations(),
                    fetchAlerts(),
                    fetchTimeline(),
                    fetchTrends(),
                ]);
            } finally {
                setLoading(false);
            }
        };
        loadAll();
    }, [fetchInventory, fetchOverview, fetchAllocations, fetchAlerts, fetchTimeline, fetchTrends]);

    // ── Handlers ───────────────────────────────────────────────────────────────

    // FIX Bug 9: handleAddFeed, handleAllocate, handleRestock were never wired up.
    // Modals called toast.success() and closed without touching state or calling the API.
    // These handlers are passed into modals so submissions actually update the UI.

    const handleAddFeed = useCallback(async (formData) => {
        try {
            await API.post('/feed', formData);
            toast.success('Feed added successfully!');
            setShowAddForm(false);
            // Refresh inventory and overview after adding
            await Promise.all([fetchInventory(), fetchOverview()]);
        } catch (err) {
            console.error('Error adding feed:', err);
            toast.error(err.response?.data?.error || 'Failed to add feed');
        }
    }, [fetchInventory, fetchOverview]);

    const handleAllocate = useCallback(async (formData) => {
        try {
            await API.post('/feed/allocate', formData);
            toast.success('Feeding recorded successfully!');
            setShowAllocateForm(false);
            // Refresh inventory (stock level decreases), overview, allocations, and alerts
            await Promise.all([
                fetchInventory(),
                fetchOverview(),
                fetchAllocations(),
                fetchAlerts(),
                fetchTrends(),
            ]);
        } catch (err) {
            console.error('Error recording feeding:', err);
            toast.error(err.response?.data?.error || 'Failed to record feeding');
        }
    }, [fetchInventory, fetchOverview, fetchAllocations, fetchAlerts, fetchTrends]);

    const handleRestock = useCallback(async (feedId, formData) => {
        try {
            await API.post(`/feed/${feedId}/restock`, formData);
            toast.success('Feed restocked successfully!');
            setShowRestockForm(false);
            setSelectedFeed(null);
            await Promise.all([fetchInventory(), fetchOverview(), fetchAlerts()]);
        } catch (err) {
            console.error('Error restocking:', err);
            toast.error(err.response?.data?.error || 'Failed to restock feed');
        }
    }, [fetchInventory, fetchOverview, fetchAlerts]);

    // FIX Bug 10: resolveAlert was missing entirely — the UI had no way to dismiss alerts
    const handleResolveAlert = useCallback(async (alertId) => {
        try {
            await API.put(`/feed/alerts/${alertId}/resolve`);
            toast.success('Alert resolved');
            setAlerts(prev => prev.filter(a => a.id !== alertId));
        } catch (err) {
            console.error('Error resolving alert:', err);
            toast.error('Failed to resolve alert');
        }
    }, []);

    // ── Helpers ────────────────────────────────────────────────────────────────

    const getStockStatusColor = (status) => {
        switch (status) {
            case 'low':     return '#f44336';
            case 'warning': return '#ff9800';
            default:        return '#4CAF50';
        }
    };

    const getStockStatusIcon = (status) => {
        switch (status) {
            case 'low':     return '🔴';
            case 'warning': return '🟡';
            default:        return '🟢';
        }
    };

    // FIX Bug 11: filteredInventory worked correctly but filterType options used
    // Title Case ('Piglet') while feed_type_category in data uses lowercase ('piglet').
    // Filter comparison now lowercases both sides to be safe.
    const filteredInventory = filterType === 'all'
        ? inventory
        : inventory.filter(f => f.feed_type_category?.toLowerCase() === filterType.toLowerCase());

    // FIX Bug 12: formatDate helper was missing — dates were rendered raw from the API
    const formatDate = (dateString) => {
        const d = new Date(dateString);
        return isNaN(d.getTime()) ? dateString : d.toLocaleDateString('en-ZA');
    };

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={{ fontSize: '2em', marginBottom: '10px' }}>🌾</div>
                <div style={styles.loadingText}>Loading feed data...</div>
            </div>
        );
    }

    return (
        <div style={styles.container}>

            {/* ── Header with Stats ── */}
            <div style={styles.header}>
                <div style={styles.headerTop}>
                    <h1 style={styles.title}>🌾 Feed management</h1>
                    <div style={styles.headerButtons}>
                        <button onClick={() => setShowAddForm(true)} style={styles.primaryButton}>
                            + Add feed
                        </button>
                        <button onClick={() => setShowAllocateForm(true)} style={styles.successButton}>
                            🍽️ Record feeding
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div style={styles.statsGrid}>
                    <StatCard icon="📦" value={`${stats.totalStock} kg`}          label="Total stock"        color="#ff1493" />
                    {/* FIX Bug 2: ZAR currency throughout */}
                    <StatCard icon="💰" value={formatCurrency(stats.totalValue)}   label="Total value"        color="#4CAF50" />
                    <StatCard icon="📊" value={`${stats.usedToday} kg`}           label="Used today"         color="#2196F3" />
                    <StatCard icon="📈" value={`${stats.usedThisWeek} kg`}        label="This week"          color="#ff9800" />
                    <StatCard icon="⚠️" value={stats.lowStockCount}               label="Low stock alerts"   color="#f44336" />
                    <StatCard icon="💵" value={formatCurrency(stats.monthlyCost)} label="Monthly cost"       color="#9C27B0" />
                </div>

                {/* Alert Banner */}
                {alerts.length > 0 && (
                    <div style={styles.alertBanner}>
                        <span style={{ fontSize: '1.5em', marginRight: '10px' }}>⚠️</span>
                        <div style={{ flex: 1 }}>
                            <strong>{alerts.length} alert(s):</strong>
                            {alerts.map(alert => (
                                <span key={alert.id} style={{ marginLeft: '10px' }}>
                                    {alert.alert_message}
                                </span>
                            ))}
                        </div>
                        {/* FIX Bug 10: resolve button now actually calls handleResolveAlert */}
                        {alerts.map(alert => (
                            <button
                                key={alert.id}
                                onClick={() => handleResolveAlert(alert.id)}
                                style={{
                                    marginLeft: '10px',
                                    padding: '4px 10px',
                                    backgroundColor: '#333',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                }}
                            >
                                Resolve
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Tabs ── */}
            <div style={styles.tabContainer}>
                {[
                    { key: 'inventory',   label: '📋 Inventory' },
                    { key: 'allocations', label: '🍽️ Feeding records' },
                    { key: 'purchases',   label: '📦 Purchases' },
                    { key: 'analytics',   label: '📊 Analytics' },
                    { key: 'timeline',    label: '🕒 Timeline' },
                ].map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        style={activeTab === key ? styles.activeTab : styles.tab}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* Filter bar (inventory only) */}
            {activeTab === 'inventory' && (
                <div style={styles.filterBar}>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        style={styles.filterSelect}
                    >
                        <option value="all">All feed types</option>
                        <option value="piglet">Piglet</option>
                        <option value="grower">Grower</option>
                        <option value="finisher">Finisher</option>
                        <option value="sow">Sow</option>
                        <option value="boar">Boar</option>
                    </select>
                </div>
            )}

            {/* ── Tab Content ── */}
            <div style={styles.tabContent}>

                {/* INVENTORY */}
                {activeTab === 'inventory' && (
                    <div>
                        {filteredInventory.length === 0 ? (
                            <EmptyState
                                message="No feed in inventory"
                                buttonText="Add feed"
                                onButtonClick={() => setShowAddForm(true)}
                            />
                        ) : (
                            <div style={styles.inventoryGrid}>
                                {filteredInventory.map(feed => (
                                    <div key={feed.id} style={{
                                        ...styles.inventoryCard,
                                        borderColor: getStockStatusColor(feed.stock_status),
                                    }}>
                                        <div style={styles.cardHeader}>
                                            <div>
                                                <h3 style={styles.feedName}>{feed.feed_type}</h3>
                                                <span style={styles.feedType}>{feed.feed_type_category}</span>
                                            </div>
                                            <span style={{
                                                ...styles.stockBadge,
                                                backgroundColor: getStockStatusColor(feed.stock_status),
                                            }}>
                                                {getStockStatusIcon(feed.stock_status)} {feed.stock_status}
                                            </span>
                                        </div>

                                        {/* Stock progress bar — capped at 100% */}
                                        <div style={styles.stockBar}>
                                            <div style={{
                                                width: `${Math.min(100, (feed.quantity_kg / (feed.min_stock_level || 1)) * 100)}%`,
                                                height: '100%',
                                                backgroundColor: getStockStatusColor(feed.stock_status),
                                                borderRadius: '4px',
                                            }} />
                                        </div>

                                        <div style={styles.statsRow}>
                                            <StatPill label="Stock"     value={`${feed.quantity_kg} kg`}              color="#fff" />
                                            <StatPill label="Min level" value={`${feed.min_stock_level} kg`}          color="#888" />
                                            {/* FIX Bug 2: ZAR */}
                                            <StatPill label="Value"     value={formatCurrency(feed.total_value)}      color="#4CAF50" />
                                        </div>

                                        <div style={styles.detailsGrid}>
                                            <DetailItem label="Cost/kg"     value={formatCurrency(feed.cost_per_kg)} />
                                            <DetailItem label="Supplier"    value={feed.supplier} />
                                            <DetailItem label="Last restock" value={formatDate(feed.last_restocked)} />
                                            <DetailItem label="Reorder qty" value={`${feed.reorder_quantity} kg`} />
                                        </div>

                                        <div style={styles.cardActions}>
                                            <button
                                                onClick={() => {
                                                    setSelectedFeed(feed);
                                                    setShowRestockForm(true);
                                                }}
                                                style={styles.actionButton}
                                            >
                                                Restock
                                            </button>
                                            {/* FIX Bug 9: Edit and History buttons
                                                should at minimum log or navigate — wired to console for now */}
                                            <button
                                                onClick={() => console.log('Edit feed:', feed.id)}
                                                style={styles.actionButton}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => console.log('View history for feed:', feed.id)}
                                                style={styles.actionButton}
                                            >
                                                History
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* FEEDING RECORDS */}
                {activeTab === 'allocations' && (
                    <div>
                        <div style={styles.sectionHeader}>
                            <h2 style={styles.sectionTitle}>Recent feeding records</h2>
                            <button onClick={() => setShowAllocateForm(true)} style={styles.smallButton}>
                                + New feeding
                            </button>
                        </div>

                        {allocations.length === 0 ? (
                            <EmptyState
                                message="No feeding records yet"
                                buttonText="Record feeding"
                                onButtonClick={() => setShowAllocateForm(true)}
                            />
                        ) : (
                            <div style={styles.tableContainer}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            {['Date', 'Feed type', 'Quantity', 'Time', 'Allocated to', 'Cost'].map(h => (
                                                <th key={h}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allocations.map(a => (
                                            <tr key={a.id}>
                                                <td>{formatDate(a.allocation_date)}</td>
                                                <td>{a.feed_type}</td>
                                                <td>{a.quantity_kg} kg</td>
                                                <td>{a.feeding_time}</td>
                                                <td>{a.allocated_to_name || a.allocated_to_type}</td>
                                                {/* FIX Bug 2: ZAR */}
                                                <td>{formatCurrency(a.cost_at_time)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Daily Summary — derived from real stats */}
                        <div style={styles.summaryCards}>
                            <SummaryCard title="Today's total"  value={`${stats.usedToday} kg`}    subValue={formatCurrency(stats.monthlyCost / 30)} color="#ff1493" />
                            <SummaryCard title="This week"      value={`${stats.usedThisWeek} kg`} subValue=""                                        color="#4CAF50" />
                            <SummaryCard title="Monthly cost"   value={formatCurrency(stats.monthlyCost)} subValue=""                                 color="#2196F3" />
                        </div>
                    </div>
                )}

                {/* PURCHASES */}
                {activeTab === 'purchases' && (
                    <div>
                        <div style={styles.sectionHeader}>
                            <h2 style={styles.sectionTitle}>Purchase history</h2>
                            <button onClick={() => setShowAddForm(true)} style={styles.smallButton}>
                                + New purchase
                            </button>
                        </div>

                        {/* FIX Bug 13: Purchases tab had no empty state */}
                        {purchases.length === 0 ? (
                            <EmptyState
                                message="No purchase history yet"
                                buttonText="Add feed"
                                onButtonClick={() => setShowAddForm(true)}
                            />
                        ) : (
                            <div style={styles.tableContainer}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            {['Date', 'Feed type', 'Quantity', 'Cost/kg', 'Total cost', 'Supplier'].map(h => (
                                                <th key={h}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {purchases.map(p => (
                                            <tr key={p.id}>
                                                <td>{formatDate(p.purchase_date)}</td>
                                                <td>{p.feed_type}</td>
                                                <td>{p.quantity_kg} kg</td>
                                                {/* FIX Bug 2: ZAR */}
                                                <td>{formatCurrency(p.cost_per_kg)}</td>
                                                <td>{formatCurrency(p.total_cost)}</td>
                                                <td>{p.supplier}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Monthly cost chart from real API data */}
                        {monthlyCostData.length > 0 && (
                            <div style={styles.chartContainer}>
                                <h3 style={styles.chartTitle}>Monthly feed cost</h3>
                                <div style={{ height: '250px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={monthlyCostData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                            <XAxis dataKey="month" stroke="#888" />
                                            <YAxis stroke="#888" tickFormatter={(v) => `R${(v/1000).toFixed(1)}k`} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1a1a1a', border: '2px solid #ff1493' }}
                                                formatter={(v) => [formatCurrency(v)]}
                                            />
                                            <Bar dataKey="cost" fill="#ff1493" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ANALYTICS */}
                {activeTab === 'analytics' && (
                    <div>
                        <div style={styles.analyticsGrid}>
                            {/* Feed type distribution — derived from real inventory */}
                            <div style={styles.chartCard}>
                                <h3 style={styles.chartTitle}>Feed type distribution</h3>
                                <div style={{ height: '250px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={feedTypeData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                outerRadius={80}
                                                dataKey="value"
                                            >
                                                {feedTypeData.map((entry, index) => (
                                                    // FIX Bug 14: key should not be array index —
                                                    // use a stable identifier
                                                    <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '2px solid #ff1493' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Daily usage trend from real API */}
                            <div style={styles.chartCard}>
                                <h3 style={styles.chartTitle}>Daily usage trend (last 30 days)</h3>
                                <div style={{ height: '250px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={usageTrendData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                            <XAxis dataKey="day" stroke="#888" />
                                            <YAxis stroke="#888" />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1a1a1a', border: '2px solid #ff1493' }}
                                                formatter={(v, name) => name === 'amount' ? [`${v} kg`] : [formatCurrency(v)]}
                                            />
                                            <Line type="monotone" dataKey="amount" stroke="#ff1493" strokeWidth={2} name="amount" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Cost by feed type from real inventory */}
                            <div style={styles.chartCard}>
                                <h3 style={styles.chartTitle}>Value by feed type</h3>
                                <div style={{ height: '250px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={inventory}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                            <XAxis dataKey="feed_type_category" stroke="#888" />
                                            <YAxis stroke="#888" tickFormatter={(v) => `R${v}`} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1a1a1a', border: '2px solid #ff1493' }}
                                                formatter={(v) => [formatCurrency(v)]}
                                            />
                                            <Bar dataKey="total_value" fill="#4CAF50" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Key metrics — derived from real stats */}
                            <div style={styles.metricsCard}>
                                <h3 style={styles.chartTitle}>Key metrics</h3>
                                <div style={styles.metricsGrid}>
                                    <MetricItem label="Total stock"     value={`${stats.totalStock} kg`} />
                                    <MetricItem label="Used this week"  value={`${stats.usedThisWeek} kg`} />
                                    <MetricItem label="Low stock items" value={stats.lowStockCount} />
                                    <MetricItem label="Monthly cost"    value={formatCurrency(stats.monthlyCost)} />
                                    <MetricItem label="Total value"     value={formatCurrency(stats.totalValue)} />
                                    <MetricItem
                                        label="Most stocked"
                                        value={
                                            inventory.length > 0
                                                ? inventory.reduce((a, b) => a.quantity_kg > b.quantity_kg ? a : b).feed_type
                                                : '—'
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TIMELINE */}
                {activeTab === 'timeline' && (
                    <div>
                        <h2 style={styles.sectionTitle}>Activity timeline</h2>
                        {timeline.length === 0 ? (
                            <EmptyState message="No timeline events yet" buttonText="Record feeding" onButtonClick={() => setShowAllocateForm(true)} />
                        ) : (
                            <div style={styles.timeline}>
                                {timeline.map((event, index) => (
                                    // FIX Bug 15: index as key is acceptable here since
                                    // timeline is read-only and never reordered — but prefer
                                    // a real id if the backend provides one
                                    <div key={event.id ?? index} style={styles.timelineItem}>
                                        <div style={{
                                            ...styles.timelineDot,
                                            backgroundColor:
                                                event.event_type === 'alert'    ? '#f44336' :
                                                event.event_type === 'purchase' ? '#4CAF50' : '#ff1493',
                                        }} />
                                        <div style={styles.timelineContent}>
                                            {/* FIX Bug 16: Backend returns event_date and description,
                                                not date and event. Field names corrected. */}
                                            <div style={styles.timelineDate}>
                                                {formatDate(event.event_date)} — {event.event_type}
                                            </div>
                                            <div style={styles.timelineDesc}>{event.description}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Modals ── */}
            {showAddForm && (
                <AddFeedModal
                    onSubmit={handleAddFeed}
                    onClose={() => setShowAddForm(false)}
                />
            )}
            {showAllocateForm && (
                <AllocateModal
                    inventory={inventory}
                    onSubmit={handleAllocate}
                    onClose={() => setShowAllocateForm(false)}
                />
            )}
            {showRestockForm && selectedFeed && (
                <RestockModal
                    feed={selectedFeed}
                    onSubmit={(formData) => handleRestock(selectedFeed.id, formData)}
                    onClose={() => {
                        setShowRestockForm(false);
                        setSelectedFeed(null);
                    }}
                />
            )}
        </div>
    );
}

// ── Helper components ──────────────────────────────────────────────────────────

const StatCard = ({ icon, value, label, color }) => (
    <div style={{ backgroundColor: '#000', border: `2px solid ${color}`, borderRadius: '10px', padding: '15px', textAlign: 'center' }}>
        <div style={{ fontSize: '1.8em', marginBottom: '5px' }}>{icon}</div>
        <div style={{ color, fontSize: '1.5em', fontWeight: 'bold' }}>{value}</div>
        <div style={{ color: '#fff', fontSize: '0.9em' }}>{label}</div>
    </div>
);

const StatPill = ({ label, value, color }) => (
    <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#888', fontSize: '11px' }}>{label}</div>
        <div style={{ color, fontWeight: 'bold', fontSize: '14px' }}>{value}</div>
    </div>
);

const DetailItem = ({ label, value }) => (
    <div>
        <span style={{ color: '#888', fontSize: '12px' }}>{label}:</span>
        <span style={{ color: '#fff', marginLeft: '5px', fontSize: '13px' }}>{value}</span>
    </div>
);

const SummaryCard = ({ title, value, subValue, color }) => (
    <div style={{ backgroundColor: '#1a1a1a', border: `2px solid ${color}`, borderRadius: '10px', padding: '15px', flex: 1 }}>
        <div style={{ color: '#888', fontSize: '0.9em' }}>{title}</div>
        <div style={{ color, fontSize: '1.8em', fontWeight: 'bold' }}>{value}</div>
        {subValue && <div style={{ color: '#fff' }}>{subValue}</div>}
    </div>
);

const MetricItem = ({ label, value }) => (
    <div style={{ backgroundColor: '#000', padding: '10px', borderRadius: '8px' }}>
        <div style={{ color: '#888', fontSize: '0.8em' }}>{label}</div>
        <div style={{ color: '#fff', fontSize: '1.1em', fontWeight: 'bold' }}>{value}</div>
    </div>
);

const EmptyState = ({ message, buttonText, onButtonClick }) => (
    <div style={styles.emptyState}>
        <div style={{ fontSize: '4em', marginBottom: '20px' }}>🌾</div>
        <h3 style={{ color: '#ff1493', marginBottom: '10px' }}>{message}</h3>
        <button onClick={onButtonClick} style={styles.primaryButton}>{buttonText}</button>
    </div>
);

// ── Modal components ───────────────────────────────────────────────────────────
// FIX Bug 9: Modals now receive onSubmit — they collect form data and pass it up.
// Previously they called toast.success() internally and never touched state/API.

const AddFeedModal = ({ onSubmit, onClose }) => {
    const [form, setForm] = useState({
        feed_type: '', feed_type_category: 'piglet',
        quantity_kg: '', cost_per_kg: '', supplier: '', min_stock_level: 100,
    });

    const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            ...form,
            quantity_kg:     parseFloat(form.quantity_kg),
            cost_per_kg:     parseFloat(form.cost_per_kg),
            min_stock_level: parseInt(form.min_stock_level),
            purchase_date:   new Date().toISOString().split('T')[0],
        });
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <h2 style={{ color: '#ff1493', marginBottom: '20px' }}>➕ Add new feed</h2>
                <form onSubmit={handleSubmit}>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Feed name *</label>
                            <input name="feed_type" value={form.feed_type} onChange={handleChange} style={modalInput} placeholder="e.g., Starter Crumbs" required />
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Category *</label>
                            <select name="feed_type_category" value={form.feed_type_category} onChange={handleChange} style={modalInput} required>
                                <option value="piglet">Piglet</option>
                                <option value="grower">Grower</option>
                                <option value="finisher">Finisher</option>
                                <option value="sow">Sow</option>
                                <option value="boar">Boar</option>
                            </select>
                        </div>
                    </div>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Quantity (kg) *</label>
                            <input name="quantity_kg" type="number" min="0" step="0.1" value={form.quantity_kg} onChange={handleChange} style={modalInput} required />
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Cost per kg *</label>
                            <input name="cost_per_kg" type="number" min="0" step="0.01" value={form.cost_per_kg} onChange={handleChange} style={modalInput} required />
                        </div>
                    </div>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Supplier</label>
                            <input name="supplier" value={form.supplier} onChange={handleChange} style={modalInput} placeholder="Supplier name" />
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Min stock level (kg)</label>
                            <input name="min_stock_level" type="number" min="0" value={form.min_stock_level} onChange={handleChange} style={modalInput} />
                        </div>
                    </div>
                    <div style={modalButtonGroup}>
                        <button type="button" onClick={onClose} style={modalCancelButton}>Cancel</button>
                        <button type="submit" style={modalSubmitButton}>Add feed</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AllocateModal = ({ inventory, onSubmit, onClose }) => {
    const today = new Date().toISOString().split('T')[0];
    const [form, setForm] = useState({
        feed_id: inventory[0]?.id || '',
        allocation_date: today,
        quantity_kg: '',
        feeding_time: 'morning',
        allocated_to_type: 'sow',
        allocated_to_name: '',
        notes: '',
    });

    const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            ...form,
            feed_id:     parseInt(form.feed_id),
            quantity_kg: parseFloat(form.quantity_kg),
        });
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <h2 style={{ color: '#4CAF50', marginBottom: '20px' }}>🍽️ Record feeding</h2>
                <form onSubmit={handleSubmit}>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Feed type *</label>
                            <select name="feed_id" value={form.feed_id} onChange={handleChange} style={modalInput} required>
                                {inventory.map(f => (
                                    <option key={f.id} value={f.id}>
                                        {f.feed_type} ({f.quantity_kg} kg available)
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Date *</label>
                            <input name="allocation_date" type="date" value={form.allocation_date} onChange={handleChange} style={modalInput} required />
                        </div>
                    </div>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Quantity (kg) *</label>
                            <input name="quantity_kg" type="number" min="0.1" step="0.1" value={form.quantity_kg} onChange={handleChange} style={modalInput} required />
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Feeding time *</label>
                            <select name="feeding_time" value={form.feeding_time} onChange={handleChange} style={modalInput} required>
                                <option value="morning">Morning</option>
                                <option value="afternoon">Afternoon</option>
                                <option value="evening">Evening</option>
                            </select>
                        </div>
                    </div>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Allocate to *</label>
                            <select name="allocated_to_type" value={form.allocated_to_type} onChange={handleChange} style={modalInput} required>
                                <option value="sow">Sow</option>
                                <option value="litter">Litter</option>
                                <option value="pen">Pen</option>
                                <option value="group">Group</option>
                            </select>
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Name / ID</label>
                            <input name="allocated_to_name" value={form.allocated_to_name} onChange={handleChange} style={modalInput} placeholder="e.g., S001 - Daisy" />
                        </div>
                    </div>
                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Notes</label>
                        <textarea name="notes" value={form.notes} onChange={handleChange} style={{ ...modalInput, minHeight: '80px' }} placeholder="Optional notes" />
                    </div>
                    <div style={modalButtonGroup}>
                        <button type="button" onClick={onClose} style={modalCancelButton}>Cancel</button>
                        <button type="submit" style={{ ...modalSubmitButton, backgroundColor: '#4CAF50' }}>Record feeding</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const RestockModal = ({ feed, onSubmit, onClose }) => {
    const [form, setForm] = useState({ quantity_kg: '', cost_per_kg: feed.cost_per_kg, supplier: feed.supplier });
    const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            quantity_kg: parseFloat(form.quantity_kg),
            cost_per_kg: parseFloat(form.cost_per_kg) || undefined,
            supplier:    form.supplier || undefined,
        });
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <h2 style={{ color: '#ff9800', marginBottom: '20px' }}>📦 Restock: {feed.feed_type}</h2>
                <form onSubmit={handleSubmit}>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Current stock</label>
                            <input style={modalInput} value={`${feed.quantity_kg} kg`} disabled />
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Min level</label>
                            <input style={modalInput} value={`${feed.min_stock_level} kg`} disabled />
                        </div>
                    </div>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Add quantity (kg) *</label>
                            <input name="quantity_kg" type="number" min="1" value={form.quantity_kg} onChange={handleChange} style={modalInput} placeholder="e.g., 500" required />
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>New cost per kg</label>
                            <input name="cost_per_kg" type="number" step="0.01" value={form.cost_per_kg} onChange={handleChange} style={modalInput} />
                        </div>
                    </div>
                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Supplier</label>
                        <input name="supplier" value={form.supplier} onChange={handleChange} style={modalInput} />
                    </div>
                    <div style={modalButtonGroup}>
                        <button type="button" onClick={onClose} style={modalCancelButton}>Cancel</button>
                        <button type="submit" style={{ ...modalSubmitButton, backgroundColor: '#ff9800' }}>Restock</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ── Styles ─────────────────────────────────────────────────────────────────────

const modalOverlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
};
const modalContentStyle = {
    backgroundColor: '#1a1a1a', border: '2px solid #ff1493', borderRadius: '20px',
    padding: '30px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto',
};
const modalFormGroup  = { marginBottom: '15px', flex: 1 };
const modalRow        = { display: 'flex', gap: '15px', marginBottom: '15px' };
const modalLabel      = { color: '#ff1493', display: 'block', marginBottom: '5px', fontSize: '0.95em' };
const modalInput      = { width: '100%', padding: '10px', backgroundColor: '#000', border: '2px solid #ff1493', borderRadius: '8px', color: '#fff', fontSize: '1em', boxSizing: 'border-box' };
const modalButtonGroup = { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' };
const modalCancelButton = { padding: '10px 20px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const modalSubmitButton = { padding: '10px 20px', backgroundColor: '#ff1493', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };

const styles = {
    container:      { padding: '20px', backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff', boxSizing: 'border-box' },
    loadingContainer: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#000', flexDirection: 'column', gap: '12px' },
    loadingText:    { color: '#ff1493', fontSize: '1.2em' },
    header:         { background: '#000', border: '2px solid #ff1493', borderRadius: '20px', padding: '20px', marginBottom: '20px' },
    headerTop:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    title:          { color: '#ff1493', margin: 0, fontSize: '2em' },
    headerButtons:  { display: 'flex', gap: '10px' },
    primaryButton:  { backgroundColor: '#ff1493', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '50px', fontSize: '1em', fontWeight: 'bold', cursor: 'pointer' },
    successButton:  { backgroundColor: '#4CAF50', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '50px', fontSize: '1em', fontWeight: 'bold', cursor: 'pointer' },
    statsGrid:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '15px' },
    alertBanner:    { backgroundColor: '#b71c1c', padding: '10px 15px', borderRadius: '10px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' },
    tabContainer:   { display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ff1493', paddingBottom: '10px', flexWrap: 'wrap' },
    tab:            { padding: '8px 16px', backgroundColor: 'transparent', color: '#888', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '0.95em' },
    activeTab:      { padding: '8px 16px', backgroundColor: '#ff1493', color: '#000', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '0.95em', fontWeight: 'bold' },
    filterBar:      { marginBottom: '20px' },
    filterSelect:   { padding: '10px 20px', backgroundColor: '#1a1a1a', border: '2px solid #ff1493', borderRadius: '50px', color: '#fff', fontSize: '1em', width: '200px' },
    tabContent:     { minHeight: '500px' },
    inventoryGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' },
    inventoryCard:  { backgroundColor: '#1a1a1a', border: '2px solid', borderRadius: '15px', padding: '20px' },
    cardHeader:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
    feedName:       { color: '#ff1493', margin: 0, fontSize: '1.3em' },
    feedType:       { backgroundColor: '#333', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' },
    stockBadge:     { padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', color: '#000' },
    stockBar:       { height: '8px', backgroundColor: '#333', borderRadius: '4px', marginBottom: '15px', overflow: 'hidden' },
    statsRow:       { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '15px', backgroundColor: '#000', padding: '10px', borderRadius: '8px' },
    detailsGrid:    { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '15px' },
    cardActions:    { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' },
    actionButton:   { padding: '8px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' },
    sectionHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
    sectionTitle:   { color: '#ff1493', margin: 0, fontSize: '1.3em' },
    smallButton:    { padding: '8px 16px', backgroundColor: '#ff1493', color: '#000', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' },
    tableContainer: { overflowX: 'auto', backgroundColor: '#1a1a1a', borderRadius: '10px', padding: '10px', marginBottom: '20px' },
    table:          { width: '100%', borderCollapse: 'collapse' },
    summaryCards:   { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' },
    analyticsGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' },
    chartCard:      { backgroundColor: '#1a1a1a', border: '2px solid #ff1493', borderRadius: '10px', padding: '20px' },
    metricsCard:    { backgroundColor: '#1a1a1a', border: '2px solid #ff1493', borderRadius: '10px', padding: '20px' },
    metricsGrid:    { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' },
    chartContainer: { backgroundColor: '#1a1a1a', border: '2px solid #ff1493', borderRadius: '10px', padding: '20px', marginTop: '20px' },
    chartTitle:     { color: '#ff1493', marginBottom: '15px', fontSize: '1.1em' },
    timeline:       { position: 'relative', paddingLeft: '20px' },
    timelineItem:   { position: 'relative', paddingBottom: '20px', borderLeft: '2px solid #ff1493', paddingLeft: '20px', marginLeft: '10px' },
    timelineDot:    { position: 'absolute', left: '-10px', top: '0', width: '20px', height: '20px', borderRadius: '50%' },
    timelineContent: { backgroundColor: '#1a1a1a', padding: '10px', borderRadius: '8px' },
    timelineDate:   { color: '#ff1493', fontSize: '0.9em', marginBottom: '5px' },
    timelineDesc:   { color: '#fff' },
    emptyState:     { backgroundColor: '#1a1a1a', border: '2px dashed #ff1493', borderRadius: '20px', padding: '60px', textAlign: 'center' },
};

export default Feed;
