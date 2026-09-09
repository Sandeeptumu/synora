import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Globe, Phone, ShieldCheck } from 'lucide-react'
import { getResources, apiMessage } from '../../api'
import { LoadingState, ErrorState, EmptyState, SectionTitle } from '../../components/ui'

const CATS = ['', 'COUNSELING', 'CRISIS_SUPPORT', 'COMMUNITY', 'LEGAL', 'REHABILITATION', 'ARTICLE', 'SELF_CARE']
const CAT_LABEL = {
  COUNSELING: 'Counseling', CRISIS_SUPPORT: 'Crisis Support', COMMUNITY: 'Community',
  LEGAL: 'Legal Support', REHABILITATION: 'Rehabilitation', ARTICLE: 'Trusted Articles', SELF_CARE: 'Self-care',
}

export default function ResourcesPage() {
  const [resources, setResources] = useState(null)
  const [err, setErr] = useState('')
  const [cat, setCat] = useState('')

  useEffect(() => { getResources().then(setResources).catch((e) => setErr(apiMessage(e))) }, [])

  if (err && !resources) return <ErrorState message={err} onRetry={() => window.location.reload()} />
  if (!resources) return <LoadingState />

  const filtered = resources.filter((r) => !cat || r.category === cat)

  return (
    <div>
      <SectionTitle right={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.82rem', color: 'var(--low)', fontWeight: 600 }}>
          <ShieldCheck size={15} /> All resources counselor-reviewed
        </span>
      }>
        Resource Center
      </SectionTitle>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {CATS.map((c) => (
          <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c}
            style={{ padding: '8px 14px', borderRadius: 999, cursor: 'pointer', fontSize: '.8rem', fontWeight: 700,
              border: `1.5px solid ${cat === c ? 'var(--teal-500)' : 'var(--border-strong)'}`,
              background: cat === c ? 'rgba(20,184,166,.1)' : '#fff',
              color: cat === c ? 'var(--teal-500)' : 'var(--text-soft)' }}>
            {c ? CAT_LABEL[c] : 'All'}
          </button>
        ))}
      </div>

      {filtered.length === 0 && <EmptyState icon={BookOpen} title="No resources found" />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14 }}>
        {filtered.map((r, i) => (
          <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }} className="card" style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
              <strong style={{ fontSize: '.96rem' }}>{r.title}</strong>
              <span className="badge badge-neutral" style={{ flexShrink: 0 }}>{CAT_LABEL[r.category] || r.category}</span>
            </div>
            <p className="muted" style={{ fontSize: '.86rem' }}>{r.description}</p>
            <div style={{ fontSize: '.78rem', color: 'var(--text-soft)', display: 'grid', gap: 3 }}>
              <span>🕐 {r.availability}</span>
              <span>🗣 {r.language}</span>
              {r.contact && <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}><Phone size={11} /> {r.contact}</span>}
            </div>
            {r.link && (
              <a href={r.link} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"
                style={{ justifyContent: 'center' }}>
                <Globe size={13} /> Open resource
              </a>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
