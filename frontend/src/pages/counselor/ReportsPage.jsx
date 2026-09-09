import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line,
} from 'recharts'
import { ShieldCheck } from 'lucide-react'
import { getReportsOverview, apiMessage } from '../../api'
import { LoadingState, ErrorState, SectionTitle, StatCard } from '../../components/ui'
import { FolderOpen, BellRing, CalendarClock, Users } from 'lucide-react'

const RISK_COLORS = { LOW: '#0ea77b', MODERATE: '#d97706', HIGH: '#e11d48', CRITICAL: '#9f1239' }

export default function ReportsPage() {
  const [reports, setReports] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => { getReportsOverview().then(setReports).catch((e) => setErr(apiMessage(e))) }, [])

  if (err) return <ErrorState message={err} onRetry={() => window.location.reload()} />
  if (!reports) return <LoadingState label="Preparing anonymized analytics…" />

  const riskDist = Object.entries(reports.riskDistribution).map(([name, value]) => ({ name, value }))
  const caseStatus = Object.entries(reports.caseStatus).map(([name, value]) => ({ name, value }))
  const regions = Object.entries(reports.regionalDistribution).map(([name, value]) => ({ name: name.replace(' District', '').replace(' Zone', ''), value }))
  const riskTrend = Object.entries(reports.avgRiskTrend).map(([day, value]) => ({ day: day.slice(5), value }))
  const fu = reports.followUps

  return (
    <div>
      <SectionTitle right={
        <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: '.8rem', color: 'var(--teal-500)', fontWeight: 700 }}>
          <ShieldCheck size={15} /> Anonymized aggregates only
        </span>
      }>
        Impact & Reporting
      </SectionTitle>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
        <StatCard icon={FolderOpen} label="Total Cases" value={reports.totalCases} accent="#5566b0" />
        <StatCard icon={Users} label="Active Cases" value={reports.activeCases} accent="#14b8a6" delay={0.05} />
        <StatCard icon={BellRing} label="Open Alerts" value={reports.alerts.open} accent="#e11d48" delay={0.1} />
        <StatCard icon={CalendarClock} label="Follow-up Completion" value={fu.completionRate} suffix="%" accent="#0ea77b" delay={0.15} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 16 }}>
        <Card title="Risk distribution">
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={riskDist} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {riskDist.map((e) => <Cell key={e.name} fill={RISK_COLORS[e.name]} />)}
                </Pie>
                <Legend /><Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Cases over time (30 days)">
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={Object.entries(reports.casesOverTime).map(([day, v]) => ({ day: day.slice(5), cases: v }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f8" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#7c89a8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#7c89a8' }} />
                <Tooltip />
                <Bar dataKey="cases" fill="#5566b0" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Average risk trend">
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <AreaChart data={riskTrend}>
                <defs>
                  <linearGradient id="repGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e11d48" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#e11d48" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f8" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#7c89a8' }} />
                <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: '#7c89a8' }} tickFormatter={(v) => v.toFixed(1)} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#e11d48" strokeWidth={2.2} fill="url(#repGrad)" name="Avg risk" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Case status">
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={caseStatus} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f8" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#7c89a8' }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: '#7c89a8' }} />
                <Tooltip />
                <Bar dataKey="value" fill="#14b8a6" radius={[0, 6, 6, 0]} name="Cases" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Anonymized regional distribution">
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={regions}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f8" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#7c89a8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#7c89a8' }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3d4f8f" radius={[6, 6, 0, 0]} name="Cases" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Alert pipeline & follow-ups">
          <div style={{ display: 'grid', gap: 14, padding: '8px 0' }}>
            {[['Open alerts', reports.alerts.open], ['Acknowledged', reports.alerts.acknowledged],
              ['Resolved', reports.alerts.resolved]].map(([k, v]) => (
              <div key={k}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.88rem', marginBottom: 4 }}>
                  <span className="muted">{k}</span><strong>{v}</strong>
                </div>
                <div style={{ height: 8, borderRadius: 5, background: '#edf0f7' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (v / Math.max(1, reports.alerts.open + reports.alerts.acknowledged + reports.alerts.resolved)) * 100)}%` }}
                    transition={{ duration: 0.9 }} style={{ height: '100%', borderRadius: 5, background: 'linear-gradient(90deg, var(--indigo-500), var(--cyan-400))' }} />
                </div>
              </div>
            ))}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, fontSize: '.88rem', display: 'grid', gap: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Follow-ups scheduled</span><strong>{fu.scheduled}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Completed</span><strong>{fu.completed}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Missed</span><strong>{fu.missed}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Avg alert resolution</span><strong>{reports.alerts.avgResolutionHours}h</strong></div>
            </div>
          </div>
        </Card>
      </div>

      <p className="disclaimer" style={{ marginTop: 18 }}>
        {reports.note} Thresholds and metrics are not clinically validated.
      </p>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="card">
      <h3 style={{ fontSize: '1rem', marginBottom: 10 }}>{title}</h3>
      {children}
    </motion.div>
  )
}
