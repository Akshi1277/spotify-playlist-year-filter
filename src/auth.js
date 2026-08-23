/**
 * Spotify PKCE Authentication Manager
 * Runs entirely in the client browser - zero backend & zero secret keys required!
 */

const STORAGE_KEYS = {
  CLIENT_ID: 'spotify_filter_client_id',
  ACCESS_TOKEN: 'spotify_filter_access_token',
  REFRESH_TOKEN: 'spotify_filter_refresh_token',
  EXPIRES_AT: 'spotify_filter_expires_at',
  CODE_VERIFIER: 'spotify_filter_code_verifier',
  STATE: 'spotify_filter_auth_state'
};

const SCOPES = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-read-private',
  'user-read-email'
].join(' ');

// Generate high-entropy cryptographic random string
export function generateRandomString(length = 64) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

// Generate SHA256 digest
async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

// Base64-URL encode
function base64encode(input) {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export function getStoredClientId() {
  return localStorage.getItem(STORAGE_KEYS.CLIENT_ID) || import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
}

export function setStoredClientId(clientId) {
  if (clientId) {
    localStorage.setItem(STORAGE_KEYS.CLIENT_ID, clientId.trim());
  } else {
    localStorage.removeItem(STORAGE_KEYS.CLIENT_ID);
  }
}

export function getRedirectUri() {
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  let uri = `${origin}${pathname.endsWith('/') ? pathname : pathname + '/'}`;
  return uri;
}

/**
 * Initiate Spotify OAuth PKCE Flow
 */
export async function redirectToSpotifyAuth(clientId) {
  if (!clientId) {
    throw new Error('Spotify Client ID is required');
  }

  setStoredClientId(clientId);

  const codeVerifier = generateRandomString(64);
  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);
  const state = generateRandomString(16);

  sessionStorage.setItem(STORAGE_KEYS.CODE_VERIFIER, codeVerifier);
  sessionStorage.setItem(STORAGE_KEYS.STATE, state);

  const redirectUri = getRedirectUri();

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    redirect_uri: redirectUri,
    state: state,
    show_dialog: 'true'
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

/**
 * Handle OAuth callback from Spotify redirect
 */
export async function handleOAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const error = urlParams.get('error');
  const state = urlParams.get('state');

  if (error) {
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
    throw new Error(`Spotify login error: ${error}`);
  }

  if (!code) {
    return null;
  }

  const storedState = sessionStorage.getItem(STORAGE_KEYS.STATE);
  const codeVerifier = sessionStorage.getItem(STORAGE_KEYS.CODE_VERIFIER);
  const clientId = getStoredClientId();

  // Clean URL parameters immediately
  window.history.replaceState({}, document.title, window.location.pathname);

  if (!codeVerifier || !clientId) {
    throw new Error('Missing code verifier or client ID for PKCE verification.');
  }

  const redirectUri = getRedirectUri();

  const payload = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  };

  const response = await fetch('https://accounts.spotify.com/api/token', payload);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Failed to exchange authorization code for token');
  }

  const expiresAt = Date.now() + data.expires_in * 1000;
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
  if (data.refresh_token) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
  }
  localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());

  // Clean session storage
  sessionStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER);
  sessionStorage.removeItem(STORAGE_KEYS.STATE);

  return data.access_token;
}

/**
 * Refresh access token using PKCE refresh token
 */
export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  const clientId = getStoredClientId();

  if (!refreshToken || !clientId) {
    logout();
    return null;
  }

  try {
    const payload = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId
      })
    };

    const response = await fetch('https://accounts.spotify.com/api/token', payload);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || 'Token refresh failed');
    }

    const expiresAt = Date.now() + data.expires_in * 1000;
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
    if (data.refresh_token) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
    }
    localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());

    return data.access_token;
  } catch (err) {
    console.error('Failed to refresh token:', err);
    logout();
    return null;
  }
}

/**
 * Get active Access Token (auto-refreshing if expired)
 */
export async function getValidAccessToken() {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const expiresAtStr = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);

  if (!token || !expiresAtStr) {
    return null;
  }

  const expiresAt = parseInt(expiresAtStr, 10);
  // If expiring in next 60 seconds, refresh
  if (Date.now() > expiresAt - 60000) {
    return await refreshAccessToken();
  }

  return token;
}

export function logout() {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
  sessionStorage.removeItem(STORAGE_KEYS.CODE_VERIFIER);
  sessionStorage.removeItem(STORAGE_KEYS.STATE);
}
