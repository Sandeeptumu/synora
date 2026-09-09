import { Link } from 'react-router-dom'
import { Smile, Sparkles, Heart, Leaf, ArrowUpRight, Check, MessageCircle, LifeBuoy, BookOpen, ShieldCheck, Languages, CalendarDays } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import useDashboardData from '../../components/dashboard/useDashboardData'
import { DashboardCard, ActionLink, SectionStatus } from '../../components/dashboard/DashboardPrimitives'
import { RecommendedExpertCard, CurrentSupportCard, SupportRequestButton } from '../../components/dashboard/SupportCards'
import { records, strings, label, languageName, formatDate, recentActivity, WELLBEING } from '../../components/dashboard/dashboardModel'

export default function VictimHome() {
  const { user } = useAuth()
  const data = useDashboardData()
  return <UserDashboard user={user} data={data} />
}

export function UserDashboard({ user, data }) {
  const {
    today, chat, triage, profile, wellness,
    cases, experts, resources, checkIns, timeline, followUps
  } = data

  const name = typeof user?.fullName === 'string'
    ? user.fullName.trim().split(/\s+/)[0]
    : ''

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const feeling = WELLBEING[triage.data?.riskLevel]
  const critical = triage.data?.riskLevel === 'CRITICAL'

  const hasConversation = records(chat.data).some(m => m.kind === 'USER')
  const languages = strings(profile.data?.languageCodes)
  const activities = recentActivity(checkIns.data, chat.data, timeline.data)
  const reviewed = records(resources.data)
    .filter(r => r.reviewed && r.category !== 'CRISIS_SUPPORT')
    .slice(0, 3)

  const wellnessNote = records(wellness.data?.cases).find(
    c => c.wellnessTone && Number(c.checkInCount) > 0
  )?.wellnessTone

  const refreshCase = () => {
    cases.retry()
    wellness.retry()
  }

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '0 4px',
      }}
    >
      {/* GREETING HERO */}
      <section
        className="home-greeting"
        aria-labelledby="greeting-heading"
        style={{
          textAlign: 'center',
          padding: 'clamp(32px, 6vw, 56px) 20px 40px',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <p
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.12em',
              color: 'var(--synora-green)',
              marginBottom: 12,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--synora-green)',
              }}
            />
            YOUR SPACE, AT YOUR PACE
          </p>
          <h1
            id="greeting-heading"
            style={{
              fontSize: 'clamp(2.4rem, 6vw, 4rem)',
              fontWeight: 500,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              margin: '0 0 12px',
              color: 'var(--synora-text)',
            }}
          >
            {greeting}
            {name ? `, ${name}.` : ''}
          </h1>
          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              color: 'var(--synora-muted)',
              margin: 0,
              fontWeight: 400,
            }}
          >
            Let's take today one step at a time.
          </p>
        </div>
        <div
          style={{
            position: 'absolute',
            right: 'clamp(10px, 3vw, 40px)',
            bottom: -10,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--synora-surface)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: '10px 16px',
            boxShadow: 'var(--shadow-sm)',
            fontSize: '0.85rem',
            color: 'var(--synora-muted)',
          }}
          aria-hidden="true"
        >
          <Heart size={18} style={{ color: 'var(--synora-green)' }} />
          <span>All of you<br />is welcome here.</span>
        </div>
      </section>

      {/* PRIMARY ACTIONS: Daily Check-In + AI Support */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
          gap: 20,
          marginBottom: 20,
        }}
      >
        {/* DAILY CHECK-IN CARD */}
        <DashboardCard aria-labelledby="daily-heading">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'var(--synora-green)',
                color: '#2c2e2a',
              }}
            >
              <Smile size={24} strokeWidth={2} />
            </span>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: 'var(--synora-muted)',
              }}
            >
              A MOMENT FOR YOU
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              marginBottom: 20,
            }}
          >
            <h2
              id="daily-heading"
              style={{
                fontSize: 'clamp(1.5rem, 3vw, 1.8rem)',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Daily Check-In
            </h2>
            <p
              style={{
                fontSize: '0.95rem',
                color: 'var(--synora-muted)',
                margin: 0,
              }}
            >
              Take a moment to check in with yourself.
            </p>
          </div>

          <SectionStatus state={today} name="Today's check-in">
            {today.data ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '14px 16px',
                    background: '#e8f5d8',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 18,
                  }}
                >
                  <Check size={18} style={{ color: 'var(--synora-green)', flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--synora-text)', fontWeight: 500 }}>
                    Today's check-in completed
                  </p>
                </div>

                {[
                  ['Mood', label(today.data.mood)],
                  ['Stress', Number.isFinite(today.data.stressLevel) ? `${today.data.stressLevel}/10` : ''],
                  ['Energy', Number.isFinite(today.data.energyLevel) ? `${today.data.energyLevel}/10` : ''],
                ]
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div
                      key={k}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px 0',
                        borderBottom: '1px solid var(--border)',
                        fontSize: '0.9rem',
                      }}
                    >
                      <span style={{ color: 'var(--synora-muted)' }}>{k}</span>
                      <span style={{ fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
              </>
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '24px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--synora-bg)',
                }}
              >
                <Smile
                  size={48}
                  strokeWidth={1.5}
                  style={{
                    color: 'var(--synora-green)',
                    margin: '0 auto 12px',
                    display: 'block',
                  }}
                  aria-hidden="true"
                />
                <div>
                  <strong style={{ display: 'block', fontSize: '1rem', marginBottom: 4 }}>
                    Ready when you are.
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--synora-muted)' }}>
                    A small pause can be a good place to begin.
                  </p>
                </div>
              </div>
            )}
          </SectionStatus>

          <div
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              paddingTop: 16,
              borderTop: '1px solid var(--border)',
            }}
          >
            <ActionLink
              to="/app/check-in/today"
              green
            >
              {today.data
                ? "View today's check-in"
                : today.error
                ? 'Open Daily Check-In'
                : 'Start Check-In'}
            </ActionLink>
            <Link
              to="/app/check-in"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '0.85rem',
                color: 'var(--synora-muted)',
                textDecoration: 'none',
              }}
            >
              Prefer a voice note?
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </DashboardCard>

        {/* AI SUPPORT CARD */}
        <DashboardCard aria-labelledby="ai-heading">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'var(--synora-blue)',
                color: '#fff',
              }}
            >
              <Sparkles size={22} strokeWidth={2} />
            </span>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: 'var(--synora-muted)',
              }}
            >
              A LITTLE ROOM TO TALK
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              marginBottom: 20,
            }}
          >
            <h2
              id="ai-heading"
              style={{
                fontSize: 'clamp(1.5rem, 3vw, 1.8rem)',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Talk with Synora AI
            </h2>
            <p
              style={{
                fontSize: '0.95rem',
                color: 'var(--synora-muted)',
                margin: 0,
              }}
            >
              Talk through what's on your mind and receive supportive guidance.
            </p>
          </div>

          {/* Decorative element */}
          <div
            aria-hidden="true"
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <span
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'var(--synora-bg)',
                display: 'grid',
                placeItems: 'center',
                border: '1px solid var(--border)',
              }}
            >
              <Sparkles size={28} strokeWidth={1.5} color="var(--synora-blue)" />
            </span>
          </div>

          {chat.error && (
            <p
              style={{
                fontSize: '0.85rem',
                color: 'var(--synora-muted)',
                textAlign: 'center',
                marginBottom: 12,
              }}
            >
              Conversation history is temporarily unavailable. You can still open AI support.
            </p>
          )}

          <div
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              paddingTop: 16,
              borderTop: '1px solid var(--border)',
            }}
          >
            <ActionLink to="/ai-support" blue>
              {hasConversation ? 'Continue Conversation' : 'Start Conversation'}
            </ActionLink>
            <p
              style={{
                fontSize: '0.82rem',
                color: 'var(--synora-muted)',
                width: '100%',
                margin: 0,
                paddingTop: 4,
              }}
            >
              Supportive guidance, not a medical diagnosis.
              <br />
              For urgent help, reach out to a person.
            </p>
          </div>
        </DashboardCard>
      </div>

      {/* SECONDARY GRID: Wellbeing + Recommended Expert */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
          gap: 20,
          marginBottom: 20,
        }}
      >
        {/* WELLBEING SUMMARY */}
        <DashboardCard
          style={{
            borderLeft: `4px solid ${feeling?.tone === 'coral' ? 'var(--synora-coral)' : feeling?.tone === 'yellow' ? 'var(--synora-yellow)' : 'var(--synora-green)'}`,
          }}
          aria-labelledby="wellbeing-heading"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: 'var(--synora-green)',
                color: '#2c2e2a',
              }}
            >
              <Leaf size={20} strokeWidth={2} />
            </span>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                letterSpacing: '0.08em',
                color: 'var(--synora-muted)',
              }}
            >
              A GENTLE PERSPECTIVE
            </span>
          </div>

          <h2
            id="wellbeing-heading"
            style={{
              fontSize: 'clamp(1.3rem, 2.5vw, 1.6rem)',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              margin: '0 0 16px',
            }}
          >
            Your wellbeing today
          </h2>

          <SectionStatus state={triage} name="Your wellbeing overview">
            {feeling ? (
              <>
                <div
                  style={{
                    textAlign: 'center',
                    padding: '20px',
                    marginBottom: 16,
                  }}
                  aria-hidden="true"
                >
                  <Heart
                    size={48}
                    strokeWidth={1.2}
                    style={{
                      color: feeling.tone === 'coral'
                        ? 'var(--synora-coral)'
                        : feeling.tone === 'yellow'
                        ? 'var(--synora-yellow)'
                        : 'var(--synora-green)',
                      margin: '0 auto 8px',
                      display: 'block',
                    }}
                  />
                </div>
                <p
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 500,
                    textAlign: 'center',
                    margin: '0 0 8px',
                  }}
                >
                  {feeling.title}
                </p>
                <p
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    fontSize: '0.9rem',
                    color: 'var(--synora-muted)',
                    margin: 0,
                  }}
                >
                  <Check size={14} />
                  {feeling.status}
                </p>
                {typeof triage.data?.suggestedSupport === 'string' && (
                  <p
                    style={{
                      fontSize: '0.9rem',
                      color: 'var(--synora-text)',
                      textAlign: 'center',
                      margin: '12px 0 0',
                      padding: '10px 14px',
                      background: 'var(--synora-bg)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    {triage.data.suggestedSupport}
                  </p>
                )}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <p style={{ fontSize: '0.95rem', color: 'var(--synora-text)', marginBottom: 4 }}>
                  We're still getting to know you.
                </p>
                <p style={{ fontSize: '0.88rem', color: 'var(--synora-muted)', margin: 0 }}>
                  Your check-ins help build a picture of how you're feeling.
                </p>
              </div>
            )}
          </SectionStatus>

          {wellnessNote && (
            <p
              style={{
                fontSize: '0.88rem',
                color: 'var(--synora-muted)',
                fontStyle: 'italic',
                textAlign: 'center',
                margin: '12px 0 0',
                padding: '10px 14px',
                background: 'var(--synora-surface-secondary)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              {wellnessNote}
            </p>
          )}

          <div
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              paddingTop: 16,
              borderTop: '1px solid var(--border)',
            }}
          >
            <ActionLink
              to={critical ? '/app/support' : '/app/experts'}
              secondary
            >
              {critical ? 'Get urgent help' : 'Explore your support'}
            </ActionLink>
            <span
              style={{
                fontSize: '0.8rem',
                color: 'var(--synora-muted)',
                width: '100%',
                paddingTop: 4,
              }}
            >
              An indication for support, not a diagnosis.
            </span>
          </div>
        </DashboardCard>

        {/* RECOMMENDED EXPERT */}
        <RecommendedExpertCard
          experts={experts}
          profile={profile}
          onRequested={refreshCase}
        />
      </div>

      {/* LANGUAGE STRIP */}
      <section
        aria-label="Your support languages"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '16px 20px',
          background: 'var(--synora-surface)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border)',
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <span
            style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: 'var(--synora-green)',
              marginBottom: 4,
            }}
          >
            FEEL UNDERSTOOD
          </span>
          <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 500 }}>
            You prefer support in
          </p>
        </div>

        <SectionStatus state={profile} name="Language preferences">
          {languages.length ? (
            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              {languages.map(code => (
                <span
                  key={code}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: '16px',
                    background: profile.data?.primaryLanguage === code
                      ? 'var(--synora-green)'
                      : 'var(--synora-surface-secondary)',
                    color: profile.data?.primaryLanguage === code
                      ? '#2c2e2a'
                      : 'var(--synora-text)',
                    fontSize: '0.85rem',
                    fontWeight: profile.data?.primaryLanguage === code ? 600 : 400,
                  }}
                >
                  {languageName(code)}
                  {profile.data?.primaryLanguage === code && (
                    <Check size={12} aria-label="Primary language" />
                  )}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.9rem', color: 'var(--synora-muted)' }}>
              Choose the languages you feel most comfortable with.
            </p>
          )}
        </SectionStatus>

        <Link
          to="/app/profile"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: '0.88rem',
            color: 'var(--synora-muted)',
            textDecoration: 'none',
            fontWeight: 500,
            flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--synora-green)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--synora-muted)'}
        >
          {languages.length ? 'Edit preferences' : 'Set preferences'}
          <ArrowUpRight size={16} />
        </Link>
      </section>

      {/* CURRENT SUPPORT */}
      <CurrentSupportCard
        cases={cases}
        followUps={followUps}
        onRequested={refreshCase}
      />

      {/* BOTTOM GRID: Activity + Resources */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
          gap: 20,
          marginBottom: 20,
        }}
      >
        {/* RECENT ACTIVITY */}
        <DashboardCard aria-labelledby="activity-heading">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 16,
            }}
          >
            <div>
              <h2
                id="activity-heading"
                style={{
                  fontSize: '1.3rem',
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  margin: 0,
                }}
              >
                Little steps, lately.
              </h2>
            </div>
            <Link
              to="/app/history"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '0.85rem',
                color: 'var(--synora-muted)',
                textDecoration: 'none',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--synora-green)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--synora-muted)'}
            >
              Your journey
              <ArrowUpRight size={16} />
            </Link>
          </div>

          {(checkIns.loading || timeline.loading || chat.loading) && !activities.length ? (
            <SectionStatus state={{ loading: true }} name="Recent activity" />
          ) : (
            <>
              {(checkIns.error || chat.error || timeline.error) && (
                <p
                  role="status"
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--synora-muted)',
                    marginBottom: 12,
                  }}
                >
                  Some recent activity is temporarily unavailable.
                </p>
              )}
              {activities.length ? (
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  {activities.map(a => (
                    <li
                      key={a.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 0',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <span
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          background:
                            a.icon === 'check'
                              ? '#e8f5d8'
                              : a.icon === 'chat'
                              ? 'var(--synora-bg)'
                              : 'var(--synora-surface-secondary)',
                          flexShrink: 0,
                        }}
                      >
                        {a.icon === 'check' ? (
                          <Check size={16} style={{ color: 'var(--synora-green)' }} />
                        ) : a.icon === 'chat' ? (
                          <MessageCircle size={16} style={{ color: 'var(--synora-blue)' }} />
                        ) : (
                          <Heart size={16} style={{ color: 'var(--synora-coral)' }} />
                        )}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Link
                          to={a.to}
                          style={{
                            display: 'block',
                            fontWeight: 500,
                            fontSize: '0.9rem',
                            textDecoration: 'none',
                            color: 'var(--synora-text)',
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--synora-green)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--synora-text)'}
                        >
                          {a.title}
                        </Link>
                        <time
                          dateTime={a.date}
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--synora-muted)',
                            display: 'block',
                            marginTop: 2,
                          }}
                        >
                          {formatDate(a.date, true)}
                        </time>
                      </div>
                      <ArrowUpRight
                        size={14}
                        aria-hidden="true"
                        style={{ color: 'var(--synora-muted)', flexShrink: 0 }}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p
                  style={{
                    textAlign: 'center',
                    padding: '20px 0',
                    color: 'var(--synora-muted)',
                    fontSize: '0.9rem',
                  }}
                >
                  Your recent activity will appear here. Every small step counts.
                </p>
              )}
            </>
          )}
        </DashboardCard>

        {/* RESOURCES */}
        <DashboardCard aria-labelledby="resources-heading">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 16,
            }}
          >
            <div>
              <h2
                id="resources-heading"
                style={{
                  fontSize: '1.3rem',
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  margin: 0,
                }}
              >
                A little extra care.
              </h2>
            </div>
            <BookOpen
              size={24}
              strokeWidth={1.5}
              style={{ color: 'var(--synora-green)' }}
            />
          </div>

          <SectionStatus state={resources} name="Support resources">
            {reviewed.length ? (
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {reviewed.map(r => (
                  <li
                    key={r.id || r.title}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <Link
                      to="/app/support"
                      style={{
                        fontWeight: 500,
                        fontSize: '0.9rem',
                        textDecoration: 'none',
                        color: 'var(--synora-text)',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--synora-green)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--synora-text)'}
                    >
                      {r.title}
                    </Link>
                    <ArrowUpRight
                      size={14}
                      aria-hidden="true"
                      style={{ color: 'var(--synora-muted)' }}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p
                style={{
                  textAlign: 'center',
                  padding: '20px 0',
                  color: 'var(--synora-muted)',
                  fontSize: '0.9rem',
                }}
              >
                Support resources will appear here when available.
              </p>
            )}
          </SectionStatus>

          <Link
            to="/app/support"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.85rem',
              color: 'var(--synora-muted)',
              textDecoration: 'none',
              marginTop: 12,
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--synora-green)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--synora-muted)'}
          >
            Browse all resources
            <ArrowUpRight size={14} />
          </Link>
        </DashboardCard>
      </div>

      {/* URGENT SUPPORT */}
      <section
        aria-labelledby="urgent-heading"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '20px 24px',
          background: 'var(--synora-surface)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border)',
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'var(--synora-coral)',
              color: '#fff',
              flexShrink: 0,
            }}
          >
            <LifeBuoy size={24} strokeWidth={2} />
          </span>
          <div>
            <h2
              id="urgent-heading"
              style={{
                fontSize: '1.2rem',
                fontWeight: 600,
                letterSpacing: '-0.01em',
                margin: '0 0 4px',
              }}
            >
              Need urgent support?
            </h2>
            <p
              style={{
                fontSize: '0.9rem',
                color: 'var(--synora-muted)',
                margin: 0,
              }}
            >
              If you feel unsafe or need immediate help, support is available.
            </p>
          </div>
        </div>
        <ActionLink to="/app/support" secondary>
          Get Urgent Help
        </ActionLink>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          textAlign: 'center',
          padding: '24px 20px',
          fontSize: '0.85rem',
          color: 'var(--synora-muted)',
          borderTop: '1px solid var(--border)',
        }}
      >
        <p
          style={{
            marginBottom: 4,
            fontWeight: 500,
            color: 'var(--synora-text)',
          }}
        >
          A little more understood. A little less alone.
        </p>
        <p>Synora · Your space to be you.</p>
      </footer>
    </div>
  )
}
