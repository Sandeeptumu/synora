import LivingBloom from './LivingBloom'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Leaf } from 'lucide-react'

export function ImageAction({ to, image = 'grove', eyebrow, title, description }) {
  return <Link to={to} className={`image-action image-action-${image}`}>
    <img src={`/images/${image}.svg`} alt="" loading="lazy" />
    <div className="image-action-copy"><span className="eyebrow">{eyebrow}</span><h3>{title}</h3>{description && <p>{description}</p>}</div>
    <span className="image-action-arrow"><ArrowUpRight size={20} /></span>
  </Link>
}

export function WorkspaceBanner({ personal = false, name }) {
  return <section className="workspace-banner">
    <div><span className="eyebrow"><Leaf size={14} /> {personal ? 'A LITTLE SPACE FOR YOU' : 'PURPOSE IN EVERY CONNECTION'}</span>
    <h2>{personal ? `Your pace. Your space${name ? `, ${name}` : ''}.` : 'A clearer picture. A more human response.'}</h2>
    <p>{personal ? 'Small moments of reflection can be a good place to begin.' : 'Bring your attention to the people who need it. Everything you need, thoughtfully connected.'}</p>
    <Link className="banner-link" to={personal ? '/app/check-in' : '/dashboard/cases'}>{personal ? 'Take a moment to check in' : 'Open your caseload'} <ArrowUpRight size={16}/></Link></div>
    <LivingBloom/><img className="banner-art" src="/images/grove.svg" alt="" />
  </section>
}
