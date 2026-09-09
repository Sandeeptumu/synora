import axios from 'axios'

/**
 * Single consistent API strategy across the whole frontend:
 *   baseURL = ''  →  every endpoint spelled as '/api/...'
 *   (Vite dev proxy forwards /api → http://localhost:8080)
 */

// Development request/error logging — never logs tokens, passwords or payload bodies.
// (Interceptors below emit [Synora API] lines when running under `npm run dev`.)

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 20000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('synora_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (import.meta.env.DEV) {
    console.debug(`[Synora API] ${config.method?.toUpperCase()} ${config.url}`)
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    const method = err.config?.method?.toUpperCase()
    const url = err.config?.url

    if (import.meta.env.DEV && url) {
      const msg = err.response?.data?.message || err.message
      console.debug(`[Synora API ERROR] ${method} ${url}${status ? ` → ${status}` : ''} — ${msg}`)
    }

    if (status === 401 && !url?.startsWith('/api/auth/')) {
      localStorage.removeItem('synora_token')
      localStorage.removeItem('synora_user')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  },
)

/** Safely extract a human message from any API/network error shape. */
export const apiMessage = (err) => {
  if (!err) return 'Something went wrong'
  if (err.code === 'ECONNABORTED') return 'The request timed out. Check your connection and try again.'
  if (err.code === 'ERR_NETWORK') return 'Cannot reach the backend service. Check your connection and try again.'
  return (
    err?.response?.data?.message ||
    (err?.response?.status ? `Request failed (${err.response.status})` : null) ||
    err?.message ||
    'Something went wrong'
  )
}

/** Normalize list-shaped API responses: array, {content}, {items}, or empty → always an array. */
export const asList = (data) => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.content)) return data.content
  if (Array.isArray(data?.items)) return data.items
  return []
}

export default api
