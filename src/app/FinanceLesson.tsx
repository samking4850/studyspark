"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Lightbulb, Sparkles, Target } from "lucide-react";
import type { StudentProfile } from "./StudentOnboarding";
import { PRACTICE_HINTS, recordAttempts, recordReflection, recordSession } from "./classroom";

export type FinanceLessonData = { id:string; title:string; objective:string; short:string; explanation:string; steps:string[]; application:string; prompt:string; choices:string[]; answer:number; feedback:string };

const modules = [
  { label:"Understand", minutes:3 },
  { label:"Guided example", minutes:4 },
  { label:"Practice", minutes:5 },
  { label:"Apply & reflect", minutes:3 },
];

const exercises: Record<string, {question:string; options:string[]; correct:number; why:string}[]> = {
  "fin-interest":[
    {question:"A $2,000 investment earns 5% simple interest per year. How much interest is earned in 2 years?",options:["$100","$200","$205","$2,200"],correct:1,why:"Simple interest = $2,000 × 0.05 × 2 = $200."},
    {question:"$1,000 earns 10% compound interest annually. What is the balance after 3 years?",options:["$1,300","$1,310","$1,331","$1,400"],correct:2,why:"$1,000 × 1.10 × 1.10 × 1.10 = $1,331."},
    {question:"With a positive interest rate, which grows faster over many years?",options:["Simple interest","Compound interest","They always grow equally","Neither grows"],correct:1,why:"Compound interest earns additional interest on previously earned interest."},
  ],
  "fin-fv":[
    {question:"What is the future value of $1,000 at 5% for one year?",options:["$950","$1,005","$1,050","$1,500"],correct:2,why:"FV = $1,000 × 1.05 = $1,050."},
    {question:"What is the future value of $2,000 at 10% annually for two years?",options:["$2,200","$2,400","$2,420","$2,500"],correct:2,why:"FV = $2,000 × 1.10² = $2,420."},
    {question:"Holding the other inputs constant, what happens to future value when the number of years increases at a positive rate?",options:["It decreases","It stays the same","It increases","It becomes zero"],correct:2,why:"More compounding periods increase future value when the rate is positive."},
  ],
  "fin-pv":[
    {question:"What is the present value of $1,050 received in one year at 5%?",options:["$950","$1,000","$1,050","$1,102.50"],correct:1,why:"PV = $1,050 / 1.05 = $1,000."},
    {question:"What is the present value of $1,210 received in two years at 10% annually?",options:["$900","$1,000","$1,100","$1,210"],correct:1,why:"PV = $1,210 / 1.10² = $1,000."},
    {question:"For a fixed future payment, what happens to present value as the discount rate rises?",options:["It rises","It stays the same","It falls","It doubles"],correct:2,why:"A higher discount rate means the future payment is worth less today."},
  ],
  "fin-annuity":[
    {question:"Which payment schedule is an annuity due?",options:["$100 at the beginning of each month","$100 at the end of each month","One $100 payment today","Unequal payments on random dates"],correct:0,why:"An annuity due has equal regular payments at the beginning of each period."},
    {question:"Which feature is essential to an ordinary annuity?",options:["Unequal payments","Payments at period ends","A single payment","Payments on random dates"],correct:1,why:"Ordinary annuity payments are equal, regular, and occur at the end of each period."},
    {question:"Which is an example of an ordinary annuity?",options:["A single bonus","$200 deposited at each month-end","Different deposits at random times","A one-time tuition payment"],correct:1,why:"Equal deposits at the end of every month form an ordinary annuity."},
  ],
};

export default function FinanceLesson({lesson,profile,accountId,minutes,onBack,onMastered,alreadyMastered}:{lesson:FinanceLessonData;profile:StudentProfile;accountId:string;minutes:number;onBack:()=>void;onMastered:()=>void;alreadyMastered:boolean}) {
  const [stage,setStage]=useState(0);
  const [answers,setAnswers]=useState<Record<number,number>>({});
  const [checked,setChecked]=useState(false);
  const [reflection,setReflection]=useState("");
  const [elapsed,setElapsed]=useState(0);
  const [done,setDone]=useState(false);
  const [hinted,setHinted]=useState<Record<number,boolean>>({});
  const elapsedRef=useRef(0);
  useEffect(()=>{const id=window.setInterval(()=>setElapsed(s=>s+1),1000);return()=>window.clearInterval(id);},[]);
  useEffect(()=>{elapsedRef.current=elapsed;},[elapsed]);
  // Save the time spent in this lesson when the student leaves it, so the professor sees real study time.
  useEffect(()=>{const started=new Date();return()=>recordSession(accountId,lesson.id,started,elapsedRef.current);},[accountId,lesson.id]);
  const hints=PRACTICE_HINTS[lesson.id]||[];
  const exampleFirst=profile.explanationPreference==="Step-by-step examples";
  const realFirst=profile.explanationPreference==="Real-world applications";
  const brief=profile.explanationPreference==="Short and simple explanations";
  const games=profile.practicePreference==="Games and trivia";
  const flash=profile.practicePreference==="Flashcards and quick recall";
  const practice=[{question:lesson.prompt,options:lesson.choices,correct:lesson.answer,why:lesson.feedback},...(exercises[lesson.id]||[])];
  const correctCount=practice.filter((q,i)=>answers[i]===q.correct).length;
  const allAnswered=practice.every((_,i)=>answers[i]!==undefined);
  const mastered=correctCount>=3;
  const target=Math.max(10,Math.min(120,minutes));
  const stageMinutes=[Math.max(2,Math.round(target*.2)),Math.max(2,Math.round(target*.25)),Math.max(3,Math.round(target*.35)),Math.max(2,Math.round(target*.2))];
  const active=modules[stage];
  const progress=(stage+1)/modules.length*100;
  return <section className="finance-full-lesson">
    <button className="back-link" onClick={onBack}><ArrowLeft size={16}/> Back to lesson plan</button>
    <div className="finance-full-header"><span className="eyebrow">FIN101 · PERSONALIZED LEARNING SESSION</span><h1>{lesson.title}</h1><p><Target size={15}/> {lesson.objective}</p><div className="finance-full-meta"><span><Clock3 size={15}/> {target}-minute study plan</span><span>{Math.floor(elapsed/60)}:{String(elapsed%60).padStart(2,"0")} elapsed</span><span><Sparkles size={15}/> {profile.explanationPreference}</span></div><div className="finance-full-progress"><div style={{width:`${progress}%`}}/></div></div>
    <nav className="finance-module-nav" aria-label="Lesson sections">{modules.map((m,i)=><button key={m.label} className={stage===i?"current":""} onClick={()=>{if(i<=stage)setStage(i);}} disabled={i>stage}><span>{i+1}</span>{m.label}<small>~{stageMinutes[i]} min</small></button>)}</nav>
    <article className="finance-full-body"><div className="finance-stage-heading"><span className="eyebrow">PART {stage+1} OF 4 · {active.label.toUpperCase()}</span><h2>{["Build your understanding","Work through an example","Test what you know","Apply what you learned"][stage]}</h2><p>Suggested time: about {stageMinutes[stage]} minutes. Move at your own pace; the timer is a study goal, not a forced wait.</p></div>
      {stage===0 && <div className="finance-learning-stack">
        {realFirst&&<div className="finance-full-callout"><strong>Start with a real situation</strong><p>{lesson.application}</p><p>Think about a time this decision might matter to you.</p></div>}
        <h3>{brief?"The essential idea":"Let's understand the concept"}</h3><p>{lesson.explanation}</p>
        <div className="finance-full-callout"><strong>Before moving on</strong><p>Write down or say aloud what the concept means without looking at the explanation. Then compare your understanding with the explanation above.</p></div>
        {!realFirst&&<div className="finance-full-callout"><strong>Why it matters</strong><p>{lesson.application}</p></div>}
        <p className="finance-personal-tip">{profile.motivation?`Your reason for learning: ${profile.motivation}`:"Your learning goal: "+profile.goal}</p>
      </div>}
      {stage===1 && <div className="finance-learning-stack"><h3>{exampleFirst?"Follow along, one step at a time":"Guided worked example"}</h3><p>Use paper or a calculator. Try each step yourself before reading the next.</p>{lesson.steps.map((s,i)=><div className="finance-worked-step" key={s}><span>{i+1}</span><div><strong>Step {i+1}</strong><p>{s}</p></div></div>)}<div className="finance-full-callout"><strong>{realFirst?"Connect this to your own money":"Your turn"}</strong><p>{realFirst?lesson.application:"Change one number in the example and calculate what would happen. Explain why the result changed."}</p></div></div>}
      {stage===2 && <div className="finance-learning-stack"><p>{games?"Challenge round! Earn mastery by getting at least 3 of 4 right.":flash?"Recall practice: answer from memory before checking your notes.":"Work through all four questions. You need at least three correct to demonstrate mastery."}</p>{practice.map((q,i)=><div className="finance-practice-card" key={i}><span className="eyebrow">QUESTION {i+1} OF {practice.length}</span><h3>{q.question}</h3><div className="finance-practice-options">{q.options.map((opt,j)=><button key={j} disabled={checked} className={answers[i]===j?"chosen":""} onClick={()=>setAnswers(prev=>({...prev,[i]:j}))}>{opt}</button>)}</div>{!checked&&hints[i]&&(hinted[i]?<div className="finance-hint"><Lightbulb size={15}/><p>{hints[i]}</p></div>:<button type="button" className="finance-hint-button" onClick={()=>setHinted(prev=>({...prev,[i]:true}))}><Lightbulb size={14}/> Show a hint</button>)}{checked&&<div className={answers[i]===q.correct?"finance-answer-good":"finance-answer-wrong"}><strong>{answers[i]===q.correct?"Correct":"Review this one"}</strong><p>{q.why}</p></div>}</div>)}{!checked?<button className="primary-button" disabled={!allAnswered} onClick={()=>{setChecked(true);recordAttempts(accountId,practice.map((q,i)=>({lessonId:lesson.id,question:i,chosen:answers[i],correct:answers[i]===q.correct,hinted:Boolean(hinted[i])})));}}>Check my 4 answers <ArrowRight size={15}/></button>:<div className="finance-full-callout"><strong>Score: {correctCount} / {practice.length}</strong><p>{mastered?"Nice work. You can continue to the final application.":"Review the explanations and try again. Three correct answers are needed to continue."}</p>{!mastered&&<button className="secondary-button" onClick={()=>{setAnswers({});setChecked(false);setHinted({});}}>Retry practice</button>}</div>}</div>}
      {stage===3 && <div className="finance-learning-stack"><h3>{realFirst?"A decision you could make":"Explain it in your own words"}</h3><p>{lesson.application}</p><label htmlFor="finance-reflection"><strong>How would you explain this topic to a classmate, and when would you use it?</strong></label><textarea id="finance-reflection" rows={5} value={reflection} onChange={e=>setReflection(e.target.value)} placeholder="Write at least a couple of sentences explaining the idea and a real example..."/><div className="finance-full-callout"><strong>Quick self-check</strong><p>Can you explain the concept without notes? Can you solve a new example? Can you recognize when the idea applies?</p></div>{done&&<div className="finance-answer-good"><strong>Lesson mastered!</strong><p>You completed the practice check and reflection. Actual study time: {Math.max(1,Math.ceil(elapsed/60))} minute(s).</p></div>}</div>}
      <div className="finance-full-actions"><button className="secondary-button" disabled={stage===0} onClick={()=>setStage(s=>Math.max(0,s-1))}>Previous section</button>{stage<3?<button className="primary-button" disabled={stage===2&&(!checked||!mastered)} onClick={()=>setStage(s=>Math.min(3,s+1))}>Continue <ArrowRight size={15}/></button>:<button className="primary-button" disabled={reflection.trim().length<30||done} onClick={()=>{setDone(true);recordReflection(accountId,lesson.id,reflection.trim());if(!alreadyMastered)onMastered();}}>{done?"Completed":"Complete lesson"} <CheckCircle2 size={15}/></button>}</div>
    </article><p className="finance-disclaimer">Estimated session lengths are learning targets, not guaranteed durations. Your study time, practice answers, hints used and reflection are saved so your professor can see your progress. This demo uses structured content and onboarding preferences; it does not yet generate AI lessons.</p>
  </section>;
}
