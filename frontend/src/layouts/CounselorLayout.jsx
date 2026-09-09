import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, FolderOpen, BellRing, HeartPulse, CalendarClock, BookOpen,
  BarChart3, Settings, LogOut, Menu, X, Bell, ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import SynoraBrand from '../components/SynoraBrand'
import ReversiblePulse from '../components/ReversiblePulse'
import { getAlerts, health } from '../api'

const NAV = [
  { to: '/dashboard/counselor', icon: LayoutDashboard, label: 'Overview', roles: ['COUNSELOR', 'CASE_OFFICER', 'ADMIN'] },
  { to: '/dashboard/cases', icon: FolderOpen, label: 'Cases', roles: ['COUNSELOR', 'CASE_OFFICER', 'ADMIN'] },
  { to: '/dashboard/alerts', icon: BellRing, label: 'Alerts', roles: ['COUNSELOR', 'CASE_OFFICER', 'ADMIN'] },
  { to: '/dashboard/followups', icon: CalendarClock, label: 'Follow-ups', roles: ['COUNSELOR', 'CASE_OFFICER', 'ADMIN'] },
  { to: '/dashboard/resources', icon: BookOpen, label: 'Resources', roles: ['COUNSELOR', 'CASE_OFFICER', 'ADMIN'] },
  { to: '/dashboard/reports', icon: BarChart3, label: 'Reports', roles: ['CASE_OFFICER', 'ADMIN'] },
  { to: '/dashboard/admin', icon: Settings, label: 'Administration', roles: ['ADMIN'] },
]

export default function CounselorLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [openAlerts, setOpenAlerts] = useState(false)
  const [alertList, setAlertList] = useState([])
  const [sys, setSys] = useState(null)
  const [mobileNav, setMobileNav] = useState(false)

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const [h, alerts] = await Promise.all([health(), getAlerts()])
        if (!alive) return
        setSys(h)
        setAlertList(alerts.filter((a) => a.status === 'OPEN').slice(0, 5))
      } catch { /* non-fatal */ }
    }
    load()
    const t = setInterval(load, 30000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  const nav = NAV.filter((n) => n.roles.includes(user.role))
  const openCount = alertList.filter((a) => a.status === 'OPEN').length

  return (
    <div className="counselor-shell" style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* sidebar */}
      {mobileNav && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <aside style={{
        width: 'var(--sidebar-w)', flexShrink: 0, position: 'sticky', top: 0, height: '100vh',
        background: 'linear-gradient(180deg, var(--navy-900), var(--navy-800))',
        color: 'var(--text-inverse)', display: 'flex', flexDirection: 'column', padding: '22px 14px',
        zIndex: 40,
      }} className={`synora-sidebar ${mobileNav ? 'is-open' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 10px 22px' }}>
          <SynoraBrand size={38} showWordmark={false} />
          <div>
            <div style={{ fontWeight: 800, letterSpacing: '.02em' }}>EARLY WARNING</div>
          </div>
        </div>

        <nav style={{ display: 'grid', gap: 4 }} aria-label="Dashboard navigation">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} onClick={() => setMobileNav(false)}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 11, padding: '11px 13px',
                borderRadius: 12, fontSize: '.93rem', fontWeight: 600,
                background: isActive ? 'rgba(45,212,191,.14)' : 'transparent',
                color: isActive ? '#5eead4' : '#aeb9d9',
                border: `1px solid ${isActive ? 'rgba(45,212,191,.25)' : 'transparent'}`,
              })}>
              <n.icon size={18} /> {n.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', padding: '14px 10px', borderTop: '1px solid rgba(255,255,255,.08)', display: 'grid', gap: 8 }}>
          {sys && (
            <div style={{ display: 'grid', gap: 6, fontSize: '.76rem', color: '#8fa0c8' }}>
              <ReversiblePulse color="#2dd4bf" label={`AI Engine ${sys.aiProvider?.startsWith('demo') ? '(demo)' : 'online'}`} />
              
              
            </div>
          )}
          <button className="btn btn-sm" onClick={() => { logout(); navigate('/login') }}
            style={{ background: 'rgba(255,255,255,.07)', color: '#dfe6f7', justifyContent: 'flex-start' }}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      {/* main */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header style={{
          position: 'sticky', top: 0, zIndex: 30, display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 26px', background: 'var(--surface-glass)', backdropFilter: 'blur(14px)',
          borderBottom: '1px solid var(--border)',
        }}>
          <button className="btn btn-ghost btn-sm mobile-menu" aria-expanded={mobileNav} aria-label="Toggle menu"
            onClick={() => setMobileNav((v) => !v)}><Menu size={17} /></button>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user.fullName}
            </div>
            <div className="muted" style={{ fontSize: '.8rem' }}>
              {user.role === 'COUNSELOR' ? 'Counselor workspace' : user.role === 'CASE_OFFICER' ? 'Case management workspace' : 'Administrator workspace'}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setOpenAlerts((v) => !v)}
            aria-label={`Notifications, ${openCount} open alerts`} style={{ position: 'relative' }}>
            <Bell size={18} />
            {openCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4, background: 'var(--high)', color: '#fff',
                borderRadius: '50%', fontSize: '.68rem', fontWeight: 800, minWidth: 18, height: 18,
                display: 'grid', placeItems: 'center', padding: '0 4px',
              }}>{openCount}</span>
            )}
          </button>
          <div style={{
            width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center',
            background: 'linear-gradient(135deg, var(--indigo-600), var(--teal-500))',
            color: '#fff', fontWeight: 800, fontSize: '.9rem',
          }} title={user.email}>
            {user.fullName.split(' ').map((w) => w[0]).slice(0, 2).join('')}
          </div>
        </header>

        {/* notification panel */}
        <AnimatePresence>
          {openAlerts && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{
                position: 'absolute', right: 26, top: 66, width: 'min(340px, calc(100vw - 32px))', zIndex: 50,
                background: 'var(--surface)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border)', padding: 16,
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <strong style={{ fontSize: '.95rem' }}>Open alerts</strong>
                <button aria-label="Close notifications" onClick={() => setOpenAlerts(false)}><X size={16} /></button>
              </div>
              {alertList.length === 0 && <p className="muted" style={{ fontSize: '.88rem' }}>No open alerts. All clear.</p>}
              {alertList.map((a) => (
                <div key={a.id} onClick={() => { setOpenAlerts(false); navigate(`/dashboard/cases/${a.caseNumber}`) }}
                  style={{ padding: '10px 8px', borderRadius: 10, cursor: 'pointer', display: 'grid', gap: 2 }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f2f5fb'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <strong style={{ fontSize: '.86rem' }}>{a.caseNumber}</strong>
                    <span className={`badge badge-${a.severity}`}>{a.severity}</span>
                  </div>
                  <span className="muted" style={{ fontSize: '.8rem' }}>{a.title}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <main style={{ flex: 1, padding: '26px', maxWidth: 1360, width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>

        <footer style={{ padding: '14px 26px', borderTop: '1px solid var(--border)' }}>
          <p className="disclaimer" style={{ fontSize: '.76rem', display: 'flex', gap: 8, alignItems: 'center' }}>
            <ShieldCheck size={14} style={{ color: 'var(--teal-500)', flexShrink: 0 }} />
            AI-generated risk indications are screening and decision-support signals only. They are not medical
            diagnoses. Final assessment and intervention decisions remain with qualified professionals.
          </p>
        </footer>
      </div>


    </div>
  )
}
