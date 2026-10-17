"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock3, GraduationCap, Sparkles, Target } from "lucide-react";
import type { StudentProfile } from "./StudentOnboarding";
import FinanceLesson from "./FinanceLesson";
import DiagnosticQuiz from "./DiagnosticQuiz";
import { buildLearningPlan, parseDiagnostic, type Diagnostic } from "../lib/learning-plan";

export const FINANCE_CODE = "FIN101";
export const FINANCE_NAME = "Introduction to Finance";

import ReviewQueue from "./ReviewQueue";
import ClassCommunity from "./ClassCommunity";
import { usePublication } from "./useLearningLoop";
import { sampleLessons } from "../lib/course-content";

const formatDate = (date: Date) => date.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
function addDays(date: Date, days: number) { const copy = new Date(date); copy.setDate(copy.getDate() + days); return copy; }

export default function FinanceClass({ profile, accountId, onBack, startWithDiagnostic=false, onLessonStart }: { profile: StudentProfile; accountId: string; onBack: () => void; startWithDiagnostic?:boolean;onLessonStart?:()=>void }) {
  const publication = usePublication();
  const lessons = useMemo(() => sampleLessons.map(lesson => publication?.lesson.id === lesson.id ? publication.lesson : lesson), [publication]);
  const progressId = (id: string) => publication?.lesson.id === id ? `${id}@v${publication.version}` : id;
  const storageKey = `study-spark-finance-completed:${accountId}`;
  const [diagnostic,setDiagnostic]=useState<Diagnostic|null>(null);
  const [showDiagnostic,setShowDiagnostic]=useState(startWithDiagnostic);
  const [planNotice,setPlanNotice]=useState("");
  const [completed, setCompleted] = useState<string[]>([]);
  const [started,setStarted]=useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [showCommunity,setShowCommunity]=useState(false);
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    setToday(new Date());
    setDiagnostic(null);
    try {setDiagnostic(parseDiagnostic(JSON.parse(window.localStorage.getItem(`study-spark-diagnostic-v1:${accountId}`)||"null")));}catch{/* Start without diagnostic results. */}
    try { const stored = JSON.parse(window.localStorage.getItem(storageKey) || "[]"); if (Array.isArray(stored)) setCompleted(lessons.filter(lesson=>stored.includes(progressId(lesson.id))).map(lesson=>lesson.id)); } catch { /* demo storage */ }
  }, [storageKey, publication]);
  useEffect(()=>{
    try {setStarted(lessons.filter(lesson=>window.localStorage.getItem(`study-spark-lesson-v1:${accountId}:${progressId(lesson.id)}`)!==null).map(lesson=>lesson.id));}catch{/* Storage can be unavailable. */}
  },[accountId,active,publication]);
  const current = lessons.find(x => x.id === active);
  const minutes = Math.max(10, Math.min(120, profile.dailyMinutes || 30));
  const plan = useMemo(() => buildLearningPlan(diagnostic,completed,minutes).map(item=>({...lessons.find(lesson=>lesson.id===item.id)!,...item})), [diagnostic,completed, minutes, lessons]);
  if(showDiagnostic)return <DiagnosticQuiz onCancel={()=>setShowDiagnostic(false)} onComplete={result=>{setDiagnostic(result);setShowDiagnostic(false);try{window.localStorage.setItem(`study-spark-diagnostic-v1:${accountId}`,JSON.stringify(result));setPlanNotice("Plan updated: topics needing the most support come first. This starting-point check is not a mastery grade.");}catch{setPlanNotice("Plan updated for this session, but browser storage is unavailable.");}}}/>;
  const currentPlan=plan.find(item=>item.id===active);
  if (current) return <FinanceLesson contentVersion={publication?.lesson.id===current.id?publication.version:0} key={`${progressId(current.id)}:${currentPlan?.readiness??"none"}:${currentPlan?.minutes??minutes}:${profile.practicePreference}`} lesson={current} profile={profile} minutes={currentPlan?.minutes??Math.min(minutes,25)} readiness={currentPlan?.readiness} accountId={accountId} alreadyMastered={completed.includes(current.id)} onBack={()=>setActive(null)} onMastered={()=>{const next=Array.from(new Set([...completed,current.id]));setCompleted(next);setPlanNotice("Lesson completed. Your plan has moved this topic to review and prioritized the remaining topics.");try{const saved=JSON.parse(window.localStorage.getItem(storageKey)||"[]");window.localStorage.setItem(storageKey,JSON.stringify([...new Set([...(Array.isArray(saved)?saved.filter(x=>typeof x==="string"):[]),progressId(current.id)])]));}catch{/* demo storage */}}}/>;
  if(showCommunity)return <section className="finance-class"><button className="back-link" onClick={()=>setShowCommunity(false)}><ArrowLeft size={16}/> Back to lesson plan</button><ClassCommunity accountId={accountId}/></section>;
  return <section className="finance-class">
    <button className="back-link" onClick={onBack}><ArrowLeft size={16}/> My classes</button>
    <div className="finance-hero"><div><span className="finance-kicker"><GraduationCap size={15}/> ENROLLED · {FINANCE_CODE} · DEMO COURSE</span><h1>{FINANCE_NAME}</h1><p>Professor Morgan Lee · Current unit: Time Value of Money</p><span className="finance-tag"><CalendarDays size={15}/> Sample quiz: {today ? formatDate(addDays(today, 5)) : "In 5 days"} · 4 learning objectives</span></div><div className="finance-progress"><strong>{completed.length} / 4</strong><span>lessons mastered</span><div className="finance-progress-track"><div style={{width:`${Math.min(100,completed.length/4*100)}%`}}/></div></div></div>
    <div className="community-class-banner"><div><h2>Your class common room</h2><p>Ask about course concepts and workload, or plan a study get-together.</p></div><button className="secondary-button" onClick={()=>setShowCommunity(true)}>Open class common room</button></div>
    {publication&&<div className="night-notice"><strong>Instructor-published lesson · version {publication.version}</strong><p>{publication.lesson.title} uses the reviewed content from the instructor demo. Other lessons are prepared samples.</p></div>}
    <ReviewQueue accountId={accountId}/>
    <div className="finance-info-grid"><div className="finance-info-card"><Target size={20}/><strong>Your learning goal</strong><p>{profile.goal}</p></div><div className="finance-info-card"><Clock3 size={20}/><strong>Your study schedule</strong><p>{minutes} minutes available daily · {Math.min(minutes,25)} minute core lessons</p></div><div className="finance-info-card"><Sparkles size={20}/><strong>Your personalized approach</strong><p>{profile.explanationPreference} + {profile.practicePreference.toLowerCase()}</p></div></div>
    <div className="finance-section-heading"><div><span className="eyebrow">BUILT FOR YOUR NEXT QUIZ</span><h2>Your personalized lesson plan</h2><p>Sample instructor-defined objectives. Your starting-point results prioritize topics needing support; completing a lesson updates the remaining plan.</p></div></div>
    <div className="diagnostic-banner"><div><strong>{diagnostic?"Your plan responds to your starting point":"Know where to begin"}</strong><p>{diagnostic?"Priority, session length, and foundation support use your topic check. Retake it when you want a fresh starting point.":"Take eight sample questions to find which course objectives need the most attention."}</p></div><button className="secondary-button" onClick={()=>setShowDiagnostic(true)}>{diagnostic?"Retake starting-point check":"Check my starting point"}</button></div>
    {planNotice&&<p className="night-notice" role="status">{planNotice}</p>}
    {profile.motivation && <div className="finance-motivation"><Sparkles size={17}/><span><strong>Remember your why:</strong> {profile.motivation}</span></div>}
    <div className="finance-lessons">{plan.map((lesson, index) => <article key={lesson.id} className={`finance-lesson ${active===lesson.id?"finance-lesson-active":""}`}><div className="finance-lesson-main"><span className="finance-lesson-index">{lesson.done ? <CheckCircle2 size={20}/> : index+1}</span><div><span className="finance-lesson-meta">DAY {lesson.day} · {lesson.minutes} MIN · {lesson.done ? "MASTERED" : started.includes(lesson.id)?"IN PROGRESS":"UPCOMING"}</span><h3>{lesson.title}</h3><p>{lesson.short}</p><span className="learning-approach">{lesson.approach}</span><p className="learning-reason">{lesson.reason}</p><small><Target size={13}/> {lesson.objective}</small></div><button className="primary-button" onClick={()=>{setActive(lesson.id);onLessonStart?.();window.scrollTo({top:0,behavior:"smooth"});}}>{lesson.done?"Review lesson":started.includes(lesson.id)?"Resume lesson":"Start lesson"} <ArrowRight size={15}/></button></div>
</article>)}</div>
    <p className="finance-disclaimer">Demonstration: course, professor, quiz date, questions, and objectives are sample content. This version personalizes lesson presentation using onboarding preferences and tracks completion locally; the sample diagnostic changes topic priority and practice support. AI generation and real Canvas enrollment require further development.</p>
  </section>;
}
