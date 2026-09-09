import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { FileText, Mic, Activity, ShieldCheck, Save, CheckCircle2, XCircle, Globe, X } from 'lucide-react'
import { getConsents, setConsent, apiMessage, patchMyLanguages, getUsers } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { LoadingState, ErrorState, ConfirmModal } from '../../components/ui'

const MODALITIES = [
  { key: 'TEXT_ANALYSIS', label: 'Text check-in analysis', desc: 'Your written check-ins are analyzed for distress language and themes.', icon: FileText },
  { key: 'VOICE_ANALYSIS', label: 'Voice check-in analysis', desc: 'Submitted recordings are saved for your assigned counselor to listen to and for voice analysis. Turning this off blocks future playback; stored recordings are retained.', icon: Mic },
  { key: 'BEHAVIORAL_ANALYSIS', label: 'Interaction patterns', desc: 'Check-in timing patterns are compared with your own baseline. No invasive tracking.', icon: Activity },
]

const AVAILABLE_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'te', label: 'Telugu' },
  { code: 'ta', label: 'Tamil' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ur', label: 'Urdu' },
  { code: 'bn', label: 'Bengali' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'mr', label: 'Marathi' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'ar', label: 'Arabic' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ru', label: 'Russian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'it', label: 'Italian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'nl', label: 'Dutch' },
  { code: 'sv', label: 'Swedish' },
  { code: 'pl', label: 'Polish' },
  { code: 'tr', label: 'Turkish' },
  { code: 'th', label: 'Thai' },
  { code: 'vi', label: 'Vietnamese' },
]

export default function VictimProfile() {
  const { user } = useAuth()
  const [consents, setConsents] = useState(null)
  const [languages, setLanguages] = useState([])
  const [primaryLang, setPrimaryLang] = useState('')
  const [langSearch, setLangSearch] = useState('')
  const [langBusy, setLangBusy] = useState(false)
  const [err, setErr] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    getConsents().then(setConsents).catch((e) => setErr(apiMessage(e)))
    patchMyLanguages({ languageCodes: [] }).catch(() => {})
    getUsers().then((us) => {
      const me = us.find((u) => u.id === user.id)
      if (me) {
        setLanguages(me.languageCodes || [])
        setPrimaryLang(me.primaryLanguage || '')
      }
    }).catch(() => {})
  }, [])

  if (consents === null && !err) return <LoadingState />
  if (err) return <ErrorState message={err} onRetry={() => window.location.reload()} />

  const current = (m) => {
    const latest = consents.filter((c) => c.modality === m)
    return latest.length ? latest[0].granted : false
  }

  const toggle = (modality, granted) => {
    if (!granted) {
      setConfirm({ modality })
      return
    }
    doSet(modality, true)
  }

  const doSet = async (modality, granted) => {
    setConfirm(null)
    try {
      await setConsent(modality, granted)
      setConsents(await getConsents())
      setSavedMsg(granted ? 'Consent granted' : 'Consent revoked')
      setTimeout(() => setSavedMsg(''), 2500)
    } catch (e) {
      setErr(apiMessage(e))
    }
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ fontSize: '1.4rem', letterSpacing: '-0.02em' }}>Profile & privacy</motion.h1>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
        className="card" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{ width: 54, height: 54, borderRadius: '50%', display: 'grid', placeItems: 'center',
          background: 'linear-gradient(135deg, var(--indigo-600), var(--teal-500))', color: '#fff',
          fontWeight: 800, fontSize: '1.2rem', flexShrink: 0 }}>
          {user.fullName.split(' ').map((w) => w[0]).slice(0, 2).join('')}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{user.fullName}</div>
          <div className="muted" style={{ fontSize: '.86rem' }}>{user.email || user.phone}</div>
        </div>      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
          <Globe size={19} color="var(--teal-500)" />
          <strong style={{ fontSize: '1.02rem' }}>Language preferences</strong>
        </div>
        <p className="muted" style={{ fontSize: '.88rem', marginBottom: 14 }}>
          Choose the languages you understand. One can be marked as your primary language. This helps us recommend professionals who can communicate with you.
        </p>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
          <input
            className="field input lang-search"
            value={langSearch}
            onChange={(e) => setLangSearch(e.target.value)}
            placeholder="Search languages…"
            style={{ flex: 1, minWidth: 180 }}
          />
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          {AVAILABLE_LANGUAGES.filter((l) => !langSearch || l.label.toLowerCase().includes(langSearch.toLowerCase()) || l.code.includes(langSearch.toLowerCase())).map((l) => {
            const selected = languages.some((c) => c === l.code)
            return (
              <div key={l.code} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${selected ? 'var(--teal-500)' : 'var(--border-strong)'}`, background: selected ? 'var(--low-soft)' : '#fff', transition: 'border-color .15s, background .15s' }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, display: 'grid', placeItems: 'center', background: selected ? 'var(--teal-500)' : 'var(--bg-soft)', color: selected ? '#04252b' : 'var(--text-faint)', flexShrink: 0 }}>
                  {selected ? <CheckCircle2 size={13}/> : <Globe size={13}/>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{l.label}</div>
                </div>
                <button
                  onClick={() => {
                    if (selected) {
                      setLanguages((prev) => prev.filter((c) => c !== l.code))
                      if (primaryLang === l.code) setPrimaryLang('')
                    } else {
                      setLanguages((prev) => [...prev, l.code])
                    }
                  }}
                  className="btn btn-sm"
                  style={{
                    background: selected ? 'var(--teal-500)' : 'var(--bg-soft)',
                    color: selected ? '#04252b' : 'var(--text-soft)',
                    border: `1.5px solid ${selected ? 'var(--teal-500)' : 'transparent'}`,
                  }}
                >
                  {selected ? 'Selected' : 'Select'}
                </button>
              </div>
            )
          })}
        </div>

        {languages.length > 0 && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: '.88rem' }}>Selected languages</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {languages.map((code) => {
                  const def = AVAILABLE_LANGUAGES.find((l) => l.code === code)
                  return (
                    <span key={code} className="badge" style={{ background: 'var(--low-soft)', color: 'var(--low)' }}>
                      {def?.label || code}
                      {code === primaryLang && <span style={{ marginLeft: 6, color: 'var(--teal-500)', fontWeight: 700 }}>Primary</span>}
                      <button onClick={(e) => { e.stopPropagation(); setLanguages((prev) => prev.filter((c) => c !== code)); if (primaryLang === code) setPrimaryLang(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', marginLeft: 6, padding: 0, display: 'inline-flex' }} aria-label="Remove"><X size={12}/></button>
                    </span>
                  )
                })}
              </div>
            </div>

            {languages.length > 1 && (
              <div style={{ display: 'grid', gap: 6 }}>
                <label className="field" style={{ marginBottom: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: '.88rem' }}>Primary language</span>
                  <select value={primaryLang} onChange={(e) => setPrimaryLang(e.target.value)} style={{ padding: '10px 12px', borderRadius: 10, border: '1.5px solid var(--border-strong)', background: '#fff', fontSize: '.9rem', width: '100%' }}>
                    <option value="">Select primary language</option>
                    {languages.map((code) => {
                      const def = AVAILABLE_LANGUAGES.find((l) => l.code === code)
                      return <option key={code} value={code}>{def?.label || code}</option>
                    })}
                  </select>
                </label>
              </div>
            )}
          </div>
        )}

        {savedMsg && <p style={{ color: 'var(--low)', fontWeight: 700, fontSize: '.86rem', marginTop: 10 }}>{savedMsg} ✓</p>}

        <button
          className="btn btn-teal"
          disabled={langBusy || languages.length === 0}
          onClick={async () => {
            setLangBusy(true); setSavedMsg('')
            try {
              await patchMyLanguages({ languageCodes: languages, primaryLanguage: primaryLang })
              setSavedMsg('Language preferences saved ✔')
              setTimeout(() => setSavedMsg(''), 2500)
            } catch (e) {
              setErr(apiMessage(e))
            } finally { setLangBusy(false) }
          }}
          style={{ marginTop: 12 }}
        >
          {langBusy ? 'Saving…' : <><Save size={15}/> Save languages</>}
        </button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
          <ShieldCheck size={19} color="var(--teal-500)" />
          <strong style={{ fontSize: '1.02rem' }}>You control what you share</strong>
        </div>
        <p className="muted" style={{ fontSize: '.88rem', marginBottom: 14 }}>
          Each type of analysis needs your separate consent. You can revoke any of them at any time —
          your care and support continue regardless.
        </p>

        <div style={{ display: 'grid', gap: 12 }}>
          {MODALITIES.map((m) => {
            const granted = current(m.key)
            return (
              <div key={m.key} style={{ display: 'flex', gap: 12, padding: '13px 14px', borderRadius: 14,
                border: `1.5px solid ${granted ? 'rgba(14,167,123,.3)' : 'var(--border-strong)'}`,
                background: granted ? 'var(--low-soft)' : '#fafbfe' }}>
                <m.icon size={19} color={granted ? 'var(--low)' : 'var(--text-faint)'} style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '.92rem' }}>{m.label}</div>
                  <div className="muted" style={{ fontSize: '.8rem' }}>{m.desc}</div>
                </div>
                <button onClick={() => toggle(m.key, !granted)}
                  aria-pressed={granted}
                  className={`btn btn-sm ${granted ? 'btn-ghost' : 'btn-teal'}`}
                  style={{ flexShrink: 0, alignSelf: 'center' }}>
                  {granted ? (<><CheckCircle2 size={14} /> On</>) : (<><XCircle size={14} /> Off</>)}
                </button>
              </div>
            )
          })}
        </div>
        {savedMsg && <p style={{ color: 'var(--low)', fontWeight: 700, fontSize: '.86rem', marginTop: 10 }}>{savedMsg} ✓</p>}
      </motion.div>

      <p className="disclaimer">
        Your information is analyzed only with your consent and is used to help connect you with appropriate human support.
        Support is never withheld because a consent is switched off.
      </p>

      <ConfirmModal
        open={!!confirm}
        title="Revoke consent?"
        message="We will stop analyzing this type of information right away. Your counselor and support team remain available to you."
        confirmLabel="Yes, revoke"
        danger
        onConfirm={() => doSet(confirm.modality, false)}
        onClose={() => setConfirm(null)}
      />
    </div>
  )
}
