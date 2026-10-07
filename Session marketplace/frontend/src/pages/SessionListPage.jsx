import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';

export default function SessionListPage() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [bookingMessage, setBookingMessage] = useState(null);
  const [bookingError, setBookingError] = useState(null);
  const [bookingInProgress, setBookingInProgress] = useState(null);

  const { isLoggedIn, role } = useAuth();

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSessions();
      setSessions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleBook = async (sessionId, sessionTitle) => {
    setBookingMessage(null);
    setBookingError(null);
    setBookingInProgress(sessionId);

    try {
      await api.bookSession(sessionId);
      setBookingMessage(`Successfully booked a seat for "${sessionTitle}"!`);
      // Refresh list to update seats_booked count
      fetchSessions();
    } catch (err) {
      setBookingError(err.message || 'Failed to book session.');
    } finally {
      setBookingInProgress(null);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Upcoming Sessions</h1>
        <p>Explore and book live sessions hosted by creators.</p>
      </div>

      {bookingMessage && (
        <div className="alert alert-success">
          {bookingMessage}
        </div>
      )}

      {bookingError && (
        <div className="alert alert-error">
          <strong>Booking Error:</strong> {bookingError}
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <strong>Failed to load sessions:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className="loading-spinner">Loading available sessions...</div>
      ) : sessions.length === 0 ? (
        <div className="empty-state">
          <p>No sessions found. Check back later!</p>
        </div>
      ) : (
        <div className="sessions-grid">
          {sessions.map((session) => {
            const seatsLeft = session.capacity - session.seats_booked;
            const isFull = seatsLeft <= 0 || session.is_full;
            const isPast = session.is_past;

            return (
              <div key={session.id} className="card session-card">
                <div className="card-header">
                  <h3>{session.title}</h3>
                  <span className={`status-badge ${isPast ? 'badge-past' : isFull ? 'badge-full' : 'badge-open'}`}>
                    {isPast ? 'Past Event' : isFull ? 'Fully Booked' : 'Open'}
                  </span>
                </div>

                <p className="session-description">{session.description}</p>

                <div className="session-meta">
                  <div>
                    <strong>Creator:</strong> {session.creator?.email || 'Unknown'}
                  </div>
                  <div>
                    <strong>Start Time:</strong>{' '}
                    {new Date(session.start_time).toLocaleString()}
                  </div>
                  <div className="seats-info">
                    <strong>Seats Left:</strong>{' '}
                    <span className={seatsLeft === 0 ? 'text-red' : 'text-green'}>
                      {seatsLeft} / {session.capacity}
                    </span>
                  </div>
                </div>

                <div className="card-actions">
                  <Link to={`/sessions/${session.id}`} className="btn btn-secondary">
                    View Details
                  </Link>

                  {isLoggedIn && role === 'user' && (
                    <button
                      onClick={() => handleBook(session.id, session.title)}
                      className="btn btn-primary"
                      disabled={isFull || isPast || bookingInProgress === session.id}
                    >
                      {bookingInProgress === session.id
                        ? 'Booking...'
                        : isPast
                        ? 'Session Past'
                        : isFull
                        ? 'Fully Booked'
                        : 'Book Seat'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
