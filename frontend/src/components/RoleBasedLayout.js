import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RoleBasedLayout = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                color: '#ff1493' 
            }}>
                Loading...
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                backgroundColor: '#000',
                color: '#fff',
                padding: '20px',
                textAlign: 'center'
            }}>
                <h1 style={{ color: '#ff1493', fontSize: '3em', marginBottom: '20px' }}>🚫</h1>
                <h2 style={{ color: '#ff1493', marginBottom: '20px' }}>Access Denied</h2>
                <p style={{ color: '#888', marginBottom: '30px', maxWidth: '500px' }}>
                    You don't have permission to access this page. 
                    Your role is <strong style={{ color: '#ff1493' }}>{user.role}</strong>.
                </p>
                <button
                    onClick={() => window.location.href = '/'}
                    style={{
                        backgroundColor: '#ff1493',
                        color: '#000',
                        border: 'none',
                        padding: '12px 30px',
                        borderRadius: '5px',
                        fontSize: '1em',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    Go to Dashboard
                </button>
            </div>
        );
    }

    return children;
};

export default RoleBasedLayout;