import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { MotionConfig, useReducedMotion } from 'framer-motion'
import { Pause, Play } from 'lucide-react'

const REVEALS = '.card, .card-glass, .image-action, .workspace-banner, .section-intro, .approach-steps article, .care-section, .synora-empty, main h1, main .page-sub, .hero-copy, .hero-art, .auth-heading, .disclaimer'
const PARALLAX = '.hero-art > img, .banner-art, .image-action > img'

export default function MotionExperience({ children }) {
  const { pathname } = useLocation()
  const reduced = useReducedMotion()
  const [paused, setPaused] = useState(() => {
    try { return localStorage.getItem('synora_motion_paused') === 'true' } catch { return false }
  })
  const off = paused || !!reduced
  const progress = useRef(null)
  useEffect(() => {
    document.documentElement.dataset.synoraMotion = off ? 'off' : 'on'
    try { localStorage.setItem('synora_motion_paused', String(paused)) } catch { /* storage is optional */ }
    return () => { delete document.documentElement.dataset.synoraMotion }
  }, [off, paused])

  useEffect(() => {
    if (off) return
    let frame = 0
    let scanFrame = 0
    let disposed = false
    const targets = new Set()
    const images = new Set()
    const animations = new Set()
    const observer = new IntersectionObserver(entries => {
      entries.forEach(({ target, isIntersecting }) => {
        target.classList.toggle('motion-in', isIntersecting || target.contains(document.activeElement))
      })
    }, { threshold: 0, rootMargin: '0px 0px -24px 0px' })
    function scan() {
      scanFrame = 0
      if (disposed) return
      for (const el of targets) if (!el.isConnected) { observer.unobserve(el); targets.delete(el) }
      for (const el of images) if (!el.isConnected) images.delete(el)
      document.querySelectorAll(REVEALS).forEach(el => {
        if (targets.has(el) || el.closest('[data-motion-still], [role="dialog"], .phone-panel')) return
        if (el.parentElement?.closest('.motion-reveal')) return
        el.classList.add('motion-reveal')
        el.style.setProperty('--reveal-delay', `${Math.min(Array.from(el.parentElement?.children || []).indexOf(el) % 4, 3) * 65}ms`)
        targets.add(el); observer.observe(el)
      })
      document.querySelectorAll(PARALLAX).forEach(el => images.add(el))
      schedule()
    }
    function update() {
      frame = 0
      if (disposed) return
      document.documentElement.style.setProperty('--bloom-turn', `${window.scrollY * .09}deg`)
      document.documentElement.style.setProperty('--bloom-open', `${1 + Math.min(window.scrollY / 3000, .25)}`)
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (progress.current) progress.current.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`
      const positions = [...images].map(el => [el, el.getBoundingClientRect()])
      positions.forEach(([el, rect]) => {
        if (rect.bottom < -100 || rect.top > window.innerHeight + 100) return
        const distance = (window.innerHeight / 2 - (rect.top + rect.height / 2)) * .075
        el.style.setProperty('--scroll-drift', `${Math.max(-22, Math.min(22, distance))}px`)
      })
    }
    function schedule() { if (!frame && !document.hidden) frame = requestAnimationFrame(update) }
    
    // Debounce the mutation observer to prevent rapid re-renders
    let mutationTimeout = null
    const mutation = new MutationObserver(() => {
      if (mutationTimeout) return
      mutationTimeout = setTimeout(() => {
        mutationTimeout = null
        if (!scanFrame) scanFrame = requestAnimationFrame(scan)
      }, 100)
    })
    mutation.observe(document.getElementById('root'), { childList: true, subtree: true })
    
    const resize = new ResizeObserver(schedule)
    resize.observe(document.documentElement)
    function focus(event) { event.target.closest?.('.motion-reveal')?.classList.add('motion-in') }
    function pop(event) {
      const button = event.target.closest?.('button, a.btn, .image-action, .personal-tab, .synora-sidebar nav a')
      if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true' || button.closest('[data-motion-still]')) return
      const animation = button.animate([{scale:1},{scale:.95,offset:.25},{scale:1.035,offset:.7},{scale:1}], {duration:360,easing:'cubic-bezier(.2,.8,.2,1)'})
      animations.add(animation)
      animation.onfinish = () => animations.delete(animation)
    }
    const visibility = () => { document.documentElement.classList.toggle('motion-tab-hidden',document.hidden);schedule() }
    window.addEventListener('scroll', schedule, {passive:true})
    window.addEventListener('resize', schedule, {passive:true})
    document.addEventListener('visibilitychange',visibility)
    document.addEventListener('focusin',focus)
    document.addEventListener('click',pop)
    scan()
    return () => {
      disposed=true;observer.disconnect();mutation.disconnect();resize.disconnect()
      cancelAnimationFrame(frame);cancelAnimationFrame(scanFrame)
      if (mutationTimeout) clearTimeout(mutationTimeout)
      window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule)
      document.removeEventListener('visibilitychange',visibility);document.removeEventListener('focusin',focus);document.removeEventListener('click',pop)
      animations.forEach(animation=>animation.cancel())
      targets.forEach(el=>{el.classList.remove('motion-reveal','motion-in');el.style.removeProperty('--reveal-delay')})
      images.forEach(el=>el.style.removeProperty('--scroll-drift'))
      document.documentElement.style.removeProperty('--bloom-turn')
      document.documentElement.style.removeProperty('--bloom-open')
      document.documentElement.classList.remove('motion-tab-hidden')
    }
  }, [pathname, off])

  return <MotionConfig reducedMotion={off ? 'always' : 'user'}>
    <div className="motion-atmosphere" aria-hidden="true"><div className="ambient-wash wash-a"/><div className="ambient-wash wash-b"/>{Array.from({length:24},(_,i)=><i key={i} className={`ambient-particle particle-${i%3}`} style={{'--x':`${(i*37+11)%100}%`,'--y':`${(i*23+7)%100}%`,'--duration':`${12+i%7*2}s`,'--delay':`${-i*1.7}s`,'--size':`${3+i%4*2}px`}}/>)}</div>
    <div className="reading-progress" aria-hidden="true"><i ref={progress}/></div>
    {children}
    <button type="button" className="motion-toggle" aria-label={off ? 'Enable animations' : 'Pause animations'} aria-pressed={!off} disabled={!!reduced} title={reduced?'Reduced motion follows your device setting':off?'Enable animations':'Pause animations'} onClick={()=>setPaused(v=>!v)}>{off?<Play size={13}/>:<Pause size={13}/>}<span>{off?'Motion off':'Motion on'}</span></button>
  </MotionConfig>
}
