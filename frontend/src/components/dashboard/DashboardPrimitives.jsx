import { Link } from 'react-router-dom'
import { ArrowUpRight, ArrowRight, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

export function DashboardCard({ children, className = '', id, ...props }) {
  return (
    <motion.section
      id={id}
      className={`home-card ${className}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: 'var(--synora-surface)',
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        padding: 'clamp(20px, 4vw, 32px)',
      }}
      {...props}
    >
      {children}
    </motion.section>
  )
}

export function ActionLink({ to, children, secondary = false, blue = false, green = false, ...props }) {
  return (
    <Link
      to={to}
      className={`home-action ${secondary ? 'home-action-secondary' : ''} ${blue ? 'home-action-blue' : ''} ${green ? 'home-action-green' : ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 24px',
        borderRadius: 'var(--radius-button)',
        fontWeight: 500,
        fontSize: '0.95rem',
        textDecoration: 'none',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        ...(blue
          ? { background: 'var(--synora-blue)', color: '#fff' }
          : green
          ? { background: 'var(--synora-green)', color: '#2c2e2a' }
          : secondary
          ? { background: 'transparent', color: 'var(--synora-muted)', border: '1.5px solid var(--border-strong)' }
          : { background: 'var(--synora-green)', color: '#2c2e2a' }),
      }}
      {...props}
    >
      <span>{children}</span>
      {secondary ? <ArrowUpRight size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
    </Link>
  )
}

export function SectionStatus({ state, name, children }) {
  if (state.loading) {
    return (
      <div
        className="home-placeholder"
        role="status"
        aria-label={`Loading ${name}`}
        style={{ display: 'flex', gap: 8, padding: '12px 0' }}
      >
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--border-strong)' }} />
        <span style={{ width: 14, height: 10, borderRadius: '50%', background: 'var(--border-strong)' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--border-strong)' }} />
      </div>
    )
  }
  if (state.error) {
    return (
      <div
        className="home-section-error"
        role="status"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          padding: '12px 16px',
          background: 'var(--synora-surface-secondary)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.9rem',
          color: 'var(--synora-muted)',
        }}
      >
        <AlertCircle size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0 }}>
            {name} {name.endsWith('s') ? 'are' : 'is'} temporarily unavailable.
          </p>
          <button
            type="button"
            className="home-text-button"
            onClick={state.retry}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--synora-green)',
              fontWeight: 500,
              cursor: 'pointer',
              padding: 0,
              fontSize: 'inherit',
            }}
          >
            Try again
          </button>
        </div>
      </div>
    )
  }
  return children
}
