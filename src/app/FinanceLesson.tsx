"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, Sparkles, Target } from "lucide-react";
import { foundationHelp, conceptVariants, type Readiness, type TopicId } from "../lib/learning-plan";
import FinanceExplorer from "./FinanceExplorer";
import type { StudentProfile } from "./StudentOnboarding";

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

export default function FinanceLesson({lesson,profile,minutes,onBack,onMastered,alreadyMastered,accountId,readiness}:{lesson:FinanceLessonData;profile:StudentProfile;minutes:number;onBack:()=>void;onMastered:()=>void;alreadyMastered:boolean;accountId:string;readiness?:Readiness}) {
  const [stage,setStage]=useState(0);
  const [revealedSteps,setRevealedSteps]=useState(1);
  const [showChoices,setShowChoices]=useState<Record<number,boolean>>({});
  const [furthest,setFurthest]=useState(0);
  const [loaded,setLoaded]=useState(false);
  const [saveFailed,setSaveFailed]=useState(false);
  const storageKey=`study-spark-lesson-v1:${accountId}:${lesson.id}`;
  const practiceKey=`${minutes>=20||readiness===2?"extended":"core"}:${profile.practicePreference==="Scenario-based challenges"?"scenario":"standard"}`;
  const [answers,setAnswers]=useState<Record<number,number>>({});
  const [checked,setChecked]=useState(false);
  const [reflection,setReflection]=useState("");
  const [elapsed,setElapsed]=useState(0);
  const [done,setDone]=useState(false);
  useEffect(()=>{
    try {
      const saved=JSON.parse(window.localStorage.getItem(storageKey)||"null");
      if(saved && typeof saved==="object") {
        const validStage=(value:unknown)=>Number.isInteger(value)&&Number(value)>=0&&Number(value)<=3;
        const samePractice=saved.practiceKey===practiceKey;
        if(samePractice&&validStage(saved.stage))setStage(saved.stage);
        if(samePractice&&validStage(saved.furthest))setFurthest(saved.furthest);
        if(typeof saved.reflection==="string")setReflection(saved.reflection.slice(0,5000));
        if(Number.isFinite(saved.elapsed)&&saved.elapsed>=0)setElapsed(saved.elapsed);
        if(samePractice&&saved.answers&&typeof saved.answers==="object")setAnswers(Object.fromEntries(Object.entries(saved.answers).filter(([key,value])=>/^\d+$/.test(key)&&Number.isInteger(value)&&Number(value)>=0&&Number(value)<4)) as Record<number,number>);
        setChecked(samePractice&&saved.checked===true);
        setDone(samePractice&&saved.done===true&&alreadyMastered);
      }
    } catch { setSaveFailed(true); }
    setLoaded(true);
  },[storageKey]);
  useEffect(()=>{
    if(!loaded||done)return;
    const id=window.setInterval(()=>{if(document.visibilityState==="visible")setElapsed(s=>s+1);},1000);
    return()=>window.clearInterval(id);
  },[loaded,done]);
  useEffect(()=>{
    if(!loaded)return;
    try { window.localStorage.setItem(storageKey,JSON.stringify({practiceKey,stage,furthest,answers,checked,reflection,elapsed,done}));setSaveFailed(false); }
    catch {setSaveFailed(true);}
  },[loaded,storageKey,practiceKey,stage,furthest,answers,checked,reflection,elapsed,done]);
  const exampleFirst=profile.explanationPreference==="Step-by-step examples";
  const realFirst=profile.explanationPreference==="Real-world applications";
  const brief=profile.explanationPreference==="Short and simple explanations";
  const games=profile.practicePreference==="Games and trivia";
  const flash=profile.practicePreference==="Flashcards and quick recall";
  const extension: Record<string, {question:string;options:string[];correct:number;why:string}[]>={
    "fin-interest":[{question:"You save $500 at 10% annually for 2 years. How much more interest does compounding earn than simple interest?",options:["$0","$5","$50","$105"],correct:1,why:"Simple interest earns $100. Compounding earns $105, so the difference is $5."},{question:"At 0% interest, how do simple and compound balances compare?",options:["Compound is larger","Simple is larger","Both equal the starting principal","Both become zero"],correct:2,why:"With no interest, neither balance grows."}],
    "fin-fv":[{question:"A $1,000 balance earns 10% for 3 years. How much of the final balance is interest?",options:["$100","$300","$331","$1,331"],correct:2,why:"FV = $1,000 × 1.1³ = $1,331. Subtract the $1,000 principal: $331 interest."},{question:"You calculate FV for monthly compounding. Which inputs must use matching periods?",options:["Rate and number of periods","Principal and currency symbol","Principal and year","Only the rate matters"],correct:0,why:"Use the monthly rate with the number of months, rather than an annual rate with monthly periods."}],
    "fin-pv":[{question:"At a 10% discount rate, is $1,210 in two years equivalent to $1,000 today?",options:["Yes","No, it is worth $1,100 today","No, it is worth $1,210 today","No, it is worth $900 today"],correct:0,why:"$1,210 ÷ 1.1² = $1,000 today."},{question:"Why does present value divide by the growth factor?",options:["To add another year's interest","To reverse compounding","To remove the principal","To make every payment equal"],correct:1,why:"Discounting reverses the growth that would turn money today into the future payment."}],
    "fin-annuity":[{question:"At a positive rate, which has the larger future value for the same payment and number of periods?",options:["Ordinary annuity","Annuity due","They are always equal","Neither has a future value"],correct:1,why:"Each beginning-of-period payment earns interest for one extra period."},{question:"At 0% interest, five equal deposits of $100 accumulate to what total?",options:["$100","$400","$500","$600"],correct:2,why:"Without interest, the total is simply payment × count: $100 × 5 = $500."}],
  };
  const concept=conceptVariants[lesson.id as TopicId];
  const scenarioQuestions:Record<string,{question:string;options:string[];correct:number;why:string}>={
    "fin-interest":{question:"Your club borrows $1,000 at 10% for two years. How much more would annual compounding cost than simple interest?",options:["$0","$10","$100","$210"],correct:1,why:"The simple balance is $1,200. The compounded balance is $1,210, a $10 difference."},
    "fin-fv":{question:"You set aside $500 for a course trip in two years. At 10% compounded annually, what balance would the model predict?",options:["$550","$600","$605","$650"],correct:2,why:"Grow the trip savings for two periods: $500 × 1.10² = $605, before fees or taxes."},
    "fin-pv":{question:"A business offers $1,000 today or $1,100 in a year. At a 10% discount rate, how do their values today compare?",options:["The future payment is worth $100 more today","They are equal under the model","The payment today is worth $100 more","There is no way to compare them"],correct:1,why:"$1,100 ÷ 1.10 = $1,000, so the model gives equal values today."},
    "fin-annuity":{question:"A student pays equal rent at each month's beginning. Which payment pattern does that resemble?",options:["An ordinary annuity","An annuity due","A single lump sum","Irregular payments"],correct:1,why:"Equal payments at the start of regular periods form an annuity-due pattern."},
  };
  const support=foundationHelp[lesson.id as TopicId];
  const practice=[{question:lesson.prompt,options:lesson.choices,correct:lesson.answer,why:lesson.feedback},...(exercises[lesson.id]||[]),...((minutes>=20||readiness===2)?(extension[lesson.id]||[]):[]),...(profile.practicePreference==="Scenario-based challenges"&&scenarioQuestions[lesson.id]?[scenarioQuestions[lesson.id]]:[])];
  const correctCount=practice.filter((q,i)=>answers[i]===q.correct).length;
  const allAnswered=practice.every((_,i)=>answers[i]!==undefined);
  const required=Math.ceil(practice.length*.75);
  const mastered=correctCount>=required;
  const target=Math.max(10,Math.min(120,minutes));
  const first=Math.round(target*.2),second=Math.round(target*.25),third=Math.round(target*.35);
  const stageMinutes=[first,second,third,target-first-second-third];
  const active=modules[stage];
  const progress=done?100:furthest/modules.length*100;
  function goTo(next:number) {setStage(next);setFurthest(previous=>Math.max(previous,next));}
  if(!loaded)return <p role="status">Loading your lesson…</p>;
  return <section className="finance-full-lesson">
    <button className="back-link" onClick={onBack}><ArrowLeft size={16}/> Back to lesson plan</button>
    <div className="finance-full-header"><span className="eyebrow">FIN101 · PERSONALIZED LEARNING SESSION</span><h1>{lesson.title}</h1><p><Target size={15}/> {lesson.objective}</p><div className="finance-full-meta"><span><Clock3 size={15}/> {target}-minute study plan</span><span>{Math.floor(elapsed/60)}:{String(elapsed%60).padStart(2,"0")} elapsed</span><span><Sparkles size={15}/> {profile.explanationPreference}</span></div><p className="finance-save-status" role="status">{saveFailed?"Progress could not be saved. Keep this tab open to continue.":"Progress saved on this device · leave and resume anytime"}</p><div className="finance-full-progress" role="progressbar" aria-label="Lesson completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div style={{width:`${progress}%`}}/></div></div>
    <nav className="finance-module-nav" aria-label="Lesson sections">{modules.map((m,i)=><button key={m.label} className={stage===i?"current":""} aria-current={stage===i?"step":undefined} onClick={()=>setStage(i)} disabled={i>furthest}><span>{i+1}</span>{m.label}<small>~{stageMinutes[i]} min</small></button>)}</nav>
    <div className="learning-integrity"><strong>Practice for understanding</strong><span>Try first, then see explanations. These are sample practice questions, not answers to a graded assignment.</span></div><article className="finance-full-body"><div className="finance-stage-heading"><span className="eyebrow">PART {stage+1} OF 4 · {active.label.toUpperCase()}</span><h2>{["Build your understanding","Work through an example","Test what you know","Apply what you learned"][stage]}</h2><p>Suggested time: about {stageMinutes[stage]} minutes. Move at your own pace; the timer is a study goal, not a forced wait.</p></div>
      {stage===0 && <div className="finance-learning-stack">
        {realFirst&&<div className="finance-full-callout"><strong>Start with a real situation</strong><p>{lesson.application}</p><p>Think about a time this decision might matter to you.</p></div>}
        {support&&(readiness===0||(profile.readingSupport==="Plain language and short sections"||profile.readingSupport==="Key terms defined before examples"))&&<div className="finance-full-callout"><strong>{profile.readingSupport==="Key terms defined before examples"?"Key ideas before the example":"Your foundation bridge"}</strong><p>{support.idea}</p><ol>{support.steps.map(step=><li key={step}>{step}</li>)}</ol><small>Extra support is based on this topic check or your stated preference, not a judgment about general reading ability.</small></div>}
        <h3>{brief?"The essential idea":"Let's understand the concept"}</h3><p>{brief?concept?.brief??lesson.explanation:lesson.explanation}</p>{profile.explanationPreference==="Detailed explanations"&&concept&&<div className="finance-full-callout"><strong>Go one layer deeper</strong><p>{concept.detail}</p><p><b>Formula:</b> {concept.formula}</p><p><b>Common mistake:</b> {concept.watch}</p></div>}
        <div className="finance-full-callout"><strong>Before moving on</strong><p>Write down or say aloud what the concept means without looking at the explanation. Then compare your understanding with the explanation above.</p></div>
        {!realFirst&&<div className="finance-full-callout"><strong>Why it matters</strong><p>{lesson.application}</p></div>}
        <p className="finance-personal-tip">{profile.motivation?`Your reason for learning: ${profile.motivation}`:"Your learning goal: "+profile.goal}</p>
      </div>}
      {stage===1 && <div className="finance-learning-stack"><h3>{exampleFirst?"Follow along, one step at a time":"Guided worked example"}</h3><p>Use paper or a calculator. Try each step yourself before reading the next.</p>{lesson.steps.slice(0,exampleFirst?revealedSteps:lesson.steps.length).map((s,i)=><div className="finance-worked-step" key={s}><span>{i+1}</span><div><strong>Step {i+1}</strong><p>{s}</p></div></div>)}{exampleFirst&&revealedSteps<lesson.steps.length&&<div className="finance-full-callout"><p>Predict what comes next before revealing the next step.</p><button className="secondary-button" onClick={()=>setRevealedSteps(n=>n+1)}>Reveal next step</button></div>}<FinanceExplorer lessonId={lesson.id}/><div className="finance-full-callout"><strong>{realFirst?"Connect this to your own money":"Your turn"}</strong><p>{realFirst?lesson.application:"Change one number in the example and calculate what would happen. Explain why the result changed."}</p></div></div>}
      {stage===2 && <div className="finance-learning-stack"><p>{games?"Challenge round! Work through the questions to build your score.":flash?"Recall practice: answer from memory before checking your notes.":"Answer each question before checking your work."}</p><p>Get at least {required} of {practice.length} correct to continue.</p>{practice.map((q,i)=><div className="finance-practice-card" key={i}><span className="eyebrow">QUESTION {i+1} OF {practice.length}</span><h3>{q.question}</h3>{profile.practicePreference==="Practice questions with hints"&&concept&&<details className="practice-hint"><summary>Need a hint?</summary><p>{concept.formula}</p><p>{concept.watch}</p></details>}{flash&&!showChoices[i]&&!checked?<button className="secondary-button" onClick={()=>setShowChoices(old=>({...old,[i]:true}))}>Recall first, then show choices</button>:<div className="finance-practice-options">{q.options.map((opt,j)=><button key={j} disabled={checked} aria-pressed={answers[i]===j} className={answers[i]===j?"chosen":""} onClick={()=>setAnswers(prev=>({...prev,[i]:j}))}>{opt}</button>)}</div>}{checked&&<div className={answers[i]===q.correct?"finance-answer-good":"finance-answer-wrong"}><strong>{answers[i]===q.correct?"Correct":"Review this one"}</strong><p>{q.why}</p></div>}</div>)}{!checked?<button className="primary-button" disabled={!allAnswered} onClick={()=>setChecked(true)}>Check my {practice.length} answers <ArrowRight size={15}/></button>:<div className="finance-full-callout"><strong>{games?`Practice points: ${correctCount*100} · `:""}Score: {correctCount} / {practice.length}</strong><p>{mastered?"Nice work. You can continue to the final application.":"Review the explanations and try again. Review the worked example before your next attempt."}</p>{!mastered&&<button className="secondary-button" onClick={()=>{setAnswers({});setChecked(false);}}>Retry practice</button>}</div>}</div>}
      {stage===3 && <div className="finance-learning-stack"><h3>{realFirst?"A decision you could make":"Explain it in your own words"}</h3><p>{lesson.application}</p><label htmlFor="finance-reflection"><strong>How would you explain this topic to a classmate, and when would you use it?</strong></label><textarea id="finance-reflection" rows={5} maxLength={5000} aria-describedby="reflection-help" value={reflection} onChange={e=>setReflection(e.target.value)} placeholder="Write at least a couple of sentences explaining the idea and a real example..."/>{profile.writingSupport==="Sentence starters"&&<p className="finance-personal-tip">Try: “The main idea is… For example… I would use this when…”</p>}{profile.writingSupport==="A short outline before writing"&&<p className="finance-personal-tip">Outline first: 1. Name the concept. 2. Show one calculation or example. 3. Explain when it is useful.</p>}<small id="reflection-help">{reflection.trim().length}/30 minimum characters. Include the main idea and an example; your reflection is not automatically graded.</small><div className="finance-full-callout"><strong>Quick self-check</strong><p>Can you explain the concept without notes? Can you solve a new example? Can you recognize when the idea applies?</p></div>{done&&<div className="finance-answer-good"><strong>Lesson mastered!</strong><p>You completed the practice check and reflection. Actual study time: {Math.max(1,Math.ceil(elapsed/60))} minute(s).</p></div>}</div>}
      <div className="finance-full-actions"><button className="secondary-button" disabled={stage===0} onClick={()=>setStage(s=>Math.max(0,s-1))}>Previous section</button>{stage<3?<button className="primary-button" disabled={stage===2&&(!checked||!mastered)} onClick={()=>goTo(Math.min(3,stage+1))}>Continue <ArrowRight size={15}/></button>:<button className="primary-button" disabled={reflection.trim().length<30||!checked||!mastered||done} onClick={()=>{setDone(true);if(!alreadyMastered)onMastered();}}>{done?"Completed":"Complete lesson"} <CheckCircle2 size={15}/></button>}</div>
    </article><p className="finance-disclaimer">Estimated session lengths are learning targets, not guaranteed durations. This demo uses structured content and onboarding preferences; the sample starting-point check adjusts support and practice depth. It does not generate AI lessons or assess general reading or writing ability.</p>
  </section>;
}
