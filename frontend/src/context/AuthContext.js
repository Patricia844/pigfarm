import React, { createContext, useState, useContext, useEffect } from 'react';
import API from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initializeAuth = () => {
            const storedUser = localStorage.getItem('user');
            const token = localStorage.getItem('token');
            
            if (storedUser && token) {
                setUser(JSON.parse(storedUser));
            }
            setLoading(false);
        };
        
        initializeAuth();
    }, []);

    const login = async (email, password) => {
        try {
            const response = await API.post('/login', { email, password });
            
            if (response.data.token && response.data.user) {
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                setUser(response.data.user);
                toast.success(`Welcome ${response.data.user.name}!`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Login error:', error.response?.data || error.message);
            const message = error.response?.data?.error || 'Login failed';
            toast.error(message);
            return false;
        }
    };

  const register = async (name, email, password) => {
    try {
        const response = await API.post('/register', { name, email, password });
        
        if (response.data.token && response.data.user) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            setUser(response.data.user);
            toast.success('Registration successful! You are logged in as worker.');
            return true;
        }
        return false;
    } catch (error) {
        console.error('Register error:', error.response?.data || error.message);
        const message = error.response?.data?.error || 'Registration failed';
        toast.error(message);
        return false;
    }
};

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        toast.success('Logged out successfully');
    };

    const value = {
        user,
        login,
        register,
        logout,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};