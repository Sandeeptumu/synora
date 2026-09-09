import { useEffect, useState } from 'react'
import api from '../api/client'
import { apiMessage, getUsers } from '../api'
import { useAuth } from '../context/AuthContext'
export default function CaseSetup({ onUpdated, cases }) {
 const {user}=useAuth(); const [people,setPeople]=useState([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
 const [victim,setVictim]=useState(''),[title,setTitle]=useState('Personal support'),[selected,setSelected]=useState(''),[counselor,setCounselor]=useState(''),[officer,setOfficer]=useState('')
 useEffect(()=>{if(['ADMIN','CASE_OFFICER'].includes(user.role)) getUsers().then(setPeople).catch(e=>setMessage(apiMessage(e)))},[user.role])
 if(!['ADMIN','CASE_OFFICER'].includes(user.role)) return null
 const run=async action=>{setBusy(true);setMessage('');try{await action();setMessage('Saved successfully.');await onUpdated()}catch(e){setMessage(apiMessage(e))}finally{setBusy(false)}}
 const safePeople=Array.isArray(people)?people:[]
 const options=role=>safePeople.filter(p=>p.active&&p.role===role).map(p=><option key={p.id} value={p.id}>{p.fullName} · {p.email||p.phone}</option>)
 return <details className="card" style={{marginBottom:16}}><summary style={{cursor:'pointer',fontWeight:700}}>Create and assign cases</summary>
 <p className="muted">First check-ins open personal cases automatically. Assign a counselor so they can review the case and listen to consented voice notes.</p>
 <form className="setup-grid" onSubmit={e=>{e.preventDefault();run(()=>api.post('/api/cases',{victimUserId:victim,title}))}}>
 <label className="field">Personal account<select value={victim} onChange={e=>setVictim(e.target.value)} required><option value="">Select person</option>{options('VICTIM')}</select></label>
 <label className="field">Case title<input required maxLength={180} value={title} onChange={e=>setTitle(e.target.value)}/></label><button className="btn btn-teal" disabled={busy}>Create case</button></form>
 <form className="setup-grid" onSubmit={e=>{e.preventDefault();run(async()=>{if(counselor)await api.post(`/api/cases/${selected}/assign`,{counselorId:counselor});if(officer&&user.role==='ADMIN')await api.post(`/api/cases/${selected}/officer`,{officerId:officer})})}}>
 <label className="field">Case<select required value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Select case</option>{cases.map(c=><option key={c.caseNumber} value={c.caseNumber}>{c.victimName} · {c.caseNumber}</option>)}</select></label>
 <label className="field">Counselor<select value={counselor} onChange={e=>setCounselor(e.target.value)}><option value="">Keep current counselor</option>{options('COUNSELOR')}</select></label>
 {user.role==='ADMIN'&&<label className="field">Case officer<select value={officer} onChange={e=>setOfficer(e.target.value)}><option value="">Keep current officer</option>{options('CASE_OFFICER')}</select></label>}
 <button className="btn btn-teal" disabled={busy||(!counselor&&!officer)}>Save assignment</button></form>
 {message&&<p role="status">{message}</p>}</details>
}
