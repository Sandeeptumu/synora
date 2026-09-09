import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarClock, CheckCircle2, XCircle } from 'lucide-react'
import { getCases, getFollowUps, patchFollowUp, apiMessage } from '../../api'
import { LoadingState, ErrorState, EmptyState, SectionTitle } from '../../components/ui'
import { fmtDate, titleize } from '../../utils/format'

const STATUS_STYLE = {
  SCHEDULED: 'badge-acknowledged',
  COMPLETED: 'badge-resolved',
  MISSED: 'badge-HIGH',
  RESCHEDULED: 'badge-neutral',
}

export default function FollowUpsPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const cases = await getCases()
        const lists = await Promise.all(cases
          .filter((c) => c.status !== 'CLOSED')
          .map(async (c) => {
            try {
              const fus = await getFollowUps(c.caseNumber)
              return fus.map((f) => ({ ...f, caseNumber: c.caseNumber, victimName: c.victimName }))
            } catch { return [] }
          }))
        setRows(lists.flat().sort((a, b) => a.dueDate.localeCompare(b.dueDate)))
      } catch (e) {
        setErr(apiMessage(e))
      }
    })()
  }, [])

  const grouped = useMemo(() => {
    const g = { Overdue: [], Today: [], Upcoming: [], Completed: [] }
    const today = new Date().toISOString().slice(0, 10)
    for (const f of rows || []) {
      if (f.status === 'COMPLETED') g.Completed.push(f)
      else if (f.dueDate < today) g.Overdue.push(f)
      else if (f.dueDate === today) g.Today.push(f)
      else g.Upcoming.push(f)
    }
    return g
  }, [rows])

  const update = async (id, patch) => {
    try {
      await patchFollowUp(id, patch)
      setRows((rs) => rs.map((f) => (f.id === id ? { ...f, ...patch } : f)))
    } catch (e) { setErr(apiMessage(e)) }
  }

  if (err && !rows) return <ErrorState message={err} onRetry={() => window.location.reload()} />
  if (!rows) return <LoadingState label="Loading follow-ups…" />

  return (
    <div>
      <SectionTitle right={<span className="muted" style={{ fontSize: '.86rem' }}>{rows.length} follow-ups</span>}>
        Follow-up Management
      </SectionTitle>

      {rows.length === 0 && (
        <EmptyState icon={CalendarClock} title="No follow-ups scheduled"
          sub="Schedule follow-ups from any case's Support tab." />
      )}

      {Object.entries(grouped).map(([group, list]) => list.length > 0 && (
        <div key={group}>
          <h3 style={{ margin: '18px 0 10px', fontSize: '.95rem', color: 'var(--text-soft)' }}>
            {group} <span className="badge badge-neutral">{list.length}</span>
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 12 }}>
            {list.map((f, i) => (
              <motion.div key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                  <strong style={{ fontSize: '.92rem' }}>{titleize(f.type)}</strong>
                  <span className={`badge ${STATUS_STYLE[f.status] || 'badge-neutral'}`}>{f.status}</span>
                </div>
                <div className="muted" style={{ fontSize: '.82rem' }}>
                  {fmtDate(f.dueDate)} · <span style={{ color: 'var(--indigo-500)', cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => navigate(`/dashboard/cases/${f.caseNumber}`)}>{f.caseNumber}</span>
                  {f.victimName ? ` · ${f.victimName}` : ''}
                </div>
                {f.notes && <div className="muted" style={{ fontSize: '.8rem', marginTop: 4 }}>{f.notes}</div>}
                {f.status === 'SCHEDULED' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button className="btn btn-teal btn-sm" onClick={() => update(f.id, { status: 'COMPLETED' })}>
                      <CheckCircle2 size={13} /> Complete
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => update(f.id, { status: 'MISSED' })}>
                      <XCircle size={13} /> Missed
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
