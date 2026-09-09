import { asList } from '../../api/client'

export const records = value => asList(value).filter(item => item && typeof item === 'object' && !Array.isArray(item))
export const strings = value => [...new Set(asList(value).filter(item => typeof item === 'string' && item.trim()))]
export const label = value => typeof value === 'string' ? value.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()) : ''
export const initials = name => (typeof name === 'string' ? name.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('') : '') || 'S'
export function languageName(code) {
  try { return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) || code } catch { return code }
}
export function formatDate(value, withTime = false) {
  const date = new Date(value)
  if (!value || !Number.isFinite(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}) })
}
export function activeCase(cases) { return records(cases).find(c => c.status && c.status !== 'CLOSED') || null }
export const WELLBEING = {
  LOW: { title: 'A little care goes a long way.', status: 'Keep checking in', icon: 'leaf', tone: 'green' },
  MODERATE: { title: 'A little extra support may help.', status: 'Make room for support', icon: 'heart', tone: 'yellow' },
  HIGH: { title: 'We recommend speaking with someone.', status: 'Professional support recommended', icon: 'heart', tone: 'coral' },
  CRITICAL: { title: 'Please seek immediate support.', status: 'Reach out for urgent help', icon: 'heart', tone: 'coral' },
}
export function recentActivity(checkIns, conversations, timeline) {
  const events = records(checkIns).map(c => ({ key: `checkin-${c.id || c.createdAt}`, title: 'Daily check-in submitted', date: c.createdAt, icon: 'check', to: '/app/check-in/today#daily-history' }))
  const latestChat = records(conversations).filter(c => c.kind === 'USER').at(-1)
  if (latestChat) events.push({ key: `chat-${latestChat.id || latestChat.createdAt}`, title: 'Conversation with Synora AI', date: latestChat.createdAt, icon: 'chat', to: '/ai-support' })
  const titles = { CASE_OPENED: 'Support case opened', ASSIGNED: 'Your support team was updated', CASE_UPDATED: 'Support case updated', FOLLOW_UP: 'Follow-up scheduled', INTERVENTION: 'Support activity recorded', CHECK_IN: 'Reflection submitted' }
  records(timeline).forEach(e => { if (titles[e.type]) events.push({ key: `case-${e.type}-${e.timestamp}`, title: titles[e.type], date: e.timestamp, icon: 'support', to: '#my-support' }) })
  return [...new Map(events.filter(e => e.date && Number.isFinite(new Date(e.date).getTime())).map(e => [e.key, e])).values()].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5)
}
