// Google OAuth 2.0 for Google Calendar access.
// Uses the "installed app" / web flow with offline access to obtain a
// refresh token. prompt=consent is required to always receive a refresh
// token even if the user has previously consented.

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'

const SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar',
].join(' ')

function clientId(): string {
  return process.env.GOOGLE_CLIENT_ID ?? ''
}

function clientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET ?? ''
}

function redirectUri(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://www.wavon.com.br'
  return `${base}/api/calendar/oauth/callback`
}

export function getGoogleAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: SCOPES,
    state,
    access_type: 'offline',
    prompt: 'consent',
  })
  return `${AUTH_URL}?${params.toString()}`
}

export interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  id_token?: string
}

export async function exchangeGoogleCode(code: string): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    client_id: clientId(),
    client_secret: clientSecret(),
    redirect_uri: redirectUri(),
    grant_type: 'authorization_code',
    code,
  })

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google token exchange failed (${res.status}): ${text}`)
  }

  return res.json() as Promise<GoogleTokenResponse>
}

export async function refreshGoogleToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    client_id: clientId(),
    client_secret: clientSecret(),
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Google token refresh failed (${res.status}): ${text}`)
  }

  return res.json() as Promise<GoogleTokenResponse>
}

export async function getGoogleUserEmail(accessToken: string): Promise<string | null> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return null
  const data = (await res.json()) as { email?: string }
  return data.email ?? null
}

export function isGoogleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}
