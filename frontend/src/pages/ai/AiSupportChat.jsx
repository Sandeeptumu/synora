import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Send, Trash2, Plus, Sparkles, AlertTriangle, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { sendChatMessage, getChatHistory, clearChatHistory, getTriage, apiMessage } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui'
import { fmtDateTime } from '../../utils/format'

const SYSTEM_PROMPT_NOTE = "Synora AI provides supportive guidance only. It does not diagnose, prescribe, or provide treatment instructions."

export default function AiSupportChat() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [busy, setBusy] = useState(false)
  const [input, setInput] = useState('')
  const [err, setErr] = useState('')
  const [mounted, setMounted] = useState(false)
  const bottom = useRef(null)
  const scroll = () => bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })

  useEffect(() => {
    setMounted(true)
    getChatHistory().then(setHistory).catch(() => setHistory([]))
    scroll()
  }, [])

  useEffect(() => { mounted && scroll() }, [history, busy])

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    setErr('')
    const tmp = [...history, { id: 'local-user-' + Date.now(), kind: 'USER', text, createdAt: new Date().toISOString() }]
    setHistory(tmp)
    setBusy(true)
    try {
      const res = sendChatMessage(text)
      const updated = [...tmp, { id: 'local-ai-' + Date.now(), kind: 'AI', text: res.reply, createdAt: new Date().toISOString() }]
      setHistory(updated)
    } catch (e) {
      setHistory(tmp.slice(0, -1))
      setErr(apiMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const clear = async () => {
    if (!history.length) return
    try {
      await clearChatHistory()
      setHistory([])
    } catch (e) {
      setErr(apiMessage(e))
    }
  }

  const refresh = async () => {
    try {
      setHistory(await getChatHistory())
    } catch (e) {
      setErr(apiMessage(e))
    }
  }

  const triage = (async () => {
    try {
      return await getTriage()
    } catch {
      return null
    }
  })()

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}><ArrowLeft size={15}/> Back</button>
        <h1 style={{ fontSize: '1.4rem', letterSpacing: '-0.02em', margin: 0 }}>Talk with Synora AI</h1>
      </div>

      <p className="muted" style={{ fontSize: '.92rem', margin: '0 0 4px' }}>
        Supportive guidance, not a diagnosis. You can also use <button className="text-link-inline" onClick={() => navigate('/app/check-in')} style={{ background: 'none', border: 'none', color: 'var(--teal-500)', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: 'inherit' }}>today's check-in</button> if you prefer structured reflection.
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="badge badge-neutral" style={{ border: 'none', cursor: 'pointer', fontSize: '.8rem', background: history.length ? '#e8ecf5' : '#fff' }} onClick={refresh}>
          {history.length} message{history.length === 1 ? '' : 's'}
        </button>
        {history.length > 0 && (
          <button className="badge badge-neutral" style={{ border: 'none', cursor: 'pointer', fontSize: '.8rem' }} onClick={clear}>
            <Trash2 size={12}/> Clear conversation
          </button>
        )}
      </div>

      {err && <p className="form-error" role="alert">{err}</p>}

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 360, maxHeight: 'min(60vh, 620px)', overflow: 'hidden' }}>
        {history.length === 0 ? (
          <EmptyState icon={Sparkles} title="Start a conversation" sub="Share what is on your mind. Synora AI will reply with supportive guidance and can suggest next steps." />
        ) : (
          <div style={{ flex: 1, overflow: 'auto', padding: '4px 2px' }}>
            {history.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="chat-bubble"
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  marginBottom: 10,
                  animationDelay: '0ms',
                }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center',
                  background: m.kind === 'USER'
                    ? 'linear-gradient(135deg, var(--teal-500), var(--cyan-400))'
                    : 'var(--navy-800)',
                  color: m.kind === 'USER' ? '#04252b' : '#fff',
                  flexShrink: 0,
                }}>
                  {m.kind === 'USER' ? <Sparkles size={15} /> : <Sparkles size={15} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="chat-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <span className={`badge badge-${m.kind === 'USER' ? 'LOW' : 'neutral'}`} style={{ fontSize: '.7rem' }}>
                      {m.kind === 'USER' ? 'You' : 'Synora AI'}
                    </span>
                    <span className="muted" style={{ fontSize: '.7rem' }}>{fmtDateTime(m.createdAt)}</span>
                  </div>
                  <p style={{ fontSize: '.94rem', color: 'var(--text-soft)', margin: '4px 0 0' }}>{m.text}</p>
                </div>
              </motion.div>
            ))}
            {busy && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="chat-bubble"
                style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center',
                  background: 'var(--navy-800)', color: '#fff',
                  flexShrink: 0,
                }}><Sparkles size={15}/></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="chat-row" style={{ display: 'flex', gap: 8 }}>
                    <span className="badge badge-neutral" style={{ fontSize: '.7rem' }}>Synora AI</span>
                    <span className="muted" style={{ fontSize: '.7rem' }}>typing…</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-faint)', animation: 'pulse 1.2s ease-in-out infinite' }}/>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-faint)', animation: 'pulse 1.2s ease-in-out infinite 0.2s' }}/>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-faint)', animation: 'pulse 1.2s ease-in-out infinite 0.4s' }}/>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={bottom} />
          </div>
        )}
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px' }}>
        <AlertTriangle size={16} color="var(--moderate)"/>
        <span style={{ fontSize: '.84rem', color: 'var(--text-soft)' }}>
          {SYSTEM_PROMPT_NOTE}. If you are in immediate danger, use urgent support options or contact local emergency services.
        </span>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          className="field input-chat"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="What is on your mind today?"
          disabled={busy}
          style={{ flex: 1, minWidth: 180, padding: '11px 14px', fontSize: '1rem' }}
        />
        <button className="btn btn-teal" onClick={send} disabled={busy || !input.trim()}>
          <Send size={17}/> Send
        </button>
      </div>

      <p className="disclaimer" style={{ marginTop: 4 }}>
        Conversations are private to you and used only to support you. They may inform support recommendations.
      </p>
    </div>
  )
}
