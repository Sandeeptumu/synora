import CaseSetup from '../../components/CaseSetup'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, ArrowRight, FolderOpen } from 'lucide-react'
import { getCases, getRisk, apiMessage } from '../../api'
import { RiskBadge, LoadingState, ErrorState, EmptyState, SectionTitle } from '../../components/ui'
import { timeAgo, trendIcon } from '../../utils/format'

const RISKS = ['', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL']
const STATUSES = ['', 'OPEN', 'IN_PROGRESS', 'MONITORING', 'CLOSED']
const TRENDS = ['', 'RISING', 'DECLINING', 'STABLE', 'VOLATILE']

export default function CasesPage() {
  const navigate = useNavigate()
  const [cases, setCases] = useState(null)
  const [riskMap, setRiskMap] = useState({})
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [risk, setRisk] = useState('')
  const [status, setStatus] = useState('')
  const [trend, setTrend] = useState('')
  const [counselor, setCounselor] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const cs = await getCases()
        setCases(cs)
        // fetch latest risk for each case (visible scope only; parallel)
        const entries = await Promise.all(cs.map(async (c) => {
          try { return [c.caseNumber, await getRisk(c.caseNumber, true)] } catch { return [c.caseNumber, null] }
        }))
        setRiskMap(Object.fromEntries(entries))
      } catch (e) {
        setErr(apiMessage(e))
      }
    })()
  }, [])

  const counselors = useMemo(() => {
    const set = new Set((cases || []).map((c) => c.counselorName).filter(Boolean))
    return ['', ...set]
  }, [cases])

  const filtered = useMemo(() => {
    if (!cases) return []
    return cases
      .map((c) => ({ ...c, currentRisk: riskMap[c.caseNumber] }))
      .filter((c) => !risk || c.currentRisk?.riskLevel === risk)
      .filter((c) => !status || c.status === status)
      .filter((c) => !trend || c.currentRisk?.trend === trend)
      .filter((c) => !counselor || c.counselorName === counselor)
      .filter((c) => !q
        || c.caseNumber.toLowerCase().includes(q.toLowerCase())
        || c.victimName?.toLowerCase().includes(q.toLowerCase())
        || c.title?.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => {
        const order = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3 }
        const ra = order[a.currentRisk?.riskLevel] ?? 4
        const rb = order[b.currentRisk?.riskLevel] ?? 4
        if (ra !== rb) return ra - rb
        return (b.currentRisk?.riskScore ?? 0) - (a.currentRisk?.riskScore ?? 0)
      })
  }, [cases, riskMap, q, risk, status, trend, counselor])

  if (err) return <ErrorState message={err} onRetry={() => window.location.reload()} />
  if (!cases) return <LoadingState label="Loading cases…" />

  return (
    <div>
      <SectionTitle>All cases</SectionTitle>
      <CaseSetup cases={cases} onUpdated={() => getCases().then(setCases)} />

      {/* filters */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ position: 'relative', gridColumn: '1 / -1' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 14, color: 'var(--text-faint)' }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search case ID, name, or title…"
            aria-label="Search cases"
            style={{ width: '100%', padding: '12px 14px 12px 38px', borderRadius: 10, border: '1.5px solid var(--border-strong)' }} />
        </div>
        <select value={risk} onChange={(e) => setRisk(e.target.value)} aria-label="Filter by risk" className="field" style={{ marginBottom: 0 }}>
          {RISKS.map((r) => <option key={r} value={r}>{r ? `Risk: ${r}` : 'All risks'}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" className="field" style={{ marginBottom: 0 }}>
          {STATUSES.map((s) => <option key={s} value={s}>{s ? `Status: ${s}` : 'All statuses'}</option>)}
        </select>
        <select value={trend} onChange={(e) => setTrend(e.target.value)} aria-label="Filter by trend" className="field" style={{ marginBottom: 0 }}>
          {TRENDS.map((t) => <option key={t} value={t}>{t ? `Trend: ${t}` : 'All trends'}</option>)}
        </select>
        <select value={counselor} onChange={(e) => setCounselor(e.target.value)} aria-label="Filter by counselor" className="field" style={{ marginBottom: 0 }}>
          {counselors.map((c) => <option key={c} value={c}>{c ? c : 'All counselors'}</option>)}
        </select>
      </motion.div>

      {filtered.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No cases match your filters" sub="Try clearing a filter or search term." />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                {['Case ID', 'Beneficiary', 'Risk', 'Trend', 'Last check-in', 'Consistency', 'Counselor', 'Status', ''].map((h) => (
                  <th key={h} className="muted" style={{ padding: '13px 14px', fontSize: '.76rem', letterSpacing: '.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <motion.tr key={c.caseNumber} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.025 }}
                  style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                  onClick={() => navigate(`/dashboard/cases/${c.caseNumber}`)}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f6f8fc'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '13px 14px', fontWeight: 700 }}>{c.caseNumber}</td>
                  <td style={{ padding: '13px 14px' }}>{c.victimName}</td>
                  <td style={{ padding: '13px 14px' }}>
                    {c.currentRisk ? <RiskBadge level={c.currentRisk.riskLevel} /> : <span className="muted">no data</span>}
                  </td>
                  <td style={{ padding: '13px 14px', fontSize: '.86rem' }}>
                    {c.currentRisk ? <>{trendIcon(c.currentRisk.trend)} {c.currentRisk.trend?.toLowerCase()}</> : '—'}
                  </td>
                  <td className="muted" style={{ padding: '13px 14px', fontSize: '.84rem' }}>
                    {c.currentRisk?.createdAt ? timeAgo(c.currentRisk.createdAt) : '—'}
                  </td>
                  <td style={{ padding: '13px 14px', fontSize: '.84rem' }}>
                    {c.currentRisk?.consistency
                      ? <span className={`badge ${c.currentRisk.consistency === 'HIGH' ? 'badge-resolved' : 'badge-neutral'}`}>
                          {c.currentRisk.consistency}</span>
                      : '—'}
                  </td>
                  <td className="muted" style={{ padding: '13px 14px', fontSize: '.84rem' }}>{c.counselorName || 'Unassigned'}</td>
                  <td style={{ padding: '13px 14px' }}><span className="badge badge-neutral">{c.status}</span></td>
                  <td style={{ padding: '13px 14px' }}><ArrowRight size={15} color="var(--text-faint)" /></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  )
}
