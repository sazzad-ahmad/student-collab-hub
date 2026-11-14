/**
 * API Utility - Centralized fetch wrapper for /api/v1
 * Handles authentication, error responses, and 401 redirects
 */

const API_BASE = '/api/v1';
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
  const userStr = localStorage.getItem(USER_KEY);
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

function setAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function isAuthenticated() {
  return !!getToken();
}

async function handleResponse(response) {
  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (response.status === 401) {
    clearAuth();
    if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
      window.location.href = '/';
    }
    throw new ApiError('Unauthorized', 401, data);
  }

  if (!response.ok) {
    // Backend returns { success: false, error: { code, message, details } }
    const message = isJson && data?.error?.message ? data.error.message :
                    isJson && data?.message ? data.message :
                    `HTTP ${response.status}`;
    throw new ApiError(message, response.status, data);
  }

  // Backend returns { success: true, data: {...}, message: '...' }
  // Return the data payload for convenience
  return isJson && data?.data !== undefined ? data.data : data;
}

function buildHeaders(customHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

function buildUrl(endpoint, params = {}) {
  const url = new URL(`${API_BASE}${endpoint}`, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.append(key, value);
    }
  });
  return url.toString();
}

export const api = {
  getToken,
  getUser,
  setAuth,
  clearAuth,
  isAuthenticated,

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      ...options,
      headers: buildHeaders(options.headers),
    };

    const response = await fetch(url, config);
    return handleResponse(response);
  },

  get(endpoint, options = {}) {
    const { params, ...restOptions } = options;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
      const qs = searchParams.toString();
      if (qs) endpoint = `${endpoint}?${qs}`;
    }
    return this.request(endpoint, { ...restOptions, method: 'GET' });
  },

  post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  put(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  },
};

export { ApiError };