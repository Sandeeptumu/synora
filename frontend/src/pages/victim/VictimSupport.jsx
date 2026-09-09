import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Phone, Globe, BookOpen, HeartHandshake, LifeBuoy } from 'lucide-react'
import { getResources, apiMessage } from '../../api'
import { LoadingState, ErrorState, EmptyState } from '../../components/ui'

const CAT_LABEL = {
  COUNSELING: 'Counseling',
  CRISIS_SUPPORT: 'Crisis Support',
  COMMUNITY: 'Community Support',
  LEGAL: 'Legal Support',
  REHABILITATION: 'Rehabilitation',
  ARTICLE: 'Trusted Articles',
  SELF_CARE: 'Self-care & Grounding',
}

export default function VictimSupport() {
  const [resources, setResources] = useState(null)
  const [err, setErr] = useState('')
  const [cat, setCat] = useState('')

  useEffect(() => {
    getResources().then(setResources).catch((e) => setErr(apiMessage(e)))
  }, [])

  if (resources === null && !err) return <LoadingState />
  if (err) return <ErrorState message={err} onRetry={() => window.location.reload()} />

  const filtered = (resources || []).filter((r) => !cat || r.category === cat)
  const cats = [...new Set((resources || []).map((r) => r.category))]

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ fontSize: '1.4rem', letterSpacing: '-0.02em' }}>You are not alone</motion.h1>
      <p className="muted" style={{ marginTop: -8, fontSize: '.92rem' }}>
        Counselor-reviewed support services, always available when you need them.
      </p>

      {filtered.filter((r) => r.category === 'CRISIS_SUPPORT').map((r) => (
        <motion.div key={r.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="card" style={{ background: 'linear-gradient(135deg, #7f1d1d, var(--critical))',
            color: '#fff', border: 'none' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <LifeBuoy size={26} color="#fecdd3" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800 }}>{r.title}</div>
              <div style={{ fontSize: '.84rem', color: '#fbcfe0' }}>{r.description}</div>
            </div>
          </div>
          <a href={r.link || '#'} target="_blank" rel="noreferrer"
            className="btn btn-sm" style={{ marginTop: 12, background: '#fff', color: 'var(--critical)',
              justifyContent: 'center', width: '100%' }}>
            <Phone size={15} /> {r.contact || 'Get help now'}
          </a>
        </motion.div>
      ))}

      {/* category filter chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => setCat('')} className={`badge ${!cat ? 'badge-LOW' : 'badge-neutral'}`}
          style={{ border: 'none', cursor: 'pointer', fontSize: '.8rem' }}>All</button>
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)}
            className={`badge ${cat === c ? 'badge-LOW' : 'badge-neutral'}`}
            style={{ border: 'none', cursor: 'pointer', fontSize: '.8rem' }}>
            {CAT_LABEL[c] || c}
          </button>
        ))}
      </div>

      {filtered.length === 0 && <EmptyState icon={BookOpen} title="No resources in this category yet" />}
      {filtered.filter((r) => r.category !== 'CRISIS_SUPPORT').map((r, i) => (
        <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }} className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center',
              background: 'var(--low-soft)', color: 'var(--low)', flexShrink: 0 }}>
              <HeartHandshake size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
                <strong style={{ fontSize: '.95rem' }}>{r.title}</strong>
                <span className="badge badge-neutral" style={{ flexShrink: 0 }}>{CAT_LABEL[r.category] || r.category}</span>
              </div>
              <p className="muted" style={{ fontSize: '.86rem', margin: '5px 0 8px' }}>{r.description}</p>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: '.78rem', color: 'var(--text-soft)' }}>
                <span>🕐 {r.availability}</span>
                <span>🗣 {r.language}</span>
                {r.contact && <span>📞 {r.contact}</span>}
                {r.link && <a href={r.link} target="_blank" rel="noreferrer"
                  style={{ color: 'var(--teal-500)', fontWeight: 700, display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                  <Globe size={12} /> Visit</a>}
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
