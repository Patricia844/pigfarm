import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const success = await login(email, password);
            if (success) {
                navigate('/');
            }
        } catch (error) {
            console.error('Login error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ 
            minHeight: '100vh', 
            backgroundColor: '#000', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{ 
                backgroundColor: '#1a1a1a', 
                padding: '40px', 
                borderRadius: '10px', 
                border: '2px solid #ff1493',
                width: '100%',
                maxWidth: '400px'
            }}>
                <h1 style={{ color: '#ff1493', textAlign: 'center', marginBottom: '10px' }}>🐷 PigFarm</h1>
                <h2 style={{ color: '#fff', textAlign: 'center', marginBottom: '30px' }}>Welcome Back</h2>
                
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ color: '#ff1493', display: 'block', marginBottom: '5px' }}>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: '#000',
                                border: '2px solid #ff1493',
                                borderRadius: '5px',
                                color: '#fff',
                                fontSize: '16px'
                            }}
                            placeholder="Enter your email"
                            required
                        />
                    </div>
                    
                    <div style={{ marginBottom: '30px' }}>
                        <label style={{ color: '#ff1493', display: 'block', marginBottom: '5px' }}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: '#000',
                                border: '2px solid #ff1493',
                                borderRadius: '5px',
                                color: '#fff',
                                fontSize: '16px'
                            }}
                            placeholder="Enter your password"
                            required
                        />
                    </div>
                    
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '14px',
                            backgroundColor: loading ? '#666' : '#ff1493',
                            color: '#000',
                            border: 'none',
                            borderRadius: '5px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            marginBottom: '20px',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
                
                <p style={{ color: '#888', textAlign: 'center' }}>
                    Don't have an account?{' '}
                    <Link 
                        to="/register" 
                        style={{ 
                            color: '#ff1493', 
                            textDecoration: 'none',
                            fontWeight: 'bold'
                        }}
                    >
                        Register here
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default Login;