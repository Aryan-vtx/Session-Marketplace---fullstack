import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);
  const [error, setError] = useState(null);

  const { loginSuccess } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await api.login(email, role);
      loginSuccess(data);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setOauthLoading('google');
    try {
      const userEmail = email || `google_user_${Math.floor(Math.random() * 1000)}@gmail.com`;
      const data = await api.loginGoogle({ email: userEmail, role });
      loginSuccess(data);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Google login failed.');
    } finally {
      setOauthLoading(null);
    }
  };

  const handleGithubLogin = async () => {
    setError(null);
    setOauthLoading('github');
    try {
      const userEmail = email || `github_user_${Math.floor(Math.random() * 1000)}@github.com`;
      const data = await api.loginGithub({ email: userEmail, role });
      loginSuccess(data);
      navigate('/');
    } catch (err) {
      setError(err.message || 'GitHub login failed.');
    } finally {
      setOauthLoading(null);
    }
  };

  // Preset quick fill helpers for testing
  const quickFill = (userEmail, userRole) => {
    setEmail(userEmail);
    setRole(userRole);
  };

  return (
    <div className="page-container page-login">
      <div className="card login-card">
        <h2>Sign In / OAuth</h2>
        <p className="subtitle">
          Log in using Google, GitHub, or test email to get JWT access tokens.
        </p>

        {error && (
          <div className="alert alert-error">
            <strong>Login Error:</strong> {error}
          </div>
        )}

        <div className="social-login-section">
          <button
            type="button"
            className="btn btn-social btn-google"
            onClick={handleGoogleLogin}
            disabled={loading || oauthLoading !== null}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" className="social-icon">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.3 7.31 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.17 0 9.99 0 12s.46 3.83 1.26 5.42l4.02-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            {oauthLoading === 'google' ? 'Connecting to Google...' : 'Continue with Google'}
          </button>

          <button
            type="button"
            className="btn btn-social btn-github"
            onClick={handleGithubLogin}
            disabled={loading || oauthLoading !== null}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="social-icon">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            {oauthLoading === 'github' ? 'Connecting to GitHub...' : 'Continue with GitHub'}
          </button>
        </div>

        <div className="divider">
          <span>or login with credentials</span>
        </div>

        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="e.g. alex@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="user">User (Book Sessions)</option>
              <option value="creator">Creator (Host Sessions)</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading || oauthLoading !== null}>
            {loading ? 'Logging in...' : 'Login & Get JWT'}
          </button>
        </form>

        <div className="quick-fill-section">
          <p className="small-text">Quick fill for testing:</p>
          <div className="quick-buttons">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => quickFill('user1@example.com', 'user')}
            >
              Fill as User
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => quickFill('creator1@example.com', 'creator')}
            >
              Fill as Creator
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

