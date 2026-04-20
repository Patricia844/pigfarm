import React, { useState, useEffect, useCallback } from 'react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ComposedChart, Area
} from 'recharts';
import toast from 'react-hot-toast';
import API from '../services/api';

const COLORS = {
    primary: '#ff1493',
    success: '#4CAF50',
    warning: '#ff9800',
    danger: '#f44336',
    info: '#2196F3',
    purple: '#9C27B0'
};
const PIE_COLORS = ['#ff1493', '#4CAF50', '#2196F3', '#ff9800', '#f44336', '#9C27B0'];

const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount || 0);

const formatNumber = (num) =>
    new Intl.NumberFormat('en-US').format(num || 0);

function Reports() {
    const [activeTab, setActiveTab] = useState('overview');
    const [dateRange, setDateRange] = useState('month');
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [loading, setLoading] = useState(true);

    // ── Real data state ──────────────────────────────────────────────────────
    const [overview, setOverview] = useState({
        totalPigs: 0,
        totalLitters: 0,
        avgLitterSize: 0,
        mortalityRate: 0,
        feedConsumption: 0,
        totalIncome: 0,
        totalExpenses: 0,
        netProfit: 0,
    });

    const [productionReport, setProductionReport] = useState({
        bestSow: null,
        bestLitter: null,
    });

    const [litters, setLitters] = useState([]);
    const [sows, setSows] = useState([]);
    const [monthlyFinance, setMonthlyFinance] = useState([]);
    const [feedInventory, setFeedInventory] = useState([]);
    const [healthRecords, setHealthRecords] = useState([]);
    const [income, setIncome] = useState([]);
    const [expenses, setExpenses] = useState([]);

    // ── Fetch functions ──────────────────────────────────────────────────────
    const fetchOverview = useCallback(async () => {
        try {
            const res = await API.get('/reports/overview');
            setOverview(res.data);
        } catch (err) {
            console.error('Overview error:', err);
        }
    }, []);

    const fetchProduction = useCallback(async () => {
        try {
            const res = await API.get('/reports/production');
            setProductionReport(res.data);
        } catch (err) {
            console.error('Production error:', err);
        }
    }, []);

    const fetchLitters = useCallback(async () => {
        try {
            const res = await API.get('/litters');
            setLitters(res.data);
        } catch (err) {
            console.error('Litters error:', err);
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

    const fetchMonthlyFinance = useCallback(async () => {
        try {
            const res = await API.get('/finance/monthly');
            setMonthlyFinance(res.data);
        } catch (err) {
            console.error('Monthly finance error:', err);
        }
    }, []);

    const fetchFeed = useCallback(async () => {
        try {
            const res = await API.get('/feed');
            setFeedInventory(res.data);
        } catch (err) {
            console.error('Feed error:', err);
        }
    }, []);

    const fetchHealth = useCallback(async () => {
        try {
            const res = await API.get('/health');
            setHealthRecords(res.data);
        } catch (err) {
            console.error('Health error:', err);
        }
    }, []);

    const fetchFinance = useCallback(async () => {
        try {
            const [incRes, expRes] = await Promise.all([
                API.get('/income'),
                API.get('/expenses'),
            ]);
            setIncome(incRes.data);
            setExpenses(expRes.data);
        } catch (err) {
            console.error('Finance error:', err);
        }
    }, []);

    useEffect(() => {
        const loadAll = async () => {
            setLoading(true);
            await Promise.all([
                fetchOverview(),
                fetchProduction(),
                fetchLitters(),
                fetchSows(),
                fetchMonthlyFinance(),
                fetchFeed(),
                fetchHealth(),
                fetchFinance(),
            ]);
            setLoading(false);
        };
        loadAll();
    }, [fetchOverview, fetchProduction, fetchLitters, fetchSows,
        fetchMonthlyFinance, fetchFeed, fetchHealth, fetchFinance]);

    // ── Derived data ─────────────────────────────────────────────────────────

    // Sow performance from real litters data
    const sowPerformance = sows.map(sow => {
        const sowLitters = litters.filter(l => l.sow_id === sow.id);
        const totalBorn = sowLitters.reduce((s, l) => s + (l.born_alive || 0), 0);
        const totalWeaned = sowLitters.reduce((s, l) => s + (l.number_weaned || 0), 0);
        const avgSurvival = sowLitters.length > 0
            ? sowLitters.reduce((s, l) => s + (l.survival_rate || 0), 0) / sowLitters.length
            : 0;
        const score = Math.min(100, Math.round((avgSurvival * 0.6) + (totalBorn / 15 * 100 * 0.4)));
        return {
            id: sow.tag_number,
            name: sow.name,
            litters: sowLitters.length,
            piglets: totalBorn,
            weaned: totalWeaned,
            avgLitter: sowLitters.length > 0 ? (totalBorn / sowLitters.length).toFixed(1) : 0,
            score,
        };
    }).sort((a, b) => b.score - a.score);

    // Feed breakdown from inventory
    const feedTypeData = feedInventory.map(f => ({
        name: f.feed_type_category || f.feed_type,
        used: parseFloat(f.quantity_kg || 0),
        value: parseFloat(f.quantity_kg || 0),
    }));

    // Expense breakdown from real expenses
    const expenseByCategory = expenses.reduce((acc, e) => {
        const found = acc.find(x => x.category === e.category);
        if (found) found.amount += parseFloat(e.amount);
        else acc.push({ category: e.category, amount: parseFloat(e.amount) });
        return acc;
    }, []);

    // Income by source
    const incomeBySource = income.reduce((acc, i) => {
        const found = acc.find(x => x.source === i.source);
        if (found) found.amount += parseFloat(i.amount);
        else acc.push({ source: i.source, amount: parseFloat(i.amount) });
        return acc;
    }, []);

    // Health records by type
    const healthByType = healthRecords.reduce((acc, r) => {
        acc[r.record_type] = (acc[r.record_type] || 0) + 1;
        return acc;
    }, {});

    // Smart insights from real data
    const insights = [];
    if (overview.mortalityRate > 5) insights.push({ type: 'warning', message: `Mortality rate is ${overview.mortalityRate}% — above the 5% target` });
    if (overview.mortalityRate <= 5 && overview.mortalityRate > 0) insights.push({ type: 'success', message: `Mortality rate is ${overview.mortalityRate}% — within target range` });
    if (productionReport.bestSow) insights.push({ type: 'success', message: `Top sow: ${productionReport.bestSow.tag_number} - ${productionReport.bestSow.name} (${productionReport.bestSow.total_alive} alive)` });
    if (overview.netProfit > 0) insights.push({ type: 'success', message: `Farm is profitable — net profit $${formatNumber(overview.netProfit)}` });
    if (overview.netProfit < 0) insights.push({ type: 'warning', message: `Farm is operating at a loss — review expenses` });
    if (expenseByCategory.length > 0) {
        const topExpense = expenseByCategory.sort((a, b) => b.amount - a.amount)[0];
        if (topExpense) insights.push({ type: 'info', message: `Highest expense category: ${topExpense.category} (${formatCurrency(topExpense.amount)})` });
    }
    if (insights.length === 0) insights.push({ type: 'info', message: 'Add more data to see smart insights about your farm' });

    // Farm score calculation from real data
    const farmScore = Math.min(100, Math.round(
        (overview.mortalityRate <= 5 ? 30 : 10) +
        (overview.netProfit > 0 ? 30 : 0) +
        (overview.totalLitters > 0 ? 20 : 0) +
        (overview.avgLitterSize >= 10 ? 20 : overview.avgLitterSize * 2)
    ));

    const handleExport = (format) => {
        toast.success(`Export as ${format} coming soon!`);
        setShowExportMenu(false);
    };

    if (loading) return (
        <div style={{ color: '#ff1493', textAlign: 'center', padding: '60px', fontSize: '1.2em' }}>
            Loading reports...
        </div>
    );

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerTop}>
                    <h1 style={styles.title}>📊 Reports & Analytics</h1>
                    <div style={{ position: 'relative' }}>
                        <button onClick={() => setShowExportMenu(!showExportMenu)} style={styles.exportButton}>
                            📤 Export Report
                        </button>
                        {showExportMenu && (
                            <div style={styles.exportMenu}>
                                {['PDF', 'Excel', 'CSV'].map(f => (
                                    <button key={f} onClick={() => handleExport(f)} style={styles.exportMenuItem}>
                                        {f === 'PDF' ? '📄' : f === 'Excel' ? '📊' : '📑'} Export as {f}
                                    </button>
                                ))}
                                <button onClick={() => { window.print(); setShowExportMenu(false); }} style={styles.exportMenuItem}>
                                    🖨️ Print Report
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Farm Score Card */}
                <div style={styles.farmScoreCard}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#888', fontSize: '0.9em' }}>Farm Performance Score</div>
                        <div style={{ color: '#ff1493', fontSize: '3em', fontWeight: 'bold', lineHeight: 1 }}>{farmScore}</div>
                        <div style={{ color: '#888', fontSize: '0.8em' }}>out of 100</div>
                    </div>
                    <div style={{ flex: 1 }}>
                        {productionReport.bestSow && (
                            <div style={styles.farmScoreInsight}>
                                🏆 Best Sow: {productionReport.bestSow.tag_number} - {productionReport.bestSow.name}
                            </div>
                        )}
                        {productionReport.bestLitter && (
                            <div style={styles.farmScoreInsight}>
                                🏆 Best Litter: Sow {productionReport.bestLitter.sow_tag} — {productionReport.bestLitter.born_alive} born alive
                            </div>
                        )}
                        {!productionReport.bestSow && !productionReport.bestLitter && (
                            <div style={styles.farmScoreInsight}>
                                Add litters and sow data to see performance highlights
                            </div>
                        )}
                    </div>
                </div>

                {/* Summary Cards */}
                <div style={styles.summaryGrid}>
                    <SummaryCard icon="🐷" value={overview.totalPigs} label="Total Pigs" color={COLORS.primary} />
                    <SummaryCard icon="🐖" value={overview.totalLitters} label="Total Litters" color={COLORS.success} />
                    <SummaryCard icon="📊" value={overview.avgLitterSize} label="Avg Litter Size" color={COLORS.info} />
                    <SummaryCard icon="💔" value={`${overview.mortalityRate}%`} label="Mortality Rate" color={COLORS.danger} />
                    <SummaryCard icon="🌾" value={`${formatNumber(overview.feedConsumption)} kg`} label="Feed Used (week)" color={COLORS.warning} />
                    <SummaryCard icon="💰" value={formatCurrency(overview.totalIncome)} label="Income" color={COLORS.success} />
                    <SummaryCard icon="💸" value={formatCurrency(overview.totalExpenses)} label="Expenses" color={COLORS.danger} />
                    <SummaryCard icon="📈" value={formatCurrency(overview.netProfit)} label="Net Profit" color={COLORS.primary} />
                </div>
            </div>

            {/* Filters */}
            <div style={styles.filterBar}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <label style={{ color: '#ff1493' }}>Date Range:</label>
                    <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} style={styles.filterSelect}>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="year">This Year</option>
                    </select>
                </div>
            </div>

            {/* Smart Insights */}
            <div style={styles.insightsBanner}>
                <div style={{ color: '#ff1493', fontWeight: 'bold', marginBottom: '10px' }}>🔍 Smart Insights</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {insights.map((insight, i) => (
                        <div key={i} style={{
                            padding: '8px', borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '10px',
                            backgroundColor: insight.type === 'warning' ? 'rgba(244,67,54,0.2)' :
                                insight.type === 'success' ? 'rgba(76,175,80,0.2)' : 'rgba(33,150,243,0.2)'
                        }}>
                            <span style={{ color: insight.type === 'warning' ? COLORS.danger : insight.type === 'success' ? COLORS.success : COLORS.info }}>
                                {insight.type === 'warning' ? '⚠️' : insight.type === 'success' ? '✅' : 'ℹ️'}
                            </span>
                            {insight.message}
                        </div>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div style={styles.tabContainer}>
                {[['overview', '📊 Overview'], ['production', '🐖 Production'],
                  ['health', '💊 Health'], ['feed', '🌽 Feed'], ['finance', '💰 Finance']].map(([tab, label]) => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        style={activeTab === tab ? styles.activeTab : styles.tab}>
                        {label}
                    </button>
                ))}
            </div>

            <div style={styles.tabContent}>

                {/* OVERVIEW */}
                {activeTab === 'overview' && (
                    <div>
                        <div style={styles.chartCard}>
                            <h3 style={styles.chartTitle}>Monthly Profit Trend</h3>
                            {monthlyFinance.length === 0 ? (
                                <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>No financial data yet.</div>
                            ) : (
                                <div style={{ height: '300px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={monthlyFinance}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                            <XAxis dataKey="month" stroke="#888" />
                                            <YAxis stroke="#888" />
                                            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '2px solid #ff1493' }} formatter={(v) => formatCurrency(v)} />
                                            <Legend />
                                            <Bar dataKey="income" fill={COLORS.success} name="Income" />
                                            <Bar dataKey="expense" fill={COLORS.danger} name="Expense" />
                                            <Line type="monotone" dataKey="profit" stroke={COLORS.primary} strokeWidth={3} name="Profit" />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        <div style={styles.twoColumn}>
                            <div style={styles.chartCard}>
                                <h3 style={styles.chartTitle}>Income vs Expenses</h3>
                                {overview.totalIncome === 0 && overview.totalExpenses === 0 ? (
                                    <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>No data yet.</div>
                                ) : (
                                    <div style={{ height: '250px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={[
                                                    { name: 'Income', value: overview.totalIncome },
                                                    { name: 'Expenses', value: overview.totalExpenses }
                                                ]} cx="50%" cy="50%" outerRadius={80}
                                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                    labelLine={false} dataKey="value">
                                                    <Cell fill={COLORS.success} />
                                                    <Cell fill={COLORS.danger} />
                                                </Pie>
                                                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '2px solid #ff1493' }} formatter={(v) => formatCurrency(v)} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', color: '#888' }}>
                                    <span>Net Profit: <span style={{ color: COLORS.primary }}>{formatCurrency(overview.netProfit)}</span></span>
                                </div>
                            </div>

                            <div style={styles.chartCard}>
                                <h3 style={styles.chartTitle}>Expense Breakdown</h3>
                                {expenseByCategory.length === 0 ? (
                                    <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>No expenses recorded yet.</div>
                                ) : (
                                    <div style={{ height: '250px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={expenseByCategory} cx="50%" cy="50%" outerRadius={80}
                                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                    labelLine={false} dataKey="amount" nameKey="category">
                                                    {expenseByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '2px solid #ff1493' }} formatter={(v) => formatCurrency(v)} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* PRODUCTION */}
                {activeTab === 'production' && (
                    <div>
                        <div style={styles.chartCard}>
                            <h3 style={styles.chartTitle}>Litter Performance (Born vs Weaned)</h3>
                            {litters.length === 0 ? (
                                <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>No litters recorded yet.</div>
                            ) : (
                                <div style={{ height: '300px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={litters.slice(0, 10)}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                            <XAxis dataKey="id" stroke="#888" />
                                            <YAxis stroke="#888" />
                                            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '2px solid #ff1493' }} />
                                            <Legend />
                                            <Bar dataKey="total_born" fill={COLORS.info} name="Born" />
                                            <Bar dataKey="born_alive" fill={COLORS.success} name="Alive" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        <div style={styles.chartCard}>
                            <h3 style={styles.chartTitle}>Sow Performance Ranking</h3>
                            {sowPerformance.length === 0 ? (
                                <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>No sow data yet.</div>
                            ) : (
                                <div style={styles.tableContainer}>
                                    <table style={styles.table}>
                                        <thead>
                                            <tr>
                                                {['Rank', 'Sow', 'Litters', 'Total Piglets', 'Weaned', 'Avg/Litter', 'Score'].map(h => (
                                                    <th key={h} style={thStyle}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sowPerformance.map((sow, i) => (
                                                <tr key={sow.id}>
                                                    <td style={tdStyle}>{i === 0 ? '🏆' : i + 1}</td>
                                                    <td style={tdStyle}><strong>{sow.id}</strong> - {sow.name}</td>
                                                    <td style={tdStyle}>{sow.litters}</td>
                                                    <td style={tdStyle}>{sow.piglets}</td>
                                                    <td style={{ ...tdStyle, color: COLORS.success }}>{sow.weaned}</td>
                                                    <td style={tdStyle}>{sow.avgLitter}</td>
                                                    <td style={tdStyle}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                            <div style={{ width: '60px', height: '10px', backgroundColor: '#333', borderRadius: '5px', overflow: 'hidden' }}>
                                                                <div style={{ width: `${sow.score}%`, height: '100%', backgroundColor: sow.score > 80 ? COLORS.success : COLORS.warning, borderRadius: '5px' }} />
                                                            </div>
                                                            <span>{sow.score}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Litter survival rates */}
                        <div style={styles.chartCard}>
                            <h3 style={styles.chartTitle}>Litter Survival Rates</h3>
                            {litters.length === 0 ? (
                                <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>No litters yet.</div>
                            ) : (
                                <div style={{ height: '250px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={litters.slice(0, 10)}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                            <XAxis dataKey="id" stroke="#888" />
                                            <YAxis stroke="#888" domain={[0, 100]} />
                                            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '2px solid #ff1493' }} formatter={(v) => `${v}%`} />
                                            <Bar dataKey="survival_rate" fill={COLORS.primary} name="Survival %" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* HEALTH */}
                {activeTab === 'health' && (
                    <div>
                        <div style={styles.chartCard}>
                            <h3 style={styles.chartTitle}>Health Records by Type</h3>
                            {healthRecords.length === 0 ? (
                                <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>No health records yet.</div>
                            ) : (
                                <div style={{ height: '300px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={Object.entries(healthByType).map(([k, v]) => ({ type: k, count: v }))}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                            <XAxis dataKey="type" stroke="#888" />
                                            <YAxis stroke="#888" />
                                            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '2px solid #ff1493' }} />
                                            <Bar dataKey="count" fill={COLORS.info} name="Records" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        <div style={styles.chartCard}>
                            <h3 style={styles.chartTitle}>Health Stats Summary</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                                <StatBox label="Total Records" value={healthRecords.length} color={COLORS.info} />
                                <StatBox label="Vaccinations" value={healthByType['vaccination'] || 0} color={COLORS.success} />
                                <StatBox label="Treatments" value={healthByType['treatment'] || 0} color={COLORS.warning} />
                                <StatBox label="Checkups" value={healthByType['checkup'] || 0} color={COLORS.primary} />
                            </div>
                        </div>
                    </div>
                )}

                {/* FEED */}
                {activeTab === 'feed' && (
                    <div>
                        <div style={styles.chartCard}>
                            <h3 style={styles.chartTitle}>Feed Inventory by Type</h3>
                            {feedInventory.length === 0 ? (
                                <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>No feed data yet.</div>
                            ) : (
                                <div style={styles.twoColumn}>
                                    <div style={{ height: '250px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={feedTypeData} cx="50%" cy="50%" outerRadius={80}
                                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                    labelLine={false} dataKey="value" nameKey="name">
                                                    {feedTypeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '2px solid #ff1493' }} formatter={(v) => `${formatNumber(v)} kg`} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div>
                                        {feedInventory.map(f => (
                                            <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#000', borderRadius: '5px', marginBottom: '8px' }}>
                                                <span>{f.feed_type}</span>
                                                <span style={{ color: COLORS.warning }}>{formatNumber(f.quantity_kg)} kg</span>
                                                <span style={{ color: f.stock_status === 'low' ? COLORS.danger : COLORS.success }}>
                                                    {f.stock_status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={styles.chartCard}>
                            <h3 style={styles.chartTitle}>Feed Stock Levels</h3>
                            {feedInventory.length === 0 ? (
                                <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>No feed data yet.</div>
                            ) : (
                                <div style={{ height: '250px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={feedInventory}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                            <XAxis dataKey="feed_type" stroke="#888" />
                                            <YAxis stroke="#888" />
                                            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '2px solid #ff1493' }} />
                                            <Bar dataKey="quantity_kg" fill={COLORS.warning} name="Stock (kg)" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* FINANCE */}
                {activeTab === 'finance' && (
                    <div>
                        <div style={styles.chartCard}>
                            <h3 style={styles.chartTitle}>Financial Summary</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
                                <StatBox label="Total Income" value={formatCurrency(overview.totalIncome)} color={COLORS.success} />
                                <StatBox label="Total Expenses" value={formatCurrency(overview.totalExpenses)} color={COLORS.danger} />
                                <StatBox label="Net Profit" value={formatCurrency(overview.netProfit)} color={COLORS.primary} />
                                <StatBox label="Income Transactions" value={income.length} color={COLORS.info} />
                                <StatBox label="Expense Transactions" value={expenses.length} color={COLORS.warning} />
                            </div>
                        </div>

                        <div style={styles.chartCard}>
                            <h3 style={styles.chartTitle}>Income by Source</h3>
                            {incomeBySource.length === 0 ? (
                                <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>No income recorded yet.</div>
                            ) : (
                                <div style={{ height: '250px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={incomeBySource}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                            <XAxis dataKey="source" stroke="#888" />
                                            <YAxis stroke="#888" />
                                            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '2px solid #ff1493' }} formatter={(v) => formatCurrency(v)} />
                                            <Bar dataKey="amount" fill={COLORS.success} name="Amount" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        <div style={styles.chartCard}>
                            <h3 style={styles.chartTitle}>Monthly Trend</h3>
                            {monthlyFinance.length === 0 ? (
                                <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>No monthly data yet.</div>
                            ) : (
                                <div style={{ height: '300px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={monthlyFinance}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                            <XAxis dataKey="month" stroke="#888" />
                                            <YAxis stroke="#888" />
                                            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '2px solid #ff1493' }} formatter={(v) => formatCurrency(v)} />
                                            <Legend />
                                            <Line type="monotone" dataKey="income" stroke={COLORS.success} name="Income" />
                                            <Line type="monotone" dataKey="expense" stroke={COLORS.danger} name="Expense" />
                                            <Line type="monotone" dataKey="profit" stroke={COLORS.primary} strokeWidth={3} name="Profit" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Helper Components ────────────────────────────────────────────────────────
const SummaryCard = ({ icon, value, label, color }) => (
    <div style={{ backgroundColor: '#1a1a1a', border: `2px solid ${color}`, borderRadius: '10px', padding: '15px', textAlign: 'center' }}>
        <div style={{ fontSize: '1.5em', marginBottom: '5px' }}>{icon}</div>
        <div style={{ color, fontSize: '1.2em', fontWeight: 'bold' }}>{value}</div>
        <div style={{ color: '#888', fontSize: '0.8em' }}>{label}</div>
    </div>
);

const StatBox = ({ label, value, color }) => (
    <div style={{ backgroundColor: '#000', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
        <div style={{ color: '#888', fontSize: '0.8em' }}>{label}</div>
        <div style={{ color, fontSize: '1.2em', fontWeight: 'bold' }}>{value}</div>
    </div>
);

// ── Shared cell styles ────────────────────────────────────────────────────────
const thStyle = { textAlign: 'left', padding: '12px', color: '#ff1493', borderBottom: '2px solid #ff1493' };
const tdStyle = { padding: '10px', borderBottom: '1px solid #333' };

// ── Page styles ───────────────────────────────────────────────────────────────
const styles = {
    container: { padding: '20px', backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff', width: '100%', boxSizing: 'border-box' },
    header: { background: '#000', border: '2px solid #ff1493', borderRadius: '20px', padding: '20px', marginBottom: '20px' },
    headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    title: { color: '#ff1493', margin: 0, fontSize: '2em' },
    exportButton: { backgroundColor: '#4CAF50', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '50px', fontSize: '1em', fontWeight: 'bold', cursor: 'pointer' },
    exportMenu: { position: 'absolute', top: '50px', right: '0', backgroundColor: '#1a1a1a', border: '2px solid #ff1493', borderRadius: '10px', padding: '10px', zIndex: 1000, minWidth: '180px' },
    exportMenuItem: { width: '100%', padding: '10px', backgroundColor: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: '5px' },
    farmScoreCard: { backgroundColor: '#1a1a1a', border: '2px solid #ff1493', borderRadius: '15px', padding: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' },
    farmScoreInsight: { color: '#fff', marginBottom: '5px', padding: '5px', backgroundColor: '#000', borderRadius: '5px' },
    summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' },
    filterBar: { display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap', backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '10px' },
    filterSelect: { padding: '8px', backgroundColor: '#000', border: '2px solid #ff1493', borderRadius: '5px', color: '#fff' },
    insightsBanner: { backgroundColor: '#1a1a1a', border: '2px solid #ff1493', borderRadius: '10px', padding: '15px', marginBottom: '20px' },
    tabContainer: { display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ff1493', paddingBottom: '10px', flexWrap: 'wrap' },
    tab: { padding: '8px 16px', backgroundColor: 'transparent', color: '#888', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '0.95em' },
    activeTab: { padding: '8px 16px', backgroundColor: '#ff1493', color: '#000', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '0.95em', fontWeight: 'bold' },
    tabContent: { minHeight: '500px' },
    chartCard: { backgroundColor: '#1a1a1a', border: '2px solid #ff1493', borderRadius: '15px', padding: '20px', marginBottom: '20px' },
    chartTitle: { color: '#ff1493', marginBottom: '15px', fontSize: '1.2em' },
    twoColumn: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
    tableContainer: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse' },
};

export default Reports;