import type { Session, SessionDetail, Asset, Upload, ComplianceResult, User } from './types'

const BASE = '/api'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('pharma_token')
}

function authHeaders(): HeadersInit {
  const token = getToken()
  if (!token) return { 'Content-Type': 'application/json' }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export async function createSession(): Promise<Session> {
  const res = await fetch(`${BASE}/sessions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({}),
  })
  return handleResponse<Session>(res)
}

export async function getSessions(): Promise<Session[]> {
  const res = await fetch(`${BASE}/sessions`, {
    headers: authHeaders(),
  })
  return handleResponse<Session[]>(res)
}

export async function getSession(id: string): Promise<SessionDetail> {
  const res = await fetch(`${BASE}/sessions/${id}`, {
    headers: authHeaders(),
  })
  return handleResponse<SessionDetail>(res)
}

export async function deleteSession(id: string): Promise<void> {
  const res = await fetch(`${BASE}/sessions/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status}: ${text}`)
  }
}

export async function updateAsset(assetId: string, htmlContent: string): Promise<Asset> {
  const res = await fetch(`${BASE}/assets/${assetId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ html_content: htmlContent }),
  })
  return handleResponse<Asset>(res)
}

export async function getAsset(assetId: string): Promise<Asset> {
  const res = await fetch(`${BASE}/assets/${assetId}`, {
    headers: authHeaders(),
  })
  return handleResponse<Asset>(res)
}

export async function undoAsset(assetId: string): Promise<Asset> {
  const res = await fetch(`${BASE}/assets/${assetId}/undo`, {
    method: 'POST',
    headers: authHeaders(),
  })
  return handleResponse<Asset>(res)
}

export async function checkCompliance(assetId: string, customChecks: string[] = []): Promise<ComplianceResult> {
  const res = await fetch(`${BASE}/compliance/check`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ asset_id: assetId, custom_checks: customChecks }),
  })
  return handleResponse<ComplianceResult>(res)
}

export async function exportAsset(assetId: string): Promise<Blob> {
  const token = getToken()
  const headers: HeadersInit = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE}/assets/${assetId}/export`, { headers })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status}: ${text}`)
  }
  return res.blob()
}

export async function uploadFile(file: File, sessionId?: string): Promise<Upload> {
  const token = getToken()
  const headers: HeadersInit = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const formData = new FormData()
  formData.append('file', file)
  if (sessionId) formData.append('session_id', sessionId)

  const res = await fetch(`${BASE}/uploads`, {
    method: 'POST',
    headers,
    body: formData,
  })
  return handleResponse<Upload>(res)
}

export async function login(email: string, password: string): Promise<{ user: User; token: string }> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await handleResponse<{ access_token: string; user: User }>(res)
  return { user: data.user, token: data.access_token }
}

export async function register(
  email: string,
  password: string,
  name: string,
  companyName: string,
  companySlug: string,
): Promise<{ user: User; token: string }> {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email, password, name,
      company_name: companyName,
      company_slug: companySlug,
    }),
  })
  const data = await handleResponse<{ access_token: string; user: User }>(res)
  return { user: data.user, token: data.access_token }
}

export async function getMe(): Promise<User> {
  const res = await fetch(`${BASE}/auth/me`, {
    headers: authHeaders(),
  })
  return handleResponse<User>(res)
}

export function sendMessageStream(
  sessionId: string,
  content: string,
  uploadIds: string[]
): Promise<Response> {
  const token = getToken()
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  return fetch(`${BASE}/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content, upload_ids: uploadIds }),
  })
}
