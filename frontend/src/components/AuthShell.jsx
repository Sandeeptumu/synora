import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'
import SynoraBrand from './SynoraBrand'

export default function AuthShell({ title, subtitle, children }) {
  return <main className="auth-scene">
    <div className="auth-landscape" aria-hidden="true"><div className="auth-orbit orbit-one"/><div className="auth-orbit orbit-two"/><div className="auth-orbit orbit-three"/><span className="auth-glow glow-one"/><span className="auth-glow glow-two"/>{Array.from({length:6},(_,i)=><span key={i} className={`auth-leaf leaf-${i}`}><ShieldCheck size={24+i*5} style={{color:'var(--text-faint)'}}/></span>)}</div>
    <motion.section className="auth-panel" initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{duration:.6,ease:'easeOut'}}>
      <Link to="/" className="brand auth-brand" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
        <SynoraBrand size={30} showWordmark={false} />
        <span style={{ fontWeight: 800, letterSpacing: '.02em' }}>Synora</span><span className="brand-dot">®</span>
      </Link>
      <div className="auth-heading"><span className="eyebrow">A SPACE THAT STARTS WITH YOU</span><h1>{title}</h1><p>{subtitle}</p></div>
      {children}
      <div className="auth-footnote"><ShieldCheck size={14}/><span>Your story. Your pace. Your space.</span></div>
    </motion.section>
  </main>
}
