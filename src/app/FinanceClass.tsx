"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock3, GraduationCap, Sparkles, Target } from "lucide-react";
import type { StudentProfile } from "./StudentOnboarding";
import FinanceLesson from "./FinanceLesson";
import DiagnosticQuiz from "./DiagnosticQuiz";
import { buildLearningPlan, parseDiagnostic, type Diagnostic } from "../lib/learning-plan";

export const FINANCE_CODE = "FIN101";
export const FINANCE_NAME = "Introduction to Finance";

type Lesson = { id: string; title: string; objective: string; short: string; explanation: string; steps: string[]; application: string; prompt: string; choices: string[]; answer: number; feedback: string };
const lessons: Lesson[] = [
  { id:"fin-interest", title:"Simple vs. compound interest", objective:"Explain how interest accumulates over time", short:"Understand why money grows faster when interest earns interest.", explanation:"Simple interest is calculated on the original principal. Compound interest is calculated on the principal plus previously earned interest.", steps:["Start with a $1,000 balance and a 10% annual interest rate.","After one year, the balance is $1,100.","With compound interest, year two earns 10% of $1,100, so the balance becomes $1,210."], application:"If you save for a car, compound interest means your savings can grow faster the longer you leave them invested.", prompt:"You invest $1,000 at 10% compounded annually. What is the balance after 2 years?", choices:["$1,100", "$1,200", "$1,210", "$1,300"], answer:2, feedback:"Year 1: $1,000 × 1.10 = $1,100. Year 2: $1,100 × 1.10 = $1,210." },
  { id:"fin-fv", title:"Future value", objective:"Calculate the future value of a lump sum", short:"Predict how much an investment will be worth later.", explanation:"Future value (FV) tells you what money invested today may grow into at a stated rate and time horizon. FV = PV × (1 + r)^n.", steps:["Identify the amount invested today (PV).","Convert the annual interest rate to a decimal (r).","Raise (1 + r) to the number of periods (n), then multiply by PV."], application:"An entrepreneur can use future value to estimate how much today's business savings could become in five years.", prompt:"What is the future value of $500 invested at 10% annually for 2 years?", choices:["$550", "$600", "$605", "$650"], answer:2, feedback:"FV = $500 × (1.10)^2 = $605." },
  { id:"fin-pv", title:"Present value", objective:"Discount a future cash flow to today's dollars", short:"Compare money received later with money available today.", explanation:"Present value (PV) tells you what a future amount is worth today. PV = FV ÷ (1 + r)^n.", steps:["Identify the future amount (FV).","Choose the discount rate (r) and number of periods (n).","Divide the future amount by (1 + r)^n."], application:"A business owner can compare getting paid now with receiving a larger payment next year.", prompt:"At a 10% discount rate, what is $1,100 received in one year worth today?", choices:["$900", "$1,000", "$1,100", "$1,210"], answer:1, feedback:"PV = $1,100 ÷ 1.10 = $1,000." },
  { id:"fin-annuity", title:"Annuities and loan payments", objective:"Recognize equal periodic cash flows", short:"Understand repeated payments such as loans and savings plans.", explanation:"An annuity is a series of equal payments at regular intervals. An ordinary annuity pays at the end of each period; an annuity due pays at the beginning.", steps:["Identify the repeating payment and frequency.","Determine whether payments occur at the beginning or end of each period.","Connect the cash-flow pattern to savings or loan repayment."], application:"Monthly car-loan payments are a familiar example of an annuity-like payment stream.", prompt:"Which example best represents an ordinary annuity?", choices:["One $5,000 gift today", "$100 paid at the end of each month", "Different payments on random dates", "$100 paid at the beginning of each month"], answer:1, feedback:"An ordinary annuity has equal payments at regular intervals, made at the end of each period." },
];

const formatDate = (date: Date) => date.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
function addDays(date: Date, days: number) { const copy = new Date(date); copy.setDate(copy.getDate() + days); return copy; }

export default function FinanceClass({ profile, accountId, onBack, startWithDiagnostic=false }: { profile: StudentProfile; accountId: string; onBack: () => void; startWithDiagnostic?:boolean }) {
  const storageKey = `study-spark-finance-completed:${accountId}`;
  const [diagnostic,setDiagnostic]=useState<Diagnostic|null>(null);
  const [showDiagnostic,setShowDiagnostic]=useState(startWithDiagnostic);
  const [planNotice,setPlanNotice]=useState("");
  const [completed, setCompleted] = useState<string[]>([]);
  const [started,setStarted]=useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    setToday(new Date());
    setDiagnostic(null);
    try {setDiagnostic(parseDiagnostic(JSON.parse(window.localStorage.getItem(`study-spark-diagnostic-v1:${accountId}`)||"null")));}catch{/* Start without diagnostic results. */}
    try { const stored = JSON.parse(window.localStorage.getItem(storageKey) || "[]"); if (Array.isArray(stored)) setCompleted([...new Set(stored.filter((x): x is string => typeof x === "string" && lessons.some(lesson=>lesson.id===x)))]); } catch { /* demo storage */ }
  }, [storageKey]);
  useEffect(()=>{
    try {setStarted(lessons.filter(lesson=>window.localStorage.getItem(`study-spark-lesson-v1:${accountId}:${lesson.id}`)!==null).map(lesson=>lesson.id));}catch{/* Storage can be unavailable. */}
  },[accountId,active]);
  const current = lessons.find(x => x.id === active);
  const minutes = Math.max(10, Math.min(120, profile.dailyMinutes || 30));
  const plan = useMemo(() => buildLearningPlan(diagnostic,completed,minutes).map(item=>({...lessons.find(lesson=>lesson.id===item.id)!,...item})), [diagnostic,completed, minutes]);
  if(showDiagnostic)return <DiagnosticQuiz onCancel={()=>setShowDiagnostic(false)} onComplete={result=>{setDiagnostic(result);setShowDiagnostic(false);try{window.localStorage.setItem(`study-spark-diagnostic-v1:${accountId}`,JSON.stringify(result));setPlanNotice("Plan updated: topics needing the most support come first. This starting-point check is not a mastery grade.");}catch{setPlanNotice("Plan updated for this session, but browser storage is unavailable.");}}}/>;
  const currentPlan=plan.find(item=>item.id===active);
  if (current) return <FinanceLesson key={`${current.id}:${currentPlan?.readiness??"none"}:${currentPlan?.minutes??minutes}:${profile.practicePreference}`} lesson={current} profile={profile} minutes={currentPlan?.minutes??Math.min(minutes,25)} readiness={currentPlan?.readiness} accountId={accountId} alreadyMastered={completed.includes(current.id)} onBack={()=>setActive(null)} onMastered={()=>{const next=Array.from(new Set([...completed,current.id]));setCompleted(next);setPlanNotice("Lesson completed. Your plan has moved this topic to review and prioritized the remaining topics.");try{window.localStorage.setItem(storageKey,JSON.stringify(next));}catch{/* demo storage */}}}/>;
  return <section className="finance-class">
    <button className="back-link" onClick={onBack}><ArrowLeft size={16}/> My classes</button>
    <div className="finance-hero"><div><span className="finance-kicker"><GraduationCap size={15}/> ENROLLED · {FINANCE_CODE} · DEMO COURSE</span><h1>{FINANCE_NAME}</h1><p>Professor Morgan Lee · Current unit: Time Value of Money</p><span className="finance-tag"><CalendarDays size={15}/> Sample quiz: {today ? formatDate(addDays(today, 5)) : "In 5 days"} · 4 learning objectives</span></div><div className="finance-progress"><strong>{completed.length} / 4</strong><span>lessons mastered</span><div className="finance-progress-track"><div style={{width:`${Math.min(100,completed.length/4*100)}%`}}/></div></div></div>
    <div className="finance-info-grid"><div className="finance-info-card"><Target size={20}/><strong>Your learning goal</strong><p>{profile.goal}</p></div><div className="finance-info-card"><Clock3 size={20}/><strong>Your study schedule</strong><p>{minutes} minutes available daily · {Math.min(minutes,25)} minute core lessons</p></div><div className="finance-info-card"><Sparkles size={20}/><strong>Your personalized approach</strong><p>{profile.explanationPreference} + {profile.practicePreference.toLowerCase()}</p></div></div>
    <div className="finance-section-heading"><div><span className="eyebrow">BUILT FOR YOUR NEXT QUIZ</span><h2>Your personalized lesson plan</h2><p>Sample instructor-defined objectives. Your starting-point results prioritize topics needing support; completing a lesson updates the remaining plan.</p></div></div>
    <div className="diagnostic-banner"><div><strong>{diagnostic?"Your plan responds to your starting point":"Know where to begin"}</strong><p>{diagnostic?"Priority, session length, and foundation support use your topic check. Retake it when you want a fresh starting point.":"Take eight sample questions to find which course objectives need the most attention."}</p></div><button className="secondary-button" onClick={()=>setShowDiagnostic(true)}>{diagnostic?"Retake starting-point check":"Check my starting point"}</button></div>
    {planNotice&&<p className="night-notice" role="status">{planNotice}</p>}
    {profile.motivation && <div className="finance-motivation"><Sparkles size={17}/><span><strong>Remember your why:</strong> {profile.motivation}</span></div>}
    <div className="finance-lessons">{plan.map((lesson, index) => <article key={lesson.id} className={`finance-lesson ${active===lesson.id?"finance-lesson-active":""}`}><div className="finance-lesson-main"><span className="finance-lesson-index">{lesson.done ? <CheckCircle2 size={20}/> : index+1}</span><div><span className="finance-lesson-meta">DAY {lesson.day} · {lesson.minutes} MIN · {lesson.done ? "MASTERED" : started.includes(lesson.id)?"IN PROGRESS":"UPCOMING"}</span><h3>{lesson.title}</h3><p>{lesson.short}</p><span className="learning-approach">{lesson.approach}</span><p className="learning-reason">{lesson.reason}</p><small><Target size={13}/> {lesson.objective}</small></div><button className="primary-button" onClick={()=>{setActive(lesson.id);window.scrollTo({top:0,behavior:"smooth"});}}>{lesson.done?"Review lesson":started.includes(lesson.id)?"Resume lesson":"Start lesson"} <ArrowRight size={15}/></button></div>
</article>)}</div>
    <p className="finance-disclaimer">Demonstration: course, professor, quiz date, questions, and objectives are sample content. This version personalizes lesson presentation using onboarding preferences and tracks completion locally; the sample diagnostic changes topic priority and practice support. AI generation and real Canvas enrollment require further development.</p>
  </section>;
}
