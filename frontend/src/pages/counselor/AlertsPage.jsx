import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BellRing, CheckCircle2, FolderOpen, CheckCheck } from 'lucide-react'
import { getAlerts, patchAlert, apiMessage } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { LoadingState, ErrorState, EmptyState, SectionTitle } from '../../components/ui'
import { timeAgo, fmtPct } from '../../utils/format'

const SEV_COLORS = { HIGH: 'var(--high)', CRITICAL: 'var(--critical)', MODERATE: 'var(--moderate)' }
const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'OPEN', label: 'Open' },
  { key: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { key: 'RESOLVED', label: 'Resolved' },
  { key: 'HIGH', label: 'High sev.' },
  { key: 'CRITICAL', label: 'Critical sev.' },
]

export default function AlertsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [alerts, setAlerts] = useState(null)
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [busyId, setBusyId] = useState(null)

  const load = async () => {
    try { setAlerts(await getAlerts()) } catch (e) { setErr(apiMessage(e)) }
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!alerts) return []
    return alerts.filter((a) => {
      if (['OPEN', 'ACKNOWLEDGED', 'RESOLVED'].includes(filter)) return a.status === filter
      if (['HIGH', 'CRITICAL'].includes(filter)) return a.severity === filter
      return true
    })
  }, [alerts, filter])

  const act = async (id, body) => {
    setBusyId(id)
    try { await patchAlert(id, body); await load() } catch (e) { setErr(apiMessage(e)) } finally { setBusyId(null) }
  }

  if (err && !alerts) return <ErrorState message={err} onRetry={load} />
  if (!alerts) return <LoadingState label="Loading alert center…" />

  const openCount = alerts.filter((a) => a.status === 'OPEN').length

  return (
    <div>
      <SectionTitle right={<span className="muted" style={{ fontSize: '.86rem' }}>{openCount} open · {alerts.length} total</span>}>
        Alert Center
      </SectionTitle>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} aria-pressed={filter === f.key}
            style={{ padding: '8px 15px', borderRadius: 999, cursor: 'pointer', fontSize: '.82rem', fontWeight: 700,
              border: `1.5px solid ${filter === f.key ? 'var(--teal-500)' : 'var(--border-strong)'}`,
              background: filter === f.key ? 'rgba(20,184,166,.1)' : '#fff',
              color: filter === f.key ? 'var(--teal-500)' : 'var(--text-soft)' }}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <EmptyState icon={CheckCheck} title="No alerts in this view" sub="When a risk indication crosses the configured threshold, an alert appears here for review." />
      )}

      <div style={{ display: 'grid', gap: 14 }}>
        {filtered.map((a, i) => (
          <motion.div key={a.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="card" style={{
              borderLeft: `4px solid ${SEV_COLORS[a.severity]}`,
              ...(a.status === 'OPEN' && (a.severity === 'HIGH' || a.severity === 'CRITICAL') ? {
                animation: 'alertPulse 3s ease-in-out infinite',
              } : {}),
            }}>
            <style>{`@keyframes alertPulse { 0%,100% { box-shadow: var(--shadow-sm); } 50% { box-shadow: 0 0 0 5px ${a.severity === 'CRITICAL' ? 'rgba(159,18,57,.08)' : 'rgba(225,29,72,.07)'}; } }`}</style>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between' }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <BellRing size={16} color={SEV_COLORS[a.severity]} />
                  <strong style={{ fontSize: '.96rem' }}>{a.title}</strong>
                  <span className={`badge badge-${a.severity}`}>{a.severity}</span>
                  <span className={`badge badge-${a.status.toLowerCase()}`}>{a.status}</span>
                  {a.escalated && <span className="badge badge-HIGH">Escalated to supervisor</span>}
                </div>
                <div className="muted" style={{ fontSize: '.85rem', marginTop: 6 }}>
                  Case <strong style={{ color: 'var(--indigo-500)', cursor: 'pointer' }}
                    onClick={() => navigate(`/dashboard/cases/${a.caseNumber}`)}>{a.caseNumber}</strong>
                  {' · '}risk {fmtPct(a.riskScore)}
                  {' · '}signals: {a.signals.join(' + ')}
                  {' · '}detected {timeAgo(a.createdAt)}
                </div>
                {a.acknowledgedBy && (
                  <div className="muted" style={{ fontSize: '.78rem', marginTop: 3 }}>
                    Acknowledged by {a.acknowledgedBy} {a.acknowledgedAt ? timeAgo(a.acknowledgedAt) : ''}
                  </div>
                )}
                {a.resolutionNote && (
                  <div className="muted" style={{ fontSize: '.8rem', marginTop: 4, fontStyle: 'italic' }}>
                    “{a.resolutionNote}”
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/dashboard/cases/${a.caseNumber}`)}>
                  <FolderOpen size={14} /> View case
                </button>
                {a.status === 'OPEN' && (
                  <button className="btn btn-ghost btn-sm" disabled={busyId === a.id}
                    onClick={() => act(a.id, { action: 'acknowledge' })}>
                    <CheckCircle2 size={14} /> Acknowledge
                  </button>
                )}
                {a.status !== 'RESOLVED' && (
                  <button className="btn btn-teal btn-sm" disabled={busyId === a.id}
                    onClick={() => act(a.id, { action: 'resolve', note: `Resolved after review by ${user.fullName}` })}>
                    Resolve
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <p className="disclaimer" style={{ marginTop: 18 }}>
        High-risk alerts escalate to the supervising officer if unacknowledged after the configured timeout
        (default 30 minutes). No automated clinical intervention is ever performed — every response is decided by a professional.
      </p>
    </div>
  )
}
