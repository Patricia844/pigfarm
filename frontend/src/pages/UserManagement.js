import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

function UserManagement() {
    const [activeTab, setActiveTab] = useState('active');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAuditModal, setShowAuditModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [selectedUser, setSelectedUser] = useState(null);

    // Colors
    const COLORS = {
        admin: '#ff1493',
        vet: '#4CAF50',
        worker: '#2196F3',
        active: '#4CAF50',
        inactive: '#888',
        danger: '#f44336',
        warning: '#ff9800'
    };

    // Sample Users Data
    const [users, setUsers] = useState([
        {
            id: 1,
            name: 'Farm Manager',
            email: 'manager@pigfarm.com',
            role: 'admin',
            status: 'active',
            lastLogin: '2024-03-17 08:30:22',
            loginAttempts: 0,
            locked: false,
            assignedTo: 'All Pens',
            created_at: '2024-01-15',
            phone: '+263 77 123 4567',
            notes: 'Farm owner, full access'
        },
        {
            id: 2,
            name: 'Dr. Sarah Smith',
            email: 'sarah.vet@pigfarm.com',
            role: 'vet',
            status: 'active',
            lastLogin: '2024-03-16 14:20:10',
            loginAttempts: 0,
            locked: false,
            assignedTo: 'Health Department',
            created_at: '2024-01-20',
            phone: '+263 78 234 5678',
            notes: 'Senior veterinarian'
        },
        {
            id: 3,
            name: 'John Worker',
            email: 'john.worker@pigfarm.com',
            role: 'worker',
            status: 'active',
            lastLogin: '2024-03-17 09:15:45',
            loginAttempts: 0,
            locked: false,
            assignedTo: 'Pen A, Pen B',
            created_at: '2024-02-01',
            phone: '+263 71 345 6789',
            notes: 'Morning shift worker'
        },
        {
            id: 4,
            name: 'Dr. James Vet',
            email: 'james.vet@pigfarm.com',
            role: 'vet',
            status: 'inactive',
            lastLogin: '2024-03-10 11:30:00',
            loginAttempts: 3,
            locked: true,
            assignedTo: 'Health Department',
            created_at: '2024-01-25',
            phone: '+263 73 456 7890',
            notes: 'On leave'
        },
        {
            id: 5,
            name: 'Peter Worker',
            email: 'peter.worker@pigfarm.com',
            role: 'worker',
            status: 'active',
            lastLogin: '2024-03-16 16:45:30',
            loginAttempts: 0,
            locked: false,
            assignedTo: 'Pen C, Pen D',
            created_at: '2024-02-15',
            phone: '+263 74 567 8901',
            notes: 'Afternoon shift'
        },
        {
            id: 6,
            name: 'Admin User',
            email: 'admin@pigfarm.com',
            role: 'admin',
            status: 'active',
            lastLogin: '2024-03-17 10:00:00',
            loginAttempts: 0,
            locked: false,
            assignedTo: 'All Areas',
            created_at: '2024-01-10',
            phone: '+263 75 678 9012',
            notes: 'System administrator'
        }
    ]);

    // Activity/Audit Logs
    const [auditLogs, setAuditLogs] = useState([
        { id: 1, user: 'Farm Manager', action: 'User created', target: 'Dr. Sarah Smith', timestamp: '2024-01-20 10:30:22', role: 'admin' },
        { id: 2, user: 'Farm Manager', action: 'Role changed', target: 'John Worker (Worker → Senior Worker)', timestamp: '2024-02-15 14:20:10', role: 'admin' },
        { id: 3, user: 'System', action: 'Failed login attempt', target: 'Dr. James Vet (3 attempts)', timestamp: '2024-03-10 11:30:00', role: 'system' },
        { id: 4, user: 'Admin User', action: 'Password reset', target: 'Peter Worker', timestamp: '2024-03-01 09:15:45', role: 'admin' },
        { id: 5, user: 'Farm Manager', action: 'User deactivated', target: 'Dr. James Vet', timestamp: '2024-03-11 08:30:22', role: 'admin' },
        { id: 6, user: 'System', action: 'Account locked', target: 'Dr. James Vet', timestamp: '2024-03-10 11:35:00', role: 'system' }
    ]);

    // Statistics
    const stats = {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.status === 'active').length,
        inactiveUsers: users.filter(u => u.status === 'inactive').length,
        lockedUsers: users.filter(u => u.locked).length,
        byRole: {
            admin: users.filter(u => u.role === 'admin').length,
            vet: users.filter(u => u.role === 'vet').length,
            worker: users.filter(u => u.role === 'worker').length
        }
    };

    // Chart data
    const roleDistributionData = [
        { name: 'Admin', value: stats.byRole.admin, color: COLORS.admin },
        { name: 'Vet', value: stats.byRole.vet, color: COLORS.vet },
        { name: 'Worker', value: stats.byRole.worker, color: COLORS.worker }
    ];

    const getRoleColor = (role) => {
        switch(role) {
            case 'admin': return COLORS.admin;
            case 'vet': return COLORS.vet;
            case 'worker': return COLORS.worker;
            default: return '#888';
        }
    };

    const getRoleIcon = (role) => {
        switch(role) {
            case 'admin': return '👑';
            case 'vet': return '⚕️';
            case 'worker': return '🌾';
            default: return '👤';
        }
    };

    const getStatusBadge = (status, locked) => {
        if (locked) {
            return <span style={{ ...styles.statusBadge, backgroundColor: COLORS.danger }}>🔒 Locked</span>;
        }
        if (status === 'active') {
            return <span style={{ ...styles.statusBadge, backgroundColor: COLORS.active }}>✅ Active</span>;
        }
        return <span style={{ ...styles.statusBadge, backgroundColor: COLORS.inactive }}>⚪ Inactive</span>;
    };

    const handleAddUser = (userData) => {
        const newUser = {
            id: users.length + 1,
            ...userData,
            lastLogin: 'Never',
            loginAttempts: 0,
            locked: false,
            created_at: new Date().toISOString().split('T')[0]
        };
        setUsers([...users, newUser]);
        
        // Add to audit log
        const auditEntry = {
            id: auditLogs.length + 1,
            user: 'Farm Manager',
            action: 'User created',
            target: userData.name,
            timestamp: new Date().toLocaleString(),
            role: 'admin'
        };
        setAuditLogs([auditEntry, ...auditLogs]);
        
        toast.success(`User ${userData.name} added successfully!`);
        setShowAddModal(false);
    };

    const handleEditUser = (userData) => {
        setUsers(users.map(u => u.id === userData.id ? userData : u));
        
        // Add to audit log
        const auditEntry = {
            id: auditLogs.length + 1,
            user: 'Farm Manager',
            action: 'User updated',
            target: userData.name,
            timestamp: new Date().toLocaleString(),
            role: 'admin'
        };
        setAuditLogs([auditEntry, ...auditLogs]);
        
        toast.success(`User ${userData.name} updated successfully!`);
        setShowEditModal(false);
    };

    const handleDeactivateUser = (user) => {
        const updatedUser = { ...user, status: user.status === 'active' ? 'inactive' : 'active' };
        setUsers(users.map(u => u.id === user.id ? updatedUser : u));
        
        // Add to audit log
        const auditEntry = {
            id: auditLogs.length + 1,
            user: 'Farm Manager',
            action: user.status === 'active' ? 'User deactivated' : 'User activated',
            target: user.name,
            timestamp: new Date().toLocaleString(),
            role: 'admin'
        };
        setAuditLogs([auditEntry, ...auditLogs]);
        
        toast.success(`User ${user.name} ${user.status === 'active' ? 'deactivated' : 'activated'}!`);
    };

    const handleResetPassword = (user) => {
        // Add to audit log
        const auditEntry = {
            id: auditLogs.length + 1,
            user: 'Farm Manager',
            action: 'Password reset',
            target: user.name,
            timestamp: new Date().toLocaleString(),
            role: 'admin'
        };
        setAuditLogs([auditEntry, ...auditLogs]);
        
        toast.success(`Password reset email sent to ${user.email}`);
    };

    const handleUnlockUser = (user) => {
        const updatedUser = { ...user, locked: false, loginAttempts: 0 };
        setUsers(users.map(u => u.id === user.id ? updatedUser : u));
        
        // Add to audit log
        const auditEntry = {
            id: auditLogs.length + 1,
            user: 'Farm Manager',
            action: 'User unlocked',
            target: user.name,
            timestamp: new Date().toLocaleString(),
            role: 'admin'
        };
        setAuditLogs([auditEntry, ...auditLogs]);
        
        toast.success(`User ${user.name} unlocked!`);
    };

    const filteredUsers = users
        .filter(user => {
            if (activeTab === 'active') return user.status === 'active' && !user.locked;
            if (activeTab === 'inactive') return user.status === 'inactive' || user.locked;
            return true;
        })
        .filter(user => {
            const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 (user.phone && user.phone.includes(searchTerm));
            const matchesRole = filterRole === 'all' || user.role === filterRole;
            return matchesSearch && matchesRole;
        });

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h1 style={styles.title}>👥 User Management</h1>
                <button
                    onClick={() => setShowAddModal(true)}
                    style={styles.addButton}
                >
                    + Add New User
                </button>
            </div>

            {/* Summary Cards */}
            <div style={styles.summaryGrid}>
                <SummaryCard 
                    icon="👥" 
                    value={stats.totalUsers} 
                    label="Total Users" 
                    color={COLORS.admin}
                />
                <SummaryCard 
                    icon="✅" 
                    value={stats.activeUsers} 
                    label="Active Users" 
                    color={COLORS.active}
                />
                <SummaryCard 
                    icon="⚪" 
                    value={stats.inactiveUsers} 
                    label="Inactive Users" 
                    color={COLORS.inactive}
                />
                <SummaryCard 
                    icon="🔒" 
                    value={stats.lockedUsers} 
                    label="Locked Accounts" 
                    color={COLORS.danger}
                />
            </div>

            {/* Role Distribution */}
            <div style={styles.roleDistribution}>
                <div style={styles.roleCards}>
                    <RoleCard 
                        icon="👑" 
                        role="Admin" 
                        count={stats.byRole.admin} 
                        color={COLORS.admin}
                    />
                    <RoleCard 
                        icon="⚕️" 
                        role="Veterinarian" 
                        count={stats.byRole.vet} 
                        color={COLORS.vet}
                    />
                    <RoleCard 
                        icon="🌾" 
                        role="Worker" 
                        count={stats.byRole.worker} 
                        color={COLORS.worker}
                    />
                </div>
                <div style={styles.pieChartContainer}>
                    <ResponsiveContainer width="100%" height={150}>
                        <PieChart>
                            <Pie
                                data={roleDistributionData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={60}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {roleDistributionData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Tabs */}
            <div style={styles.tabContainer}>
                <button
                    onClick={() => setActiveTab('active')}
                    style={activeTab === 'active' ? styles.activeTab : styles.tab}
                >
                    ✅ Active Users
                </button>
                <button
                    onClick={() => setActiveTab('inactive')}
                    style={activeTab === 'inactive' ? styles.activeTab : styles.tab}
                >
                    ⚪ Inactive Users
                </button>
                <button
                    onClick={() => setActiveTab('audit')}
                    style={activeTab === 'audit' ? styles.activeTab : styles.tab}
                >
                    📋 Audit Logs
                </button>
            </div>

            {/* Search and Filter */}
            {activeTab !== 'audit' && (
                <div style={styles.filterBar}>
                    <input
                        type="text"
                        placeholder="🔍 Search by name, email or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={styles.searchInput}
                    />
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        style={styles.filterSelect}
                    >
                        <option value="all">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="vet">Veterinarian</option>
                        <option value="worker">Worker</option>
                    </select>
                </div>
            )}

            {/* Content */}
            {activeTab === 'audit' ? (
                // Audit Logs Table
                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>User</th>
                                <th>Action</th>
                                <th>Target</th>
                                <th>Role</th>
                            </tr>
                        </thead>
                        <tbody>
                            {auditLogs.map(log => (
                                <tr key={log.id}>
                                    <td>{log.timestamp}</td>
                                    <td>
                                        <span style={{ color: log.role === 'admin' ? COLORS.admin : 
                                                      log.role === 'system' ? '#888' : COLORS.vet }}>
                                            {log.user}
                                        </span>
                                    </td>
                                    <td>{log.action}</td>
                                    <td>{log.target}</td>
                                    <td>
                                        <span style={{
                                            ...styles.roleBadge,
                                            backgroundColor: log.role === 'admin' ? COLORS.admin :
                                                              log.role === 'system' ? '#888' : COLORS.vet
                                        }}>
                                            {log.role}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                // Users Table
                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Role</th>
                                <th>Email / Phone</th>
                                <th>Status</th>
                                <th>Last Login</th>
                                <th>Assigned To</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id}>
                                    <td>
                                        <div style={styles.userCell}>
                                            <span style={{
                                                ...styles.userAvatar,
                                                backgroundColor: getRoleColor(user.role)
                                            }}>
                                                {getRoleIcon(user.role)}
                                            </span>
                                            <div>
                                                <div style={{ fontWeight: 'bold' }}>{user.name}</div>
                                                <div style={{ color: '#888', fontSize: '0.85em' }}>ID: {user.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{
                                            ...styles.roleBadge,
                                            backgroundColor: getRoleColor(user.role)
                                        }}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td>
                                        <div>{user.email}</div>
                                        <div style={{ color: '#888', fontSize: '0.85em' }}>{user.phone}</div>
                                    </td>
                                    <td>{getStatusBadge(user.status, user.locked)}</td>
                                    <td>
                                        <div>{user.lastLogin}</div>
                                        {user.loginAttempts > 0 && (
                                            <div style={{ color: COLORS.warning, fontSize: '0.85em' }}>
                                                {user.loginAttempts} failed attempts
                                            </div>
                                        )}
                                    </td>
                                    <td>{user.assignedTo}</td>
                                    <td>
                                        <div style={styles.actionButtons}>
                                            <button
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setShowEditModal(true);
                                                }}
                                                style={styles.editButton}
                                                title="Edit User"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleResetPassword(user)}
                                                style={styles.resetButton}
                                                title="Reset Password"
                                            >
                                                🔑
                                            </button>
                                            {user.locked ? (
                                                <button
                                                    onClick={() => handleUnlockUser(user)}
                                                    style={styles.unlockButton}
                                                    title="Unlock Account"
                                                >
                                                    🔓
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleDeactivateUser(user)}
                                                    style={user.status === 'active' ? styles.deactivateButton : styles.activateButton}
                                                    title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                                                >
                                                    {user.status === 'active' ? '⛔' : '✅'}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add User Modal */}
            {showAddModal && (
                <UserModal
                    mode="add"
                    onClose={() => setShowAddModal(false)}
                    onSubmit={handleAddUser}
                    COLORS={COLORS}
                />
            )}

            {/* Edit User Modal */}
            {showEditModal && selectedUser && (
                <UserModal
                    mode="edit"
                    user={selectedUser}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedUser(null);
                    }}
                    onSubmit={handleEditUser}
                    COLORS={COLORS}
                />
            )}
        </div>
    );
}

// Helper Components
const SummaryCard = ({ icon, value, label, color }) => (
    <div style={{
        backgroundColor: '#1a1a1a',
        border: `2px solid ${color}`,
        borderRadius: '10px',
        padding: '15px',
        textAlign: 'center'
    }}>
        <div style={{ fontSize: '2em', marginBottom: '5px' }}>{icon}</div>
        <div style={{ color: color, fontSize: '1.5em', fontWeight: 'bold' }}>{value}</div>
        <div style={{ color: '#888', fontSize: '0.9em' }}>{label}</div>
    </div>
);

const RoleCard = ({ icon, role, count, color }) => (
    <div style={{
        backgroundColor: '#1a1a1a',
        border: `2px solid ${color}`,
        borderRadius: '10px',
        padding: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        flex: 1
    }}>
        <div style={{ fontSize: '1.5em' }}>{icon}</div>
        <div>
            <div style={{ color: '#888', fontSize: '0.8em' }}>{role}</div>
            <div style={{ color: color, fontSize: '1.3em', fontWeight: 'bold' }}>{count}</div>
        </div>
    </div>
);

const UserModal = ({ mode, user, onClose, onSubmit, COLORS }) => {
    const [formData, setFormData] = useState({
        id: user?.id || null,
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        role: user?.role || 'worker',
        status: user?.status || 'active',
        assignedTo: user?.assignedTo || '',
        notes: user?.notes || '',
        password: '',
        confirmPassword: ''
    });

    const [generatePassword, setGeneratePassword] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (mode === 'add' && !generatePassword && !formData.password) {
            toast.error('Please enter a password or check auto-generate');
            return;
        }
        
        if (!generatePassword && formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        // Generate random password if checked
        if (generatePassword) {
            const randomPass = Math.random().toString(36).slice(-8);
            formData.password = randomPass;
            toast.success(`Generated password: ${randomPass}`);
        }

        onSubmit(formData);
    };

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <h2 style={{ color: COLORS.admin, marginBottom: '20px' }}>
                    {mode === 'add' ? '➕ Add New User' : '✏️ Edit User'}
                </h2>
                <form onSubmit={handleSubmit}>
                    <div style={styles.modalRow}>
                        <div style={styles.modalFormGroup}>
                            <label style={styles.modalLabel}>Full Name *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                style={styles.modalInput}
                                required
                            />
                        </div>
                        <div style={styles.modalFormGroup}>
                            <label style={styles.modalLabel}>Email *</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                style={styles.modalInput}
                                required
                            />
                        </div>
                    </div>

                    <div style={styles.modalRow}>
                        <div style={styles.modalFormGroup}>
                            <label style={styles.modalLabel}>Phone</label>
                            <input
                                type="text"
                                value={formData.phone}
                                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                style={styles.modalInput}
                                placeholder="+263 XX XXX XXXX"
                            />
                        </div>
                        <div style={styles.modalFormGroup}>
                            <label style={styles.modalLabel}>Role *</label>
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({...formData, role: e.target.value})}
                                style={styles.modalInput}
                                required
                            >
                                <option value="admin">Admin</option>
                                <option value="vet">Veterinarian</option>
                                <option value="worker">Worker</option>
                            </select>
                        </div>
                    </div>

                    {mode === 'add' && (
                        <>
                            <div style={styles.modalRow}>
                                <div style={styles.modalFormGroup}>
                                    <label style={styles.modalLabel}>Password</label>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                                        style={styles.modalInput}
                                        disabled={generatePassword}
                                    />
                                </div>
                                <div style={styles.modalFormGroup}>
                                    <label style={styles.modalLabel}>Confirm Password</label>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                                        style={styles.modalInput}
                                        disabled={generatePassword}
                                    />
                                </div>
                            </div>
                            <div style={styles.modalCheckboxGroup}>
                                <label style={styles.modalCheckbox}>
                                    <input
                                        type="checkbox"
                                        checked={generatePassword}
                                        onChange={(e) => setGeneratePassword(e.target.checked)}
                                    />
                                    Auto-generate password
                                </label>
                                <label style={styles.modalCheckbox}>
                                    <input
                                        type="checkbox"
                                        checked={showPassword}
                                        onChange={(e) => setShowPassword(e.target.checked)}
                                    />
                                    Show password
                                </label>
                            </div>
                        </>
                    )}

                    <div style={styles.modalFormGroup}>
                        <label style={styles.modalLabel}>Assigned To (Pens/Litters)</label>
                        <input
                            type="text"
                            value={formData.assignedTo}
                            onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
                            style={styles.modalInput}
                            placeholder="e.g., Pen A, Pen B, Litter L001"
                        />
                    </div>

                    <div style={styles.modalFormGroup}>
                        <label style={styles.modalLabel}>Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                            style={{...styles.modalInput, minHeight: '80px'}}
                            placeholder="Additional notes about user..."
                        />
                    </div>

                    {mode === 'edit' && (
                        <div style={styles.modalFormGroup}>
                            <label style={styles.modalLabel}>Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({...formData, status: e.target.value})}
                                style={styles.modalInput}
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    )}

                    <div style={styles.modalButtonGroup}>
                        <button type="button" onClick={onClose} style={styles.modalCancelButton}>
                            Cancel
                        </button>
                        <button type="submit" style={styles.modalSubmitButton}>
                            {mode === 'add' ? 'Add User' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Styles
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
    header: {
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
        padding: '10px 20px',
        borderRadius: '50px',
        fontSize: '1em',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    summaryGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '10px',
        marginBottom: '20px'
    },
    roleDistribution: {
        display: 'flex',
        gap: '20px',
        marginBottom: '20px',
        backgroundColor: '#1a1a1a',
        border: '2px solid #ff1493',
        borderRadius: '10px',
        padding: '15px'
    },
    roleCards: {
        display: 'flex',
        gap: '10px',
        flex: 2
    },
    pieChartContainer: {
        flex: 1,
        minWidth: '200px'
    },
    tabContainer: {
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
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
        fontSize: '1em'
    },
    activeTab: {
        padding: '8px 16px',
        backgroundColor: '#ff1493',
        color: '#000',
        border: 'none',
        borderRadius: '20px',
        cursor: 'pointer',
        fontSize: '1em',
        fontWeight: 'bold'
    },
    filterBar: {
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
        padding: '12px',
        backgroundColor: '#1a1a1a',
        border: '2px solid #ff1493',
        borderRadius: '50px',
        color: '#fff',
        fontSize: '1em',
        minWidth: '150px'
    },
    tableContainer: {
        overflowX: 'auto',
        backgroundColor: '#1a1a1a',
        borderRadius: '10px',
        padding: '10px'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        'th': {
            textAlign: 'left',
            padding: '12px',
            color: '#ff1493',
            borderBottom: '2px solid #ff1493'
        },
        'td': {
            padding: '12px',
            borderBottom: '1px solid #333'
        }
    },
    userCell: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    },
    userAvatar: {
        width: '35px',
        height: '35px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.2em'
    },
    roleBadge: {
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 'bold',
        color: '#000'
    },
    statusBadge: {
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 'bold',
        color: '#000',
        display: 'inline-block'
    },
    actionButtons: {
        display: 'flex',
        gap: '5px'
    },
    editButton: {
        padding: '5px',
        backgroundColor: '#333',
        color: '#fff',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer'
    },
    resetButton: {
        padding: '5px',
        backgroundColor: '#ff9800',
        color: '#000',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer'
    },
    unlockButton: {
        padding: '5px',
        backgroundColor: '#4CAF50',
        color: '#000',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer'
    },
    deactivateButton: {
        padding: '5px',
        backgroundColor: '#f44336',
        color: '#fff',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer'
    },
    activateButton: {
        padding: '5px',
        backgroundColor: '#4CAF50',
        color: '#000',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer'
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
    },
    modalContent: {
        backgroundColor: '#1a1a1a',
        border: '2px solid #ff1493',
        borderRadius: '20px',
        padding: '30px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflowY: 'auto'
    },
    modalRow: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '15px',
        marginBottom: '15px'
    },
    modalFormGroup: {
        marginBottom: '15px'
    },
    modalLabel: {
        color: '#ff1493',
        display: 'block',
        marginBottom: '5px'
    },
    modalInput: {
        width: '100%',
        padding: '10px',
        backgroundColor: '#000',
        border: '2px solid #ff1493',
        borderRadius: '5px',
        color: '#fff',
        fontSize: '1em'
    },
    modalCheckboxGroup: {
        display: 'flex',
        gap: '20px',
        marginBottom: '15px'
    },
    modalCheckbox: {
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        cursor: 'pointer'
    },
    modalButtonGroup: {
        display: 'flex',
        gap: '10px',
        justifyContent: 'flex-end',
        marginTop: '20px'
    },
    modalCancelButton: {
        padding: '10px 20px',
        backgroundColor: '#333',
        color: '#fff',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer'
    },
    modalSubmitButton: {
        padding: '10px 20px',
        backgroundColor: '#ff1493',
        color: '#000',
        border: 'none',
        borderRadius: '5px',
        fontWeight: 'bold',
        cursor: 'pointer'
    }
};

export default UserManagement;