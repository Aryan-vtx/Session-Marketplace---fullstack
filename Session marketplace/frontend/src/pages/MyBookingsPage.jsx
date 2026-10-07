import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';

export default function MyBookingsPage() {
  const { isLoggedIn, role } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchMyBookings = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getMyBookings();
        setBookings(data);
      } catch (err) {
        setError(err.message || 'Failed to load bookings.');
      } finally {
        setLoading(false);
      }
    };

    fetchMyBookings();
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className="page-container">
        <div className="alert alert-error">
          Please <Link to="/login">login</Link> as a user to view your bookings.
        </div>
      </div>
    );
  }

  if (role !== 'user') {
    return (
      <div className="page-container">
        <div className="alert alert-error">
          The My Bookings page is reserved for user accounts. You are currently logged in as a Creator.
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>My Booked Sessions</h1>
        <p>Overview of all active and past sessions you have booked.</p>
      </div>

      {error && (
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className="loading-spinner">Loading your bookings...</div>
      ) : bookings.length === 0 ? (
        <div className="empty-state card">
          <h3>No Bookings Found</h3>
          <p>You haven't booked any sessions yet.</p>
          <Link to="/" className="btn btn-primary">Browse Available Sessions</Link>
        </div>
      ) : (
        <div className="bookings-list">
          {bookings.map((booking) => {
            const session = booking.session || {};
            const isPast = new Date(session.start_time) <= new Date();

            return (
              <div key={booking.id} className="card booking-card">
                <div className="booking-main">
                  <h3>{session.title || 'Untitled Session'}</h3>
                  <span className={`status-badge ${booking.status === 'active' ? 'badge-open' : 'badge-past'}`}>
                    {booking.status.toUpperCase()}
                  </span>
                </div>

                <div className="booking-details">
                  <div>
                    <strong>Creator:</strong> {session.creator?.email || 'N/A'}
                  </div>
                  <div>
                    <strong>Session Start:</strong>{' '}
                    {session.start_time ? new Date(session.start_time).toLocaleString() : 'N/A'}
                  </div>
                  <div>
                    <strong>Booked On:</strong>{' '}
                    {new Date(booking.created_at).toLocaleString()}
                  </div>
                </div>

                <div className="booking-actions">
                  <Link to={`/sessions/${session.id}`} className="btn btn-secondary btn-sm">
                    View Session Details
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
