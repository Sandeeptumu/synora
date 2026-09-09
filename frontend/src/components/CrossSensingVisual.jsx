import { motion } from 'framer-motion'
import { FileText, Mic, Activity, UserRound, TrendingUp, BrainCircuit } from 'lucide-react'

/**
 * Signature visual: animated cross-sensing signal map.
 * Signals flow into the AI engine; particles travel along the paths.
 */
export default function CrossSensingVisual({
  scores = {},             // { text, voice, behavior, baseline, trend }
  size = 460,
  onSelect,                // (nodeKey) => void
  compact = false,
}) {
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.36
  const nodes = [
    { key: 'text', label: 'TEXT', icon: FileText, angle: -90, color: '#38bdf8' },
    { key: 'voice', label: 'VOICE', icon: Mic, angle: -18, color: '#a78bfa' },
    { key: 'behavior', label: 'BEHAVIOR', icon: Activity, angle: 54, color: '#f59e0b' },
    { key: 'baseline', label: 'BASELINE', icon: UserRound, angle: 126, color: '#34d399' },
    { key: 'trend', label: 'TREND', icon: TrendingUp, angle: 198, color: '#fb7185' },
  ]
  const scoreOf = (k) => {
    const v = scores[k]
    return typeof v === 'number' ? Math.round(v * 100) : null
  }

  const nodePos = nodes.map((n) => ({
    ...n,
    x: cx + r * Math.cos((n.angle * Math.PI) / 180),
    y: cy + r * Math.sin((n.angle * Math.PI) / 180),
  }))

  return (
    <div style={{ width: '100%', maxWidth: size, margin: '0 auto', position: 'relative' }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', height: 'auto' }} role="img"
        aria-label="Cross-sensing AI signal map">
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#3d4f8f" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#101a3a" stopOpacity="0.9" />
          </radialGradient>
          <linearGradient id="pathGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#3d4f8f" stopOpacity="0.7" />
          </linearGradient>
        </defs>

        {/* paths + flowing particles */}
        {nodePos.map((n) => {
          const mx = (cx + n.x) / 2 + (n.y - cy) * 0.12
          const my = (cy + n.y) / 2 - (n.x - cx) * 0.12
          const d = `M ${n.x} ${n.y} Q ${mx} ${my} ${cx} ${cy}`
          return (
            <g key={n.key}>
              <path d={d} fill="none" stroke="url(#pathGrad)" strokeWidth="2" strokeDasharray="4 6" opacity="0.6" />
              <motion.circle r="3.4" fill={n.color}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 0], offsetDistance: ['0%', '0%', '100%', '100%'] }}
                transition={{ duration: 2.6, repeat: Infinity, delay: Math.random() * 2, ease: 'linear' }}
                style={{ offsetPath: `path('${d}')` }} />
            </g>
          )
        })}

        {/* signal nodes */}
        {nodePos.map((n, i) => {
          const score = scoreOf(n.key)
          const Icon = n.icon
          return (
            <motion.g
              key={n.key}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.12, type: 'spring', stiffness: 200, damping: 16 }}
              style={{ cursor: onSelect ? 'pointer' : 'default' }}
              onClick={() => onSelect?.(n.key)}
              tabIndex={onSelect ? 0 : undefined}
              role={onSelect ? 'button' : undefined}
              aria-label={`${n.label} signal${score !== null ? `, score ${score}%` : ''}`}
            >
              <circle cx={n.x} cy={n.y} r="34" fill="#ffffff" stroke={n.color} strokeWidth="2.4"
                opacity="0.98" />
              <circle cx={n.x} cy={n.y} r="34" fill="none" stroke={n.color} strokeWidth="1.4" opacity="0.35">
                <animate attributeName="r" values="34;39;34" dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.35;0.12;0.35" dur="3s" repeatCount="indefinite" />
              </circle>
              <text x={n.x} y={n.y - 9} textAnchor="middle" fontSize="11" fontWeight="800" fill="#101a3a">
                {n.label}
              </text>
              <text x={n.x} y={n.y + 7} textAnchor="middle" fontSize="10" fontWeight="600"
                fill={score !== null ? n.color : '#7c89a8'}>
                {score !== null ? `${score}%` : '—'}
              </text>
            </motion.g>
          )
        })}

        {/* AI core */}
        <motion.g
          initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, type: 'spring', stiffness: 160, damping: 14 }}>
          <circle cx={cx} cy={cy} r="52" fill="url(#coreGlow)" />
          <motion.circle cx={cx} cy={cy} r="52" fill="none" stroke="#2dd4bf" strokeWidth="2"
            animate={{ r: [52, 60, 52], opacity: [0.6, 0.15, 0.6] }}
            transition={{ duration: 2.6, repeat: Infinity }} />
          <text x={cx} y={cy - 8} textAnchor="middle" fontSize="12" fontWeight="800" fill="#ffffff">CROSS-</text>
          <text x={cx} y={cy + 7} textAnchor="middle" fontSize="12" fontWeight="800" fill="#ffffff">SENSING</text>
          <text x={cx} y={cy + 22} textAnchor="middle" fontSize="9" fontWeight="600" fill="#a5f3fc">AI ENGINE</text>
        </motion.g>
      </svg>

      {!compact && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 6 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-faint)', fontSize: '.8rem' }}>
            <BrainCircuit size={15} style={{ color: 'var(--teal-500)' }} />
            Signals flow into the engine — click a node to inspect its analysis
          </div>
        </div>
      )}
    </div>
  )
}
