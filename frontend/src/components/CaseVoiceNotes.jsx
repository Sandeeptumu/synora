import { useEffect, useState } from 'react'
import api from '../api/client'
import { apiMessage } from '../api'

export default function CaseVoiceNotes({ caseNumber }) {
  const [notes, setNotes] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let live = true
    setNotes(null); setError('')
    api.get(`/api/cases/${encodeURIComponent(caseNumber)}/recordings`).then(r => { if (live) setNotes(r.data) }).catch(e => { if (live) setError(apiMessage(e)) })
    return () => { live = false }
  }, [caseNumber])
  return <section className="card">
    <h2>Voice notes</h2>
    <p className="muted">Listen to the person's own words alongside their check-in history. Recordings are available only while voice consent is active.</p>
    {error ? <p role="alert">{error}</p> : notes === null ? <p>Loading recordings…</p> : notes.length === 0 ? <p>No saved recordings yet. New voice check-ins will appear here.</p> : notes.map(note => <VoiceNote key={note.id} note={note} caseNumber={caseNumber} />)}
  </section>
}
function VoiceNote({ note, caseNumber }) {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  const load = async () => {
    setBusy(true); setError('')
    try {
      const r = await api.get(`/api/cases/${encodeURIComponent(caseNumber)}/recordings/${note.id}`, { responseType: 'blob' })
      setUrl(URL.createObjectURL(r.data))
    } catch { setError('Unable to load this recording. Check your connection and current case access, then try again.') }
    finally { setBusy(false) }
  }
  return <article className="voice-note">
    <strong>{new Date(note.createdAt).toLocaleString()}</strong>
    {note.mood && <span className="muted">Self-reported mood: {note.mood}</span>}
    {url ? <audio controls src={url} preload="metadata" onError={() => setError('Your browser cannot play this recording. Try an up-to-date Safari or Chrome browser.')} /> : <button className="btn btn-teal" disabled={busy} onClick={load}>{busy ? 'Loading…' : 'Load voice note'}</button>}
    {error && <p role="alert">{error}</p>}
  </article>
}
