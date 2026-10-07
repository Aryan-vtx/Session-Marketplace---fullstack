import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';

export default function SessionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn, role } = useAuth();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [bookingMessage, setBookingMessage] = useState(null);
  const [bookingError, setBookingError] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  const fetchSessionDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSession(id);
      setSession(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch session detail.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionDetail();
  }, [id]);

  const handleBook = async () => {
    setBookingMessage(null);
    setBookingError(null);
    setBookingLoading(true);

    try {
      await api.bookSession(id);
      setBookingMessage('Seat successfully booked! You are confirmed for this session.');
      fetchSessionDetail();
    } catch (err) {
      setBookingError(err.message || 'Failed to book session.');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return <div className="page-container"><div className="loading-spinner">Loading session details...</div></div>;
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="alert alert-error">
          <h3>Error Loading Session</h3>
          <p>{error}</p>
        </div>
        <Link to="/" className="btn btn-secondary">Back to Sessions</Link>
      </div>
    );
  }

  if (!session) return null;

  const seatsLeft = session.capacity - session.seats_booked;
  const isFull = seatsLeft <= 0 || session.is_full;
  const isPast = session.is_past;

  return (
    <div className="page-container">
      <div className="detail-container">
        <div className="detail-header">
          <Link to="/" className="back-link">← Back to All Sessions</Link>
          <h2>{session.title}</h2>
          <span className={`status-badge ${isPast ? 'badge-past' : isFull ? 'badge-full' : 'badge-open'}`}>
            {isPast ? 'Past Event' : isFull ? 'Fully Booked' : 'Open'}
          </span>
        </div>

        {bookingMessage && (
          <div className="alert alert-success">
            {bookingMessage}
          </div>
        )}

        {bookingError && (
          <div className="alert alert-error">
            <strong>Booking Request Error:</strong> {bookingError}
          </div>
        )}

        <div className="card detail-card">
          <h3>Session Overview</h3>
          <p className="detail-description">{session.description}</p>

          <div className="detail-grid">
            <div className="detail-item">
              <span className="label">Hosted By</span>
              <span className="value">{session.creator?.email}</span>
            </div>

            <div className="detail-item">
              <span className="label">Start Date & Time</span>
              <span className="value">{new Date(session.start_time).toLocaleString()}</span>
            </div>

            <div className="detail-item">
              <span className="label">Total Capacity</span>
              <span className="value">{session.capacity} seats</span>
            </div>

            <div className="detail-item">
              <span className="label">Seats Booked</span>
              <span className="value">{session.seats_booked}</span>
            </div>

            <div className="detail-item">
              <span className="label">Remaining Available Seats</span>
              <span className={`value ${seatsLeft === 0 ? 'text-red' : 'text-green'}`}>
                {seatsLeft}
              </span>
            </div>
          </div>

          <div className="detail-actions">
            {!isLoggedIn ? (
              <div className="login-prompt">
                <p>Want to attend this session?</p>
                <Link to="/login" className="btn btn-primary">Login to Book a Seat</Link>
              </div>
            ) : role === 'user' ? (
              <button
                onClick={handleBook}
                className="btn btn-primary btn-lg"
                disabled={isFull || isPast || bookingLoading}
              >
                {bookingLoading
                  ? 'Processing Booking...'
                  : isPast
                  ? 'Session Expired'
                  : isFull
                  ? 'Session Fully Booked'
                  : 'Confirm & Book Seat Now'}
              </button>
            ) : (
              <div className="info-box">
                Logged in as a <strong>Creator</strong>. Switch to a <strong>User</strong> account to book seats.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
