import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Users, Globe, Star, CheckCircle2, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getTriage, getExperts, getUsers, apiMessage } from '../../api'
import { useAuth } from '../../context/AuthContext'
import { LoadingState, ErrorState, EmptyState, SectionTitle, ConfirmModal } from '../../components/ui'
import { riskColor } from '../../utils/format'
import { useState as reactUseState } from 'react'

export default function ExpertRecommendation() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [triage, setTriage] = useState(null)
  const [experts, setExperts] = useState([])
  const [allStaff, setAllStaff] = useState([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = reactUseState(null)
  const [confirmStart, setConfirmStart] = reactUseState(false)

  useEffect(() => {
    (async () => {
      try {
        const [t, e, s] = await Promise.all([
          getTriage(),
          getExperts(12),
          getUsers(),
        ])
        setTriage(t)
        setExperts(e)
        setAllStaff(s)
        setLoading(false)
      } catch (e) {
        setErr(apiMessage(e))
        setLoading(false)
      }
    })()
  }, [])

  const startCase = async () => {
    setConfirmStart(false)
    if (!selected) return
    const body = { victimUserId: user.id, title: `Support request — ${triage?.primaryConcern || 'wellbeing'}` }
    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('synora_token')}` },
        body: JSON.stringify(body),
      }).then(r => r.json())
      navigate(`/dashboard/cases/${res.caseNumber}`)
    } catch (e) {
      setErr(apiMessage(e))
    }
  }

  const riskLevel = triage?.riskLevel
  const riskLabel = riskLevel === 'CRITICAL' ? 'Critical concern'
    : riskLevel === 'HIGH' ? 'High concern'
    : riskLevel === 'MODERATE' ? 'Moderate concern'
    : 'Low concern'

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}><ArrowLeft size={15}/> Back</button>
        <h1 style={{ fontSize: '1.4rem', letterSpacing: '-0.02em', margin: 0 }}>Recommended for you</h1>
      </div>

      <p className="muted" style={{ fontSize: '.92rem', margin: 0 }}>
        Based on your recent check-in and conversation, speaking with a professional may be helpful.
      </p>

      {err && <p className="form-error" role="alert">{err}</p>}

      {triage && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ borderLeft: '4px solid ' + riskColor(riskLevel) }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
            <Users size={18} color={riskColor(riskLevel)}/>
            <div>
              <div style={{ fontWeight: 700, fontSize: '.94rem' }}>{riskLabel}</div>
              <div className="muted" style={{ fontSize: '.8rem' }}>
                {triage.concernAreas?.length ? 'Concerns identified: ' + triage.concernAreas.join(', ') : 'Assessing your recent activity'}
              </div>
            </div>
          </div>
          <p style={{ fontSize: '.92rem', color: 'var(--text-soft)', margin: 0 }}>{triage.suggestedSupport}</p>
        </motion.div>
      )}

      <SectionTitle right={<a className="text-link-inline" href="#" style={{ color: 'var(--teal-500)', fontWeight: 700, fontSize: '.85rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} onClick={() => alert('View other suitable experts coming soon')}>View other suitable experts</a>}>
        Recommended for you
      </SectionTitle>

      {loading ? <LoadingState label="Finding suitable professionals…"/> : experts.length === 0 ? <EmptyState title="No experts available" sub="No suitable professionals are currently listed." /> : (
        <div style={{ display: 'grid', gap: 12 }}>
          {experts.map((expert, i) => (
            <motion.div
              key={expert.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card"
              style={{ display: 'grid', gap: 12, padding: 18 }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{
                  width: 46, height: 46, borderRadius: '50%',
                  display: 'grid', placeItems: 'center',
                  background: 'linear-gradient(135deg, var(--indigo-600), var(--teal-500))',
                  color: '#fff', fontWeight: 800, fontSize: '.95rem', flexShrink: 0,
                }}>
                  {expert.fullName.split(' ').map(w => w[0]).slice(0,2).join('')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '.95rem' }}>{expert.fullName}</div>
                      <div className="muted" style={{ fontSize: '.8rem' }}>{expert.role} · {expert.organization || '—'}</div>
                    </div>
                    <span className="badge badge-neutral" style={{ fontSize: '.72rem' }}>Match {expert.score ?? '—'}%</span>
                  </div>
                  <div className="muted" style={{ fontSize: '.8rem', marginTop: 2 }}>{expert.suggestedSupport || triage?.suggestedSupport}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                    {expert.specialisations?.length ? expert.specialisations.map(s => (
                      <span key={s} className="badge badge-neutral" style={{ fontSize: '.72rem' }}>{s}</span>
                    )) : ''}
                    <span className="badge badge-neutral" style={{ fontSize: '.72rem', marginLeft: 'auto' }}>
                      <Globe size={11}/> {expert.languages?.join(', ') || expert.primaryLanguage || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {expert.matchReason && (
                <p className="muted" style={{ fontSize: '.84rem', margin: 0, padding: '8px 12px', background: 'var(--bg-soft)', borderRadius: 8 }}>
                  {expert.matchReason}
                </p>
              )}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <ConfirmModal
                  open={!!selected && selected.id === expert.id}
                  title="Request support from this professional?"
                  message={`Start a support case with ${expert.fullName}? This will use the existing Synora case workflow.`}
                  confirmLabel="Start support case"
                  onConfirm={startCase}
                  onClose={() => setSelected(null)}
                />
                <button className="btn btn-teal" onClick={() => setSelected(expert)}>
                  <CheckCircle2 size={15}/> Request support
                </button>
                <button className="btn btn-ghost" onClick={() => window.open(`/dashboard/cases?expert=${expert.id}`, '_self')}>
                  View profile
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
