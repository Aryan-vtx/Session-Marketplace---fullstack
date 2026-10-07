const API_BASE_URL = 'http://localhost:8000/api';

/**
 * Base fetch wrapper with JWT token injection and error handling.
 */
export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // If 204 No Content
    if (response.status === 204) {
      return null;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Extract error detail or construct readable error message
      let errorMessage = data.detail || data.message || 'An unexpected error occurred.';
      if (typeof data === 'object' && !data.detail && !data.message) {
        // Handle DRF field validation errors e.g. { title: ["This field is required."] }
        const fieldErrors = Object.entries(data)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(' ') : val}`)
          .join(' | ');
        if (fieldErrors) errorMessage = fieldErrors;
      }

      if (response.status === 401) {
        // Clear stale token on 401
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth-unauthorized'));
      }

      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' || err.message.includes('Failed to fetch')) {
      throw new Error(
        'Server unreachable. Please make sure the Django backend is running at http://localhost:8000.'
      );
    }
    throw err;
  }
}

// API Endpoints Mapping
export const api = {
  // Auth
  getOAuthConfig: () => apiFetch('/auth/config/'),
  login: (email, role) =>
    apiFetch('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),
  loginGoogle: (payload) =>
    apiFetch('/auth/google/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  loginGithub: (payload) =>
    apiFetch('/auth/github/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),


  // Sessions
  getSessions: () => apiFetch('/sessions/'),
  getSession: (id) => apiFetch(`/sessions/${id}/`),
  createSession: (sessionData) =>
    apiFetch('/sessions/', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    }),
  updateSession: (id, sessionData) =>
    apiFetch(`/sessions/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(sessionData),
    }),
  deleteSession: (id) =>
    apiFetch(`/sessions/${id}/`, {
      method: 'DELETE',
    }),

  // Bookings
  bookSession: (id) =>
    apiFetch(`/sessions/${id}/book/`, {
      method: 'POST',
    }),
  getMyBookings: () => apiFetch('/bookings/my/'),
  getSessionBookings: (id) => apiFetch(`/sessions/${id}/bookings/`),
};
