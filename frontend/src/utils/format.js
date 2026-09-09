export const riskColor = (level) =>
  ({ LOW: 'var(--low)', MODERATE: 'var(--moderate)', HIGH: 'var(--high)', CRITICAL: 'var(--critical)' }[level] || 'var(--text-faint)')
export const riskSoft = (level) =>
  ({ LOW: 'var(--low-soft)', MODERATE: 'var(--moderate-soft)', HIGH: 'var(--high-soft)', CRITICAL: 'var(--critical-soft)' }[level] || '#e8ecf5')
export const fuzzyDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const diff = (now - d) / 1000
  if (diff < 120) return 'just now'
  if (diff < 3600) return Math.floor(diff / 60) + ' min ago'
  if (diff < 86400) return Math.floor(diff / 3600) + ' hr ago'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
export const timeAgo = (iso) => {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`
  return new Date(iso).toLocaleDateString()
}
export const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'
export const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
export const fmtPct = (v) => `${Math.round((v ?? 0) * 100)}%`
export const titleize = (s) =>
  (s || '').toLowerCase().split('_').filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
export const trendIcon = (trend) =>
  ({ RISING: '↗', DECLINING: '↘', STABLE: '→', VOLATILE: '↕' }[trend] || '→')
