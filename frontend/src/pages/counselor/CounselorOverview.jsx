import { WorkspaceBanner, ImageAction } from '../../components/WorkspaceVisuals'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  FolderOpen, BellRing, CalendarClock, Cpu, ArrowRight, Users, ClipboardList, ShieldAlert,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { getCases, getAlerts, getRisk, getReportsOverview, getFollowUps, apiMessage } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { StatCard, RiskBadge, LoadingState, ErrorState, SectionTitle } from '../../components/ui'
import { timeAgo, trendIcon, fmtDate } from '../../utils/format'

const RISK_COLORS = { LOW: '#0ea77b', MODERATE: '#d97706', HIGH: '#e11d48', CRITICAL: '#9f1239' }

/**
 * Counselor command center. Every data source loads independently:
 * one failing endpoint degrades a section, never the whole dashboard.
 */
export default function CounselorOverview() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [cases, setCases] = useState(null)          // null = loading
  const [casesErr, setCasesErr] = useState(null)
  const [riskMap, setRiskMap] = useState({})
  const [alerts, setAlerts] = useState(null)
  const [alertsErr, setAlertsErr] = useState(null)
  const [reports, setReports] = useState(null)
  const [reportsErr, setReportsErr] = useState(null)
  const [followUps, setFollowUps] = useState([])
  const [followUpsUnavailable, setFollowUpsUnavailable] = useState(true)
  const [tick, setTick] = useState(0)               // retry handle

  useEffect(() => {
    let alive = true
    setCasesErr(null); setAlertsErr(null); setReportsErr(null)

    // Independent loads — no shared Promise.all failure domain.
    getCases()
      .then(async (cs) => {
        if (!alive) return
        setCases(cs)
        // Silent per-case risk fetch; failures just leave "—" in the table.
        const entries = await Promise.allSettled(
          cs.map(async (c) => [c.caseNumber, await getRisk(c.caseNumber, true)]),
        )
        if (!alive) return
        const map = {}
        for (const e of entries) {
          if (e.status === 'fulfilled' && e.value?.[1]) map[e.value[0]] = e.value[1]
        }
        setRiskMap(map)
      })
      .catch((e) => { if (alive) { setCasesErr(apiMessage(e)); setCases([]) } })

    getAlerts()
      .then((al) => { if (alive) setAlerts(al) })
      .catch((e) => { if (alive) { setAlertsErr(apiMessage(e)); setAlerts([]) } })

    getReportsOverview()
      .then((rep) => { if (alive) setReports(rep) })
      .catch((e) => { if (alive) { setReportsErr(apiMessage(e)); setReports({}) } })

    return () => { alive = false }
  }, [tick])

  // Follow-ups for the current top-risk case (non-critical decoration).
  useEffect(() => {
    if (!cases?.length) return
    const withRisk = cases.map((c) => ({ c, r: riskMap[c.caseNumber] }))
      .sort((a, b) => (b.r?.riskScore ?? 0) - (a.r?.riskScore ?? 0))
    const top = withRisk[0]?.c
    if (top) {
      setFollowUpsUnavailable(true)
      let alive = true
      getFollowUps(top.caseNumber)
        .then((f) => { if (alive) { setFollowUps(f); setFollowUpsUnavailable(false) } })
        .catch(() => { if (alive) setFollowUps([]) })
      return () => { alive = false }
    }
  }, [cases, riskMap])

  const stats = useMemo(() => {
    const openAlerts = (alerts || []).filter((a) => a.status === 'OPEN').length
    return {
      active: (cases || []).filter((c) => c.status !== 'CLOSED').length,
      openAlerts,
      highRisk: (cases || []).filter((c) => ['HIGH', 'CRITICAL'].includes(riskMap[c.caseNumber]?.riskLevel)).length,
      review: (alerts || []).filter((a) => a.status === 'ACKNOWLEDGED').length,
      due: followUps.filter((f) => f.status === 'SCHEDULED').length,
    }
  }, [cases, alerts, followUps, riskMap])

  const retryAll = () => setTick((t) => t + 1)

  if (cases === null && !casesErr) return <LoadingState label="Loading your workspace…" />

  const priority = [...(cases || [])]
    .filter((c) => c.status !== 'CLOSED')
    .sort((a, b) => (riskMap[b.caseNumber]?.riskScore ?? 0) - (riskMap[a.caseNumber]?.riskScore ?? 0))
    .slice(0, 8)

  const riskDist = reports?.riskDistribution
    ? Object.entries(reports.riskDistribution).map(([name, value]) => ({ name, value }))
    : []

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <span className="eyebrow">YOUR WORKSPACE</span><h1 className="page-title">Care overview</h1>
        <p className="page-sub">
          {user.role === 'COUNSELOR'
            ? 'Your assigned caseload, prioritized by dynamic risk indication.'
            : 'Organization-wide view of active support cases.'}
        </p>
      </motion.div>

      <WorkspaceBanner />
      <div className="dashboard-actions"><ImageAction to="/dashboard/cases" image="grove" eyebrow="PEOPLE FIRST" title="Your caseload"/><ImageAction to="/dashboard/followups" image="dawn" eyebrow="THE NEXT STEP" title="Plan your follow-ups"/><ImageAction to="/dashboard/resources" image="water" eyebrow="TOOLS FOR CARE" title="Explore resources"/></div>
      {/* metrics — render with 0s if their source failed */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, margin: '20px 0' }}>
        <StatCard icon={FolderOpen} label="Active Cases" value={casesErr ? null : stats.active} accent="#5566b0" delay={0} />
        <StatCard icon={BellRing} label="Open alerts" value={alerts === null || alertsErr ? null : stats.openAlerts} accent="#e11d48" delay={0.06} />
        <StatCard icon={ShieldAlert} label="High / Critical Risk" value={casesErr || (cases?.length && Object.keys(riskMap).length < cases.length) ? null : stats.highRisk} accent="#9f1239" delay={0.12} />
        <StatCard icon={ClipboardList} label="Cases Needing Review" value={alerts === null || alertsErr ? null : stats.review} accent="#d97706" delay={0.18} />
        <StatCard icon={CalendarClock} label="Priority case follow-ups" value={followUpsUnavailable ? null : stats.due} accent="#14b8a6" delay={0.24} />
      </div>

      {/* per-section error banners with retry */}
      {(casesErr || alertsErr || reportsErr) && (
        <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
          {[['cases', casesErr], ['alerts', alertsErr], ['analytics', reportsErr]].map(([k, e]) => e && (
            <div key={k} className="card" style={{
              padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center',
              borderLeft: '3px solid var(--moderate)', background: 'var(--moderate-soft)',
            }}>
              <span style={{ fontSize: '.88rem', color: 'var(--text-soft)' }}>
                Unable to load {k}. Check the backend connection and try again.
              </span>
              <button className="btn btn-ghost btn-sm" onClick={retryAll} style={{ marginLeft: 'auto' }}>Retry</button>
            </div>
          ))}
        </div>
      )}

      {/* charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 16 }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card">
          <SectionTitle>Risk distribution</SectionTitle>
          {reportsErr || riskDist.length === 0 ? (
            <p className="muted" style={{ padding: 24 }}>{reportsErr ? 'Analytics unavailable right now.' : 'Your risk distribution will appear when case data is available.'}</p>
          ) : (
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={riskDist} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={3}>
                    {riskDist.map((e) => <Cell key={e.name} fill={RISK_COLORS[e.name]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="disclaimer" style={{ marginTop: 8 }}>
            Aggregated across visible cases. Prototype thresholds — not clinically validated.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }} className="card">
          <SectionTitle>Average risk trend (30 days)</SectionTitle>
          <TrendChart data={reports?.avgRiskTrend} unavailable={!!reportsErr} />
        </motion.div>
      </div>

      {/* priority queue */}
      <SectionTitle right={<Link to="/dashboard/cases" style={{ color: 'var(--teal-500)', fontWeight: 700, fontSize: '.85rem' }}>All cases</Link>}>
        Priority case queue
      </SectionTitle>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="card" style={{ padding: 0, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
              {['Case', 'Beneficiary', 'Risk', 'Trend', 'Last check-in', 'Status', ''].map((h) => (
                <th key={h} className="muted" style={{ padding: '13px 16px', fontSize: '.78rem', letterSpacing: '.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {priority.length === 0 && (
              <tr><td colSpan={7}><EmptyInline label="No active cases found." /></td></tr>
            )}
            {priority.map((c, i) => {
              const r = riskMap[c.caseNumber]
              return (
                <motion.tr key={c.caseNumber} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.34 + i * 0.04 }}
                  style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                  onClick={() => navigate(`/dashboard/cases/${c.caseNumber}`)}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f6f8fc'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ fontWeight: 700 }}>{c.caseNumber}</div>
                    <div className="muted" style={{ fontSize: '.8rem' }}>{c.category}</div>
                  </td>
                  <td style={{ padding: '13px 16px' }}>{c.victimName}</td>
                  <td style={{ padding: '13px 16px' }}>
                    {r ? <RiskBadge level={r.riskLevel} /> : <span className="muted">—</span>}
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: '.88rem' }}>
                    {r ? <>{trendIcon(r.trend)} {r.trend?.toLowerCase()}</> : '—'}
                  </td>
                  <td className="muted" style={{ padding: '13px 16px', fontSize: '.86rem' }}>
                    {r?.createdAt ? timeAgo(r.createdAt) : '—'}
                  </td>
                  <td style={{ padding: '13px 16px' }}><span className="badge badge-neutral">{c.status}</span></td>
                  <td style={{ padding: '13px 16px' }}><ArrowRight size={15} color="var(--text-faint)" /></td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </motion.div>

      {/* open alerts strip */}
      {(alerts || []).filter((a) => a.status === 'OPEN').slice(0, 3).length > 0 && (
        <>
          <SectionTitle right={<Link to="/dashboard/alerts" style={{ color: 'var(--teal-500)', fontWeight: 700, fontSize: '.85rem' }}>Alert center</Link>}>
            Open alerts
          </SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 14 }}>
            {(alerts || []).filter((a) => a.status === 'OPEN').slice(0, 3).map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.07 }}
                onClick={() => navigate(`/dashboard/cases/${a.caseNumber}`)}
                className="card" style={{ borderTop: `3px solid ${RISK_COLORS[a.severity]}`, cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <strong style={{ fontSize: '.95rem' }}>{a.caseNumber}</strong>
                  <motion.span className={`badge badge-${a.severity}`}
                    animate={a.severity === 'CRITICAL' ? { opacity: [1, 0.6, 1] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}>{a.severity}</motion.span>
                </div>
                <div className="muted" style={{ fontSize: '.84rem' }}>{a.title}</div>
                <div className="muted" style={{ fontSize: '.78rem', marginTop: 6 }}>
                  {(a.signals || []).join(' + ')} · detected {timeAgo(a.createdAt)}
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function EmptyInline({ label }) {
  return (
    <div style={{ padding: '28px', textAlign: 'center' }}>
      <div className="muted" style={{ fontSize: '.9rem' }}>{label}</div>
    </div>
  )
}

function TrendChart({ data, unavailable }) {
  const rows = useMemo(() => {
    if (!data) return []
    return Object.entries(data).map(([day, v]) => ({ day: fmtDate(day), value: v }))
  }, [data])
  if (unavailable) return <p className="muted" style={{ padding: 24 }}>Analytics unavailable right now.</p>
  if (rows.length === 0) return <p className="muted" style={{ padding: 24 }}>No trend data yet.</p>
  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <AreaChart data={rows} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e11d48" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#e11d48" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef1f8" />
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#7c89a8' }} />
          <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: '#7c89a8' }} tickFormatter={(v) => v.toFixed(1)} />
          <Tooltip />
          <Area type="monotone" dataKey="value" stroke="#e11d48" strokeWidth={2.2} fill="url(#riskGrad)" name="Avg risk" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
