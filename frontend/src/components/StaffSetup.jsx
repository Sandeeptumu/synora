import { useEffect, useState } from 'react'
import api, { asList as asStaffList } from '../api/client'
import { apiMessage } from '../api'
export default function StaffSetup({ onUpdated }) {
 const [email,setEmail]=useState(''), [role,setRole]=useState('COUNSELOR'), [busy,setBusy]=useState(false), [message,setMessage]=useState(''), [pending,setPending]=useState([])
 const load=()=>api.get('/api/admin/staff-invitations').then(r=>setPending(asStaffList(r.data))).catch(e=>setMessage(apiMessage(e)))
 useEffect(()=>{load()},[])
 return <section className="card" style={{marginBottom:20}}><h2>Staff access</h2><p className="muted">Use a separate staff account. New staff sign in with Google using the email you authorize here.</p>
 <form className="setup-grid" onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage('');try{const r=await api.post('/api/admin/staff',{email,role});setMessage(r.data.message);setEmail('');load();onUpdated?.()}catch(e){setMessage(apiMessage(e))}finally{setBusy(false)}}}>
 <label className="field">Staff email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={180}/></label>
 <label className="field">Access<select value={role} onChange={e=>setRole(e.target.value)}><option value="COUNSELOR">Counselor</option><option value="CASE_OFFICER">Case officer</option></select></label>
 <button className="btn btn-teal" disabled={busy}>{busy?'Saving…':'Grant staff access'}</button></form>
 {message&&<p role="status">{message}</p>}
 {pending.length>0&&<div><h3>Pending first sign-in</h3>{pending.map(p=><div key={p.email} className="staff-pending"><span>{p.email} · {p.role}</span><button className="btn btn-ghost" onClick={async()=>{try{await api.delete('/api/admin/staff-invitations',{params:{email:p.email}});load()}catch(e){setMessage(apiMessage(e))}}}>Revoke</button></div>)}</div>}
 </section>
}
