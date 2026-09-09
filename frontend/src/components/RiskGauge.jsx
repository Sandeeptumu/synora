import { motion } from 'framer-motion'

/**
 * Circular risk gauge — animated radial progress with level coloring.
 */
export default function RiskGauge({ score = 0, level = 'LOW', size = 190, label = 'AI-Assisted Risk Indication' }) {
  const stroke = 13
  const r = (size - stroke * 2) / 2 - 8
  const circumference = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, score))
  const color = { LOW: 'var(--low)', MODERATE: 'var(--moderate)', HIGH: 'var(--high)', CRITICAL: 'var(--critical)' }[level]

  return (
    <div style={{ display: 'grid', placeItems: 'center', gap: 8 }}>
      <svg width={size} height={size} role="img" aria-label={`Risk score ${Math.round(pct * 100)} percent, ${level}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8ecf5" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct) }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r - 14} fill="none"
          stroke={color} strokeWidth="1.5" opacity="0.35"
          animate={{ r: [r - 14, r - 10, r - 14], opacity: [0.35, 0.12, 0.35] }}
          transition={{ duration: 2.8, repeat: Infinity }}
        />
        <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.17} fontWeight="800" fill="#101a3a">
          {Math.round(pct * 100)}%
        </text>
        <text x="50%" y="63%" textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.075} fontWeight="800" letterSpacing="2" fill={color}>
          {level}
        </text>
      </svg>
      <div className="disclaimer" style={{ maxWidth: 280, textAlign: 'left' }}>
        <strong>{label}</strong> — Not a Medical Diagnosis
      </div>
    </div>
  )
}
