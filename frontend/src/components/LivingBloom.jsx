import { useId } from 'react'

/** Vector botanical sculpture: layered leaves rotate and open as the page moves. */
export default function LivingBloom() {
  const id=useId().replace(/:/g,'')
  return <div className="living-bloom" aria-hidden="true"><div className="bloom-scroll-layer"><svg viewBox="0 0 440 440" focusable="false">
    <defs><linearGradient id={`${id}-leaf`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#dfebbc"/><stop offset=".43" stopColor="#719878"/><stop offset=".7" stopColor="#1f5540"/><stop offset="1" stopColor="#c7d6a3"/></linearGradient><radialGradient id={`${id}-core`}><stop stopColor="#fbebaf"/><stop offset=".5" stopColor="#d1b777"/><stop offset="1" stopColor="#46755a"/></radialGradient></defs>
    <g className="bloom-orbit"><ellipse cx="220" cy="220" rx="195" ry="100" fill="none" stroke="#708f6660"/><ellipse cx="220" cy="220" rx="195" ry="100" fill="none" stroke="#708f6630" transform="rotate(60 220 220)"/><ellipse cx="220" cy="220" rx="195" ry="100" fill="none" stroke="#708f6630" transform="rotate(120 220 220)"/></g>
    <g className="bloom-petals">{Array.from({length:12},(_,i)=><g key={i} transform={`rotate(${i*30} 220 220)`}><path className="bloom-petal" style={{animationDelay:`${-i*.35}s`}} d="M220 225 C125 175 151 63 220 28 C195 112 308 160 220 225Z" fill={`url(#${id}-leaf)`} stroke="#f0f4d980" strokeWidth=".7"/><path d="M220 215Q179 122 220 38" fill="none" stroke="#e9edcc70" strokeWidth=".7"/></g>)}</g>
    <g className="bloom-inner">{Array.from({length:8},(_,i)=><g key={i} transform={`rotate(${i*45} 220 220)`}><path d="M220 225C165 201 174 135 220 115C209 156 267 196 220 225Z" fill={`url(#${id}-leaf)`} stroke="#edf2d960" strokeWidth=".6"/></g>)}</g>
    <circle cx="220" cy="220" r="24" fill={`url(#${id}-core)`}/><circle className="bloom-heart" cx="220" cy="220" r="9" fill="#f5e8b1"/>
    {[0,1,2,3,4,5].map(i=><circle key={i} cx={220+Math.cos(i*Math.PI/3)*185} cy={220+Math.sin(i*Math.PI/3)*185} r={i%2?3:5} fill="#c5ac70" className="bloom-spark" style={{animationDelay:`${-i*.6}s`}}/>)}</svg></div></div>
}
