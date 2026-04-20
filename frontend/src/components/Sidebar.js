import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Sidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getInitials = () => {
        if (!user?.name) return 'U';
        return user.name.charAt(0).toUpperCase();
    };

    const getRoleColor = (role) => {
        switch(role) {
            case 'admin': return '#ff0000';
            case 'farm_manager': return '#ff1493';
            case 'veterinarian': return '#4CAF50';
            default: return '#888';
        }
    };

    const menuItems = [
        { path: '/', icon: '📊', label: 'Dashboard' },
        { path: '/sows', icon: '🐷', label: 'Sows' },
        { path: '/litters', icon: '🐖', label: 'Litters' },
        { path: '/boars', icon: '🐗', label: 'Boars' },
        { path: '/sales', icon: '💵', label: 'Sales' },
        { path: '/feed', icon: '🌾', label: 'Feed' },
        { path: '/finance', icon: '💰', label: 'Finance' },
        { path: '/health', icon: '💉', label: 'Health' },
        { path: '/reports', icon: '📈', label: 'Reports' },
        { path: '/inbox', icon: '📥', label: 'Inbox' },
        { path: '/users', icon: '👥', label: 'Users' },
        { path: '/profile', icon: '👤', label: 'Profile' }
    ];

    return (
        <div style={{
            width: '280px',
            backgroundColor: '#1a1a1a',
            borderRight: '2px solid #ff1493',
            display: 'flex',
            flexDirection: 'column',
            position: 'fixed',
            height: '100vh',
            left: 0,
            top: 0,
            zIndex: 1000
        }}>
            <div style={{ padding: '25px', borderBottom: '2px solid #ff1493', textAlign: 'center' }}>
                <h1 style={{ color: '#ff1493', fontSize: '24px', margin: 0 }}>🐷 PigFarm</h1>
                {user && (
                    <span style={{ display: 'inline-block', marginTop: '8px', padding: '4px 12px', backgroundColor: getRoleColor(user.role), color: '#000', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                        {user.role?.toUpperCase() || 'WORKER'}
                    </span>
                )}
            </div>
            <nav style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
                {menuItems.map(item => (
                    <NavLink key={item.path} to={item.path} end={item.path === '/'}
                        style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '12px 15px', marginBottom: '5px',
                            color: isActive ? '#000' : '#fff',
                            backgroundColor: isActive ? '#ff1493' : 'transparent',
                            borderRadius: '8px', textDecoration: 'none',
                            transition: 'all 0.3s ease',
                            fontWeight: isActive ? 'bold' : 'normal'
                        })}
                    >
                        <span style={{ fontSize: '1.2em' }}>{item.icon}</span>
                        {item.label}
                    </NavLink>
                ))}
            </nav>
            <div style={{ padding: '20px', borderTop: '2px solid #ff1493' }}>
                {user && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                        <div style={{ width: '45px', height: '45px', backgroundColor: '#ff1493', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#000', fontSize: '1.2em' }}>
                            {getInitials()}
                        </div>
                        <div>
                            <p style={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px', fontSize: '14px' }}>{user.name || 'User'}</p>
                            <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>{user.email || ''}</p>
                        </div>
                    </div>
                )}
                <button onClick={handleLogout}
                    style={{ width: '100%', padding: '10px', backgroundColor: 'transparent', border: '2px solid #ff1493', color: '#ff1493', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
                    onMouseEnter={(e) => { e.target.style.backgroundColor = '#ff1493'; e.target.style.color = '#000'; }}
                    onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; e.target.style.color = '#ff1493'; }}
                >
                    🚪 Logout
                </button>
            </div>
        </div>
    );
}

export default Sidebar;