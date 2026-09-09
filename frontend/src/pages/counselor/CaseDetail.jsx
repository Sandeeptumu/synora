import CaseVoiceNotes from '../../components/CaseVoiceNotes'
import { useCallback, useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ReferenceLine,
} from 'recharts'
import {
  ArrowLeft, FileText, Mic, Activity, Gauge, TrendingUp, BrainCircuit, BellRing,
  ClipboardList, CalendarClock, History, Sparkles, PlayCircle, UserRound, CheckCircle2,
} from 'lucide-react'
import {
  getCase, getRisk, getRiskHistory, getSignals, getBaseline, getExplainability,
  getTimeline, getAlerts, patchAlert, getInterventions, addIntervention,
  getFollowUps, createFollowUp, patchFollowUp, apiMessage,
} from '../../api'
import { useAuth } from '../../context/AuthContext'
import RiskGauge from '../../components/RiskGauge'
import CrossSensingVisual from '../../components/CrossSensingVisual'
import {
  LoadingState, ErrorState, EmptyState, SectionTitle, ConfirmModal,
} from '../../components/ui'
import { timeAgo, fmtDate, fmtDateTime, riskColor, fmtPct, titleize } from '../../utils/format'

const RISK_COLORS = { LOW: '#0ea77b', MODERATE: '#d97706', HIGH: '#e11d48', CRITICAL: '#9f1239' }

const TABS = ['Voice notes', 'Risk', 'Signals', 'Cross-Sensing', 'Explainability', 'Alerts', 'Support', 'Timeline']

export default function CaseDetail() {
  const { caseNumber } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('Risk')
  const [data, setData] = useState({})
  const [err, setErr] = useState('')
  const [range, setRange] = useState(30)
  const [noteOpen, setNoteOpen] = useState(false)
  const [fuOpen, setFuOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      // Every analysis endpoint fails independently: a failure records `null`
      // for that slice, and the corresponding section renders its own
      // "unavailable" state while the rest of the case page keeps working.
      const safe = (p) => p.catch(() => null)
      const [c, risk, history, signals, baseline, expl, timeline, alerts, interventions, followUps] =
        await Promise.allSettled([
          getCase(caseNumber),
          safe(getRisk(caseNumber)),
          safe(getRiskHistory(caseNumber, 90)),
          safe(getSignals(caseNumber)),
          safe(getBaseline(caseNumber)),
          safe(getExplainability(caseNumber)),
          safe(getTimeline(caseNumber)),
          safe(getAlerts(`caseNumber=${caseNumber}`)),
          safe(getInterventions(caseNumber)),
          safe(getFollowUps(caseNumber)),
        ]).then((results) => results.map((r) => (r.status === 'fulfilled' ? r.value : null)))
      if (c == null) {
        // The case itself could not be loaded — that IS a page-level failure.
        setErr('Unable to load this case. Check the backend connection and try again.')
        setData((d) => ({ ...d, c: d.c ?? null }))
        return
      }
      setErr('')
      setData({
        c,
        risk,
        history: history || [],
        signals: signals || {},
        baseline,
        expl: expl || { factors: [] },
        timeline: timeline || [],
        alerts: alerts || [],
        interventions: interventions || [],
        followUps: followUps || [],
      })
    } catch (e) {
      setErr(apiMessage(e))
    }
  }, [caseNumber])

  useEffect(() => { load() }, [load])

  if (err && !data.c) return <ErrorState message={err} onRetry={load} />
  if (!data.c) return <LoadingState label="Loading case…" />

  const { c, risk, history, signals, baseline, expl, timeline, alerts, interventions, followUps } = data
  const level = risk?.riskLevel || 'LOW'
  const chartRows = (history || [])
    .filter((h) => true)
    .slice(-range)
    .map((h) => ({ ...h, day: fmtDate(h.date) }))

  return (
    <div>


      {/* header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft size={16} /></button>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <h1 className="page-title">{c.caseNumber}</h1>
            <span className="badge badge-neutral">{c.status}</span>
          </div>
          <p className="page-sub" style={{ marginTop: 2 }}>{c.title} · {c.victimName} · counselor: {c.counselorName || 'unassigned'}</p>
        </div>
      </motion.div>

      {/* tabs */}
      <div style={{ display: 'flex', gap: 6, margin: '18px 0', flexWrap: 'wrap' }} role="tablist">
        {TABS.filter(t => t !== 'Voice notes' || user.role === 'COUNSELOR').map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            style={{ padding: '9px 16px', borderRadius: 12, border: '1.5px solid',
              borderColor: tab === t ? 'var(--teal-500)' : 'var(--border-strong)',
              background: tab === t ? 'rgba(20,184,166,.1)' : '#fff',
              color: tab === t ? 'var(--teal-500)' : 'var(--text-soft)',
              fontWeight: 700, fontSize: '.86rem' }}>
            {t}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
      <motion.div key={tab} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: .22 }}>
      {tab === 'Voice notes' && <CaseVoiceNotes caseNumber={caseNumber} />}
      {/* ============ RISK TAB ============ */}
      {tab === 'Risk' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 16 }}>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card"
            style={{ display: 'grid', placeItems: 'center', gap: 12 }}>
            <RiskGauge score={risk?.riskScore ?? 0} level={level} />
            <div className="muted" style={{ fontSize: '.84rem', textAlign: 'center' }}>
              Evaluated {risk?.createdAt ? timeAgo(risk.createdAt) : '—'} · provider: {risk?.provider || 'demo'}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="card">
            <SectionTitle right={
              <div style={{ display: 'flex', gap: 6 }}>
                {[7, 30, 90].map((d) => (
                  <button key={d} onClick={() => setRange(d)}
                    style={{ padding: '5px 11px', borderRadius: 9, fontSize: '.76rem', fontWeight: 700,
                      border: '1.5px solid', borderColor: range === d ? 'var(--teal-500)' : 'var(--border-strong)',
                      background: range === d ? 'rgba(20,184,166,.1)' : '#fff',
                      color: range === d ? 'var(--teal-500)' : 'var(--text-soft)' }}>
                    {d}d
                  </button>
                ))}
              </div>
            }>
              Risk trajectory
            </SectionTitle>
            {(history || []).length === 0 ? (
              <p className="muted" style={{ padding: 24 }}>Risk history unavailable for this case.</p>
            ) : (
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer>
                <AreaChart data={chartRows} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="caseRiskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={RISK_COLORS[level]} stopOpacity={0.32} />
                      <stop offset="100%" stopColor={RISK_COLORS[level]} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f8" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#7c89a8' }} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: '#7c89a8' }} tickFormatter={(v) => v.toFixed(1)} />
                  <Tooltip />
                  {[0.3, 0.6, 0.8].map((t) => (
                    <ReferenceLine key={t} y={t} stroke="#c4cde2" strokeDasharray="4 4"
                      label={{ value: t, fontSize: 9, fill: '#7c89a8', position: 'right' }} />
                  ))}
                  <Area type="monotone" dataKey="riskScore" stroke={RISK_COLORS[level]} strokeWidth={2.4}
                    fill="url(#caseRiskGrad)" name="Risk score" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            )}
          </motion.div>

          {/* personal baseline */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="card">
            <SectionTitle><span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><UserRound size={17} /> Personal baseline</span></SectionTitle>
            {baseline ? (
              <>
                <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
                  {[['Personal baseline', baseline.baselineDistress], ['Current state', baseline.currentDistress]].map(([label, v]) => (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.84rem', marginBottom: 4 }}>
                        <span className="muted">{label}</span><strong>{Math.round(v * 100)}%</strong>
                      </div>
                      <div style={{ height: 9, borderRadius: 6, background: '#edf0f7' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, v * 100)}%` }}
                          transition={{ duration: 0.9, ease: 'easeOut' }}
                          style={{ height: '100%', borderRadius: 6,
                            background: label === 'Current state' ? 'linear-gradient(90deg, var(--indigo-500), var(--cyan-400))' : '#c4cde2' }} />
                      </div>
                    </div>
                  ))}
                  <div style={{ fontSize: '.9rem' }}>
                    <span className="muted">Deviation: </span>
                    <strong style={{ color: baseline.deviation > 0.15 ? 'var(--high)' : 'var(--low)' }}>
                      {baseline.deviation > 0 ? '+' : ''}{baseline.deviation}
                    </strong>
                  </div>
                </div>
                <p style={{ fontSize: '.88rem', color: 'var(--text-soft)' }}>{baseline.interpretation}</p>
                <p className="disclaimer" style={{ marginTop: 10 }}>
                  Risk is evaluated relative to the individual's historical interaction pattern — not a population norm.
                </p>
              </>
            ) : <EmptyState title="No baseline yet" sub="More check-ins are needed to establish a personal baseline." />}
          </motion.div>

          {/* component breakdown */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="card">
            <SectionTitle><span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><Gauge size={17} /> Component breakdown</span></SectionTitle>
            {[['Text', risk?.textScore], ['Voice', risk?.voiceScore], ['Behavior', risk?.behaviorScore],
              ['Baseline dev', risk?.baselineDeviation], ['Signal agreement', risk?.signalAgreement]].map(([k, v]) => (
              <div key={k} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.84rem', marginBottom: 3 }}>
                  <span className="muted">{k}</span><strong>{v == null ? '—' : fmtPct(v)}</strong>
                </div>
                {v != null && (
                  <div style={{ height: 7, borderRadius: 5, background: '#edf0f7' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, v * 100)}%` }}
                      transition={{ duration: 0.8 }} style={{ height: '100%', borderRadius: 5,
                        background: `linear-gradient(90deg, ${riskColor(level)}, var(--cyan-400))` }} />
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        </div>
      )}

      {/* ============ SIGNALS TAB ============ */}
      {tab === 'Signals' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 16 }}>
          <SignalCard icon={FileText} title="Text signal" color="#38bdf8" timestamp={signals?.text?.timestamp}
            rows={signals?.text ? [
              ['Distress', fmtPct(signals.text.distressScore)],
              ['Sentiment', titleize(signals.text.sentiment)],
              ['Themes', signals.text.themes.join(', ') || '—'],
              ['Sleep disruption', signals.text.sleepDisruption ? 'Detected' : 'None'],
              ['Urgency', signals.text.urgency ? 'Detected' : 'None'],
              ['Confidence', fmtPct(signals.text.confidence)],
            ] : null} emptyText="No text analysis yet." />
          <SignalCard icon={Mic} title="Voice signal" color="#a78bfa" timestamp={signals?.voice?.timestamp}
            rows={signals?.voice ? [
              ['Distress', fmtPct(signals.voice.distressScore)],
              ['Tone indicators', signals.voice.toneIndicators.join(', ')],
              ['Energy level', fmtPct(signals.voice.energyLevel)],
              ['Speech rate', fmtPct(signals.voice.speechRate)],
              ['Confidence', fmtPct(signals.voice.confidence)],
            ] : null} emptyText="No voice analysis yet." />
          <SignalCard icon={Activity} title="Behavior signal" color="#f59e0b" timestamp={signals?.behavior?.timestamp}
            rows={signals?.behavior ? [
              ['Deviation', fmtPct(signals.behavior.deviation)],
              ['Interaction frequency', `${signals.behavior.interactionFrequency} vs baseline ${signals.behavior.baselineInteractionFrequency}`],
              ['Response interval', `${signals.behavior.responseIntervalHours}h vs baseline ${signals.behavior.baselineResponseIntervalHours}h`],
              ['Indicators', signals.behavior.indicators.map(titleize).join(', ')],
            ] : null} emptyText="No behavioral signal yet." />
        </div>
      )}

      {/* ============ CROSS-SENSING TAB ============ */}
      {tab === 'Cross-Sensing' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 16 }}>
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="card"
            style={{ display: 'grid', placeItems: 'center', padding: 26 }}>
            <CrossSensingVisual
              size={430}
              onSelect={() => setTab('Signals')}
              scores={{
                text: signals?.text?.distressScore,
                voice: signals?.voice?.distressScore,
                behavior: signals?.behavior?.deviation,
                baseline: baseline ? Math.max(0, baseline.deviation) : undefined,
                trend: risk?.trend === 'RISING' ? Math.abs(risk?.baselineDeviation ?? 0.4) : 0.1,
              }} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ display: 'grid', gap: 14 }}>
            <SectionTitle><span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><BrainCircuit size={18} /> Cross-sensing summary</span></SectionTitle>
            <div style={{ display: 'grid', gap: 12 }}>
              <AgreementBar label="Signal agreement" value={risk?.signalAgreement ?? 0} />
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span className="muted" style={{ fontSize: '.88rem' }}>Consistency:</span>
                <span className={`badge ${(risk?.consistency || 'LOW') === 'HIGH' ? 'badge-resolved' : 'badge-neutral'}`}>
                  {risk?.consistency || 'INSUFFICIENT'}</span>
              </div>
            </div>
            <p style={{ fontSize: '.92rem', color: 'var(--text-soft)', background: 'var(--bg-soft)', padding: 14, borderRadius: 12 }}>
              Multiple permitted signals show a similar change from the individual's baseline. This is an
              explainable screening signal, <strong>not a diagnosis</strong> — final interpretation belongs to the reviewing professional.
            </p>
            <div style={{ fontSize: '.84rem', color: 'var(--text-soft)', display: 'grid', gap: 6 }}>
              {(signals?.text) && <div>✓ Text signal: distress {fmtPct(signals.text.distressScore)}, sentiment {signals.text.sentiment}</div>}
              {(signals?.voice) && <div>✓ Voice signal: distress {fmtPct(signals.voice.distressScore)}, tones: {signals.voice.toneIndicators.join(', ')}</div>}
              {(signals?.behavior) && <div>✓ Behavior: {signals.behavior.indicators.map(titleize).join(', ')}</div>}
              {(baseline) && <div>✓ Baseline deviation: {baseline.deviation > 0 ? '+' : ''}{baseline.deviation}</div>}
            </div>
          </motion.div>
        </div>
      )}

      {/* ============ EXPLAINABILITY TAB ============ */}
      {tab === 'Explainability' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card">
          <SectionTitle>Why did the risk indication change?</SectionTitle>
          {(expl?.factors || []).length === 0 ? (
            <EmptyState title="No contributing factors yet" sub="Factors appear once analysis data exists for this case." />
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {(expl?.factors || []).map((f, i) => (
                <motion.div key={f.factor} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '13px 15px',
                    background: 'var(--bg-soft)', borderRadius: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, display: 'grid', placeItems: 'center',
                    background: '#fff', color: riskColor(level), flexShrink: 0 }}>
                    <TrendingUp size={17} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{titleize(f.factor)}</div>
                    <div className="muted" style={{ fontSize: '.82rem' }}>{f.explanation}</div>
                    <div style={{ height: 6, borderRadius: 4, background: '#e3e8f2', marginTop: 6 }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, f.contribution * 400)}%` }}
                        transition={{ duration: 0.8, delay: 0.15 + i * 0.07 }}
                        style={{ height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${riskColor(level)}, var(--cyan-400))` }} />
                    </div>
                  </div>
                  <strong style={{ color: riskColor(level), fontSize: '.95rem', flexShrink: 0 }}>+{f.contribution}</strong>
                </motion.div>
              ))}
            </div>
          )}
          <p className="disclaimer" style={{ marginTop: 14 }}>
            Contributions are relative weights from the scoring engine, provided for transparency. They are not
            clinical measurements. AI-Assisted Risk Indication — Not a Medical Diagnosis.
          </p>
        </motion.div>
      )}

      {/* ============ ALERTS TAB ============ */}
      {tab === 'Alerts' && (
        <div style={{ display: 'grid', gap: 14 }}>
          {alerts.length === 0 && <EmptyState icon={BellRing} title="No alerts for this case" sub="Alerts appear when the risk indication crosses the configured threshold." />}
          {alerts.map((a, i) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="card" style={{ borderTop: `3px solid ${RISK_COLORS[a.severity]}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <strong>{a.title}</strong>
                    <span className={`badge badge-${a.severity}`}>{a.severity}</span>
                    <span className={`badge badge-${a.status.toLowerCase()}`}>{a.status}</span>
                    {a.escalated && <span className="badge badge-HIGH">Escalated</span>}
                  </div>
                  <div className="muted" style={{ fontSize: '.84rem', marginTop: 4 }}>
                    {a.signals.join(' + ')} · risk {fmtPct(a.riskScore)} · detected {timeAgo(a.createdAt)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {a.status === 'OPEN' && (
                    <button className="btn btn-sm btn-ghost" onClick={async () => {
                      await patchAlert(a.id, { action: 'acknowledge' }); load()
                    }}>Acknowledge</button>
                  )}
                  {a.status !== 'RESOLVED' && (
                    <button className="btn btn-sm btn-teal" onClick={async () => {
                      await patchAlert(a.id, { action: 'resolve', note: 'Reviewed by ' + user.fullName }); load()
                    }}>Resolve</button>
                  )}
                  {a.status === 'RESOLVED' && <span className="muted" style={{ fontSize: '.82rem', alignSelf: 'center' }}>Resolved {timeAgo(a.resolvedAt)}</span>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ============ SUPPORT TAB ============ */}
      {tab === 'Support' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 16 }}>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card">
            <SectionTitle right={<button className="btn btn-teal btn-sm" onClick={() => setNoteOpen(true)}>
              <ClipboardList size={14} /> Record support</button>}>
              Interventions
            </SectionTitle>
            {interventions.length === 0 ? (
              <EmptyState icon={ClipboardList} title="No support recorded yet" />
            ) : interventions.map((iv) => (
              <div key={iv.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.86rem' }}>
                  <strong>{titleize(iv.type)}</strong>
                  <span className="muted">{fmtDateTime(iv.createdAt)}</span>
                </div>
                <p className="muted" style={{ fontSize: '.85rem', marginTop: 3 }}>{iv.notes}</p>
                {iv.outcome && <span className="badge badge-resolved" style={{ marginTop: 6 }}>{iv.outcome}</span>}
              </div>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="card">
            <SectionTitle right={<button className="btn btn-teal btn-sm" onClick={() => setFuOpen(true)}>
              <CalendarClock size={14} /> Schedule</button>}>
              Follow-ups
            </SectionTitle>
            {followUps.length === 0 ? (
              <EmptyState icon={CalendarClock} title="No follow-ups scheduled" />
            ) : followUps.map((f) => (
              <FollowUpRow key={f.id} f={f} onUpdate={async (patch) => { await patchFollowUp(f.id, patch); load() }} />
            ))}
          </motion.div>
        </div>
      )}

      {/* ============ TIMELINE TAB ============ */}
      {tab === 'Timeline' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card">
          <SectionTitle><span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><History size={17} /> Case timeline</span></SectionTitle>
          {timeline.length === 0 ? (
            <EmptyState icon={History} title="No timeline events yet" />
          ) : (
            <div style={{ position: 'relative', paddingLeft: 26 }}>
              <div style={{ position: 'absolute', left: 9, top: 6, bottom: 6, width: 2, background: '#e3e8f2' }} />
              {timeline.map((e, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }} style={{ position: 'relative', paddingBottom: 20 }}>
                  <div style={{ position: 'absolute', left: -24, top: 3, width: 14, height: 14, borderRadius: '50%',
                    background: '#fff', border: `3px solid ${e.type === 'ALERT_GENERATED' ? 'var(--high)' : 'var(--teal-500)'}` }} />
                  <div style={{ fontWeight: 700, fontSize: '.92rem' }}>{e.label}</div>
                  <div className="muted" style={{ fontSize: '.82rem' }}>{e.description}</div>
                  <div className="muted" style={{ fontSize: '.74rem', marginTop: 2 }}>{fmtDateTime(e.timestamp)} · {e.actor}</div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      </motion.div>
      </AnimatePresence>
      {/* modals */}
      <NoteModal open={noteOpen} onClose={() => setNoteOpen(false)} onSave={async (payload) => {
        await addIntervention(caseNumber, payload); setNoteOpen(false); load()
      }} />
      <FollowUpModal open={fuOpen} onClose={() => setFuOpen(false)} onSave={async (payload) => {
        await createFollowUp(caseNumber, payload); setFuOpen(false); load()
      }} />
    </div>
  )
}

/* ---------- sub components ---------- */

function SignalCard({ icon: Icon, title, color, rows, timestamp, emptyText }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card"
      style={{ borderTop: `3px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <strong style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><Icon size={17} color={color} /> {title}</strong>
        <span className="muted" style={{ fontSize: '.76rem' }}>{timestamp ? timeAgo(timestamp) : ''}</span>
      </div>
      {rows ? (
        <div style={{ display: 'grid', gap: 8, fontSize: '.88rem' }}>
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span className="muted">{k}</span><span style={{ fontWeight: 600, textAlign: 'right' }}>{v}</span>
            </div>
          ))}
        </div>
      ) : <p className="muted" style={{ fontSize: '.86rem' }}>{emptyText}</p>}
    </motion.div>
  )
}

function AgreementBar({ label, value }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.88rem', marginBottom: 5 }}>
        <span className="muted">{label}</span><strong>{fmtPct(value)}</strong>
      </div>
      <div style={{ height: 10, borderRadius: 6, background: '#edf0f7' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, value * 100)}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 6, background: 'linear-gradient(90deg, var(--teal-500), var(--cyan-400))' }} />
      </div>
    </div>
  )
}

function FollowUpRow({ f, onUpdate }) {
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)', display: 'grid', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <strong style={{ fontSize: '.9rem' }}>{titleize(f.type)} · {fmtDate(f.dueDate)}</strong>
        <span className={`badge badge-${f.status === 'COMPLETED' ? 'resolved' : f.status === 'MISSED' ? 'HIGH' : 'acknowledged'}`.replace('badgeHIGH', 'badge-HIGH')}>
          {f.status}
        </span>
      </div>
      {f.notes && <div className="muted" style={{ fontSize: '.82rem' }}>{f.notes}</div>}
      {f.status === 'SCHEDULED' && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-sm btn-teal" onClick={() => onUpdate({ status: 'COMPLETED' })}>
            <CheckCircle2 size={13} /> Complete
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => onUpdate({ status: 'MISSED' })}>Mark missed</button>
        </div>
      )}
    </div>
  )
}

function NoteModal({ open, onClose, onSave }) {
  const [type, setType] = useState('COUNSELING_SESSION')
  const [notes, setNotes] = useState('')
  const [outcome, setOutcome] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Modal open={open} onClose={onClose} title="Record support activity">
      <div className="field">
        <label htmlFor="iv-type">Type</label>
        <select id="iv-type" value={type} onChange={(e) => setType(e.target.value)}>
          {['COUNSELING_SESSION', 'SUPPORT_CALL', 'SAFETY_PLAN', 'REFERRAL', 'OTHER'].map((t) => (
            <option key={t} value={t}>{titleize(t)}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="iv-notes">Notes</label>
        <textarea id="iv-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="iv-outcome">Outcome</label>
        <input id="iv-outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)}
          placeholder="e.g. Positive engagement" />
      </div>
      <button className="btn btn-teal" style={{ width: '100%' }} disabled={busy || !notes.trim()}
        onClick={async () => { setBusy(true); await onSave({ type, notes, outcome }); setBusy(false) }}>
        Save record
      </button>
    </Modal>
  )
}

function FollowUpModal({ open, onClose, onSave }) {
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(Date.now() + 3 * 86400000)
    return d.toISOString().slice(0, 10)
  })
  const [type, setType] = useState('CALL')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Modal open={open} onClose={onClose} title="Schedule follow-up">
      <div className="field">
        <label htmlFor="fu-date">Due date</label>
        <input id="fu-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="fu-type">Type</label>
        <select id="fu-type" value={type} onChange={(e) => setType(e.target.value)}>
          {['CALL', 'SESSION', 'CHECK_IN', 'VISIT'].map((t) => <option key={t} value={t}>{titleize(t)}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="fu-notes">Notes</label>
        <input id="fu-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <button className="btn btn-teal" style={{ width: '100%' }} disabled={busy}
        onClick={async () => { setBusy(true); await onSave({ dueDate, type, notes }); setBusy(false) }}>
        Schedule
      </button>
    </Modal>
  )
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div role="dialog" aria-modal="true" aria-label={title}
      style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'grid', placeItems: 'center', padding: 20 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(6,13,31,.5)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="card" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440 }}>
        <h3 style={{ marginBottom: 16 }}>{title}</h3>
        {children}
      </motion.div>
    </div>
  )
}
