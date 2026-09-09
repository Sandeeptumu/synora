import { motion } from 'framer-motion'

export default function ReversiblePulse({ color = 'var(--low)', label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <span style={{ position: 'relative', width: 10, height: 10, display: 'inline-block' }}>
        <motion.span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: color }}
          animate={{ scale: [1, 1.9], opacity: [0.7, 0] }} transition={{ duration: 1.8, repeat: Infinity }} />
        <span style={{ position: 'absolute', inset: 1.5, borderRadius: '50%', background: color, display: 'block' }} />
      </span>
      {label && <span style={{ fontSize: '.84rem', fontWeight: 600 }}>{label}</span>}
    </span>
  )
}
