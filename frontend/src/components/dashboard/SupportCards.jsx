import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, HeartHandshake, Languages, Check, CalendarDays, ShieldCheck } from 'lucide-react'
import { requestSupportCase, apiMessage } from '../../api'
import { ConfirmModal } from '../ui'
import { DashboardCard, SectionStatus, ActionLink } from './DashboardPrimitives'
import { records, strings, initials, label, languageName, formatDate, activeCase } from './dashboardModel'

export function SupportRequestButton({ onRequested }) {
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function request() {
    if (busy) return
    setConfirm(false)
    setBusy(true)
    setMessage('')
    try {
      const result = await requestSupportCase()
      if (!result?.caseNumber) throw new Error('The support request could not be confirmed. Please try again.')
      setMessage(`Your support case ${result.caseNumber} is open. Your team will confirm the counselor assignment.`)
      onRequested?.()
    } catch (e) {
      setMessage(apiMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirm(true)}
        disabled={busy}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 24px',
          borderRadius: 'var(--radius-button)',
          background: busy ? 'var(--synora-muted)' : 'var(--synora-green)',
          color: '#2c2e2a',
          border: 'none',
          fontWeight: 500,
          fontSize: '0.95rem',
          cursor: busy ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        <span>{busy ? 'Opening your case…' : 'Request support'}</span>
        <ArrowRight size={18} aria-hidden="true" />
      </button>
      {message && (
        <p
          role="status"
          style={{
            marginTop: 12,
            padding: '12px 16px',
            background: 'var(--synora-surface-secondary)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.9rem',
            color: 'var(--synora-text)',
          }}
        >
          {message}
        </p>
      )}
      <ConfirmModal
        open={confirm}
        title="Open your support case?"
        message="Your support team will review your case and confirm a counselor assignment. This opens or reuses your personal case; it does not book a specific professional."
        confirmLabel="Open support case"
        onConfirm={request}
        onClose={() => setConfirm(false)}
      />
    </>
  )
}

export function ExpertDetails({ expert, preferredLanguages = [] }) {
  const langs = strings(expert.languages)
  const preferred = strings(preferredLanguages)
  const common = langs.filter(code => preferred.some(p => p.toLowerCase() === code.toLowerCase()))
  const specialisations = strings(expert.specialisations)

  if (!specialisations.length && typeof expert.specialisation === 'string' && expert.specialisation.trim()) {
    specialisations.push(expert.specialisation)
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
        <span
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            background: 'linear-gradient(135deg, var(--synora-green), var(--synora-yellow))',
            color: '#2c2e2a',
            fontWeight: 600,
            fontSize: '1.1rem',
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          {initials(expert.fullName)}
        </span>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>
            {expert.fullName || 'Support professional'}
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--synora-muted)' }}>
            {expert.role === 'COUNSELOR' ? 'Counselor' : label(expert.role) || 'Support professional'}
            {expert.organization ? ` · ${expert.organization}` : ''}
          </p>
        </div>
      </div>

      {!!specialisations.length && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {specialisations.map(s => (
            <span
              key={s}
              style={{
                padding: '6px 12px',
                borderRadius: '12px',
                background: 'var(--synora-surface-secondary)',
                fontSize: '0.82rem',
                color: 'var(--synora-text)',
                fontWeight: 500,
              }}
            >
              {label(s)}
            </span>
          ))}
        </div>
      )}

      {!!langs.length && (
        <p style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: '0.9rem', color: 'var(--synora-muted)' }}>
          <Languages size={16} aria-hidden="true" style={{ color: 'var(--synora-blue)' }} />
          {langs.map(languageName).join(' · ')}
        </p>
      )}

      {!!common.length && (
        <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', color: 'var(--synora-green)', marginBottom: 14 }}>
          <Check size={15} aria-hidden="true" />
          Speaks your preferred {common.length > 1 ? 'languages' : 'language'}
        </p>
      )}

      {typeof expert.matchReason === 'string' && expert.matchReason && (
        <div style={{ padding: '14px 16px', background: 'var(--synora-bg)', borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
          <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', color: 'var(--synora-muted)', marginBottom: 4 }}>
            Why this match?
          </span>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--synora-text)' }}>{expert.matchReason}</p>
        </div>
      )}

      <details style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
        <summary style={{ cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500, color: 'var(--synora-text)', listStyle: 'none' }}>
          View profile
        </summary>
        <div style={{ marginTop: 12, fontSize: '0.88rem', color: 'var(--synora-muted)' }}>
          <p>
            {expert.fullName || 'This professional'} is listed as a
            {' '}{label(expert.role).toLowerCase() || 'support professional'}
            {expert.organization ? ` at ${expert.organization}` : ''}.
          </p>
          {expert.primaryLanguage && (
            <p>Primary language: {languageName(expert.primaryLanguage)}</p>
          )}
          <p>Availability and appointment details are confirmed by your support team.</p>
        </div>
      </details>
    </>
  )
}

export function RecommendedExpertCard({ experts, profile, onRequested }) {
  const best = records(experts.data).find(e => e.active !== false)

  return (
    <DashboardCard aria-labelledby="recommended-heading">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--synora-coral)' }}>
          <HeartHandshake size={18} />
          HUMAN CONNECTION
        </span>
      </div>

      <h2
        id="recommended-heading"
        style={{
          fontSize: 'clamp(1.6rem, 3vw, 2rem)',
          fontWeight: 500,
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          margin: '0 0 8px',
        }}
      >
        Someone who may
        <br />
        be right for you.
      </h2>

      <SectionStatus state={experts} name="Recommendations">
        {best ? (
          <ExpertDetails expert={best} preferredLanguages={profile.data?.languageCodes} />
        ) : (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--synora-muted)' }}>
            <p style={{ fontSize: '0.95rem' }}>No suitable professionals are listed right now.</p>
            <p style={{ fontSize: '0.88rem', marginTop: 4 }}>Your support resources are always here to explore.</p>
          </div>
        )}
      </SectionStatus>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
        {best && <SupportRequestButton onRequested={onRequested} />}
        <ActionLink to="/app/experts" secondary>Explore experts</ActionLink>
      </div>
    </DashboardCard>
  )
}

export function CurrentSupportCard({ cases, followUps, onRequested }) {
  const current = activeCase(cases.data)
  const next = records(followUps.data)
    .filter(f => f.status === 'SCHEDULED')
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))[0]

  return (
    <DashboardCard id="my-support" aria-labelledby="support-heading">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--synora-green)', marginBottom: 6 }}>
            HERE FOR YOU
          </span>
          <h2 id="support-heading" style={{ fontSize: '1.5rem', fontWeight: 500, letterSpacing: '-0.01em', margin: 0 }}>
            My support
          </h2>
        </div>
        <ShieldCheck size={32} strokeWidth={1.4} aria-hidden="true" style={{ color: 'var(--synora-green)' }} />
      </div>

      <SectionStatus state={cases} name="Your support case">
        {current ? (
          <>
            <div style={{ display: 'grid', gap: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--synora-muted)', marginBottom: 2 }}>Your counselor</span>
                  <strong style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                    {current.counselorName || 'Awaiting assignment'}
                  </strong>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--synora-muted)', marginBottom: 2 }}>Case status</span>
                  <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--synora-green)', fontWeight: 500 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--synora-green)' }} />
                    {label(current.status)}
                  </strong>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--synora-muted)', marginBottom: 2 }}>Latest update</span>
                  <strong style={{ fontSize: '0.95rem' }}>
                    {formatDate(current.updatedAt || current.createdAt) || 'No update yet'}
                  </strong>
                </div>
              </div>
            </div>

            <details style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: 16 }}>
              <summary style={{ cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500, listStyle: 'none' }}>
                View support details
              </summary>
              <div style={{ marginTop: 12, fontSize: '0.88rem', color: 'var(--synora-muted)' }}>
                <p>{current.title}</p>
                <p>Case reference: {current.caseNumber}</p>
                {current.officerName && <p>Case officer: {current.officerName}</p>}
                {current.summary && <p>{current.summary}</p>}
              </div>
            </details>

            <SectionStatus state={followUps} name="Follow-ups">
              {next && (
                <p style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--synora-bg)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>
                  <CalendarDays size={18} style={{ color: 'var(--synora-blue)' }} />
                  {label(next.type)} scheduled · {formatDate(`${next.dueDate}T00:00:00`)}
                </p>
              )}
            </SectionStatus>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ fontSize: '0.95rem', color: 'var(--synora-text)', marginBottom: 16 }}>
              You don't currently have an active support request.
            </p>
            <SupportRequestButton onRequested={onRequested} />
          </div>
        )}
      </SectionStatus>

      <Link
        to="/app/support"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 16,
          fontSize: '0.88rem',
          color: 'var(--synora-muted)',
          textDecoration: 'none',
          transition: 'color 0.2s ease',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--synora-green)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--synora-muted)'}
      >
        Browse support resources <ArrowRight size={16} />
      </Link>
    </DashboardCard>
  )
}
