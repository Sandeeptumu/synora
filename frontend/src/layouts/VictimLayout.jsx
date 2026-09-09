import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Home, MessageSquareHeart, History, LifeBuoy, UserRound, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import SynoraBrand from '../components/SynoraBrand'

const TABS = [
  { to: '/app/home', icon: Home, label: 'Home' },
  { to: '/app/check-in/today', icon: MessageSquareHeart, label: 'Check-in' },
  { to: '/app/history', icon: History, label: 'History' },
  { to: '/ai-support', icon: Sparkles, label: 'AI' },
  { to: '/app/profile', icon: UserRound, label: 'Profile' },
]

export default function VictimLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="personal-shell" style={{
      minHeight: '100vh', maxWidth: 1200, margin: '0 auto', background: 'var(--synora-bg)',
      display: 'flex', flexDirection: 'column', position: 'relative',
      padding: '0 20px',
    }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 30, display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 20px', background: 'var(--synora-surface)',
        borderRadius: '50px', border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: 24,
      }}>
        <SynoraBrand size={36} />
        <div style={{ flex: 1, fontSize: '0.85rem', color: 'var(--synora-muted)', fontWeight: 400 }}>
          Your space to be you.
        </div>
        <button onClick={() => { logout(); navigate('/login') }}
          style={{
            background: 'var(--synora-surface)',
            color: 'var(--synora-text)',
            border: '1.5px solid var(--border-strong)',
            borderRadius: 'var(--radius-button)',
            padding: '8px 16px',
            fontSize: '.85rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--synora-green)'; e.currentTarget.style.color = 'var(--synora-green)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--synora-text)' }}
        >
          Sign out
        </button>
      </header>

      <main style={{ flex: 1, padding: '0 0 100px' }}>
        <Outlet />
      </main>

      <nav aria-label="Main navigation" style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%',
        maxWidth: 1120, zIndex: 40, display: 'flex', justifyContent: 'space-around',
        background: 'var(--synora-surface)',
        borderTop: '1px solid var(--border)',
        borderRadius: '50px 50px 0 0',
        padding: '8px 6px calc(10px + env(safe-area-inset-bottom))',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) => `personal-tab ${isActive ? 'active' : ''}`}
            style={{ padding: '8px 12px', borderRadius: 12 }}
          >
            <t.icon size={22} />
            <span style={{ fontSize: '0.7rem', marginTop: 2 }}>{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
