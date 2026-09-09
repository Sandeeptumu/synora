import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Phone, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react'
import api from '../api/client'
import { firebaseConfigured, firebaseClient, providerMessage } from '../api/firebase'

export default function ProviderSignIn({ onSuccess, fullName = '', disabled = false, onBusy }) {
  const [client, setClient] = useState(null)
  const [available, setAvailable] = useState(null)
  const [phoneMode, setPhoneMode] = useState(false)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const captchaNode = useRef(null)
  const verifier = useRef(null)
  const sending = useRef(false)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    if (!firebaseConfigured) { setAvailable(false); return }
    Promise.all([firebaseClient(), api.get('/api/auth/providers')]).then(([c, res]) => {
      if (alive.current) { setClient(c); setAvailable(res.data.firebase === true) }
    }).catch(() => { if (alive.current) setAvailable(false) })
    return () => { alive.current = false; verifier.current?.clear(); verifier.current = null }
  }, [])
  useEffect(() => {
    if (!cooldown) return
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function run(action) {
    if (sending.current || disabled) return
    sending.current = true; setBusy(true); onBusy?.(true); setError('')
    try { await action() } catch (e) { if (alive.current) setError(providerMessage(e)) }
    finally { sending.current = false; if (alive.current) { setBusy(false); onBusy?.(false) } }
  }
  async function exchange(user) {
    try {
      const idToken = await user.getIdToken(true)
      const { data } = await api.post('/api/auth/firebase', { idToken, fullName: fullName.trim() || undefined })
      // End the provider session; Synora's existing session controls dashboard access.
      await client.sdk.signOut(client.auth)
      if (alive.current) onSuccess(data)
    } finally { await client.sdk.signOut(client.auth).catch(() => {}) }
  }
  function google() {
    run(async () => {
      const provider = new client.sdk.GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      const result = await client.sdk.signInWithPopup(client.auth, provider)
      await exchange(result.user)
    })
  }
  function sendCode(e) {
    e?.preventDefault()
    if (cooldown > 0) return
    const normalized = phone.replace(/[\s()-]/g, '')
    if (!/^\+[1-9]\d{7,14}$/.test(normalized)) { setError('Enter your country code and phone number, for example +91 98765 43210.'); return }
    run(async () => {
      verifier.current?.clear()
      verifier.current = new client.sdk.RecaptchaVerifier(client.auth, captchaNode.current, { size: 'normal' })
      try {
        const result = await client.sdk.signInWithPhoneNumber(client.auth, normalized, verifier.current)
        if (alive.current) { setConfirmation(result); setCode(''); setCooldown(60) }
      } finally { verifier.current?.clear(); verifier.current = null }
    })
  }
  function verifyCode(e) {
    e.preventDefault()
    run(async () => {
      const result = await confirmation.confirm(code)
      await exchange(result.user)
    })
  }
  const blocked = disabled || busy || !available || !client
  return <div className="provider-signin">
    <div className="provider-buttons">
      <button className="btn provider-button" type="button" disabled={blocked} onClick={google}><svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2.2H12v4.1h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.4Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5a6 6 0 0 1-9-3.1H3.1v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 14a6 6 0 0 1 0-4V7.4H3.1a10 10 0 0 0 0 9.2Z"/><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.9 5.4L6.4 10A6 6 0 0 1 12 6Z"/></svg>Google</button>
      <button className="btn provider-button" type="button" disabled={blocked} onClick={() => {setPhoneMode(v=>!v);setError('')}} aria-expanded={phoneMode}><Phone size={17}/>Phone number</button>
    </div>
    {available === false && <p className="provider-status">Google and phone sign-in are not available yet. Please continue with email.</p>}
    {available === null && <p className="provider-status" role="status">Checking sign-in options…</p>}
    {busy && !phoneMode && <p className="provider-status" role="status"><Loader2 className="auth-spinner" size={14}/> Completing sign-in…</p>}
    <AnimatePresence initial={false}>{phoneMode && <motion.div className="phone-panel" initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}>
      <h2>{confirmation ? 'Check your messages' : 'Sign in with your phone'}</h2>
      <p>{confirmation ? `Enter the six-digit code sent to ${phone}.` : 'We’ll text you a code. No password needed.'}</p>
      {!confirmation ? <form onSubmit={sendCode}>
        <div className="field"><label htmlFor="signin-phone">Phone number with country code</label><input id="signin-phone" type="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91 98765 43210" required disabled={busy}/></div>
        <p className="sms-disclosure">By continuing, you agree to receive a verification SMS. Message rates may apply. Google processes your number to prevent abuse.</p>
        <button className="btn btn-primary" disabled={blocked || cooldown > 0}>{busy ? 'Sending code…' : cooldown ? `Send again in ${cooldown}s` : 'Send verification code'}<ArrowRight size={16}/></button>
      </form> : <form onSubmit={verifyCode}>
        <div className="field"><label htmlFor="signin-code">Verification code</label><input autoFocus id="signin-code" className="otp-input" type="text" inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} required disabled={busy}/></div>
        <button className="btn btn-primary" disabled={blocked || code.length!==6}>{busy ? 'Verifying…' : 'Verify & continue'}<ArrowRight size={16}/></button>
        <div className="phone-secondary"><button type="button" disabled={busy} onClick={()=>{setConfirmation(null);setCode('');setError('')}}><ArrowLeft size={13}/> Change number</button><button type="button" disabled={busy || cooldown>0} onClick={sendCode}>{cooldown ? `Resend in ${cooldown}s` : 'Resend code'}</button></div>
      </form>}
      <div ref={captchaNode} className="auth-captcha"/>
    </motion.div>}</AnimatePresence>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="auth-divider"><span>or continue with email</span></div>
  </div>
}
