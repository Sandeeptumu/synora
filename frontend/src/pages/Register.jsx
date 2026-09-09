import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Eye, EyeOff } from 'lucide-react'
import { register, apiMessage } from '../api'
import { useAuth } from '../context/AuthContext'
import AuthShell from '../components/AuthShell'
import ProviderSignIn from '../components/ProviderSignIn'

export default function Register() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [providerBusy, setProviderBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { loginWith } = useAuth()
  const navigate = useNavigate()
  const complete = data => navigate(loginWith(data), {replace:true})
  const set = k => e => setForm(f=>({...f,[k]:e.target.value}))
  async function submit(e) {
    e.preventDefault();setErr('');setBusy(true)
    try { complete(await register(form)) } catch(e) {setErr(apiMessage(e))} finally {setBusy(false)}
  }
  return <AuthShell title="Create your account" subtitle="A little space to reflect, feel understood, and find support. Let’s make it yours.">
    <ProviderSignIn onSuccess={complete} fullName={form.fullName} disabled={busy} onBusy={setProviderBusy}/>
    <form className="auth-form" onSubmit={submit}>
      <div className="field"><label htmlFor="fullName">Full name</label><input id="fullName" autoComplete="name" required minLength={2} maxLength={120} value={form.fullName} onChange={set('fullName')} placeholder="What should we call you?" disabled={busy||providerBusy}/></div>
      <div className="field"><label htmlFor="email">Email address</label><input id="email" type="email" autoComplete="email" required maxLength={180} value={form.email} onChange={set('email')} placeholder="you@example.com" disabled={busy||providerBusy}/></div>
      <div className="field"><label htmlFor="password">Password</label><div className="password-field"><input id="password" type={showPassword?'text':'password'} autoComplete="new-password" required minLength={8} maxLength={72} value={form.password} onChange={set('password')} placeholder="At least 8 characters" disabled={busy||providerBusy}/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Hide password':'Show password'} aria-pressed={showPassword}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></div>
      {err && <p className="form-error" role="alert">{err}</p>}
      <button className="btn btn-primary auth-submit" disabled={busy||providerBusy}>{busy?'Creating your space…':'Create account'}<ArrowUpRight size={18}/></button>
    </form><p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
  </AuthShell>
}
