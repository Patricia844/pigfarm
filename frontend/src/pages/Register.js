import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function Register() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        role: 'worker', // Default role
        farmName: '',
        terms: false
    });
    
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const validateForm = () => {
        if (!formData.name.trim()) {
            toast.error('Full name is required');
            return false;
        }
        
        if (!formData.email.trim()) {
            toast.error('Email is required');
            return false;
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            toast.error('Please enter a valid email address');
            return false;
        }
        
        if (formData.password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return false;
        }
        
        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return false;
        }
        
        if (!formData.terms) {
            toast.error('You must accept the terms and conditions');
            return false;
        }
        
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;
        
        setLoading(true);
        
        try {
            // Register user (always as worker - admin will promote later)
            const success = await register(
                formData.name,
                formData.email,
                formData.password,
                'worker' // Force worker role on registration
            );
            
            if (success) {
                toast.success('Registration successful! Welcome to PigFarm.');
                navigate('/');
            }
        } catch (error) {
            console.error('Registration error:', error);
            toast.error(error.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                {/* Header */}
                <div style={styles.header}>
                    <h1 style={styles.title}>🐷 PigFarm</h1>
                    <h2 style={styles.subtitle}>Create New Account</h2>
                    <p style={styles.description}>
                        Join PigFarm to start managing your farm efficiently
                    </p>
                </div>

                {/* Register Form */}
                <form onSubmit={handleSubmit} style={styles.form}>
                    {/* Full Name */}
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>
                            <span style={styles.labelIcon}>👤</span>
                            Full Name
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter your full name"
                            style={styles.input}
                            required
                        />
                    </div>

                    {/* Email */}
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>
                            <span style={styles.labelIcon}>📧</span>
                            Email Address
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="you@example.com"
                            style={styles.input}
                            required
                        />
                    </div>

                    {/* Phone (Optional) */}
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>
                            <span style={styles.labelIcon}>📱</span>
                            Phone Number (Optional)
                        </label>
                        <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="+263 XX XXX XXXX"
                            style={styles.input}
                        />
                    </div>

                    {/* Farm Name (Optional) */}
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>
                            <span style={styles.labelIcon}>🏠</span>
                            Farm Name (Optional)
                        </label>
                        <input
                            type="text"
                            name="farmName"
                            value={formData.farmName}
                            onChange={handleChange}
                            placeholder="e.g., Green Acres Farm"
                            style={styles.input}
                        />
                    </div>

                    {/* Role Info - Display Only */}
                    <div style={styles.roleInfo}>
                        <span style={styles.roleIcon}>🌾</span>
                        <div style={styles.roleText}>
                            <strong>Worker Account</strong>
                            <p style={styles.roleDescription}>
                                You'll register as a worker. Admin can upgrade your role later.
                            </p>
                        </div>
                    </div>

                    {/* Password */}
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>
                            <span style={styles.labelIcon}>🔒</span>
                            Password
                        </label>
                        <div style={styles.passwordContainer}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Minimum 6 characters"
                                style={styles.passwordInput}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={styles.passwordToggle}
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>
                            <span style={styles.labelIcon}>🔒</span>
                            Confirm Password
                        </label>
                        <div style={styles.passwordContainer}>
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Re-enter your password"
                                style={styles.passwordInput}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                style={styles.passwordToggle}
                            >
                                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                    </div>

                    {/* Password Strength Indicator */}
                    {formData.password && (
                        <div style={styles.passwordStrength}>
                            <div style={styles.strengthLabel}>
                                Password Strength:
                                <span style={{
                                    ...styles.strengthValue,
                                    color: formData.password.length < 6 ? '#f44336' :
                                           formData.password.length < 8 ? '#ff9800' : '#4CAF50'
                                }}>
                                    {formData.password.length < 6 ? ' Weak' :
                                     formData.password.length < 8 ? ' Medium' : ' Strong'}
                                </span>
                            </div>
                            <div style={styles.strengthBar}>
                                <div style={{
                                    ...styles.strengthBarFill,
                                    width: formData.password.length < 6 ? '33%' :
                                           formData.password.length < 8 ? '66%' : '100%',
                                    backgroundColor: formData.password.length < 6 ? '#f44336' :
                                                     formData.password.length < 8 ? '#ff9800' : '#4CAF50'
                                }} />
                            </div>
                        </div>
                    )}

                    {/* Terms and Conditions */}
                    <div style={styles.termsGroup}>
                        <label style={styles.checkbox}>
                            <input
                                type="checkbox"
                                name="terms"
                                checked={formData.terms}
                                onChange={handleChange}
                                style={styles.checkboxInput}
                            />
                            <span style={styles.checkboxText}>
                                I agree to the <Link to="/terms" style={styles.link}>Terms of Service</Link> and{' '}
                                <Link to="/privacy" style={styles.link}>Privacy Policy</Link>
                            </span>
                        </label>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            ...styles.submitButton,
                            opacity: loading ? 0.7 : 1,
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? (
                            <span style={styles.loadingSpinner}>⏳</span>
                        ) : (
                            'Create Account'
                        )}
                    </button>

                    {/* Login Link */}
                    <div style={styles.loginLink}>
                        Already have an account?{' '}
                        <Link to="/login" style={styles.link}>
                            Sign in here
                        </Link>
                    </div>
                </form>

                {/* Features List */}
                <div style={styles.features}>
                    <div style={styles.feature}>
                        <span style={styles.featureIcon}>✅</span>
                        <span>Free account</span>
                    </div>
                    <div style={styles.feature}>
                        <span style={styles.featureIcon}>🚀</span>
                        <span>Instant access</span>
                    </div>
                    <div style={styles.feature}>
                        <span style={styles.featureIcon}>🔒</span>
                        <span>Secure data</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Styles
const styles = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background: 'linear-gradient(135deg, #000 0%, #1a1a1a 100%)'
    },
    card: {
        backgroundColor: '#1a1a1a',
        border: '2px solid #ff1493',
        borderRadius: '20px',
        padding: '40px',
        width: '100%',
        maxWidth: '500px',
        boxShadow: '0 10px 40px rgba(255, 20, 147, 0.2)'
    },
    header: {
        textAlign: 'center',
        marginBottom: '30px'
    },
    title: {
        color: '#ff1493',
        fontSize: '2.5em',
        margin: 0,
        marginBottom: '10px'
    },
    subtitle: {
        color: '#fff',
        fontSize: '1.5em',
        margin: 0,
        marginBottom: '10px'
    },
    description: {
        color: '#888',
        fontSize: '0.95em',
        margin: 0
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '5px'
    },
    label: {
        color: '#ff1493',
        fontSize: '0.95em',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    labelIcon: {
        fontSize: '1.2em'
    },
    input: {
        padding: '12px 15px',
        backgroundColor: '#000',
        border: '2px solid #ff1493',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '1em',
        outline: 'none',
        transition: 'all 0.3s'
    },
    roleInfo: {
        backgroundColor: '#000',
        border: '2px solid #ff1493',
        borderRadius: '8px',
        padding: '15px',
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
    },
    roleIcon: {
        fontSize: '2em'
    },
    roleText: {
        flex: 1
    },
    roleDescription: {
        color: '#888',
        fontSize: '0.85em',
        margin: '5px 0 0 0'
    },
    passwordContainer: {
        position: 'relative',
        width: '100%'
    },
    passwordInput: {
        width: '100%',
        padding: '12px 45px 12px 15px',
        backgroundColor: '#000',
        border: '2px solid #ff1493',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '1em',
        outline: 'none',
        transition: 'all 0.3s',
        boxSizing: 'border-box'
    },
    passwordToggle: {
        position: 'absolute',
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'none',
        border: 'none',
        color: '#888',
        cursor: 'pointer',
        fontSize: '1.2em',
        padding: '5px'
    },
    passwordStrength: {
        marginTop: '-10px'
    },
    strengthLabel: {
        color: '#888',
        fontSize: '0.85em',
        marginBottom: '5px'
    },
    strengthValue: {
        fontWeight: 'bold',
        marginLeft: '5px'
    },
    strengthBar: {
        height: '4px',
        backgroundColor: '#333',
        borderRadius: '2px',
        overflow: 'hidden'
    },
    strengthBarFill: {
        height: '100%',
        transition: 'width 0.3s ease'
    },
    termsGroup: {
        marginTop: '10px'
    },
    checkbox: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        color: '#fff',
        cursor: 'pointer'
    },
    checkboxInput: {
        width: '18px',
        height: '18px',
        cursor: 'pointer',
        accentColor: '#ff1493'
    },
    checkboxText: {
        fontSize: '0.95em'
    },
    link: {
        color: '#ff1493',
        textDecoration: 'none',
        fontWeight: 'bold',
        ':hover': {
            textDecoration: 'underline'
        }
    },
    submitButton: {
        padding: '14px',
        backgroundColor: '#ff1493',
        color: '#000',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1.1em',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.3s',
        marginTop: '10px'
    },
    loadingSpinner: {
        fontSize: '1.2em'
    },
    loginLink: {
        textAlign: 'center',
        color: '#888',
        marginTop: '10px'
    },
    features: {
        display: 'flex',
        justifyContent: 'center',
        gap: '30px',
        marginTop: '30px',
        paddingTop: '20px',
        borderTop: '1px solid #333'
    },
    feature: {
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        color: '#888',
        fontSize: '0.9em'
    },
    featureIcon: {
        fontSize: '1.1em'
    }
};

export default Register;