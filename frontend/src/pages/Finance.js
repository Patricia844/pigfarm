import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import API from '../services/api';

const COLORS = ['#ff1493', '#4CAF50', '#2196F3', '#ff9800', '#f44336', '#9C27B0'];

const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

function Finance() {
    const [activeTab, setActiveTab] = useState('overview');
    const [dateRange, setDateRange] = useState('month');
    const [showIncomeForm, setShowIncomeForm] = useState(false);
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [showDebtForm, setShowDebtForm] = useState(false);
    const [showBudgetForm, setShowBudgetForm] = useState(false);
    const [filterCategory, setFilterCategory] = useState('all');
    const [loading, setLoading] = useState(true);

    // ── Real data state ──────────────────────────────────────────────────────
    const [summary, setSummary] = useState({
        totalIncome: 0,
        totalExpenses: 0,
        netProfit: 0,
        profitMargin: 0,
    });

    const [income, setIncome] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [monthlyData, setMonthlyData] = useState([]);

    // These tabs still use local state (no backend table yet — we add later)
    const [debts, setDebts] = useState([]);
    const [budget, setBudget] = useState({
        monthly_budget: 30000,
        spent: 0,
        remaining: 30000,
        percentage_used: 0,
        categories: [
            { name: 'Feed', budget: 15000, spent: 0, remaining: 15000 },
            { name: 'Medication', budget: 3000, spent: 0, remaining: 3000 },
            { name: 'Labor', budget: 5000, spent: 0, remaining: 5000 },
            { name: 'Transport', budget: 2000, spent: 0, remaining: 2000 },
            { name: 'Utilities', budget: 3000, spent: 0, remaining: 3000 },
            { name: 'Maintenance', budget: 2000, spent: 0, remaining: 2000 },
        ],
    });

    // ── Fetch functions ──────────────────────────────────────────────────────
    const fetchSummary = useCallback(async () => {
        try {
            const res = await API.get(`/finance/summary?period=${dateRange}`);
            setSummary(res.data);
        } catch (err) {
            console.error('Summary fetch error:', err);
        }
    }, [dateRange]);

    const fetchIncome = useCallback(async () => {
        try {
            const res = await API.get('/income');
            setIncome(res.data);
        } catch (err) {
            console.error('Income fetch error:', err);
        }
    }, []);

    const fetchExpenses = useCallback(async () => {
        try {
            const res = await API.get('/expenses');
            setExpenses(res.data);
        } catch (err) {
            console.error('Expenses fetch error:', err);
        }
    }, []);

    const fetchMonthly = useCallback(async () => {
        try {
            const res = await API.get('/finance/monthly');
            setMonthlyData(res.data);
        } catch (err) {
            console.error('Monthly fetch error:', err);
        }
    }, []);

    useEffect(() => {
        const loadAll = async () => {
            setLoading(true);
            await Promise.all([fetchSummary(), fetchIncome(), fetchExpenses(), fetchMonthly()]);
            setLoading(false);
        };
        loadAll();
    }, [fetchSummary, fetchIncome, fetchExpenses, fetchMonthly]);

    // Re-fetch summary when date range changes
    useEffect(() => {
        fetchSummary();
    }, [dateRange, fetchSummary]);

    // ── Derived chart data from real state ───────────────────────────────────
    const categoryData = expenses.reduce((acc, e) => {
        const found = acc.find(x => x.name === e.category);
        if (found) found.value += parseFloat(e.amount);
        else acc.push({ name: e.category, value: parseFloat(e.amount) });
        return acc;
    }, []);

    const incomeSourceData = income.reduce((acc, i) => {
        const found = acc.find(x => x.name === i.source);
        if (found) found.value += parseFloat(i.amount);
        else acc.push({ name: i.source, value: parseFloat(i.amount) });
        return acc;
    }, []);

    // Budget spent per category from real expenses
    const budgetWithReal = budget.categories.map(cat => {
        const spent = expenses
            .filter(e => e.category === cat.name)
            .reduce((sum, e) => sum + parseFloat(e.amount), 0);
        return { ...cat, spent, remaining: cat.budget - spent };
    });
    const totalSpent = budgetWithReal.reduce((s, c) => s + c.spent, 0);
    const budgetDisplay = {
        ...budget,
        spent: totalSpent,
        remaining: budget.monthly_budget - totalSpent,
        percentage_used: ((totalSpent / budget.monthly_budget) * 100).toFixed(1),
        categories: budgetWithReal,
    };

    const filteredExpenses = filterCategory === 'all'
        ? expenses
        : expenses.filter(e => e.category === filterCategory);

    const totalReceivables = debts
        .filter(d => d.type === 'receivable' && d.status === 'pending')
        .reduce((sum, d) => sum + d.amount, 0);
    const totalPayables = debts
        .filter(d => d.type === 'payable' && d.status === 'pending')
        .reduce((sum, d) => sum + d.amount, 0);

    // Avg daily stats
    const avgDailyIncome = summary.totalIncome ? (summary.totalIncome / 30).toFixed(0) : 0;
    const avgDailyExpense = summary.totalExpenses ? (summary.totalExpenses / 30).toFixed(0) : 0;

    const getStatusColor = (status) => {
        switch (status) {
            case 'paid': return '#4CAF50';
            case 'pending': return '#ff9800';
            case 'overdue': return '#f44336';
            default: return '#888';
        }
    };

    const getCategoryIcon = (category) => {
        switch (category) {
            case 'Feed': return '🌾';
            case 'Medication': return '💊';
            case 'Labor': return '👥';
            case 'Transport': return '🚛';
            case 'Utilities': return '⚡';
            case 'Maintenance': return '🔧';
            default: return '💰';
        }
    };

    if (loading) return (
        <div style={{ color: '#ff1493', textAlign: 'center', padding: '60px', fontSize: '1.2em' }}>
            Loading financial data...
        </div>
    );

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerTop}>
                    <h1 style={styles.title}>💰 Financial Management</h1>
                    <div style={styles.headerButtons}>
                        <button onClick={() => setShowIncomeForm(true)} style={styles.incomeButton}>
                            ➕ Add Income
                        </button>
                        <button onClick={() => setShowExpenseForm(true)} style={styles.expenseButton}>
                            ➖ Add Expense
                        </button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div style={styles.summaryGrid}>
                    <SummaryCard title="Total Income" value={formatCurrency(summary.totalIncome)} icon="📈" color="#4CAF50" />
                    <SummaryCard title="Total Expenses" value={formatCurrency(summary.totalExpenses)} icon="📉" color="#f44336" />
                    <SummaryCard
                        title="Net Profit"
                        value={formatCurrency(summary.profit || summary.netProfit || 0)}
                        icon="💰"
                        color={summary.profit >= 0 ? '#4CAF50' : '#f44336'}
                        subValue={`Margin: ${summary.profitMargin || 0}%`}
                    />
                    <SummaryCard title="Monthly Expenses" value={formatCurrency(summary.totalExpenses)} icon="💵" color="#2196F3" subValue="This period" />
                </div>

                {/* Quick Stats */}
                <div style={styles.quickStats}>
                    <QuickStat label="Net Profit" value={formatCurrency(summary.profit || 0)} color="#ff1493" />
                    <QuickStat label="Avg Daily Income" value={formatCurrency(avgDailyIncome)} color="#4CAF50" />
                    <QuickStat label="Avg Daily Expense" value={formatCurrency(avgDailyExpense)} color="#f44336" />
                    <QuickStat label="Profit Margin" value={`${summary.profitMargin || 0}%`} color="#ff9800" />
                </div>
            </div>

            {/* Tabs */}
            <div style={styles.tabContainer}>
                {['overview', 'income', 'expenses', 'profit', 'debts', 'budget'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        style={activeTab === tab ? styles.activeTab : styles.tab}>
                        {tab === 'overview' && '📊 Overview'}
                        {tab === 'income' && '💰 Income'}
                        {tab === 'expenses' && '💸 Expenses'}
                        {tab === 'profit' && '📈 Profit Analysis'}
                        {tab === 'debts' && '💳 Debts'}
                        {tab === 'budget' && '📋 Budget'}
                    </button>
                ))}
            </div>

            {/* Filter bar */}
            <div style={styles.filterBar}>
                <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} style={styles.filterSelect}>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                </select>
                {activeTab === 'expenses' && (
                    <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                        style={{ ...styles.filterSelect, marginLeft: '10px' }}>
                        <option value="all">All Categories</option>
                        <option value="Feed">Feed</option>
                        <option value="Medication">Medication</option>
                        <option value="Labor">Labor</option>
                        <option value="Transport">Transport</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Maintenance">Maintenance</option>
                    </select>
                )}
            </div>

            {/* Tab Content */}
            <div style={styles.tabContent}>

                {/* OVERVIEW */}
                {activeTab === 'overview' && (
                    <div>
                        <div style={styles.chartCard}>
                            <h3 style={styles.chartTitle}>Monthly Income vs Expenses</h3>
                            {monthlyData.length === 0 ? (
                                <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>
                                    No monthly data yet. Add income and expenses to see trends.
                                </div>
                            ) : (
                                <div style={{ height: '300px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={monthlyData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                            <XAxis dataKey="month" stroke="#888" />
                                            <YAxis stroke="#888" />
                                            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '2px solid #ff1493' }} formatter={(v) => formatCurrency(v)} />
                                            <Legend />
                                            <Bar dataKey="income" fill="#4CAF50" name="Income" />
                                            <Bar dataKey="expense" fill="#f44336" name="Expense" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>

                        <div style={styles.twoColumn}>
                            <div style={styles.chartCard}>
                                <h3 style={styles.chartTitle}>Income by Source</h3>
                                {incomeSourceData.length === 0 ? (
                                    <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>No income recorded yet.</div>
                                ) : (
                                    <div style={{ height: '250px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={incomeSourceData} cx="50%" cy="50%" outerRadius={80}
                                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                    labelLine={false} dataKey="value">
                                                    {incomeSourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '2px solid #ff1493' }} formatter={(v) => formatCurrency(v)} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>

                            <div style={styles.chartCard}>
                                <h3 style={styles.chartTitle}>Expenses by Category</h3>
                                {categoryData.length === 0 ? (
                                    <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>No expenses recorded yet.</div>
                                ) : (
                                    <div style={{ height: '250px' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={categoryData} cx="50%" cy="50%" outerRadius={80}
                                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                    labelLine={false} dataKey="value">
                                                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '2px solid #ff1493' }} formatter={(v) => formatCurrency(v)} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={styles.chartCard}>
                            <h3 style={styles.chartTitle}>Profit Trend</h3>
                            {monthlyData.length === 0 ? (
                                <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>No data yet.</div>
                            ) : (
                                <div style={{ height: '250px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={monthlyData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                            <XAxis dataKey="month" stroke="#888" />
                                            <YAxis stroke="#888" />
                                            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '2px solid #ff1493' }} formatter={(v) => formatCurrency(v)} />
                                            <Line type="monotone" dataKey="profit" stroke="#ff1493" strokeWidth={3} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* INCOME */}
                {activeTab === 'income' && (
                    <div>
                        <div style={styles.sectionHeader}>
                            <h2 style={styles.sectionTitle}>Income Transactions ({income.length})</h2>
                            <button onClick={() => setShowIncomeForm(true)} style={styles.smallButton}>+ Add Income</button>
                        </div>
                        {income.length === 0 ? (
                            <div style={{ color: '#888', textAlign: 'center', padding: '60px' }}>
                                No income recorded yet. Click "Add Income" to get started.
                            </div>
                        ) : (
                            <div style={styles.tableContainer}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            {['Date', 'Source', 'Description', 'Amount', 'Customer', 'Payment', 'Status'].map(h => (
                                                <th key={h} style={{ textAlign: 'left', padding: '12px', color: '#ff1493', borderBottom: '2px solid #ff1493' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {income.map(item => (
                                            <tr key={item.id}>
                                                <td style={{ padding: '10px', borderBottom: '1px solid #333' }}>{item.income_date?.split('T')[0] || item.date}</td>
                                                <td style={{ padding: '10px', borderBottom: '1px solid #333' }}>{item.source}</td>
                                                <td style={{ padding: '10px', borderBottom: '1px solid #333' }}>{item.description}</td>
                                                <td style={{ padding: '10px', borderBottom: '1px solid #333', color: '#4CAF50', fontWeight: 'bold' }}>{formatCurrency(item.amount)}</td>
                                                <td style={{ padding: '10px', borderBottom: '1px solid #333' }}>{item.customer || '-'}</td>
                                                <td style={{ padding: '10px', borderBottom: '1px solid #333' }}>{item.payment_method || '-'}</td>
                                                <td style={{ padding: '10px', borderBottom: '1px solid #333' }}>
                                                    <span style={{ ...styles.statusBadge, backgroundColor: getStatusColor(item.status) }}>
                                                        {item.status || 'paid'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div style={styles.summaryCards}>
                            <SummaryCard title="Total Income" value={formatCurrency(income.reduce((s, i) => s + parseFloat(i.amount || 0), 0))} color="#4CAF50" size="small" />
                            <SummaryCard title="Total Transactions" value={income.length} color="#2196F3" size="small" />
                            <SummaryCard title="Pending Payments" value={income.filter(i => i.status === 'pending').length} color="#ff9800" size="small" />
                        </div>
                    </div>
                )}

                {/* EXPENSES */}
                {activeTab === 'expenses' && (
                    <div>
                        <div style={styles.sectionHeader}>
                            <h2 style={styles.sectionTitle}>Expense Transactions ({expenses.length})</h2>
                            <button onClick={() => setShowExpenseForm(true)} style={styles.smallButton}>+ Add Expense</button>
                        </div>
                        {filteredExpenses.length === 0 ? (
                            <div style={{ color: '#888', textAlign: 'center', padding: '60px' }}>
                                No expenses recorded yet. Click "Add Expense" to get started.
                            </div>
                        ) : (
                            <div style={styles.tableContainer}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            {['Date', 'Category', 'Description', 'Amount', 'Payment', 'Supplier', 'Notes'].map(h => (
                                                <th key={h} style={{ textAlign: 'left', padding: '12px', color: '#ff1493', borderBottom: '2px solid #ff1493' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredExpenses.map(item => (
                                            <tr key={item.id}>
                                                <td style={{ padding: '10px', borderBottom: '1px solid #333' }}>{item.expense_date?.split('T')[0] || item.date}</td>
                                                <td style={{ padding: '10px', borderBottom: '1px solid #333' }}>
                                                    <span style={styles.categoryBadge}>{getCategoryIcon(item.category)} {item.category}</span>
                                                </td>
                                                <td style={{ padding: '10px', borderBottom: '1px solid #333' }}>{item.description}</td>
                                                <td style={{ padding: '10px', borderBottom: '1px solid #333', color: '#f44336', fontWeight: 'bold' }}>{formatCurrency(item.amount)}</td>
                                                <td style={{ padding: '10px', borderBottom: '1px solid #333' }}>{item.payment_method || '-'}</td>
                                                <td style={{ padding: '10px', borderBottom: '1px solid #333' }}>{item.supplier || '-'}</td>
                                                <td style={{ padding: '10px', borderBottom: '1px solid #333' }}>{item.notes || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* PROFIT ANALYSIS */}
                {activeTab === 'profit' && (
                    <div>
                        <div style={styles.chartCard}>
                            <h3 style={styles.chartTitle}>Income vs Expenses Breakdown</h3>
                            <div style={styles.breakevenGrid}>
                                <BreakEvenItem label="Total Income" value={formatCurrency(summary.totalIncome)} subtext="All recorded income" />
                                <BreakEvenItem label="Total Expenses" value={formatCurrency(summary.totalExpenses)} subtext="All recorded expenses" />
                                <BreakEvenItem
                                    label="Net Profit"
                                    value={formatCurrency(summary.profit || 0)}
                                    subtext={`${summary.profitMargin || 0}% margin`}
                                />
                            </div>
                        </div>

                        <div style={styles.chartCard}>
                            <h3 style={styles.chartTitle}>Expense Breakdown by Category</h3>
                            {categoryData.length === 0 ? (
                                <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>No expenses recorded yet.</div>
                            ) : (
                                <div style={{ height: '300px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={categoryData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                            <XAxis dataKey="name" stroke="#888" />
                                            <YAxis stroke="#888" />
                                            <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '2px solid #ff1493' }} formatter={(v) => formatCurrency(v)} />
                                            <Bar dataKey="value" fill="#ff1493" name="Amount" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* DEBTS */}
                {activeTab === 'debts' && (
                    <div>
                        <div style={styles.debtSummary}>
                            <DebtCard title="Money Owed to You" value={formatCurrency(totalReceivables)} icon="💰" color="#4CAF50" count={debts.filter(d => d.type === 'receivable').length} />
                            <DebtCard title="Money You Owe" value={formatCurrency(totalPayables)} icon="💳" color="#f44336" count={debts.filter(d => d.type === 'payable').length} />
                        </div>
                        <div style={{ color: '#888', textAlign: 'center', padding: '40px', border: '2px dashed #333', borderRadius: '10px' }}>
                            💳 Debt tracking coming soon. Use the Add button below to record debts.
                            <br /><br />
                            <button onClick={() => setShowDebtForm(true)} style={styles.smallButton}>+ Add Debt Record</button>
                        </div>
                    </div>
                )}

                {/* BUDGET */}
                {activeTab === 'budget' && (
                    <div>
                        <div style={styles.budgetHeader}>
                            <h2 style={styles.sectionTitle}>Monthly Budget Overview</h2>
                            <button onClick={() => setShowBudgetForm(true)} style={styles.smallButton}>Edit Budget</button>
                        </div>
                        <div style={styles.budgetCard}>
                            <div style={styles.budgetMainRow}>
                                <div>
                                    <div style={styles.budgetLabel}>Monthly Budget</div>
                                    <div style={styles.budgetValue}>{formatCurrency(budgetDisplay.monthly_budget)}</div>
                                </div>
                                <div>
                                    <div style={styles.budgetLabel}>Spent So Far</div>
                                    <div style={{ ...styles.budgetValue, color: '#f44336' }}>{formatCurrency(budgetDisplay.spent)}</div>
                                </div>
                                <div>
                                    <div style={styles.budgetLabel}>Remaining</div>
                                    <div style={{ ...styles.budgetValue, color: '#4CAF50' }}>{formatCurrency(budgetDisplay.remaining)}</div>
                                </div>
                            </div>
                            <div style={styles.budgetProgressBar}>
                                <div style={{
                                    width: `${Math.min(budgetDisplay.percentage_used, 100)}%`,
                                    height: '100%',
                                    backgroundColor: budgetDisplay.percentage_used > 80 ? '#f44336' : '#4CAF50',
                                    borderRadius: '5px'
                                }} />
                            </div>
                            <div style={styles.budgetPercentage}>{budgetDisplay.percentage_used}% of budget used</div>
                        </div>

                        <h3 style={{ ...styles.chartTitle, marginTop: '20px' }}>Budget by Category</h3>
                        <div style={styles.budgetCategories}>
                            {budgetDisplay.categories.map((cat, i) => {
                                const pct = cat.budget > 0 ? ((cat.spent / cat.budget) * 100).toFixed(1) : 0;
                                const over = pct > 100;
                                return (
                                    <div key={i} style={styles.budgetCategoryCard}>
                                        <div style={styles.budgetCategoryHeader}>
                                            <span style={{ color: '#ff1493', fontWeight: 'bold' }}>{getCategoryIcon(cat.name)} {cat.name}</span>
                                            <span style={{ color: over ? '#f44336' : '#888', fontSize: '0.9em' }}>{pct}%</span>
                                        </div>
                                        <div style={styles.budgetCategoryBar}>
                                            <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', backgroundColor: over ? '#f44336' : '#ff1493', borderRadius: '4px' }} />
                                        </div>
                                        <div style={styles.budgetCategoryRow}>
                                            <span>Budget: {formatCurrency(cat.budget)}</span>
                                            <span style={{ color: '#f44336' }}>Spent: {formatCurrency(cat.spent)}</span>
                                        </div>
                                        <div style={styles.budgetCategoryRemaining}>Remaining: {formatCurrency(cat.remaining)}</div>
                                        {over && <div style={styles.overBudgetAlert}>⚠️ Over budget!</div>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showIncomeForm && (
                <AddIncomeModal
                    onClose={() => setShowIncomeForm(false)}
                    onSuccess={() => { fetchIncome(); fetchSummary(); fetchMonthly(); }}
                />
            )}
            {showExpenseForm && (
                <AddExpenseModal
                    onClose={() => setShowExpenseForm(false)}
                    onSuccess={() => { fetchExpenses(); fetchSummary(); fetchMonthly(); }}
                />
            )}
            {showDebtForm && <AddDebtModal onClose={() => setShowDebtForm(false)} />}
            {showBudgetForm && <BudgetModal budget={budget} setBudget={setBudget} onClose={() => setShowBudgetForm(false)} />}
        </div>
    );
}

// ── Helper Components ────────────────────────────────────────────────────────

const SummaryCard = ({ title, value, icon, color, trend, subValue, size = 'normal' }) => (
    <div style={{ backgroundColor: '#1a1a1a', border: `2px solid ${color}`, borderRadius: '15px', padding: size === 'normal' ? '20px' : '15px', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ color: '#888', fontSize: '0.9em' }}>{title}</span>
            {icon && <span style={{ fontSize: '1.5em' }}>{icon}</span>}
        </div>
        <div style={{ color, fontSize: size === 'normal' ? '2em' : '1.5em', fontWeight: 'bold' }}>{value}</div>
        {trend && <div style={{ color: '#888', fontSize: '0.85em' }}>{trend}</div>}
        {subValue && <div style={{ color: '#fff', fontSize: '0.9em' }}>{subValue}</div>}
    </div>
);

const QuickStat = ({ label, value, color }) => (
    <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#888', fontSize: '0.8em' }}>{label}</div>
        <div style={{ color, fontSize: '1.1em', fontWeight: 'bold' }}>{value}</div>
    </div>
);

const DebtCard = ({ title, value, icon, color, count }) => (
    <div style={{ backgroundColor: '#1a1a1a', border: `2px solid ${color}`, borderRadius: '15px', padding: '20px', flex: 1, textAlign: 'center' }}>
        <div style={{ fontSize: '2.5em', marginBottom: '10px' }}>{icon}</div>
        <div style={{ color: '#888', marginBottom: '5px' }}>{title}</div>
        <div style={{ color, fontSize: '2em', fontWeight: 'bold' }}>{value}</div>
        <div style={{ color: '#fff' }}>{count} pending {count === 1 ? 'item' : 'items'}</div>
    </div>
);

const BreakEvenItem = ({ label, value, subtext }) => (
    <div style={{ backgroundColor: '#000', padding: '15px', borderRadius: '10px' }}>
        <div style={{ color: '#888', fontSize: '0.9em', marginBottom: '5px' }}>{label}</div>
        <div style={{ color: '#ff1493', fontSize: '1.5em', fontWeight: 'bold' }}>{value}</div>
        <div style={{ color: '#4CAF50', fontSize: '0.85em' }}>{subtext}</div>
    </div>
);

// ── Modals ───────────────────────────────────────────────────────────────────

const AddIncomeModal = ({ onClose, onSuccess }) => {
    const [form, setForm] = useState({
        source: 'Pig Sales',
        amount: '',
        income_date: new Date().toISOString().split('T')[0],
        description: '',
        quantity: '',
        price_per_unit: '',
        customer: '',
        payment_method: 'Cash',
        status: 'paid',
    });
    const [saving, setSaving] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    // Auto-calculate amount from qty × price
    useEffect(() => {
        if (form.quantity && form.price_per_unit) {
            setForm(f => ({ ...f, amount: (parseFloat(f.quantity) * parseFloat(f.price_per_unit)).toFixed(2) }));
        }
    }, [form.quantity, form.price_per_unit]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.amount || parseFloat(form.amount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }
        setSaving(true);
        try {
            await API.post('/income', form);
            toast.success('Income added successfully!');
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to add income');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <h2 style={{ color: '#4CAF50', marginBottom: '20px' }}>💰 Add Income</h2>
                <form onSubmit={handleSubmit}>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Date *</label>
                            <input type="date" name="income_date" value={form.income_date} onChange={handleChange} style={modalInput} required />
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Source *</label>
                            <select name="source" value={form.source} onChange={handleChange} style={modalInput} required>
                                <option>Pig Sales</option>
                                <option>Piglet Sales</option>
                                <option>Manure Sales</option>
                                <option>Other</option>
                            </select>
                        </div>
                    </div>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Quantity</label>
                            <input type="number" name="quantity" value={form.quantity} onChange={handleChange} style={modalInput} placeholder="Number sold" />
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Price per Unit (R)</label>
                            <input type="number" step="0.01" name="price_per_unit" value={form.price_per_unit} onChange={handleChange} style={modalInput} />
                        </div>
                    </div>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Total Amount (R) *</label>
                            <input type="number" step="0.01" name="amount" value={form.amount} onChange={handleChange} style={{ ...modalInput, borderColor: '#4CAF50' }} required />
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Status</label>
                            <select name="status" value={form.status} onChange={handleChange} style={modalInput}>
                                <option value="paid">Paid</option>
                                <option value="pending">Pending</option>
                            </select>
                        </div>
                    </div>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Customer</label>
                            <input name="customer" value={form.customer} onChange={handleChange} style={modalInput} placeholder="Buyer name" />
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Payment Method</label>
                            <select name="payment_method" value={form.payment_method} onChange={handleChange} style={modalInput}>
                                <option>Cash</option>
                                <option>Bank Transfer</option>
                                <option>Mobile Money</option>
                            </select>
                        </div>
                    </div>
                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Description</label>
                        <textarea name="description" value={form.description} onChange={handleChange} style={{ ...modalInput, minHeight: '80px' }} placeholder="Details..." />
                    </div>
                    <div style={modalButtonGroup}>
                        <button type="button" onClick={onClose} style={modalCancelButton}>Cancel</button>
                        <button type="submit" disabled={saving} style={{ ...modalSubmitButton, backgroundColor: '#4CAF50', opacity: saving ? 0.7 : 1 }}>
                            {saving ? 'Saving...' : 'Add Income'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AddExpenseModal = ({ onClose, onSuccess }) => {
    const [form, setForm] = useState({
        category: 'Feed',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        description: '',
        payment_method: 'Cash',
        supplier: '',
        invoice_number: '',
        notes: '',
    });
    const [saving, setSaving] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.amount || parseFloat(form.amount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }
        setSaving(true);
        try {
            await API.post('/expenses', form);
            toast.success('Expense added successfully!');
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to add expense');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <h2 style={{ color: '#f44336', marginBottom: '20px' }}>💸 Add Expense</h2>
                <form onSubmit={handleSubmit}>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Date *</label>
                            <input type="date" name="expense_date" value={form.expense_date} onChange={handleChange} style={modalInput} required />
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Category *</label>
                            <select name="category" value={form.category} onChange={handleChange} style={modalInput} required>
                                <option>Feed</option>
                                <option>Medication</option>
                                <option>Labor</option>
                                <option>Transport</option>
                                <option>Utilities</option>
                                <option>Maintenance</option>
                                <option>Other</option>
                            </select>
                        </div>
                    </div>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Amount (R) *</label>
                            <input type="number" step="0.01" name="amount" value={form.amount} onChange={handleChange} style={{ ...modalInput, borderColor: '#f44336' }} required />
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Payment Method</label>
                            <select name="payment_method" value={form.payment_method} onChange={handleChange} style={modalInput}>
                                <option>Cash</option>
                                <option>Bank Transfer</option>
                                <option>Mobile Money</option>
                            </select>
                        </div>
                    </div>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Supplier</label>
                            <input name="supplier" value={form.supplier} onChange={handleChange} style={modalInput} placeholder="Vendor name" />
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Invoice #</label>
                            <input name="invoice_number" value={form.invoice_number} onChange={handleChange} style={modalInput} placeholder="Optional" />
                        </div>
                    </div>
                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Description *</label>
                        <textarea name="description" value={form.description} onChange={handleChange} style={{ ...modalInput, minHeight: '80px' }} placeholder="What was this expense for?" required />
                    </div>
                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Notes</label>
                        <textarea name="notes" value={form.notes} onChange={handleChange} style={{ ...modalInput, minHeight: '60px' }} placeholder="Any extra details..." />
                    </div>
                    <div style={modalButtonGroup}>
                        <button type="button" onClick={onClose} style={modalCancelButton}>Cancel</button>
                        <button type="submit" disabled={saving} style={{ ...modalSubmitButton, backgroundColor: '#f44336', opacity: saving ? 0.7 : 1 }}>
                            {saving ? 'Saving...' : 'Add Expense'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AddDebtModal = ({ onClose }) => {
    const handleSubmit = (e) => {
        e.preventDefault();
        toast.success('Debt record noted! (Debt tracking backend coming soon)');
        onClose();
    };
    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <h2 style={{ color: '#ff9800', marginBottom: '20px' }}>💳 Add Debt Record</h2>
                <form onSubmit={handleSubmit}>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Type *</label>
                            <select style={modalInput} required>
                                <option>Money Owed to Me</option>
                                <option>Money I Owe</option>
                            </select>
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Amount (R) *</label>
                            <input type="number" step="0.01" style={modalInput} required />
                        </div>
                    </div>
                    <div style={modalRow}>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Customer/Supplier</label>
                            <input style={modalInput} placeholder="Name" required />
                        </div>
                        <div style={modalFormGroup}>
                            <label style={modalLabel}>Due Date</label>
                            <input type="date" style={modalInput} />
                        </div>
                    </div>
                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Description</label>
                        <textarea style={{ ...modalInput, minHeight: '80px' }} placeholder="Details..." />
                    </div>
                    <div style={modalButtonGroup}>
                        <button type="button" onClick={onClose} style={modalCancelButton}>Cancel</button>
                        <button type="submit" style={{ ...modalSubmitButton, backgroundColor: '#ff9800' }}>Add Debt</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const BudgetModal = ({ budget, setBudget, onClose }) => {
    const [form, setForm] = useState({ monthly_budget: budget.monthly_budget });
    const handleSubmit = (e) => {
        e.preventDefault();
        setBudget(b => ({ ...b, monthly_budget: parseFloat(form.monthly_budget) }));
        toast.success('Budget updated!');
        onClose();
    };
    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <h2 style={{ color: '#2196F3', marginBottom: '20px' }}>📋 Edit Budget</h2>
                <form onSubmit={handleSubmit}>
                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Monthly Budget (R)</label>
                        <input type="number" value={form.monthly_budget} onChange={e => setForm({ monthly_budget: e.target.value })} style={modalInput} required />
                    </div>
                    <div style={modalButtonGroup}>
                        <button type="button" onClick={onClose} style={modalCancelButton}>Cancel</button>
                        <button type="submit" style={{ ...modalSubmitButton, backgroundColor: '#2196F3' }}>Save Budget</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

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
    incomeButton: { backgroundColor: '#4CAF50', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '50px', fontSize: '1em', fontWeight: 'bold', cursor: 'pointer' },
    expenseButton: { backgroundColor: '#f44336', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '50px', fontSize: '1em', fontWeight: 'bold', cursor: 'pointer' },
    summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px' },
    quickStats: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '10px' },
    tabContainer: { display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ff1493', paddingBottom: '10px', flexWrap: 'wrap' },
    tab: { padding: '8px 16px', backgroundColor: 'transparent', color: '#888', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '0.95em' },
    activeTab: { padding: '8px 16px', backgroundColor: '#ff1493', color: '#000', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '0.95em', fontWeight: 'bold' },
    filterBar: { marginBottom: '20px', display: 'flex' },
    filterSelect: { padding: '10px 20px', backgroundColor: '#1a1a1a', border: '2px solid #ff1493', borderRadius: '50px', color: '#fff', fontSize: '1em', minWidth: '150px' },
    tabContent: { minHeight: '500px' },
    chartCard: { backgroundColor: '#1a1a1a', border: '2px solid #ff1493', borderRadius: '15px', padding: '20px', marginBottom: '20px' },
    chartTitle: { color: '#ff1493', marginBottom: '15px', fontSize: '1.2em' },
    twoColumn: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' },
    sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
    sectionTitle: { color: '#ff1493', margin: 0, fontSize: '1.3em' },
    smallButton: { padding: '8px 16px', backgroundColor: '#ff1493', color: '#000', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' },
    tableContainer: { overflowX: 'auto', backgroundColor: '#1a1a1a', borderRadius: '10px', padding: '10px', marginBottom: '20px' },
    table: { width: '100%', borderCollapse: 'collapse' },
    statusBadge: { padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', color: '#000' },
    categoryBadge: { backgroundColor: '#333', padding: '4px 8px', borderRadius: '12px', fontSize: '11px' },
    summaryCards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' },
    breakevenGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' },
    debtSummary: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' },
    budgetHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
    budgetCard: { backgroundColor: '#1a1a1a', border: '2px solid #ff1493', borderRadius: '15px', padding: '20px', marginBottom: '20px' },
    budgetMainRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '15px' },
    budgetLabel: { color: '#888', fontSize: '0.9em', marginBottom: '5px' },
    budgetValue: { fontSize: '1.5em', fontWeight: 'bold', color: '#fff' },
    budgetProgressBar: { height: '10px', backgroundColor: '#333', borderRadius: '5px', marginBottom: '5px', overflow: 'hidden' },
    budgetPercentage: { textAlign: 'right', color: '#888', fontSize: '0.9em' },
    budgetCategories: { display: 'grid', gap: '15px' },
    budgetCategoryCard: { backgroundColor: '#000', padding: '15px', borderRadius: '10px' },
    budgetCategoryHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px' },
    budgetCategoryBar: { height: '6px', backgroundColor: '#333', borderRadius: '3px', marginBottom: '10px', overflow: 'hidden' },
    budgetCategoryRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#888', fontSize: '0.9em' },
    budgetCategoryRemaining: { color: '#4CAF50', fontSize: '0.9em', fontWeight: 'bold' },
    overBudgetAlert: { marginTop: '10px', padding: '5px', backgroundColor: '#f44336', color: '#fff', borderRadius: '5px', textAlign: 'center', fontSize: '0.9em' },
};

export default Finance;