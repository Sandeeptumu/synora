import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion'
import { AlertTriangle, Inbox, Loader2, RefreshCw, X } from 'lucide-react'

/* ---------- animated counter ---------- */
export function Counter({ value, decimals = 0, duration = 1.1 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { duration: duration * 1000, bounce: 0 })
  const [display, setDisplay] = useState('0')
  useEffect(() => { if (inView) mv.set(value) }, [inView, value, mv])
  useEffect(() => spring.on('change', (v) => setDisplay(v.toFixed(decimals))), [spring, decimals])
  return <span ref={ref}>{display}</span>
}

/* ---------- stat card ---------- */
export function StatCard({ icon: Icon, label, value, sub, accent = 'var(--teal-500)', delay = 0, prefix = '', suffix = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: 'easeOut' }}
      className="card"
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 4,
        background: `linear-gradient(90deg, ${accent}, transparent)`,
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <div className="muted" style={{ fontSize: '.82rem', fontWeight: 600, letterSpacing: '.03em' }}>{label}</div>
          <div style={{ fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, marginTop: 4 }}>
            {prefix}{value == null ? '—' : <Counter value={value} />}{suffix}
          </div>
          {sub && <div className="muted" style={{ fontSize: '.82rem', marginTop: 2 }}>{sub}</div>}
        </div>
        {Icon && (
          <div style={{
            width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center',
            background: `color-mix(in srgb, ${accent} 14%, transparent)`, color: accent, flexShrink: 0,
          }}>
            <Icon size={21} strokeWidth={2.1} />
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ---------- risk badge ---------- */
export function RiskBadge({ level, trend }) {
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
      <span className={`badge badge-${level}`}>{level}</span>
      {trend && <span className="muted" style={{ fontSize: '.85rem' }}>
        {({ RISING: '↗', DECLINING: '↘', STABLE: '→', VOLATILE: '↕' }[trend] || '')} {trend.toLowerCase()}
      </span>}
    </span>
  )
}

/* ---------- loading / error / empty states ---------- */
export function LoadingState({ label = 'Loading…' }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: '60px 20px', gap: 12, color: 'var(--text-soft)' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }}>
        <Loader2 size={30} color="var(--teal-500)" />
      </motion.div>
      <div style={{ fontSize: '.92rem' }}>{label}</div>
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: '46px 20px', gap: 12, textAlign: 'center' }}>
      <AlertTriangle size={34} color="var(--moderate)" />
      <div style={{ fontWeight: 600 }}>{message || 'Something went wrong'}</div>
      {onRetry && <button className="btn btn-ghost btn-sm" onClick={onRetry}><RefreshCw size={15} /> Try again</button>}
    </div>
  )
}

export function EmptyState({ icon: Icon = Inbox, title, sub }) {
  return (
    <div className="synora-empty" style={{ display: 'grid', placeItems: 'center', padding: '46px 20px', gap: 8, textAlign: 'center' }}>
      <div style={{
        width: 62, height: 62, borderRadius: 18, display: 'grid', placeItems: 'center',
        background: '#eef1f8', color: 'var(--text-faint)',
      }}><Icon size={27} /></div>
      <div style={{ fontWeight: 700 }}>{title}</div>
      {sub && <div className="muted" style={{ fontSize: '.9rem', maxWidth: 380 }}>{sub}</div>}
    </div>
  )
}

export function SkeletonLoader({ height = 90, count = 3 }) {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card" style={{ height, padding: 0, position: 'relative', overflow: 'hidden' }}>
          <motion.div
            initial={{ x: '-100%' }} animate={{ x: '100%' }}
            transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
            style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(90deg, transparent, rgba(120,140,190,.14), transparent)',
            }} />
        </div>
      ))}
    </div>
  )
}

/* ---------- confirmation modal ---------- */
export function ConfirmModal({ open, title, message, confirmLabel = 'Confirm', danger, onConfirm, onClose }) {
  if (!open) return null
  return (
    <div role="dialog" aria-modal="true" aria-label={title}
      style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'grid', placeItems: 'center', padding: 20 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(6,13,31,.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
        className="card" style={{ maxWidth: 420, width: '100%', position: 'relative', zIndex: 1 }}>
        <h3 style={{ fontSize: '1.15rem', marginBottom: 8 }}>{title}</h3>
        <p className="muted" style={{ fontSize: '.94rem', marginBottom: 20 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-teal'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </motion.div>
    </div>
  )
}

/* ---------- section header ---------- */
export function SectionTitle({ children, right }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '26px 0 14px', gap: 12, flexWrap: 'wrap' }}>
      <h2 style={{ fontSize: '1.12rem', fontWeight: 800, letterSpacing: '-0.01em' }}>{children}</h2>
      {right}
    </div>
  )
}

export { X }
