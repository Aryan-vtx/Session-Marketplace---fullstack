import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Navbar() {
  const { user, role, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-brand">
          ⚡ Sessions Marketplace
        </Link>

        <div className="nav-links">
          <Link to="/" className="nav-item">
            All Sessions
          </Link>

          {isLoggedIn && role === 'user' && (
            <Link to="/bookings/my" className="nav-item">
              My Bookings
            </Link>
          )}

          {isLoggedIn && role === 'creator' && (
            <Link to="/creator/dashboard" className="nav-item">
              Creator Dashboard
            </Link>
          )}
        </div>

        <div className="nav-user">
          {isLoggedIn ? (
            <div className="user-badge-container">
              <span className="user-badge">
                {user?.email} ({role})
              </span>
              <button onClick={handleLogout} className="btn btn-logout">
                Logout
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-login">
              Login (Mock OAuth)
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
