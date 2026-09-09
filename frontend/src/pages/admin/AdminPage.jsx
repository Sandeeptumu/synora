import StaffSetup from '../../components/StaffSetup'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Server, Cpu, Database, ShieldCheck, BellRing, Users, ScrollText, Settings2,
  Building2, Power, CheckCircle2, AlertTriangle, Globe, Tag,
} from 'lucide-react'
import {
  getSystemHealth, getAdminConfig, getAuditLogs, getUsers, patchUser, patchMySpecialisations, patchMyLanguages,
  getOrganizations, apiMessage,
} from '../../api'
import { useAuth } from '../../context/AuthContext'
import { LoadingState, ErrorState, SectionTitle, ConfirmModal } from '../../components/ui'
import { timeAgo, titleize } from '../../utils/format'

const TABS = ['System', 'Users', 'Audit Logs', 'Configuration', 'Organizations']
const SERVICE_ICONS = { 'Backend API': Server, 'AI Engine': Cpu, PostgreSQL: Database, Authentication: ShieldCheck, 'Alert Service': BellRing }

export default function AdminPage() {
  const { user: me } = useAuth()
  const [tab, setTab] = useState('System')
  const [health, setHealth] = useState(null)
  const [config, setConfig] = useState(null)
  const [logs, setLogs] = useState(null)
  const [users, setUsers] = useState(null)
  const [orgs, setOrgs] = useState(null)
  const [err, setErr] = useState('')
  const [confirmUser, setConfirmUser] = useState(null)
  const [expertSpec, setExpertSpec] = useState('')
  const [expertLang, setExpertLang] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const [h, cfg, lg, us, or] = await Promise.all([
          getSystemHealth(), getAdminConfig(),
          getAuditLogs('size=60'), getUsers(), getOrganizations(),
        ])
        setHealth(h); setConfig(cfg); setLogs(lg.content || []); setUsers(us); setOrgs(or)
        if (us && me) {
          const meUser = us.find((u) => u.id === me.id)
          if (meUser) {
            setExpertSpec((meUser.specialisations || []).join(', '))
            setExpertLang((meUser.languages || []).join(', '))
          }
        }
      } catch (e) { setErr(apiMessage(e)) }
    })()
  }, [])

  const toggleUser = async (u) => {
    setConfirmUser(null)
    try {
      await patchUser(u.id, { active: !u.active })
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, active: !x.active } : x)))
    } catch (e) { setErr(apiMessage(e)) }
  }

  if (err && !health) return <ErrorState message={err} onRetry={() => window.location.reload()} />
  if (!health) return <LoadingState label="Checking systems…" />

  return (
    <div>
      <SectionTitle>Administration</SectionTitle>
      <StaffSetup onUpdated={() => getUsers().then(setUsers)} />
      {['COUNSELOR','CASE_OFFICER'].includes(me.role) && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
            <Tag size={19} color="var(--teal-500)"/>
            <strong style={{ fontSize: '1.02rem' }}>Your professional profile</strong>
          </div>
          <p className="muted" style={{ fontSize: '.88rem', marginBottom: 14 }}>
            Add your specialisations and languages so the system can recommend you appropriately.
          </p>
          <div style={{ display: 'grid', gap: 12 }}>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Specialisations (comma separated)</span>
              <input
                className="field input"
                value={expertSpec}
                onChange={(e) => setExpertSpec(e.target.value)}
                placeholder="e.g. Anxiety, Trauma, Academic wellbeing"
              />
            </label>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Languages supported (comma separated, lowercase codes)</span>
              <input
                className="field input"
                value={expertLang}
                onChange={(e) => setExpertLang(e.target.value)}
                placeholder="e.g. en, te, hi"
              />
            </label>
            <button
              className="btn btn-teal"
              disabled={busy}
              onClick={() => {
                setBusy(true)
                const run = async () => {
                  try {
                    const specs = expertSpec.split(',').map(s => s.trim()).filter(Boolean)
                    await patchMySpecialisations({ specialisations: specs })
                    const langs = expertLang.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
                    await patchMyLanguages({ languageCodes: langs, primaryLanguage: '' })
                    await getUsers().then(setUsers)
                    setSaved(true)
                    setTimeout(() => setSaved(false), 2500)
                  } finally {
                    setBusy(false)
                  }
                }
                run()
              }}
            >
              {busy ? 'Saving…' : <><Globe size={15}/> Save profile</>}
            </button>
            {saved && <p style={{ color: 'var(--low)', fontWeight: 700, fontSize: '.86rem', marginTop: 8 }}>Profile updated ✔</p>}
          </div>
        </motion.div>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }} role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            style={{ padding: '9px 16px', borderRadius: 12, border: '1.5px solid',
              borderColor: tab === t ? 'var(--teal-500)' : 'var(--border-strong)',
              background: tab === t ? 'rgba(20,184,166,.1)' : '#fff',
              color: tab === t ? 'var(--teal-500)' : 'var(--text-soft)', fontWeight: 700, fontSize: '.86rem' }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'System' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          {health.services.map((s, i) => {
            const Icon = SERVICE_ICONS[s.name] || Server
            const ok = ['OPERATIONAL', 'CONNECTED'].includes(s.status)
            return (
              <motion.div key={s.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }} className="card" style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, display: 'grid', placeItems: 'center',
                      background: ok ? 'var(--low-soft)' : 'var(--moderate-soft)', color: ok ? 'var(--low)' : 'var(--moderate)' }}>
                      <Icon size={19} />
                    </div>
                    <strong style={{ fontSize: '.98rem' }}>{s.name}</strong>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '.8rem',
                    fontWeight: 700, color: ok ? 'var(--low)' : 'var(--moderate)' }}>
                    {ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />} {s.status}
                  </span>
                </div>
                <p className="muted" style={{ fontSize: '.8rem' }}>{s.detail}</p>
              </motion.div>
            )
          })}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="card" style={{ gridColumn: '1 / -1' }}>
            <p className="disclaimer" style={{ margin: 0 }}>
              AI provider: <strong>{health.aiProvider}</strong> · Ollama online: {health.ollamaOnline ? 'yes' : 'no (deterministic demo fallback active)'} ·
              Checked {timeAgo(health.checkedAt)}
            </p>
          </motion.div>
        </div>
      )}

      {tab === 'Users' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Email', 'Role', 'Organization', 'Status', ''].map((h) => (
                  <th key={h} className="muted" style={{ padding: '13px 16px', fontSize: '.76rem', letterSpacing: '.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(users || []).slice(0, 60).map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{u.fullName}</td>
                  <td className="muted" style={{ padding: '12px 16px', fontSize: '.84rem' }}>{u.email || u.phone || '—'}</td>
                  <td style={{ padding: '12px 16px' }}><span className="badge badge-neutral">{u.role}</span></td>
                  <td className="muted" style={{ padding: '12px 16px', fontSize: '.84rem' }}>{u.organization || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className={`badge ${u.active ? 'badge-resolved' : 'badge-HIGH'}`}>{u.active ? 'Active' : 'Disabled'}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {u.id !== me.id && (
                      <button className="btn btn-ghost btn-sm" onClick={() => setConfirmUser(u)}>
                        <Power size={13} /> {u.active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {tab === 'Audit Logs' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                {['Time', 'Action', 'Resource', 'Actor', 'Details'].map((h) => (
                  <th key={h} className="muted" style={{ padding: '13px 16px', fontSize: '.76rem', letterSpacing: '.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(logs || []).map((l) => (
                <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="muted" style={{ padding: '11px 16px', fontSize: '.8rem', whiteSpace: 'nowrap' }}>{timeAgo(l.createdAt)}</td>
                  <td style={{ padding: '11px 16px' }}><span className="badge badge-neutral">{l.action}</span></td>
                  <td className="muted" style={{ padding: '11px 16px', fontSize: '.82rem' }}>{l.resourceType || '—'}</td>
                  <td className="muted" style={{ padding: '11px 16px', fontSize: '.82rem' }}>{l.actor}</td>
                  <td className="muted" style={{ padding: '11px 16px', fontSize: '.8rem' }}>{l.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {tab === 'Configuration' && config && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 16 }}>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card">
            <h3 style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
              <Settings2 size={17} /> Risk thresholds
            </h3>
            {[['Moderate ≥', config.thresholds.moderate], ['High ≥', config.thresholds.high],
              ['Critical ≥', config.thresholds.critical], ['Alert threshold ≥', config.thresholds.alertThreshold]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0',
                borderBottom: '1px solid var(--border)', fontSize: '.9rem' }}>
                <span className="muted">{k}</span><strong className="mono">{v}</strong>
              </div>
            ))}
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="card">
            <h3 style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
              <Cpu size={17} /> Scoring weights
            </h3>
            {Object.entries(config.weights).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0',
                borderBottom: '1px solid var(--border)', fontSize: '.9rem' }}>
                <span className="muted" style={{ textTransform: 'capitalize' }}>{titleize(k)}</span>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', width: 130 }}>
                  <div style={{ flex: 1, height: 7, borderRadius: 4, background: '#edf0f7' }}>
                    <div style={{ width: `${v * 250}%`, maxWidth: '100%', height: '100%', borderRadius: 4,
                      background: 'linear-gradient(90deg, var(--indigo-500), var(--cyan-400))' }} />
                  </div>
                  <strong className="mono" style={{ fontSize: '.8rem' }}>{v}</strong>
                </div>
              </div>
            ))}
            <p className="disclaimer" style={{ marginTop: 12 }}>{config.note}</p>
          </motion.div>
        </div>
      )}

      {tab === 'Organizations' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 14 }}>
          {(orgs || []).map((o, i) => (
            <motion.div key={o.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }} className="card" style={{ display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, display: 'grid', placeItems: 'center',
                  background: 'var(--bg-soft)', color: 'var(--indigo-500)' }}><Building2 size={18} /></div>
                <strong>{o.name}</strong>
              </div>
              <div className="muted" style={{ fontSize: '.84rem' }}>{o.members} team members</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {o.roles.map((r) => <span key={r} className="badge badge-neutral">{r}</span>)}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <ConfirmModal open={!!confirmUser} danger
        title={`${confirmUser?.active ? 'Deactivate' : 'Activate'} ${confirmUser?.fullName}?`}
        message={confirmUser?.active
          ? 'This user will no longer be able to sign in. Their data and case history are preserved.'
          : 'This user will be able to sign in again.'}
        confirmLabel={confirmUser?.active ? 'Deactivate' : 'Activate'}
        onConfirm={() => toggleUser(confirmUser)}
        onClose={() => setConfirmUser(null)} />
    </div>
  )
}
