import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { getMyCasesWellness, getRiskHistory, apiMessage } from '../../api'
import { LoadingState, ErrorState, EmptyState, SectionTitle } from '../../components/ui'
import { fmtDate } from '../../utils/format'

export default function VictimHistory() {
  const [wellness, setWellness] = useState(null)
  const [history, setHistory] = useState([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const w = await getMyCasesWellness()
        setWellness(w)
        const firstCase = Array.isArray(w?.cases) ? w.cases[0] : null
        if (firstCase?.caseNumber) {
          const h = await getRiskHistory(firstCase.caseNumber, 90)
          setHistory((Array.isArray(h) ? h : []).map((x) => ({
            ...x,
            day: fmtDate(x.date),
            // Victim-facing y-axis: reframe risk 0..1 as "wellness" 100..0 (inverted semantics)
            wellness: Math.round((1 - x.riskScore) * 100),
          })))
        }
      } catch (e) {
        setErr(apiMessage(e))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <LoadingState />
  if (err) return <ErrorState message={err} onRetry={() => window.location.reload()} />

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ fontSize: '1.4rem', letterSpacing: '-0.02em' }}>Your journey</motion.h1>
      <p className="muted" style={{ marginTop: -8, fontSize: '.92rem' }}>
        A private view of your check-in pattern over time. Higher means more settled.
      </p>

      {history.length === 0 ? (
        <EmptyState title="No check-ins yet" sub="Complete your first check-in to start seeing your personal trend." />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="card">
          <SectionTitle>Personal wellness trend</SectionTitle>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <AreaChart data={history} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="wellnessGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8ecf5" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#7c89a8' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#7c89a8' }} />
                <Tooltip />
                <Area type="monotone" dataKey="wellness" stroke="#14b8a6" strokeWidth={2.4}
                  fill="url(#wellnessGrad)" name="Wellness" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      <SectionTitle>Check-in log</SectionTitle>
      <div style={{ display: 'grid', gap: 10 }}>
        {[...history].reverse().slice(0, 10).map((h, i) => (
          <motion.div key={h.date} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }} className="card" style={{ padding: 14, display: 'flex',
              justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{fmtDate(h.date)}</div>
              <div className="muted" style={{ fontSize: '.78rem' }}>
                {h.textScore != null ? 'Text' : ''}{h.textScore != null && h.voiceScore != null ? ' + ' : ''}
                {h.voiceScore != null ? 'Voice' : ''}{h.textScore == null && h.voiceScore == null ? 'Check-in' : ''}
              </div>
            </div>
            <span className="badge badge-neutral">Wellness {Math.round((1 - h.riskScore) * 100)}</span>
          </motion.div>
        ))}
      </div>

      <p className="disclaimer">
        This view is designed to be supportive, not clinical. Your counselor sees a fuller picture and can explain anything you are curious about.
      </p>
    </div>
  )
}
