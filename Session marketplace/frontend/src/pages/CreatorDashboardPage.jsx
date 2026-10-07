import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../AuthContext';

export default function CreatorDashboardPage() {
  const { user, role, isLoggedIn } = useAuth();

  const [mySessions, setMySessions] = useState([]);
  const [sessionBookingsMap, setSessionBookingsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // New Session Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState(10);
  const [startTime, setStartTime] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Edit Session State
  const [editingSession, setEditingSession] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCapacity, setEditCapacity] = useState(10);
  const [editStartTime, setEditStartTime] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const fetchCreatorData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all public sessions and filter by current logged-in creator
      const allSessions = await api.getSessions();
      const ownedSessions = allSessions.filter(
        (s) => s.creator?.email === user?.email || s.creator?.id === user?.id
      );
      setMySessions(ownedSessions);

      // Fetch attendee bookings for each owned session
      const bookingsMap = {};
      await Promise.all(
        ownedSessions.map(async (sess) => {
          try {
            const bookingsData = await api.getSessionBookings(sess.id);
            bookingsMap[sess.id] = bookingsData;
          } catch (err) {
            // Store error or default empty
            bookingsMap[sess.id] = { error: err.message, bookings: [], total_bookings: 0 };
          }
        })
      );
      setSessionBookingsMap(bookingsMap);
    } catch (err) {
      setError(err.message || 'Failed to fetch creator dashboard sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && role === 'creator') {
      fetchCreatorData();
    }
  }, [isLoggedIn, role]);

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setCreateError(null);
    setActionSuccess(null);
    setCreateLoading(true);

    try {
      await api.createSession({
        title,
        description,
        capacity: parseInt(capacity, 10),
        start_time: startTime,  // datetime-local already produces YYYY-MM-DDTHH:mm
      });

      setActionSuccess(`Successfully created session "${title}"!`);
      // Reset form
      setTitle('');
      setDescription('');
      setCapacity(10);
      setStartTime('');

      fetchCreatorData();
    } catch (err) {
      setCreateError(err.message || 'Failed to create session.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleStartEdit = (session) => {
    setEditingSession(session.id);
    setEditTitle(session.title);
    setEditDescription(session.description);
    setEditCapacity(session.capacity);
    // Format ISO string to datetime-local input format YYYY-MM-DDTHH:mm
    const dt = new Date(session.start_time);
    dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
    setEditStartTime(dt.toISOString().slice(0, 16));
  };

  const handleSaveEdit = async (sessionId) => {
    setEditLoading(true);
    setCreateError(null);
    setActionSuccess(null);

    try {
      await api.updateSession(sessionId, {
        title: editTitle,
        description: editDescription,
        capacity: parseInt(editCapacity, 10),
        start_time: editStartTime,  // datetime-local already produces YYYY-MM-DDTHH:mm
      });

      setActionSuccess(`Successfully updated session #${sessionId}!`);
      setEditingSession(null);
      fetchCreatorData();
    } catch (err) {
      setCreateError(`Update failed: ${err.message}`);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId, sessionTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${sessionTitle}"?`)) return;

    setActionSuccess(null);
    setCreateError(null);

    try {
      await api.deleteSession(sessionId);
      setActionSuccess(`Session "${sessionTitle}" has been deleted.`);
      fetchCreatorData();
    } catch (err) {
      setCreateError(`Delete failed: ${err.message}`);
    }
  };

  if (!isLoggedIn || role !== 'creator') {
    return (
      <div className="page-container">
        <div className="alert alert-error">
          Access Denied. You must be logged in as a <strong>Creator</strong> to access the Creator Dashboard.
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Creator Dashboard</h1>
        <p>Host new events, view attendee bookings, and manage your active sessions.</p>
      </div>

      {actionSuccess && <div className="alert alert-success">{actionSuccess}</div>}
      {createError && <div className="alert alert-error"><strong>Error:</strong> {createError}</div>}
      {error && <div className="alert alert-error"><strong>Error:</strong> {error}</div>}

      {/* CREATE SESSION FORM */}
      <div className="card dashboard-card">
        <h2>Host a New Session</h2>
        <form onSubmit={handleCreateSession} className="form form-grid">
          <div className="form-group col-full">
            <label htmlFor="title">Session Title</label>
            <input
              id="title"
              type="text"
              placeholder="e.g. Advanced Django REST Framework & Microservices"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group col-full">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              rows="3"
              placeholder="Provide event details, topic overview, and prerequisites..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="capacity">Total Seat Capacity</label>
            <input
              id="capacity"
              type="number"
              min="1"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="startTime">Start Date & Time</label>
            <input
              id="startTime"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>

          <div className="col-full">
            <button type="submit" className="btn btn-primary" disabled={createLoading}>
              {createLoading ? 'Publishing Session...' : 'Publish New Session'}
            </button>
          </div>
        </form>
      </div>

      {/* CREATOR OWNED SESSIONS LIST */}
      <div className="dashboard-section">
        <h2>Your Managed Sessions</h2>

        {loading ? (
          <div className="loading-spinner">Loading your sessions...</div>
        ) : mySessions.length === 0 ? (
          <div className="empty-state card">
            <p>You haven't published any sessions yet. Fill out the form above to host your first session!</p>
          </div>
        ) : (
          <div className="sessions-list">
            {mySessions.map((sess) => {
              const bookingsInfo = sessionBookingsMap[sess.id] || {};
              const attendees = bookingsInfo.bookings || [];

              return (
                <div key={sess.id} className="card session-management-card">
                  {editingSession === sess.id ? (
                    <div className="edit-form">
                      <h3>Editing Session #{sess.id}</h3>
                      <div className="form-group">
                        <label>Title</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Description</label>
                        <textarea
                          rows="2"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Capacity</label>
                        <input
                          type="number"
                          value={editCapacity}
                          onChange={(e) => setEditCapacity(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Start Time</label>
                        <input
                          type="datetime-local"
                          value={editStartTime}
                          onChange={(e) => setEditStartTime(e.target.value)}
                        />
                      </div>
                      <div className="edit-actions">
                        <button
                          onClick={() => handleSaveEdit(sess.id)}
                          className="btn btn-primary btn-sm"
                          disabled={editLoading}
                        >
                          {editLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={() => setEditingSession(null)}
                          className="btn btn-secondary btn-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="card-header">
                        <h3>{sess.title}</h3>
                        <div className="header-actions">
                          <button
                            onClick={() => handleStartEdit(sess)}
                            className="btn btn-secondary btn-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteSession(sess.id, sess.title)}
                            className="btn btn-danger btn-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <p className="session-description">{sess.description}</p>

                      <div className="session-meta-row">
                        <span><strong>Capacity:</strong> {sess.capacity}</span>
                        <span><strong>Seats Booked:</strong> {sess.seats_booked}</span>
                        <span><strong>Start Time:</strong> {new Date(sess.start_time).toLocaleString()}</span>
                      </div>

                      {/* ATTENDEE BOOKING LIST (Fetched from GET /api/sessions/{id}/bookings/) */}
                      <div className="attendees-section">
                        <h4>
                          Attendee List ({bookingsInfo.total_bookings ?? sess.seats_booked} booked)
                        </h4>

                        {bookingsInfo.error ? (
                          <p className="small-text text-red">Could not fetch bookings: {bookingsInfo.error}</p>
                        ) : attendees.length === 0 ? (
                          <p className="small-text text-muted">No attendees have booked this session yet.</p>
                        ) : (
                          <ul className="attendees-list">
                            {attendees.map((b) => (
                              <li key={b.id}>
                                👤 <strong>{b.user?.email}</strong> — Status: {b.status} (Booked at {new Date(b.created_at).toLocaleTimeString()})
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
