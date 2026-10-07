import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import Navbar from './components/Navbar';
import SessionListPage from './pages/SessionListPage';
import SessionDetailPage from './pages/SessionDetailPage';
import LoginPage from './pages/LoginPage';
import MyBookingsPage from './pages/MyBookingsPage';
import CreatorDashboardPage from './pages/CreatorDashboardPage';
import './App.css';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Navbar />
          <main>
            <Routes>
              <Route path="/" element={<SessionListPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/sessions/:id" element={<SessionDetailPage />} />
              <Route path="/bookings/my" element={<MyBookingsPage />} />
              <Route path="/creator/dashboard" element={<CreatorDashboardPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}
