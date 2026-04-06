const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI;

/**
 * Generates the Spotify Authorization URL using Authorization Code PKCE flow.
 */
export async function getAuthUrl() {
  const verifier = generateCodeVerifier(128);
  const challenge = await generateCodeChallenge(verifier);

  localStorage.setItem('spotify_code_verifier', verifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID!,
    response_type: 'code',
    redirect_uri: REDIRECT_URI!,
    scope: [
      'user-read-private',
      'user-read-email',
      'streaming',
      'user-modify-playback-state',
      'user-read-playback-state',
      'playlist-read-private'
    ].join(' '),
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

/**
 * PKCE Code Verifier
 */
function generateCodeVerifier(length: number) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * PKCE Code Challenge from Verifier
 */
async function generateCodeChallenge(codeVerifier: string) {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Retrieves a valid Spotify access token, refreshing if necessary.
 */
export async function getAccessToken() {
  const tokenData = localStorage.getItem('spotify_token_data');
  if (!tokenData) return null;

  const { access_token, expires_at, refresh_token } = JSON.parse(tokenData);

  if (Date.now() < expires_at) {
    return access_token;
  }

  // Refresh token
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID!,
      grant_type: 'refresh_token',
      refresh_token,
    }),
  });

  const data = await response.json();
  if (data.error) {
    localStorage.removeItem('spotify_token_data');
    return null;
  }

  const newTokenData = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  localStorage.setItem('spotify_token_data', JSON.stringify(newTokenData));
  return data.access_token;
}
