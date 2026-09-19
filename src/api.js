const TOKEN_KEY = 'mizani-token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function req(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'حصل خطأ في السيرفر')
  return data
}

export const api = {
  health: () => req('/health'),
  config: () => req('/auth/config'),
  register: (body) => req('/auth/register', { method: 'POST', body }),
  login: (body) => req('/auth/login', { method: 'POST', body }),
  google: (credential) => req('/auth/google', { method: 'POST', body: { credential } }),
  me: () => req('/auth/me'),
  getData: () => req('/data'),
  saveData: (payload) => req('/data', { method: 'PUT', body: { payload } }),
}
