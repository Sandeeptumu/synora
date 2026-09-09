import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, HeartHandshake, TrendingUp, CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getTodayCheckIn, submitDailyCheckIn, getCheckInHistory, apiMessage } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { LoadingState, ErrorState, EmptyState, ConfirmModal } from '../../components/ui'
import { fmtDate, riskSoft, riskColor } from '../../utils/format'
import { getTriage } from '../../api'

const MOODS = [
  { key: 'very_low', label: 'Very low', emoji: '😢' },
  { key: 'low', label: 'Low', emoji: '😔' },
  { key: 'okay', label: 'Okay', emoji: '🙂' },
  { key: 'good', label: 'Good', emoji: '😊' },
  { key: 'great', label: 'Great', emoji: '🌟' },
]

const SCALE_BREAKS = [
  { value: 1, label: 'Very low' },
  { value: 4, label: 'Low' },
  { value: 5, label: 'Okay' },
  { value: 7, label: 'Good' },
  { value: 10, label: 'Very high' },
]

export default function DailyCheckInPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [today, setToday] = useState(null)
  const [history, setHistory] = useState([])
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [submitMsg, setSubmitMsg] = useState('')

  const [mood, setMood] = useState('')
  const [stress, setStress] = useState('')
  const [energy, setEnergy] = useState('')
  const [sleep, setSleep] = useState('')
  const [connection, setConnection] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    Promise.all([
      getTodayCheckIn().then(setToday),
      getCheckInHistory().then(setHistory).catch(() => setHistory([]))
    ]).catch((e) => setErr(apiMessage(e)))
  }, [])

  useEffect(() => {
    if (today) {
      setMood(today.mood || '')
      setStress(today.stressLevel != null ? today.stressLevel.toString() : '')
      setEnergy(today.energyLevel != null ? today.energyLevel.toString() : '')
      setSleep(today.sleepQuality != null ? today.sleepQuality.toString() : '')
      setConnection(today.connectionLevel != null ? today.connectionLevel.toString() : '')
      setNote(today.noteText || '')
    }
  }, [today])

  const canSubmit = mood && stress && energy && sleep && connection

  const submit = async () => {
    if (!canSubmit || busy) return
    setBusy(true)
    setErr('')
    setSubmitMsg('')
    try {
      await submitDailyCheckIn({
        mood,
        stressLevel: parseInt(stress, 10),
        energyLevel: parseInt(energy, 10),
        sleepQuality: parseInt(sleep, 10),
        connectionLevel: parseInt(connection, 10),
        noteText: note.trim() || undefined,
      })
      setSubmitMsg('Today’s check-in saved ✔')
      setTimeout(() => setSubmitMsg(''), 2500)
      setHistory(await getCheckInHistory())
      setToday(await getTodayCheckIn())
    } catch (e) {
      setErr(apiMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}><ArrowLeft size={15}/> Back</button>
        <h1 style={{ fontSize: '1.4rem', letterSpacing: '-0.02em', margin: 0 }}>Daily check-in</h1>
      </div>

      <p className="muted" style={{ fontSize: '.92rem', margin: 0 }}>
        Take a quiet moment to reflect. There is no right or wrong answer.
      </p>

      {err && <p className="form-error" role="alert">{err}</p>}
      {submitMsg && <p style={{ color: 'var(--low)', fontWeight: 700, fontSize: '.9rem' }}>{submitMsg}</p>}

      {today ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ borderLeft: '4px solid var(--teal-400)' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <CheckCircle2 size={20} color="var(--teal-500)"/>
            <strong style={{ fontSize: '1.02rem' }}>Today’s check-in completed ✓</strong>
            <span className="badge badge-neutral" style={{ marginLeft: 'auto' }}>{fmtDate(today.createdAt)}</span>
          </div>
          <div style={{ display: 'grid', gap: 8, marginTop: 8, fontSize: '.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Mood</span><span style={{ fontWeight: 600 }}>{MOODS.find(m => m.key === today.mood)?.label || today.mood}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Stress</span><span>{today.stressLevel ?? '—'}/10</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Energy</span><span>{today.energyLevel ?? '—'}/10</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Sleep</span><span>{today.sleepQuality ?? '—'}/10</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Connection</span><span>{today.connectionLevel ?? '—'}/10</span></div>
            {today.noteText && <div style={{ marginTop: 4 }}><span className="muted" style={{ display: 'block', marginBottom: 2 }}>Note</span><p style={{ fontSize: '.9rem', color: 'var(--text-soft)' }}>{today.noteText}</p></div>}
          </div>
          <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 10 }} onClick={() => navigate('/app/check-in/history')}>
            <TrendingUp size={15}/> View history
          </button>
        </motion.div>
      ) : (
        <>
          <div className="card">
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
              <HeartHandshake size={18} color="var(--teal-500)"/>
              <strong style={{ fontSize: '1.02rem' }}>How are you feeling today?</strong>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: 8 }}>Mood</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {MOODS.map((m) => (
                    <button
                      key={m.key}
                      onClick={() => setMood(m.key)}
                      aria-pressed={mood === m.key}
                      className={`choice-tile choice-tile-wider`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '9px 14px', borderRadius: 12, cursor: 'pointer',
                        border: `2px solid ${mood === m.key ? 'var(--teal-500)' : 'var(--border-strong)'}`,
                        background: mood === m.key ? 'var(--low-soft)' : '#fff',
                        fontWeight: 600, fontSize: '.9rem', color: 'var(--text-soft)',
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>{m.emoji}</span>{m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                {[
                  { label: 'Stress level', value: stress, set: setStress, min: 1, max: 10 },
                  { label: 'Energy level', value: energy, set: setEnergy, min: 1, max: 10 },
                  { label: 'Sleep quality', value: sleep, set: setSleep, min: 1, max: 10 },
                  { label: 'How connected do you feel today?', value: connection, set: setConnection, min: 1, max: 10 },
                ].map((q) => (
                  <ScaleField key={q.label} {...q} />
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="checkin-note">Optional: would you like to tell us anything about your day?</label>
              <textarea id="checkin-note" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Whatever feels important today — even a sentence helps." style={{ resize: 'vertical' }} />
            </div>
          </div>

          <button className="btn btn-teal" style={{ width: '100%' }} onClick={submit} disabled={busy || !canSubmit}>
            {busy ? 'Saving…' : 'Save check-in'}
          </button>

          <p className="disclaimer" style={{ margin: 0 }}>
            This is private to you and helps us understand how you are doing. It is not a medical diagnosis.
          </p>
        </>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.01em', marginBottom: 10 }}>Recent check-ins</h2>
        {history.length === 0 ? (
          <EmptyState title="No check-ins yet" sub="Your check-in history will appear here once you complete today’s check-in." />
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {[...history].reverse().slice(0, 14).map((h) => (
              <div key={h.id} className="card" style={{ padding: 14, display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{fmtDate(h.createdAt)}</div>
                  <span className="badge" style={{ background: riskSoft(h.mood === 'great' ? 'LOW' : h.mood === 'okay' || h.mood === 'low' ? 'MODERATE' : 'HIGH'), color: riskColor(h.mood === 'great' ? 'LOW' : h.mood === 'okay' || h.mood === 'low' ? 'MODERATE' : 'HIGH') }}>
                    {MOODS.find(m => m.key === h.mood)?.label || h.mood || '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: '.8rem', color: 'var(--text-soft)', flexWrap: 'wrap' }}>
                  <span>Stress {h.stressLevel ?? '—'}/10</span>
                  <span>Energy {h.energyLevel ?? '—'}/10</span>
                  <span>Sleep {h.sleepQuality ?? '—'}/10</span>
                  <span>Connection {h.connectionLevel ?? '—'}/10</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}

function ScaleField({ label, value, set, min, max }) {
  const num = value === '' ? null : parseInt(value, 10)
  const low = isFinite(num) ? num : 5
  const pct = ((low - min) / (max - min)) * 100
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontWeight: 700, fontSize: '.9rem' }}>{label}</span>
        <span style={{ fontWeight: 700, fontSize: '.9rem', color: 'var(--teal-500)' }}>
          {num != null ? `${num}/10` : '—'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {SCALE_BREAKS.map((b) => (
          <button
            key={b.value}
            onClick={() => set(b.value.toString())}
            aria-pressed={num === b.value}
            className="badge"
            style={{
              border: 'none',
              cursor: 'pointer',
              fontSize: '.78rem',
              background: num === b.value ? 'var(--teal-500)' : undefined,
              color: num === b.value ? '#04252b' : 'var(--text-soft)',
            }}
          >
            {SCALE_BREAKS.indexOf(b) === 0 ? 'Low' : SCALE_BREAKS.indexOf(b) === SCALE_BREAKS.length - 1 ? 'High' : b.label}
          </button>
        ))}
      </div>
    </div>
  )
}
