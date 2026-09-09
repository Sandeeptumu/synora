import LivingBloom from '../components/LivingBloom'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowUpRight, ArrowRight, ShieldCheck, AudioLines, HeartHandshake, Fingerprint } from 'lucide-react'
import { ImageAction } from '../components/WorkspaceVisuals'
import SynoraBrand from '../components/SynoraBrand'

const reveal = { initial: { opacity: 0, y: 22 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: .65 } }
export default function Landing() {
  return <div className="landing-premium">
    <header className="landing-nav"><Link className="brand" to="/"><SynoraBrand size={26} showWordmark={false}/><span style={{fontWeight:800,letterSpacing:'.02em'}}>synora</span><span className="brand-dot">®</span></Link>
      <nav aria-label="Website"><a href="#approach">Our approach</a><a href="#spaces">Your workspace</a><a href="#care">Built with care</a></nav>
      <Link to="/login" className="btn btn-primary">Sign in <ArrowUpRight size={16}/></Link></header>
    <main>
      <section className="editorial-hero">
        <motion.div {...reveal} className="hero-copy"><span className="eyebrow"><span className="status-dot"/> TECHNOLOGY WITH A HUMAN HEART</span>
          <h1>Every signal.<br/>Every story.<br/><em>Someone who cares.</em></h1>
          <p>A thoughtful space for personal check-ins and connected care. Helping support teams see the bigger picture, and people feel a little more understood.</p>
          <div className="hero-actions"><Link to="/register" className="btn btn-primary">Find your space <ArrowUpRight size={18}/></Link><a className="text-link" href="#approach">Meet Synora <ArrowRight size={17}/></a></div>
          <div className="hero-assurance"><ShieldCheck size={17}/> Consent first <span/> Human-led support <span/> Personal to you</div>
        </motion.div>
        <motion.div {...reveal} transition={{duration:.8,delay:.15}} className="hero-art">
          <img src="/images/grove.svg" alt="An illustrated winding path through a quiet green landscape at sunrise"/>
          <LivingBloom/><div className="art-caption"><span>ROOM TO REFLECT</span><span>SPACE TO GROW ↗</span></div>
          <div className="floating-note note-top"><span className="note-icon"><AudioLines size={24}/></span><div><strong>Small signals. Meaningful context.</strong><p>Text, voice, and your personal journey.</p></div></div>
          <div className="floating-note note-bottom"><span className="note-icon"><HeartHandshake size={24}/></span><div><strong>People at the center.</strong><p>Support begins with understanding.</p></div></div>
        </motion.div>
      </section>
      <div className="principle-strip"><span>A MORE CONSIDERED KIND OF CARE</span><strong>Listen closely.</strong><span className="strip-star">✳</span><strong>Understand deeply.</strong><span className="strip-star">✳</span><strong>Respond thoughtfully.</strong></div>
      <section id="spaces" className="landing-section"><motion.div {...reveal} className="section-intro"><div><span className="eyebrow">YOUR SPACE, CONNECTED</span><h2>Different needs.<br/><em>One thoughtful platform.</em></h2></div><p>From a quiet moment of reflection to a clearer view of your caseload. Get to what matters, with less in the way.</p></motion.div>
        <div className="landing-image-grid"><ImageAction to="/app/home" image="grove" eyebrow="FOR INDIVIDUALS" title="A moment for yourself" description="Check in, reflect, and find support."/><ImageAction to="/dashboard/counselor" image="water" eyebrow="FOR SUPPORT TEAMS" title="Care with perspective" description="Bring cases, signals, and follow-ups together."/><ImageAction to="/dashboard/admin" image="dawn" eyebrow="FOR ADMINISTRATORS" title="A connected organization" description="Manage your team and platform settings."/></div>
      </section>
      <section id="approach" className="approach-section"><div><span className="eyebrow">A LITTLE CONTEXT CHANGES EVERYTHING</span><h2>See the person.<br/><em>Beyond the data.</em></h2><p>Synora brings shared signals together over time, so a single moment never has to tell the whole story.</p></div><div className="approach-steps">{[['01','A space to share','Guided check-ins give people a way to express how they are feeling, with consent.'],['02','A picture that evolves','Text, optional voice, and personal patterns add context to each check-in.'],['03','A human next step','Support professionals review available indications and decide how to respond.']].map(([n,t,d])=><motion.article {...reveal} key={n}><span>{n}</span><div><h3>{t}</h3><p>{d}</p></div></motion.article>)}</div></section>
      <section id="care" className="care-section"><Fingerprint size={34}/><span className="eyebrow">BUILT AROUND PEOPLE</span><h2>Your story deserves<br/><em>thoughtful care.</em></h2><p>Consent-based sharing. Role-based access. Human oversight.<br/>AI indications support professional judgment; they do not provide a diagnosis.</p><Link className="btn btn-primary" to="/register">Begin your journey <ArrowUpRight size={17}/></Link></section>
    </main><footer className="landing-footer"><Link className="brand" to="/">synora<span className="brand-dot">®</span></Link><span>Built for understanding. Designed for people.</span><Link to="/login">Your workspace <ArrowUpRight size={14}/></Link></footer>
  </div>
}
