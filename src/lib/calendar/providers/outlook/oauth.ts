// Microsoft OAuth 2.0 for personal Outlook accounts (outlook.live.com).
// Authority: consumers — works for @outlook.com, @hotmail.com, @live.com.
// For Microsoft 365 business accounts, the authority would be 'common' or
// tenant-specific, but that is out of scope for this phase.

const AUTHORITY = 'https://login.microsoftonline.com/consumers/oauth2/v2.0'
const SCOPES = ['offline_access', 'Calendars.ReadWrite', 'User.Read'].join(' ')

function clientId(): string {
  return process.env.MICROSOFT_CLIENT_ID ?? ''
}

function clientSecret(): string {
  return process.env.MICROSOFT_CLIENT_SECRET ?? ''
}

function redirectUri(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://www.wavon.com.br'
  return `${base}/api/calendar/oauth/callback`
}

export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    response_type: 'code',
    redirect_uri: redirectUri(),
    scope: SCOPES,
    state,
    response_mode: 'query',
  })
  return `${AUTHORITY}/authorize?${params.toString()}`
}

export interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: clientId(),
    client_secret: clientSecret(),
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(),
    scope: SCOPES,
  })

  const res = await fetch(`${AUTHORITY}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Microsoft token exchange failed (${res.status}): ${text}`)
  }

  return res.json() as Promise<TokenResponse>
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: clientId(),
    client_secret: clientSecret(),
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: SCOPES,
  })

  const res = await fetch(`${AUTHORITY}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Microsoft token refresh failed (${res.status}): ${text}`)
  }

  return res.json() as Promise<TokenResponse>
}

export async function getMicrosoftUserEmail(accessToken: string): Promise<string | null> {
  const res = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return null
  const data = (await res.json()) as { mail?: string; userPrincipalName?: string }
  return data.mail ?? data.userPrincipalName ?? null
}

export function isMicrosoftConfigured(): boolean {
  return !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET)
}
