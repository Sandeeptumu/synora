import api from '../../api/client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck, ChevronLeft, ChevronRight, Mic, Square, Play, Trash2, Send,
  HeartHandshake, CheckCircle2, FileText, Activity,
} from 'lucide-react'
import { getConsents, setConsent, getMyCasesWellness, submitTextCheckIn, submitVoiceCheckIn, apiMessage } from '../../api'
import { useAuth } from '../../context/AuthContext'
import AIProcessingOverlay, { AI_PIPELINE_STEPS } from '../../components/AIProcessingOverlay'
import { ConfirmModal } from '../../components/ui'

const MOODS = [
  { key: 'great', emoji: '😊', label: 'Pretty good' },
  { key: 'okay', emoji: '🙂', label: 'Okay' },
  { key: 'mixed', emoji: '😐', label: 'Up and down' },
  { key: 'low', emoji: '😔', label: 'Quite low' },
  { key: 'awful', emoji: '😢', label: 'Really struggling' },
]

function Waveform({ active, audioUrl }) {
  const bars = 36
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 54, justifyContent: 'center' }}>
      {Array.from({ length: bars }).map((_, i) => (
        <motion.span key={i} style={{ width: 4, borderRadius: 3,
          background: i % 3 ? 'var(--teal-400)' : 'var(--cyan-400)' }}
          animate={active
            ? { height: [8, 12 + Math.abs(Math.sin(i * 1.7)) * 34, 8] }
            : { height: 10 }}
          transition={active
            ? { duration: 0.9 + (i % 5) * 0.13, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.3 }} />
      ))}
      {audioUrl && <audio src={audioUrl} controls style={{ display: 'none' }} />}
    </div>
  )
}

export default function CheckInFlow() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, updateStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const setStep = (next) => { const n = typeof next === "function" ? next(step) : next; setDirection(n >= step ? 1 : -1); updateStep(n) } // // 0 consent, 1 text, 2 voice, 3 behavioral, 4 review
  const [consents, setConsents] = useState(null)
  const [mood, setMood] = useState('')
  const [text, setText] = useState('')
  const [freqDelta, setFreqDelta] = useState(null)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState('')
  const [procOpen, setProcOpen] = useState(false)
  const [procStep, setProcStep] = useState(0)
  const [procDone, setProcDone] = useState(false)
  const [confirmExit, setConfirmExit] = useState(false)

  // voice state
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState('')
  const [seconds, setSeconds] = useState(0)
  const [voiceConsentAsked, setVoiceConsentAsked] = useState(false)
  const mediaRef = useRef(null)
  const timerRef = useRef(null)
  const submitting = useRef(false)
  const [consentBusy, setConsentBusy] = useState(false)

  useEffect(() => {
    getConsents().then(setConsents).catch(() => setConsents([]))
  }, [])

  const hasConsent = (m) => {
    const list = (consents || []).filter((c) => c.modality === m)
    return list.length ? list[0].granted : false
  }

  const steps = useMemo(() => {
    const s = ['Consent', 'Text', 'Voice', 'Patterns', 'Review']
    return s
  }, [])

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl) }, [audioUrl])
  useEffect(() => () => {
    clearInterval(timerRef.current)
    const recorder = mediaRef.current
    if (recorder) { recorder.onstop = null; if (recorder.state !== 'inactive') recorder.stop(); recorder.stream.getTracks().forEach(t => t.stop()) }
  }, [])
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].find(t => MediaRecorder.isTypeSupported(t))
      mediaRef.current = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      const recorder = mediaRef.current
      setErr('')
      const chunks = []
      mediaRef.current.ondataavailable = (e) => e.data.size && chunks.push(e.data)
      mediaRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || chunks[0]?.type || 'audio/mp4' })
        if (!blob.size) { setErr('No audio was captured. Please try recording again.'); stream.getTracks().forEach(t => t.stop()); return }
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach((t) => t.stop())
      }
      recorder.onerror = () => { setErr('Recording failed. Please try again.'); stream.getTracks().forEach(t => t.stop()); setRecording(false); clearInterval(timerRef.current) }
      mediaRef.current.start()
      setRecording(true)
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch {
      setErr('Microphone access was denied. You can continue with text only.')
    }
  }

  const stopRecording = () => {
    mediaRef.current?.stop()
    setRecording(false)
    clearInterval(timerRef.current)
  }

  const deleteAudio = () => {
    setAudioBlob(null)
    setAudioUrl('')
    setSeconds(0)
  }

  const submit = async () => {
    if (submitting.current) return
    submitting.current = true
    setErr('')
    setProcOpen(true)
    setProcDone(false)
    setProcStep(0)
    // Animate the pipeline while the request runs
    const stepper = setInterval(() => setProcStep((s) => Math.min(s + 1, AI_PIPELINE_STEPS.length - 1)), 340)
    try {
      const { data: supportCase } = await api.post('/api/me/case')
      const caseNumber = supportCase.caseNumber
      if (!caseNumber) throw new Error('No active case found for your account. Please contact your support officer.')
      let data
      if (audioBlob) {
        const fd = new FormData()
        fd.append('file', audioBlob, `check-in.${audioBlob.type.includes('mp4') ? 'm4a' : audioBlob.type.includes('ogg') ? 'ogg' : 'webm'}`)
        if (freqDelta !== null) fd.append('interactionFrequencyDelta', freqDelta)
        if (text) fd.append('text', text)
        if (mood) fd.append('mood', mood)
        data = await submitVoiceCheckIn(caseNumber, fd)
      } else {
        data = await submitTextCheckIn(caseNumber, { text, mood, interactionFrequencyDelta: freqDelta })
      }
      clearInterval(stepper)
      setProcStep(AI_PIPELINE_STEPS.length)
      setTimeout(() => {
        setProcDone(true)
        setResult(data)
      }, 550)
    } catch (e) {
      clearInterval(stepper)
      setProcOpen(false)
      setErr(apiMessage(e))
    } finally { submitting.current = false }
  }

  const finish = () => {
    setProcOpen(false)
    navigate('/app/home')
  }

  const canNext = () => {
    if (step === 0) return hasConsent('TEXT_ANALYSIS') && !consentBusy
    if (step === 1) return text.trim().length > 3 || audioBlob || mood
    return true
  }

  // ------- result view -------
  if (result) {
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <AIProcessingOverlay open={procOpen} step={procStep} done={procDone} />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="card" style={{ textAlign: 'center', padding: 28 }}>
          <CheckCircle2 size={44} color="var(--teal-500)" style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '1.3rem', letterSpacing: '-0.02em' }}>Thank you for checking in</h2>
          <p className="muted" style={{ marginTop: 6, fontSize: '.94rem' }}>
            Your check-in was analyzed with your consent. Based on what you shared, here is a gentle note for you:
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="card" style={{ borderLeft: '4px solid var(--teal-400)', display: 'flex', gap: 12 }}>
          <HeartHandshake size={22} color="var(--teal-500)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 700, marginBottom: 3 }}>A note for you</div>
            <p style={{ fontSize: '.94rem', color: 'var(--text-soft)' }}>
              {result.riskScore > 0.6
                ? 'We noticed some changes in your recent check-ins. You may want to connect with your support team — they are here for you and reaching out is a strong step.'
                : result.riskScore > 0.3
                ? 'It looks like things have been a bit up and down lately. Remember your support team is here for you whenever you need them.'
                : 'Your recent check-ins suggest you are managing. Keep taking care of yourself — and remember support is always here if things change.'}
            </p>
          </div>
        </motion.div>
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
          className="btn btn-teal" style={{ width: '100%' }} onClick={finish}>
          Back to home
        </motion.button>
        <p className="disclaimer">Analysis is for support only and is never a medical diagnosis.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <AIProcessingOverlay open={procOpen} step={procStep} done={procDone}
        disclaimer={false} />

      {/* progress header */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h1 style={{ fontSize: '1.3rem', letterSpacing: '-0.02em' }}>Check-in</h1>
          <span className="muted" style={{ fontSize: '.8rem' }}>Step {step + 1} of {steps.length}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1 }}>
              <div style={{ height: 5, borderRadius: 4, background: i <= step ? 'var(--teal-500)' : '#e3e8f2',
                transition: 'background .3s' }} />
              <div className="muted" style={{ fontSize: '.64rem', textAlign: 'center', marginTop: 4,
                fontWeight: i === step ? 700 : 500, color: i === step ? 'var(--teal-500)' : undefined }}>{s}</div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        {/* STEP 0: consent */}
        {step === 0 && (
          <motion.div key="s0" custom={direction} variants={{ enter: d => ({ opacity: 0, x: d * 45, scale: .98 }), center: { opacity: 1, x: 0, scale: 1 }, leave: d => ({ opacity: 0, x: d * -35, scale: .98 }) }} initial="enter" animate="center" exit="leave" transition={{ duration: .3, ease: [.22, 1, .36, 1] }} className="card checkin-step" style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <ShieldCheck size={22} color="var(--teal-500)" />
              <strong style={{ fontSize: '1.05rem' }}>Before we begin</strong>
            </div>
            <div style={{ display: 'grid', gap: 10, fontSize: '.92rem', color: 'var(--text-soft)' }}>
              <p><strong>What is collected:</strong> the text you write, an optional voice note, and basic check-in timing patterns.</p>
              <p><strong>Why:</strong> to notice changes from your own normal pattern early, so your support team can help sooner.</p>
              <p><strong>Who can see it:</strong> only your assigned counselor and case officer. Data is never sold or shared.</p>
              <p><strong>Your choice:</strong> voice is optional. Any consent can be revoked anytime from your profile.</p>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ width: '100%' }}
              disabled={consentBusy} onClick={async () => {
                setConsentBusy(true); setErr('')
                try { await Promise.all([
                  setConsent('TEXT_ANALYSIS', true),
                  hasConsent('BEHAVIORAL_ANALYSIS') ? Promise.resolve() : setConsent('BEHAVIORAL_ANALYSIS', true),
                ])
                setConsents(await getConsents())
                setStep(1)
                } catch(e) { setErr(apiMessage(e)) } finally { setConsentBusy(false) }
              }}>
              <ShieldCheck size={15} /> Accept & continue
            </button>
          </motion.div>
        )}

        {/* STEP 1: mood + text */}
        {step === 1 && (
          <motion.div key="s1" custom={direction} variants={{ enter: d => ({ opacity: 0, x: d * 45, scale: .98 }), center: { opacity: 1, x: 0, scale: 1 }, leave: d => ({ opacity: 0, x: d * -35, scale: .98 }) }} initial="enter" animate="center" exit="leave" transition={{ duration: .3, ease: [.22, 1, .36, 1] }} className="card checkin-step" style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <HeartHandshake size={20} color="var(--teal-500)" />
              <strong style={{ fontSize: '1.02rem' }}>How have you been feeling recently?</strong>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {MOODS.map((m) => (
                <button className="choice-tile" key={m.key} onClick={() => setMood(m.key)}
                  aria-pressed={mood === m.key}
                  style={{ display: 'grid', placeItems: 'center', gap: 2, padding: '10px 12px', minWidth: 62,
                    borderRadius: 14, border: `2px solid ${mood === m.key ? 'var(--teal-500)' : 'var(--border-strong)'}`,
                    background: mood === m.key ? 'var(--low-soft)' : '#fff', cursor: 'pointer',
                    fontSize: '.68rem', fontWeight: 700, color: 'var(--text-soft)' }}>
                  <span style={{ fontSize: '1.3rem' }}>{m.emoji}</span>{m.label}
                </button>
              ))}
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="checkin-text">Tell us in your own words (optional)</label>
              <textarea id="checkin-text" rows={5} value={text} onChange={(e) => setText(e.target.value)}
                placeholder="Whatever feels important today — even a sentence helps."
                style={{ resize: 'vertical' }} />
            </div>
          </motion.div>
        )}

        {/* STEP 2: voice */}
        {step === 2 && (
          <motion.div key="s2" custom={direction} variants={{ enter: d => ({ opacity: 0, x: d * 45, scale: .98 }), center: { opacity: 1, x: 0, scale: 1 }, leave: d => ({ opacity: 0, x: d * -35, scale: .98 }) }} initial="enter" animate="center" exit="leave" transition={{ duration: .3, ease: [.22, 1, .36, 1] }} className="card checkin-step" style={{ display: 'grid', gap: 14, justifyItems: 'center' }}>
            <strong style={{ fontSize: '1.02rem', display: 'flex', gap: 9, alignItems: 'center' }}>
              <Mic size={18} color="var(--teal-500)" /> Optional voice check-in
            </strong>
            <p className="muted" style={{ fontSize: '.88rem', textAlign: 'center' }}>
              Speaking can sometimes feel easier than writing. Submitted recordings are saved for your assigned counselor to listen to. You can skip this step.
            </p>

            {hasConsent('VOICE_ANALYSIS') || voiceConsentAsked ? (
              <>
                <div style={{ width: '100%', padding: '14px', background: '#0c1531', borderRadius: 16 }}>
                  <Waveform active={recording} />
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '.04em' }}>
                  {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {!recording && !audioBlob && (
                    <button className="btn btn-teal" onClick={startRecording} style={{ borderRadius: '50%', width: 62, height: 62, padding: 0 }}>
                      <Mic size={22} />
                    </button>
                  )}
                  {recording && (
                    <button className="btn btn-danger" onClick={stopRecording} style={{ borderRadius: '50%', width: 62, height: 62, padding: 0 }}
                      aria-label="Stop recording">
                      <Square size={20} />
                    </button>
                  )}
                  {audioBlob && (
                    <>
                      <audio key={audioUrl} src={audioUrl} controls preload="metadata" onError={() => setErr("This browser could not play the recording. Please delete it and record again.")} style={{ maxWidth: 280, width: "100%", height: 44 }} />
                      <button className="btn btn-ghost" onClick={deleteRecording} aria-label="Delete recording"
                        style={{ borderRadius: '50%', width: 48, height: 48, padding: 0 }}>
                        <Trash2 size={18} color="var(--high)" />
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', display: 'grid', gap: 12 }}>
                <p style={{ fontSize: '.92rem', color: 'var(--text-soft)' }}>
                  With your consent, submitted voice notes are saved with your case for your assigned counselor to listen to, alongside voice analysis. Revoking voice consent blocks future playback.
                </p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button className="btn btn-teal btn-sm" onClick={async () => {
                    await setConsent('VOICE_ANALYSIS', true)
                    setConsents(await getConsents())
                    setVoiceConsentAsked(true)
                  }}>Give voice consent</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setStep(3)}>Skip voice</button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* STEP 3: behavioral */}
        {step === 3 && (
          <motion.div key="s3" custom={direction} variants={{ enter: d => ({ opacity: 0, x: d * 45, scale: .98 }), center: { opacity: 1, x: 0, scale: 1 }, leave: d => ({ opacity: 0, x: d * -35, scale: .98 }) }} initial="enter" animate="center" exit="leave" transition={{ duration: .3, ease: [.22, 1, .36, 1] }} className="card checkin-step" style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Activity size={19} color="var(--teal-500)" />
              <strong style={{ fontSize: '1.02rem' }}>Weekly pattern (optional)</strong>
            </div>
            <p className="muted" style={{ fontSize: '.88rem' }}>
              Compared to a typical week, how have these been? We use this only to understand changes from your own normal.
            </p>
            {[
              { label: 'Contact with your support circle', value: freqDelta, set: setFreqDelta,
                options: [{ v: 1, l: 'More than usual' }, { v: 0, l: 'About the same' }, { v: -1.5, l: 'Less than usual' }] },
            ].map((q) => (
              <div key={q.label}>
                <div style={{ fontWeight: 700, fontSize: '.88rem', marginBottom: 8 }}>{q.label}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {q.options.map((o) => (
                    <button className="choice-tile" key={o.v} onClick={() => q.set(o.v)} aria-pressed={q.value === o.v}
                      style={{ padding: '9px 14px', borderRadius: 12, cursor: 'pointer', fontSize: '.82rem', fontWeight: 600,
                        border: `2px solid ${q.value === o.v ? 'var(--teal-500)' : 'var(--border-strong)'}`,
                        background: q.value === o.v ? 'var(--low-soft)' : '#fff', color: 'var(--text-soft)' }}>
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* STEP 4: review + submit */}
        {step === 4 && (
          <motion.div key="s4" custom={direction} variants={{ enter: d => ({ opacity: 0, x: d * 45, scale: .98 }), center: { opacity: 1, x: 0, scale: 1 }, leave: d => ({ opacity: 0, x: d * -35, scale: .98 }) }} initial="enter" animate="center" exit="leave" transition={{ duration: .3, ease: [.22, 1, .36, 1] }} className="card checkin-step" style={{ display: 'grid', gap: 14 }}>
            <strong style={{ fontSize: '1.05rem', display: 'flex', gap: 9, alignItems: 'center' }}>
              <FileText size={19} color="var(--teal-500)" /> Ready to submit
            </strong>
            <div style={{ display: 'grid', gap: 8, fontSize: '.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Mood</span><span style={{ fontWeight: 600 }}>{MOODS.find((m) => m.key === mood)?.label || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Written note</span><span style={{ fontWeight: 600 }}>{text ? `${text.trim().split(/\s+/).length} words` : 'None'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="muted">Voice note</span><span style={{ fontWeight: 600 }}>{audioBlob ? `Recorded (${seconds}s)` : 'None'}</span>
              </div>
            </div>
            {err && <p className="form-error" role="alert">{err}</p>}
            <button className="btn btn-teal" style={{ width: '100%' }} onClick={submit} disabled={procOpen || (!text.trim() && !audioBlob && !mood)}>
              <Send size={16} /> Submit check-in
            </button>
            <p className="disclaimer" style={{ margin: 0 }}>
              Analyzed only with your consent, to connect you with the right human support. Not a medical diagnosis.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {err && step !== 4 && <p className="form-error" role="alert">{err}</p>}
      {/* nav buttons */}
      {!result && (
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => (step === 0 ? setConfirmExit(true) : setStep((s) => s - 1))}
            disabled={procOpen || recording}>
            <ChevronLeft size={16} /> Back
          </button>
          {step < steps.length - 1 && (
            <button className="btn btn-primary btn-sm" onClick={() => setStep((s) => s + 1)} disabled={!canNext() || recording}>
              Continue <ChevronRight size={16} />
            </button>
          )}
        </div>
      )}

      <ConfirmModal open={confirmExit} title="Leave check-in?"
        message="Your progress will not be saved. You can start a new check-in anytime."
        confirmLabel="Leave" danger
        onConfirm={() => { setConfirmExit(false); navigate('/app/home') }}
        onClose={() => setConfirmExit(false)} />
    </div>
  )

  function deleteRecording() {
    deleteAudio()
  }
}
