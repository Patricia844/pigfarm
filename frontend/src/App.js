import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Sows from './pages/Sows';
import Health from './pages/Health';
import Finance from './pages/Finance';
import Litters from './pages/Litters';
import Feed from './pages/Feed';
import Reports from './pages/Reports';
import Inbox from './pages/Inbox';
import Boars from './pages/Boars';
import Sales from './pages/Sales';
import UserManagement from './pages/UserManagement';
import Profile from './pages/Profile';
import './App.css';


// Protected route component
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    
    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                color: '#ff1493',
                fontSize: '1.2em',
                backgroundColor: '#000'
            }}>
                Loading...
            </div>
        );
    }
    
    if (!user) {
        return <Navigate to="/login" />;
    }
    
    return children;
};

function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route path="/" element={
                <ProtectedRoute>
                    <Layout />
                </ProtectedRoute>
            }>
                <Route index element={<Dashboard />} />
                <Route path="sows" element={<Sows />} />
                <Route path="litters" element={<Litters />} />
                <Route path="feed" element={<Feed />} />
                <Route path="finance" element={<Finance/>}/>
                <Route path="health" element={<Health />} />
                <Route path="reports" element={<Reports />} />
                <Route path="inbox" element={<Inbox />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="profile" element={<Profile />} />
                <Route path="boars" element={<Boars />} />
                <Route path="sales" element={<Sales />} />
            </Route>
        </Routes>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Toaster 
                    position="top-right"
                    toastOptions={{
                        duration: 4000,
                        style: {
                            background: '#1a1a1a',
                            color: '#fff',
                            border: '2px solid #ff1493'
                        }
                    }}
                />
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;