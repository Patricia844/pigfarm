import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import toast from 'react-hot-toast';

function Profile() {
    const { user, logout } = useAuth();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('personal');
    const [editMode, setEditMode] = useState(false);
    
    // Personal Details
    const [personalData, setPersonalData] = useState({
        firstName: user?.name?.split(' ')[0] || '',
        lastName: user?.name?.split(' ').slice(1).join(' ') || '',
        email: user?.email || '',
        phone: '+263 77 123 4567',
        dateOfBirth: '1985-06-15',
        gender: 'male',
        nationality: 'Zimbabwean',
        idNumber: '63-1234567X-00',
        address: '123 Farm Road, Harare',
        city: 'Harare',
        province: 'Harare',
        postalCode: '00263',
        emergencyContact: 'John Doe: +263 78 987 6543'
    });

    // Account Settings
    const [accountData, setAccountData] = useState({
        username: user?.email?.split('@')[0] || 'farmer123',
        role: user?.role || 'worker',
        department: 'Farm Management',
        joinDate: '2024-01-15',
        lastLogin: '2024-03-17 08:30 AM',
        twoFactorEnabled: false,
        loginNotifications: true
    });

    // Password Change
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Notification Preferences
    const [notifications, setNotifications] = useState({
        emailAlerts: true,
        smsAlerts: false,
        browserNotifications: true,
        weeklyReports: true,
        healthAlerts: true,
        feedAlerts: true,
        marketingEmails: false
    });

    const getRoleColor = (role) => {
        switch(role) {
            case 'admin': return '#ff0000';
            case 'vet': return '#4CAF50';
            case 'worker': return '#2196F3';
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

    const handlePersonalUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            // Combine first and last name
            const fullName = `${personalData.firstName} ${personalData.lastName}`.trim();
            await API.put('/users/profile', { 
                name: fullName, 
                email: personalData.email,
                phone: personalData.phone,
                address: personalData.address,
                city: personalData.city
            });
            
            // Update local storage user
            const updatedUser = { ...user, name: fullName, email: personalData.email };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            
            toast.success('Personal details updated successfully!');
            setEditMode(false);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('New passwords do not match');
            return;
        }
        
        if (passwordData.newPassword.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        
        setLoading(true);
        
        try {
            await API.put('/users/password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            toast.success('Password changed successfully!');
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = () => {
        if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            toast.error('Account deletion is not available in demo mode');
        }
    };

    const getInitials = () => {
        return `${personalData.firstName.charAt(0)}${personalData.lastName.charAt(0)}`.toUpperCase();
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h1 style={styles.title}>👤 My Profile</h1>
                {!editMode && activeTab === 'personal' && (
                    <button
                        onClick={() => setEditMode(true)}
                        style={styles.editButton}
                    >
                        ✏️ Edit Profile
                    </button>
                )}
            </div>

            {/* Profile Header Card */}
            <div style={styles.profileHeader}>
                <div style={styles.avatarSection}>
                    <div style={{
                        ...styles.avatar,
                        backgroundColor: getRoleColor(accountData.role)
                    }}>
                        {getInitials() || getRoleIcon(accountData.role)}
                    </div>
                    <div style={styles.userTitleInfo}>
                        <h2 style={styles.userName}>
                            {personalData.firstName} {personalData.lastName}
                        </h2>
                        <p style={styles.userTitle}>
                            {accountData.department} • {accountData.role.charAt(0).toUpperCase() + accountData.role.slice(1)}
                        </p>
                        <span style={{
                            ...styles.roleBadge,
                            backgroundColor: getRoleColor(accountData.role)
                        }}>
                            {getRoleIcon(accountData.role)} {accountData.role.toUpperCase()}
                        </span>
                    </div>
                </div>
                <div style={styles.accountMeta}>
                    <div style={styles.metaItem}>
                        <span style={styles.metaLabel}>Member since</span>
                        <span style={styles.metaValue}>{accountData.joinDate}</span>
                    </div>
                    <div style={styles.metaItem}>
                        <span style={styles.metaLabel}>Last login</span>
                        <span style={styles.metaValue}>{accountData.lastLogin}</span>
                    </div>
                    <div style={styles.metaItem}>
                        <span style={styles.metaLabel}>Username</span>
                        <span style={styles.metaValue}>@{accountData.username}</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={styles.tabContainer}>
                <button
                    onClick={() => { setActiveTab('personal'); setEditMode(false); }}
                    style={activeTab === 'personal' ? styles.activeTab : styles.tab}
                >
                    👤 Personal Details
                </button>
                <button
                    onClick={() => { setActiveTab('account'); setEditMode(false); }}
                    style={activeTab === 'account' ? styles.activeTab : styles.tab}
                >
                    🔐 Account Settings
                </button>
                <button
                    onClick={() => { setActiveTab('notifications'); setEditMode(false); }}
                    style={activeTab === 'notifications' ? styles.activeTab : styles.tab}
                >
                    🔔 Notifications
                </button>
                <button
                    onClick={() => { setActiveTab('security'); setEditMode(false); }}
                    style={activeTab === 'security' ? styles.activeTab : styles.tab}
                >
                    🛡️ Security
                </button>
            </div>

            {/* Tab Content */}
            <div style={styles.tabContent}>
                {/* PERSONAL DETAILS TAB */}
                {activeTab === 'personal' && (
                    <div style={styles.contentCard}>
                        {!editMode ? (
                            // View Mode
                            <div>
                                <h3 style={styles.sectionTitle}>Personal Information</h3>
                                <div style={styles.infoGrid}>
                                    <InfoItem label="First Name" value={personalData.firstName} />
                                    <InfoItem label="Last Name" value={personalData.lastName} />
                                    <InfoItem label="Email Address" value={personalData.email} />
                                    <InfoItem label="Phone Number" value={personalData.phone} />
                                    <InfoItem label="Date of Birth" value={personalData.dateOfBirth} />
                                    <InfoItem label="Gender" value={personalData.gender === 'male' ? 'Male' : 'Female'} />
                                    <InfoItem label="Nationality" value={personalData.nationality} />
                                    <InfoItem label="ID/Passport" value={personalData.idNumber} />
                                </div>

                                <h3 style={{...styles.sectionTitle, marginTop: '30px'}}>Address</h3>
                                <div style={styles.infoGrid}>
                                    <InfoItem label="Street Address" value={personalData.address} />
                                    <InfoItem label="City" value={personalData.city} />
                                    <InfoItem label="Province" value={personalData.province} />
                                    <InfoItem label="Postal Code" value={personalData.postalCode} />
                                </div>

                                <h3 style={{...styles.sectionTitle, marginTop: '30px'}}>Emergency Contact</h3>
                                <div style={styles.infoGrid}>
                                    <InfoItem label="Emergency Contact" value={personalData.emergencyContact} />
                                </div>
                            </div>
                        ) : (
                            // Edit Mode
                            <form onSubmit={handlePersonalUpdate}>
                                <h3 style={styles.sectionTitle}>Personal Information</h3>
                                <div style={styles.formRow}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>First Name *</label>
                                        <input
                                            type="text"
                                            value={personalData.firstName}
                                            onChange={(e) => setPersonalData({...personalData, firstName: e.target.value})}
                                            style={styles.input}
                                            required
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Last Name *</label>
                                        <input
                                            type="text"
                                            value={personalData.lastName}
                                            onChange={(e) => setPersonalData({...personalData, lastName: e.target.value})}
                                            style={styles.input}
                                            required
                                        />
                                    </div>
                                </div>

                                <div style={styles.formRow}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Email *</label>
                                        <input
                                            type="email"
                                            value={personalData.email}
                                            onChange={(e) => setPersonalData({...personalData, email: e.target.value})}
                                            style={styles.input}
                                            required
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Phone</label>
                                        <input
                                            type="tel"
                                            value={personalData.phone}
                                            onChange={(e) => setPersonalData({...personalData, phone: e.target.value})}
                                            style={styles.input}
                                        />
                                    </div>
                                </div>

                                <div style={styles.formRow}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Date of Birth</label>
                                        <input
                                            type="date"
                                            value={personalData.dateOfBirth}
                                            onChange={(e) => setPersonalData({...personalData, dateOfBirth: e.target.value})}
                                            style={styles.input}
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Gender</label>
                                        <select
                                            value={personalData.gender}
                                            onChange={(e) => setPersonalData({...personalData, gender: e.target.value})}
                                            style={styles.input}
                                        >
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={styles.formRow}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Nationality</label>
                                        <input
                                            type="text"
                                            value={personalData.nationality}
                                            onChange={(e) => setPersonalData({...personalData, nationality: e.target.value})}
                                            style={styles.input}
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>ID/Passport Number</label>
                                        <input
                                            type="text"
                                            value={personalData.idNumber}
                                            onChange={(e) => setPersonalData({...personalData, idNumber: e.target.value})}
                                            style={styles.input}
                                        />
                                    </div>
                                </div>

                                <h3 style={styles.sectionTitle}>Address</h3>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Street Address</label>
                                    <input
                                        type="text"
                                        value={personalData.address}
                                        onChange={(e) => setPersonalData({...personalData, address: e.target.value})}
                                        style={styles.input}
                                    />
                                </div>

                                <div style={styles.formRow}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>City</label>
                                        <input
                                            type="text"
                                            value={personalData.city}
                                            onChange={(e) => setPersonalData({...personalData, city: e.target.value})}
                                            style={styles.input}
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Province</label>
                                        <input
                                            type="text"
                                            value={personalData.province}
                                            onChange={(e) => setPersonalData({...personalData, province: e.target.value})}
                                            style={styles.input}
                                        />
                                    </div>
                                </div>

                                <div style={styles.formRow}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Postal Code</label>
                                        <input
                                            type="text"
                                            value={personalData.postalCode}
                                            onChange={(e) => setPersonalData({...personalData, postalCode: e.target.value})}
                                            style={styles.input}
                                        />
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Emergency Contact</label>
                                        <input
                                            type="text"
                                            value={personalData.emergencyContact}
                                            onChange={(e) => setPersonalData({...personalData, emergencyContact: e.target.value})}
                                            style={styles.input}
                                            placeholder="Name: Phone"
                                        />
                                    </div>
                                </div>

                                <div style={styles.formActions}>
                                    <button
                                        type="button"
                                        onClick={() => setEditMode(false)}
                                        style={styles.cancelButton}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        style={styles.saveButton}
                                    >
                                        {loading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}

                {/* ACCOUNT SETTINGS TAB */}
                {activeTab === 'account' && (
                    <div style={styles.contentCard}>
                        <h3 style={styles.sectionTitle}>Account Information</h3>
                        <div style={styles.infoGrid}>
                            <InfoItem label="Username" value={`@${accountData.username}`} />
                            <InfoItem label="Role" value={accountData.role.toUpperCase()} />
                            <InfoItem label="Department" value={accountData.department} />
                            <InfoItem label="Member Since" value={accountData.joinDate} />
                            <InfoItem label="Last Login" value={accountData.lastLogin} />
                        </div>

                        <h3 style={{...styles.sectionTitle, marginTop: '30px'}}>Account Preferences</h3>
                        <div style={styles.preferencesList}>
                            <PreferenceItem
                                label="Two-Factor Authentication"
                                description="Add an extra layer of security to your account"
                                checked={accountData.twoFactorEnabled}
                                onChange={(checked) => setAccountData({...accountData, twoFactorEnabled: checked})}
                            />
                            <PreferenceItem
                                label="Login Notifications"
                                description="Get notified when someone logs into your account"
                                checked={accountData.loginNotifications}
                                onChange={(checked) => setAccountData({...accountData, loginNotifications: checked})}
                            />
                        </div>

                        <div style={styles.formActions}>
                            <button
                                onClick={() => toast.success('Account settings saved!')}
                                style={styles.saveButton}
                            >
                                Save Settings
                            </button>
                        </div>
                    </div>
                )}

                {/* NOTIFICATIONS TAB */}
                {activeTab === 'notifications' && (
                    <div style={styles.contentCard}>
                        <h3 style={styles.sectionTitle}>Notification Preferences</h3>
                        
                        <div style={styles.preferencesList}>
                            <PreferenceItem
                                label="Email Alerts"
                                description="Receive important alerts via email"
                                checked={notifications.emailAlerts}
                                onChange={(checked) => setNotifications({...notifications, emailAlerts: checked})}
                            />
                            <PreferenceItem
                                label="SMS Notifications"
                                description="Get text messages for urgent alerts"
                                checked={notifications.smsAlerts}
                                onChange={(checked) => setNotifications({...notifications, smsAlerts: checked})}
                            />
                            <PreferenceItem
                                label="Browser Notifications"
                                description="Show notifications in your browser"
                                checked={notifications.browserNotifications}
                                onChange={(checked) => setNotifications({...notifications, browserNotifications: checked})}
                            />
                            <PreferenceItem
                                label="Weekly Reports"
                                description="Receive weekly farm summary reports"
                                checked={notifications.weeklyReports}
                                onChange={(checked) => setNotifications({...notifications, weeklyReports: checked})}
                            />
                            <PreferenceItem
                                label="Health Alerts"
                                description="Get notified about animal health issues"
                                checked={notifications.healthAlerts}
                                onChange={(checked) => setNotifications({...notifications, healthAlerts: checked})}
                            />
                            <PreferenceItem
                                label="Feed Alerts"
                                description="Alerts for low feed stock"
                                checked={notifications.feedAlerts}
                                onChange={(checked) => setNotifications({...notifications, feedAlerts: checked})}
                            />
                            <PreferenceItem
                                label="Marketing Emails"
                                description="Receive tips, updates and promotions"
                                checked={notifications.marketingEmails}
                                onChange={(checked) => setNotifications({...notifications, marketingEmails: checked})}
                            />
                        </div>

                        <div style={styles.formActions}>
                            <button
                                onClick={() => toast.success('Notification preferences saved!')}
                                style={styles.saveButton}
                            >
                                Save Preferences
                            </button>
                        </div>
                    </div>
                )}

                {/* SECURITY TAB */}
                {activeTab === 'security' && (
                    <div style={styles.contentCard}>
                        <h3 style={styles.sectionTitle}>Change Password</h3>
                        <form onSubmit={handlePasswordChange}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Current Password</label>
                                <input
                                    type="password"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                                    style={styles.input}
                                    required
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>New Password</label>
                                <input
                                    type="password"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                                    style={styles.input}
                                    required
                                />
                                <p style={styles.hint}>Minimum 6 characters</p>
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Confirm New Password</label>
                                <input
                                    type="password"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                    style={styles.input}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                style={styles.saveButton}
                            >
                                {loading ? 'Updating...' : 'Update Password'}
                            </button>
                        </form>

                        <div style={styles.dangerZone}>
                            <h3 style={{...styles.sectionTitle, color: '#f44336'}}>Danger Zone</h3>
                            <p style={styles.dangerText}>
                                Once you delete your account, there is no going back. All your data will be permanently removed.
                            </p>
                            <button
                                onClick={handleDeleteAccount}
                                style={styles.deleteButton}
                            >
                                Delete Account
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Logout Button */}
            <button
                onClick={logout}
                style={styles.logoutButton}
            >
                🚪 Logout
            </button>
        </div>
    );
}

// Helper Components
const InfoItem = ({ label, value }) => (
    <div style={styles.infoItem}>
        <div style={styles.infoLabel}>{label}</div>
        <div style={styles.infoValue}>{value}</div>
    </div>
);

const PreferenceItem = ({ label, description, checked, onChange }) => (
    <label style={styles.preferenceItem}>
        <div style={styles.preferenceInfo}>
            <div style={styles.preferenceLabel}>{label}</div>
            <div style={styles.preferenceDescription}>{description}</div>
        </div>
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            style={styles.preferenceCheckbox}
        />
    </label>
);

// Styles
const styles = {
    container: {
        padding: '20px',
        marginLeft: '0px',
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
    editButton: {
        padding: '10px 20px',
        backgroundColor: '#ff1493',
        color: '#000',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1em',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    profileHeader: {
        backgroundColor: '#1a1a1a',
        border: '2px solid #ff1493',
        borderRadius: '15px',
        padding: '25px',
        marginBottom: '20px'
    },
    avatarSection: {
        display: 'flex',
        gap: '20px',
        marginBottom: '20px'
    },
    avatar: {
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2em',
        color: '#000',
        fontWeight: 'bold'
    },
    userTitleInfo: {
        flex: 1
    },
    userName: {
        color: '#ff1493',
        margin: '0 0 5px 0',
        fontSize: '1.5em'
    },
    userTitle: {
        color: '#888',
        margin: '0 0 10px 0'
    },
    roleBadge: {
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '0.9em',
        fontWeight: 'bold',
        color: '#000',
        display: 'inline-block'
    },
    accountMeta: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '15px',
        padding: '15px',
        backgroundColor: '#000',
        borderRadius: '10px'
    },
    metaItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '5px'
    },
    metaLabel: {
        color: '#888',
        fontSize: '0.85em'
    },
    metaValue: {
        color: '#fff',
        fontWeight: 'bold'
    },
    tabContainer: {
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        borderBottom: '2px solid #ff1493',
        paddingBottom: '10px',
        flexWrap: 'wrap'
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
    tabContent: {
        marginBottom: '20px'
    },
    contentCard: {
        backgroundColor: '#1a1a1a',
        border: '2px solid #ff1493',
        borderRadius: '15px',
        padding: '25px'
    },
    sectionTitle: {
        color: '#ff1493',
        margin: '0 0 20px 0',
        fontSize: '1.2em'
    },
    infoGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '15px'
    },
    infoItem: {
        backgroundColor: '#000',
        padding: '12px 15px',
        borderRadius: '8px'
    },
    infoLabel: {
        color: '#888',
        fontSize: '0.85em',
        marginBottom: '5px'
    },
    infoValue: {
        color: '#fff',
        fontSize: '1em',
        fontWeight: 'bold'
    },
    formRow: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '15px',
        marginBottom: '15px'
    },
    formGroup: {
        marginBottom: '15px'
    },
    label: {
        color: '#ff1493',
        display: 'block',
        marginBottom: '5px',
        fontSize: '0.9em'
    },
    input: {
        width: '100%',
        padding: '12px',
        backgroundColor: '#000',
        border: '2px solid #ff1493',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '1em',
        boxSizing: 'border-box'
    },
    hint: {
        color: '#888',
        fontSize: '0.8em',
        marginTop: '5px'
    },
    formActions: {
        display: 'flex',
        gap: '10px',
        justifyContent: 'flex-end',
        marginTop: '20px'
    },
    cancelButton: {
        padding: '10px 20px',
        backgroundColor: '#333',
        color: '#fff',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer'
    },
    saveButton: {
        padding: '10px 20px',
        backgroundColor: '#ff1493',
        color: '#000',
        border: 'none',
        borderRadius: '5px',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    preferencesList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '15px'
    },
    preferenceItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '15px',
        backgroundColor: '#000',
        borderRadius: '8px',
        cursor: 'pointer'
    },
    preferenceInfo: {
        flex: 1
    },
    preferenceLabel: {
        color: '#fff',
        fontWeight: 'bold',
        marginBottom: '3px'
    },
    preferenceDescription: {
        color: '#888',
        fontSize: '0.85em'
    },
    preferenceCheckbox: {
        width: '20px',
        height: '20px',
        cursor: 'pointer',
        accentColor: '#ff1493'
    },
    dangerZone: {
        marginTop: '30px',
        padding: '20px',
        backgroundColor: '#000',
        borderRadius: '10px',
        border: '2px solid #f44336'
    },
    dangerText: {
        color: '#888',
        marginBottom: '15px'
    },
    deleteButton: {
        padding: '10px 20px',
        backgroundColor: '#f44336',
        color: '#fff',
        border: 'none',
        borderRadius: '5px',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    logoutButton: {
        width: '100%',
        padding: '15px',
        backgroundColor: '#ff1493',
        color: '#000',
        border: 'none',
        borderRadius: '10px',
        fontSize: '1.1em',
        fontWeight: 'bold',
        cursor: 'pointer',
        marginTop: '20px'
    }
};

export default Profile;