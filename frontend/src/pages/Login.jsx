import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ArrowUpRight, Eye, EyeOff } from 'lucide-react'
import { login, apiMessage } from '../api'
import { useAuth } from '../context/AuthContext'
import AuthShell from '../components/AuthShell'
import ProviderSignIn from '../components/ProviderSignIn'

export default function Login() {
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [showPassword,setShowPassword]=useState(false)
  const [err,setErr]=useState('')
  const [busy,setBusy]=useState(false)
  const [providerBusy,setProviderBusy]=useState(false)
  const {loginWith}=useAuth()
  const navigate=useNavigate()
  const location=useLocation()
  const complete = data => {
    const home=loginWith(data)
    const requested=location.state?.from?.pathname
    const allowed = data.role==='VICTIM' ? requested?.startsWith('/app/') : requested?.startsWith('/dashboard/')
    navigate(allowed ? requested : home,{replace:true})
  }
  async function submit(e) {
    e.preventDefault();setErr('');setBusy(true)
    try {complete(await login(email,password))} catch(e) {setErr(apiMessage(e))} finally {setBusy(false)}
  }
  return <AuthShell title="Good to see you again" subtitle="Take a breath. Your space, your people, and your next steps are right here.">
    <ProviderSignIn onSuccess={complete} disabled={busy} onBusy={setProviderBusy}/>
    <form className="auth-form" onSubmit={submit}>
      <div className="field"><label htmlFor="email">Email address</label><input id="email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" disabled={busy||providerBusy}/></div>
      <div className="field"><div className="password-label"><label htmlFor="password">Password</label><Link to="/forgot-password">Forgot password?</Link></div><div className="password-field"><input id="password" type={showPassword?'text':'password'} autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" disabled={busy||providerBusy}/><button type="button" aria-label={showPassword?'Hide password':'Show password'} aria-pressed={showPassword} onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></div>
      {err&&<p className="form-error" role="alert">{err}</p>}
      <button className="btn btn-primary auth-submit" disabled={busy||providerBusy}>{busy?'Opening your space…':'Sign in'}<ArrowUpRight size={18}/></button>
    </form><p className="auth-switch">New to Synora? <Link to="/register">Create an account</Link></p>
  </AuthShell>
}
