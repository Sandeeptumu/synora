import { motion } from 'framer-motion'
import { Check, BrainCircuit, AlertTriangle } from 'lucide-react'

const STEPS = [
  'Preprocessing',
  'Text analysis (AI/NLP)',
  'Voice signal analysis',
  'Behavioral signals',
  'Personal baseline',
  'Cross-sensing',
  'Temporal trend',
  'Risk scoring',
  'Explainability',
]

function NeuralNet() {
  const layers = [3, 4, 4, 2]
  const w = 230, h = 150
  const nodes = layers.map((count, li) =>
    Array.from({ length: count }).map((_, i) => ({
      x: 30 + (li * (w - 60)) / (layers.length - 1),
      y: (h / (count + 1)) * (i + 1),
    })))
  return (
    <svg width={w} height={h} aria-hidden="true">
      {nodes.slice(0, -1).map((layer, li) =>
        layer.map((from, fi) =>
          nodes[li + 1].map((to, ti) => (
            <motion.line key={`${li}-${fi}-${ti}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke="#22d3ee" strokeWidth="1" initial={{ opacity: 0.1 }}
              animate={{ opacity: [0.08, 0.55, 0.08] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: (li * 4 + fi + ti) * 0.12 }} />
          ))))}
      {nodes.flat().map((n, i) => (
        <motion.circle key={i} cx={n.x} cy={n.y} r="4.5" fill="#2dd4bf"
          animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.25, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.1 }} />
      ))}
    </svg>
  )
}

/**
 * Full-screen AI processing overlay with progressive step checklist.
 * `step` = number of completed steps (0..STEPS.length).
 * `error` — when set, shows a failure state; caller renders its own Retry.
 */
export default function AIProcessingOverlay({ open, step = 0, done = false, error = '', disclaimer = true }) {
  if (!open) return null
  return (
    <div role="alertdialog" aria-modal="true" aria-label="AI analysis in progress"
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center', padding: 20 }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(6,13,31,.78)', backdropFilter: 'blur(8px)' }} />
      <motion.div initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }}
        className="card-glass" style={{ position: 'relative', zIndex: 1, maxWidth: 480, width: '100%', padding: 30,
          background: 'rgba(10,17,40,.72)', border: '1px solid rgba(102,232,249,.2)', color: 'var(--text-inverse)' }}>
        <div style={{ display: 'grid', placeItems: 'center', gap: 6, marginBottom: 8 }}>
          <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2, repeat: Infinity }}
            style={{ filter: 'drop-shadow(0 0 14px rgba(45,212,191,.8))' }}>
            <BrainCircuit size={34} color="#5eead4" />
          </motion.div>
          {error ? (
            <>
              <AlertTriangle size={30} color="#fbbf24" style={{ margin: '0 auto 4px' }} />
              <h3 style={{ fontSize: '1.15rem', letterSpacing: '-0.01em' }}>
                Analysis could not be completed
              </h3>
              <p style={{ fontSize: '.84rem', color: '#9fb0d8' }}>
                Check the backend connection and try again.
              </p>
            </>
          ) : (
            <>
              <h3 style={{ fontSize: '1.15rem', letterSpacing: '-0.01em' }}>
                {done ? 'Analysis complete' : 'Synora is analyzing permitted signals'}
              </h3>
              <p style={{ fontSize: '.84rem', color: '#9fb0d8' }}>
                {done ? 'Review the explainable results below.' : 'Running the cross-sensing pipeline…'}
              </p>
            </>
          )}
        </div>

        {!error && (
        <div style={{ display: 'grid', placeItems: 'center', margin: '10px 0 18px' }}>
          <NeuralNet />
        </div>
        )}

        <div style={{ display: 'grid', gap: 7 }}>
          {STEPS.map((s, i) => {
            const complete = !error && i < step
            const active = !error && i === step && !done
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '.9rem',
                color: complete ? '#a5f3fc' : active ? '#fff' : '#5c6c94' }}>
                <span style={{
                  width: 20, height: 20, borderRadius: '50%', display: 'grid', placeItems: 'center',
                  background: complete ? 'rgba(45,212,191,.25)' : active ? 'rgba(103,232,249,.18)' : 'rgba(255,255,255,.06)',
                  border: `1.5px solid ${complete ? '#2dd4bf' : active ? '#67e8f9' : 'rgba(255,255,255,.14)'}`,
                  flexShrink: 0,
                }}>
                  {complete ? <Check size={12} color="#5eead4" strokeWidth={3.5} />
                    : active && <motion.span animate={{ scale: [0.6, 1, 0.6] }} transition={{ repeat: Infinity, duration: 1 }}
                      style={{ width: 7, height: 7, borderRadius: '50%', background: '#67e8f9', display: 'block' }} />}
                </span>
                {s}
              </div>
            )
          })}
        </div>

        {disclaimer && (
          <p style={{ marginTop: 18, fontSize: '.74rem', color: '#7c8db5', textAlign: 'center' }}>
            AI-Assisted Risk Indication — Not a Medical Diagnosis
          </p>
        )}
      </motion.div>
    </div>
  )
}

export { STEPS as AI_PIPELINE_STEPS }
