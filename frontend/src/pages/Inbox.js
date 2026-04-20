import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import API from '../services/api';

function Inbox() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('messages');
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [showNewMessageModal, setShowNewMessageModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    // ── Real data state ──────────────────────────────────────────────────────
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);

    // Notifications stay local — no backend table yet
    const [notifications, setNotifications] = useState([]);

    // ── Fetch functions ──────────────────────────────────────────────────────
    const fetchMessages = useCallback(async () => {
        try {
            const res = await API.get('/messages');
            setMessages(res.data);
        } catch (err) {
            console.error('Messages error:', err);
        }
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            const res = await API.get('/users');
            setUsers(res.data.filter(u => u.id !== user?.id));
        } catch (err) {
            // Non-admin users can't fetch user list — that's fine
            console.log('User list not available for this role');
        }
    }, [user]);

    useEffect(() => {
        const loadAll = async () => {
            setLoading(true);
            await Promise.all([fetchMessages(), fetchUsers()]);
            setLoading(false);
        };
        loadAll();
    }, [fetchMessages, fetchUsers]);

    // ── Derived data ─────────────────────────────────────────────────────────
    const unreadMessages = messages.filter(m => !m.is_read && m.receiver_id === user?.id);

    const filteredMessages = messages.filter(m => {
        if (!searchTerm) return true;
        return (
            m.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.sender_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.message?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    // Split into received and sent
    const received = filteredMessages.filter(m => m.receiver_id === user?.id);
    const sent = filteredMessages.filter(m => m.sender_id === user?.id);

    const handleMarkRead = async (id) => {
        try {
            await API.put(`/messages/${id}/read`);
            setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
        } catch (err) {
            console.error('Mark read error:', err);
        }
    };

    const handleSelectMessage = (msg) => {
        setSelectedMessage(msg);
        if (!msg.is_read && msg.receiver_id === user?.id) {
            handleMarkRead(msg.id);
        }
    };

    const getRoleColor = (role) => {
        switch (role) {
            case 'admin': return '#ff1493';
            case 'farm_manager': return '#ff1493';
            case 'veterinarian': return '#4CAF50';
            case 'worker': return '#2196F3';
            default: return '#888';
        }
    };

    const getRoleIcon = (role) => {
        switch (role) {
            case 'admin': return '👑';
            case 'farm_manager': return '👑';
            case 'veterinarian': return '⚕️';
            case 'worker': return '🌾';
            default: return '👤';
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        return date.toLocaleDateString('en-ZA');
    };

    if (loading) return (
        <div style={{ color: '#ff1493', textAlign: 'center', padding: '60px', fontSize: '1.2em' }}>
            Loading messages...
        </div>
    );

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h1 style={styles.title}>📥 Inbox & Communications</h1>
                <button onClick={() => setShowNewMessageModal(true)} style={styles.newMessageButton}>
                    ✏️ New Message
                </button>
            </div>

            {/* Tabs */}
            <div style={styles.tabContainer}>
                <button onClick={() => setActiveTab('messages')} style={activeTab === 'messages' ? styles.activeTab : styles.tab}>
                    📥 Received
                    {unreadMessages.length > 0 && <span style={styles.badge}>{unreadMessages.length}</span>}
                </button>
                <button onClick={() => setActiveTab('sent')} style={activeTab === 'sent' ? styles.activeTab : styles.tab}>
                    📤 Sent
                </button>
                <button onClick={() => setActiveTab('notifications')} style={activeTab === 'notifications' ? styles.activeTab : styles.tab}>
                    🔔 Notifications
                    {notifications.filter(n => !n.seen).length > 0 && (
                        <span style={styles.badge}>{notifications.filter(n => !n.seen).length}</span>
                    )}
                </button>
            </div>

            {/* Search */}
            <div style={styles.filterBar}>
                <input
                    type="text"
                    placeholder="🔍 Search messages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                />
            </div>

            {/* Main Content */}
            <div style={styles.mainContent}>

                {/* MESSAGES TAB — split panel */}
                {(activeTab === 'messages' || activeTab === 'sent') && (
                    <>
                        {/* Left: message list */}
                        <div style={styles.leftPanel}>
                            {(activeTab === 'messages' ? received : sent).length === 0 ? (
                                <div style={{ color: '#888', textAlign: 'center', padding: '40px' }}>
                                    {activeTab === 'messages'
                                        ? 'No messages received yet.'
                                        : 'No sent messages yet.'}
                                    <br /><br />
                                    <button onClick={() => setShowNewMessageModal(true)} style={styles.smallButton}>
                                        ✏️ Send a message
                                    </button>
                                </div>
                            ) : (
                                (activeTab === 'messages' ? received : sent).map(msg => (
                                    <div
                                        key={msg.id}
                                        onClick={() => handleSelectMessage(msg)}
                                        style={{
                                            ...styles.messageItem,
                                            backgroundColor: selectedMessage?.id === msg.id ? '#2a1a2a' :
                                                (!msg.is_read && msg.receiver_id === user?.id) ? '#1a0a1a' : 'transparent',
                                            borderLeft: (!msg.is_read && msg.receiver_id === user?.id)
                                                ? '4px solid #ff1493' : '4px solid transparent'
                                        }}
                                    >
                                        <div style={styles.messageItemHeader}>
                                            <span style={{ color: getRoleColor(activeTab === 'messages' ? msg.sender_role : msg.receiver_role || 'worker'), fontWeight: 'bold' }}>
                                                {getRoleIcon(activeTab === 'messages' ? msg.sender_role : msg.receiver_role || 'worker')}
                                                {' '}
                                                {activeTab === 'messages' ? msg.sender_name : (msg.receiver_name || 'User')}
                                            </span>
                                            <span style={{ color: '#888', fontSize: '11px' }}>{formatTime(msg.created_at)}</span>
                                        </div>
                                        <div style={{ color: '#fff', fontWeight: !msg.is_read && msg.receiver_id === user?.id ? 'bold' : 'normal', marginBottom: '4px' }}>
                                            {msg.subject || '(No subject)'}
                                        </div>
                                        <div style={{ color: '#888', fontSize: '12px' }}>
                                            {msg.message?.substring(0, 60)}{msg.message?.length > 60 ? '...' : ''}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Right: message detail */}
                        <div style={styles.rightPanel}>
                            {selectedMessage ? (
                                <div style={styles.messageDetail}>
                                    <div style={styles.detailHeader}>
                                        <h3 style={{ color: '#ff1493', margin: 0 }}>{selectedMessage.subject || '(No subject)'}</h3>
                                        <div style={{ color: '#888', fontSize: '13px', marginTop: '8px' }}>
                                            <span>From: <strong style={{ color: '#fff' }}>{selectedMessage.sender_name}</strong></span>
                                            <span style={{ margin: '0 15px' }}>To: <strong style={{ color: '#fff' }}>{selectedMessage.receiver_name}</strong></span>
                                            <span>{formatTime(selectedMessage.created_at)}</span>
                                        </div>
                                    </div>
                                    <div style={styles.detailBody}>
                                        {selectedMessage.message}
                                    </div>
                                    <div style={styles.detailActions}>
                                        <button
                                            onClick={() => {
                                                setShowNewMessageModal(true);
                                            }}
                                            style={styles.replyButton}
                                        >
                                            ↩️ Reply
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={styles.noChatSelected}>
                                    <div style={{ fontSize: '4em', marginBottom: '20px' }}>💬</div>
                                    <h3>Select a message to read it</h3>
                                    <p style={{ color: '#888' }}>Choose from your messages on the left</p>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* NOTIFICATIONS TAB */}
                {activeTab === 'notifications' && (
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ color: '#ff1493', margin: 0 }}>🔔 Notifications</h3>
                            {notifications.length > 0 && (
                                <button
                                    onClick={() => setNotifications(n => n.map(x => ({ ...x, seen: true })))}
                                    style={styles.smallButton}
                                >
                                    Mark all as read
                                </button>
                            )}
                        </div>

                        {/* Real unread messages as notifications */}
                        {unreadMessages.length > 0 && (
                            <div style={{ marginBottom: '20px' }}>
                                <h4 style={{ color: '#888', marginBottom: '10px' }}>Unread Messages</h4>
                                {unreadMessages.map(msg => (
                                    <div
                                        key={msg.id}
                                        onClick={() => { setActiveTab('messages'); handleSelectMessage(msg); }}
                                        style={{
                                            ...styles.notificationItem,
                                            backgroundColor: '#1a0a1a',
                                            borderLeft: '4px solid #ff1493',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div style={{ fontSize: '1.5em' }}>💬</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ color: '#fff', marginBottom: '4px' }}>
                                                New message from <strong>{msg.sender_name}</strong>: {msg.subject}
                                            </div>
                                            <div style={{ color: '#888', fontSize: '12px' }}>{formatTime(msg.created_at)}</div>
                                        </div>
                                        <span style={{ padding: '2px 8px', backgroundColor: '#f44336', color: '#fff', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                                            UNREAD
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {notifications.length === 0 && unreadMessages.length === 0 && (
                            <div style={{ color: '#888', textAlign: 'center', padding: '60px', border: '2px dashed #333', borderRadius: '10px' }}>
                                ✅ All caught up — no new notifications.
                            </div>
                        )}

                        {notifications.map(n => (
                            <div
                                key={n.id}
                                onClick={() => setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, seen: true } : x))}
                                style={{
                                    ...styles.notificationItem,
                                    backgroundColor: !n.seen ? '#2a1a2a' : '#1a1a1a',
                                    borderLeft: n.priority === 'urgent' ? '4px solid #f44336' : '4px solid transparent'
                                }}
                            >
                                <div style={{ fontSize: '1.5em' }}>
                                    {n.type === 'message' ? '💬' : n.type === 'meeting' ? '📅' : '⚠️'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: '#fff', marginBottom: '4px' }}>{n.message}</div>
                                    <div style={{ color: '#888', fontSize: '12px' }}>{formatTime(n.timestamp)}</div>
                                </div>
                                {n.priority === 'urgent' && (
                                    <span style={{ padding: '2px 8px', backgroundColor: '#f44336', color: '#fff', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                                        URGENT
                                    </span>
                                )}
                                {!n.seen && <span style={{ width: '10px', height: '10px', backgroundColor: '#ff1493', borderRadius: '50%', display: 'inline-block' }} />}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* New Message Modal */}
            {showNewMessageModal && (
                <NewMessageModal
                    users={users}
                    replyTo={selectedMessage}
                    currentUser={user}
                    onClose={() => setShowNewMessageModal(false)}
                    onSuccess={() => { fetchMessages(); setShowNewMessageModal(false); }}
                />
            )}
        </div>
    );
}

// ── New Message Modal ────────────────────────────────────────────────────────

const NewMessageModal = ({ users, replyTo, currentUser, onClose, onSuccess }) => {
    const [form, setForm] = useState({
        receiver_id: replyTo ? replyTo.sender_id : '',
        subject: replyTo ? `Re: ${replyTo.subject}` : '',
        message: '',
    });
    const [saving, setSaving] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.receiver_id) { toast.error('Please select a recipient'); return; }
        if (!form.message.trim()) { toast.error('Message cannot be empty'); return; }
        setSaving(true);
        try {
            await API.post('/messages', form);
            toast.success('Message sent!');
            onSuccess();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to send message');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <h2 style={{ color: '#ff1493', marginBottom: '20px' }}>✏️ {replyTo ? 'Reply' : 'New Message'}</h2>
                <form onSubmit={handleSubmit}>
                    <div style={modalFormGroup}>
                        <label style={modalLabel}>To *</label>
                        {users.length > 0 ? (
                            <select name="receiver_id" value={form.receiver_id} onChange={handleChange} style={modalInput} required>
                                <option value="">Select recipient</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.name} ({u.role})
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                name="receiver_id"
                                value={form.receiver_id}
                                onChange={handleChange}
                                style={modalInput}
                                placeholder="Enter user ID"
                                required
                            />
                        )}
                    </div>
                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Subject</label>
                        <input
                            name="subject"
                            value={form.subject}
                            onChange={handleChange}
                            style={modalInput}
                            placeholder="e.g., Health alert, Feed update"
                        />
                    </div>
                    <div style={modalFormGroup}>
                        <label style={modalLabel}>Message *</label>
                        <textarea
                            name="message"
                            value={form.message}
                            onChange={handleChange}
                            style={{ ...modalInput, minHeight: '120px', resize: 'vertical' }}
                            placeholder="Type your message..."
                            required
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                        <button type="button" onClick={onClose} style={modalCancelButton}>Cancel</button>
                        <button type="submit" disabled={saving} style={{ ...modalSubmitButton, opacity: saving ? 0.7 : 1 }}>
                            {saving ? 'Sending...' : '📤 Send Message'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ── Modal styles ─────────────────────────────────────────────────────────────
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalContentStyle = { backgroundColor: '#1a1a1a', border: '2px solid #ff1493', borderRadius: '20px', padding: '30px', width: '90%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' };
const modalFormGroup = { marginBottom: '15px' };
const modalLabel = { color: '#ff1493', display: 'block', marginBottom: '5px', fontSize: '0.95em' };
const modalInput = { width: '100%', padding: '10px', backgroundColor: '#000', border: '2px solid #ff1493', borderRadius: '8px', color: '#fff', fontSize: '1em', boxSizing: 'border-box' };
const modalCancelButton = { padding: '10px 20px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };
const modalSubmitButton = { padding: '10px 20px', backgroundColor: '#ff1493', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' };

// ── Page styles ───────────────────────────────────────────────────────────────
const styles = {
    container: { padding: '20px', backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff', width: '100%', boxSizing: 'border-box' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    title: { color: '#ff1493', margin: 0, fontSize: '2em' },
    newMessageButton: { backgroundColor: '#ff1493', color: '#000', border: 'none', padding: '10px 20px', borderRadius: '50px', fontSize: '1em', fontWeight: 'bold', cursor: 'pointer' },
    tabContainer: { display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ff1493', paddingBottom: '10px' },
    tab: { padding: '8px 16px', backgroundColor: 'transparent', color: '#888', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '1em', position: 'relative' },
    activeTab: { padding: '8px 16px', backgroundColor: '#ff1493', color: '#000', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '1em', fontWeight: 'bold', position: 'relative' },
    badge: { position: 'absolute', top: '-5px', right: '-5px', backgroundColor: '#f44336', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    filterBar: { marginBottom: '20px' },
    searchInput: { width: '100%', padding: '12px', backgroundColor: '#1a1a1a', border: '2px solid #ff1493', borderRadius: '50px', color: '#fff', fontSize: '1em', boxSizing: 'border-box' },
    mainContent: { display: 'flex', gap: '20px', minHeight: '600px' },
    leftPanel: { width: '340px', backgroundColor: '#1a1a1a', border: '2px solid #ff1493', borderRadius: '15px', overflowY: 'auto' },
    rightPanel: { flex: 1, backgroundColor: '#1a1a1a', border: '2px solid #ff1493', borderRadius: '15px', overflow: 'hidden' },
    messageItem: { padding: '15px', borderBottom: '1px solid #333', cursor: 'pointer', transition: 'background 0.2s' },
    messageItemHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' },
    noChatSelected: { height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#888' },
    messageDetail: { padding: '25px', height: '100%', display: 'flex', flexDirection: 'column' },
    detailHeader: { borderBottom: '2px solid #ff1493', paddingBottom: '15px', marginBottom: '20px' },
    detailBody: { flex: 1, color: '#fff', fontSize: '1em', lineHeight: '1.7', whiteSpace: 'pre-wrap' },
    detailActions: { marginTop: '20px', borderTop: '1px solid #333', paddingTop: '15px' },
    replyButton: { padding: '10px 20px', backgroundColor: '#ff1493', color: '#000', border: 'none', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' },
    smallButton: { padding: '8px 16px', backgroundColor: '#ff1493', color: '#000', border: 'none', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' },
    notificationItem: { display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', borderRadius: '10px', marginBottom: '10px', cursor: 'pointer' },
};

export default Inbox;