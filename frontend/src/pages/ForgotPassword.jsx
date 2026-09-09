import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles, MailCheck } from 'lucide-react'

export default function ForgotPassword() {
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState('')

  return (
    <div style={{
      minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20,
      background: 'radial-gradient(1000px 500px at 50% -10%, #16305c 0%, var(--navy-900) 60%), var(--navy-900)',
    }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="card-glass" style={{ width: '100%', maxWidth: 420, padding: 30, background: 'rgba(255,255,255,.97)' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, display: 'grid', placeItems: 'center',
            background: 'linear-gradient(135deg, var(--teal-500), var(--cyan-400))' }}>
            <Sparkles size={18} color="#04252b" />
          </div>
          <span style={{ fontWeight: 800 }}>Synora</span>
        </Link>
        {sent ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <MailCheck size={38} color="var(--teal-500)" style={{ margin: '0 auto 12px' }} />
            <h2 style={{ fontSize: '1.25rem', marginBottom: 8 }}>Check your inbox</h2>
            <p className="muted" style={{ fontSize: '.92rem' }}>
              If an account exists for <strong>{email}</strong>, a reset link is on its way.
              Password reset email is not configured. Contact your administrator for account recovery.
            </p>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: '1.3rem', letterSpacing: '-0.02em' }}>Reset your password</h2>
            <p className="muted" style={{ marginBottom: 18, fontSize: '.92rem' }}>
              Enter your account email and we will send a reset link.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); setSent(true) }}>
              <div className="field">
                <label htmlFor="fp-email">Email</label>
                <input id="fp-email" type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)} />
              </div>
              <button className="btn btn-teal" style={{ width: '100%' }}>Send reset link</button>
            </form>
          </>
        )}
        <p style={{ marginTop: 16, textAlign: 'center', fontSize: '.88rem' }}>
          <Link to="/login" style={{ color: 'var(--indigo-500)', fontWeight: 600 }}>← Back to sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
