import { Sparkles } from 'lucide-react'

import LOGO from "../assets/logo/SynoraLogo.png";
<img src={LOGO} alt="Synora" />

export default function SynoraBrand({ size = 38, showWordmark = true, className }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, className }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <img
          src={LOGO}
          alt="Synora"
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'contain', display: 'block',
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            e.currentTarget.nextElementSibling.style.display = 'grid'
          }}
        />
        <div
          style={{
            position: 'absolute', inset: 0, display: 'none', placeItems: 'center',
            background: 'linear-gradient(135deg, var(--teal-500), var(--cyan-400))',
            boxShadow: 'var(--shadow-glow-teal)',
          }}
        >
          <Sparkles size={Math.round(size * 0.5)} color="#04252b" />
        </div>
      </div>
      {showWordmark && (
        <div>
          <div style={{ fontWeight: 800, letterSpacing: '.02em', fontSize: size > 42 ? '1.15rem' : '1rem' }}>
            Synora
          </div>
        </div>
      )}
    </div>
  )
}
