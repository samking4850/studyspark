"use client";
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import s from './schools.module.css';
export default function DemoForm(){
 const [brief,setBrief]=useState(''),[notice,setNotice]=useState('');
 return <form className={s.form} onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);setBrief(`StudySpark pilot brief\nSchool: ${data.get('organization')}\nSchool type: ${data.get('type')}\nEducator role: ${data.get('role')}\nStudy challenge: ${data.get('message')||'To define together'}\nProposed start: one educator, one course or small cohort.\nTo agree: budget owner, learning targets, access and support needs, evaluation period, privacy, accessibility and pricing.\nProposed measures: participation, repeat practice, topic-check results and educator workload.`);setNotice('Your brief is ready below. Nothing was sent.');}}>
  <label>School or institution<input name="organization" autoComplete="organization" required maxLength={150} placeholder="School name"/></label>
  <div className={s.formRow}><label>School type<select name="type" defaultValue="Private college"><option>Private college</option><option>Independent high school</option><option>Specialist learning-support school</option><option>Other institution</option></select></label><label>Your role<select name="role" defaultValue="Educator / instructor"><option>Educator / instructor</option><option>School or program leader</option><option>Learning-support specialist</option><option>Other</option></select></label></div>
  <label>What study challenge would you explore?<textarea name="message" rows={3} maxLength={1000} placeholder="For example: helping students choose their next practice topic."/></label>
  <button className={s.button} type="submit">Prepare my brief <ArrowRight size={16}/></button>
  <p className={s.formHint}>This planning brief stays on this page. It does not register your school or send a request.</p>
  {brief&&<><pre style={{whiteSpace:'pre-wrap',fontFamily:'inherit',lineHeight:1.7,fontSize:14}}>{brief}</pre><button type="button" className={s.button} onClick={()=>{const url=URL.createObjectURL(new Blob([brief],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download='StudySpark-School-Pilot-Brief.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice('Pilot brief downloaded. Share it with your team.');}}>Download pilot brief</button></>}{notice&&<p role="status" className={s.success}>{notice}</p>}
 </form>;
}
