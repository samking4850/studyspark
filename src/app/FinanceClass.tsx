"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, CheckCircle2, Clock3, Flame, GraduationCap, Mail, Sparkles, Target } from "lucide-react";
import type { StudentProfile } from "./StudentOnboarding";
import FinanceLesson from "./FinanceLesson";
import { DIAGNOSTIC_QUESTIONS, readActivity, readDiagnostic, saveDiagnostic, storageChangeEvent, studyStreak, weeklyMinutes, type Activity, type Diagnostic } from "./classroom";
import { daysUntil, formatDue, isAssignedTo, markAssignmentDone, markMessageRead, readProfessorData, studentKeyFor, type ProfessorData } from "./professor/data";
import "./classroom.css";

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

export default function FinanceClass({ profile, accountId, onBack }: { profile: StudentProfile; accountId: string; onBack: () => void }) {
  const storageKey = `study-spark-finance-completed:${accountId}`;
  const studentKey = studentKeyFor(accountId);
  const [completed, setCompleted] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [today, setToday] = useState<Date | null>(null);
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [classData, setClassData] = useState<ProfessorData | null>(null);
  const [takingCheck, setTakingCheck] = useState(false);

  const refresh = useCallback(() => {
    setDiagnostic(readDiagnostic(accountId));
    setActivity(readActivity(accountId));
    setClassData(readProfessorData());
  }, [accountId]);

  useEffect(() => {
    setToday(new Date());
    try { const stored = JSON.parse(window.localStorage.getItem(storageKey) || "[]"); if (Array.isArray(stored)) setCompleted(stored.filter((x): x is string => typeof x === "string")); } catch { /* demo storage */ }
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener(storageChangeEvent, refresh);
    return () => { window.removeEventListener("storage", refresh); window.removeEventListener(storageChangeEvent, refresh); };
  }, [storageKey, refresh]);

  const current = lessons.find(x => x.id === active);
  const minutes = Math.max(10, Math.min(120, profile.dailyMinutes || 30));
  // Lessons the diagnostic check-in shows the student needs most come first.
  const plan = useMemo(() => {
    const ordered = diagnostic ? [...lessons].sort((a, b) => Number(diagnostic.results[a.id] ?? false) - Number(diagnostic.results[b.id] ?? false)) : lessons;
    return ordered.map((lesson, i) => ({ ...lesson, day:i + 1, minutes:Math.min(minutes, 25), done:completed.includes(lesson.id), focus: diagnostic ? diagnostic.results[lesson.id] === false : false, review: diagnostic ? diagnostic.results[lesson.id] === true : false }));
  }, [completed, minutes, diagnostic]);

  if (current) return <FinanceLesson key={current.id} lesson={current} profile={profile} accountId={accountId} minutes={Math.min(minutes,25)} alreadyMastered={completed.includes(current.id)} onBack={()=>{setActive(null);refresh();}} onMastered={()=>{const next=Array.from(new Set([...completed,current.id]));setCompleted(next);try{window.localStorage.setItem(storageKey,JSON.stringify(next));window.dispatchEvent(new Event(storageChangeEvent));}catch{/* demo storage */}}}/>;

  const assignments = (classData?.assignments ?? []).filter((assignment) => assignment.classCode === FINANCE_CODE && isAssignedTo(assignment, studentKey)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const messages = (classData?.messages ?? []).filter((message) => message.studentKey === studentKey).sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  const unread = messages.filter((message) => !message.readAt);
  const week = activity ? weeklyMinutes(activity)[3] : 0;
  const weekGoal = minutes * 5;
  const streak = activity ? studyStreak(activity) : 0;

  return <section className="finance-class">
    <button className="back-link" onClick={onBack}><ArrowLeft size={16}/> My classes</button>
    <div className="finance-hero"><div><span className="finance-kicker"><GraduationCap size={15}/> ENROLLED · {FINANCE_CODE} · DEMO COURSE</span><h1>{FINANCE_NAME}</h1><p>Professor Morgan Lee · Current unit: Time Value of Money</p><span className="finance-tag"><CalendarDays size={15}/> Next quiz: {today ? formatDate(addDays(today, 5)) : "In 5 days"} · 4 learning objectives</span></div><div className="finance-progress"><strong>{completed.length} / 4</strong><span>lessons mastered</span><div className="finance-progress-track"><div style={{width:`${Math.min(100,completed.length/4*100)}%`}}/></div></div></div>

    {unread.length > 0 && <div className="cls-messages">{unread.map((message) => <div className="cls-message" key={message.id}>
      <Mail size={18}/><div><strong>Message from Prof. {message.from}</strong><p>{message.text}</p><small>{new Date(message.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</small></div>
      <button type="button" className="secondary-button" onClick={() => { markMessageRead(message.id); refresh(); }}>Got it</button>
    </div>)}</div>}

    <div className="cls-row">
      <section className="cls-card">
        <div className="cls-card-head"><div><span className="eyebrow">FROM YOUR PROFESSOR</span><h2>Assignments</h2></div><span className="cls-count">{assignments.length}</span></div>
        {assignments.length ? assignments.map((assignment) => {
          const lessonDone = assignment.objectiveId ? completed.includes(assignment.objectiveId) : (classData?.received[assignment.id] ?? []).includes(studentKey);
          const days = daysUntil(assignment.dueDate);
          const dueText = lessonDone ? "Done" : days < 0 ? `Overdue · was due ${formatDue(assignment.dueDate)}` : days === 0 ? "Due today" : days === 1 ? "Due tomorrow" : `Due ${formatDue(assignment.dueDate)}`;
          return <div className="cls-item" key={assignment.id}>
            <span className={`cls-check ${lessonDone ? "done" : days < 0 ? "late" : ""}`}>{lessonDone ? <Check size={14}/> : <BookOpen size={13}/>}</span>
            <div><strong>{assignment.title}</strong><small className={!lessonDone && days < 0 ? "cls-late" : ""}>{assignment.type} · ~{assignment.estMinutes} min · {dueText}</small>{assignment.instructions && !lessonDone && <p>{assignment.instructions}</p>}</div>
            {assignment.objectiveId
              ? !lessonDone && <button type="button" className="small-link" onClick={() => setActive(assignment.objectiveId!)}>Start <ArrowRight size={12}/></button>
              : <button type="button" className="small-link" aria-pressed={lessonDone} onClick={() => { markAssignmentDone(assignment.id, studentKey, !lessonDone); refresh(); }}>{lessonDone ? "Undo" : "Mark done"}</button>}
          </div>;
        }) : <p className="cls-empty">No assignments yet. Your professor's coursework will show up here.</p>}
      </section>
      <section className="cls-card">
        <div className="cls-card-head"><div><span className="eyebrow">THIS WEEK</span><h2>Your study habit</h2></div></div>
        <div className="cls-stats">
          <div><Clock3 size={18}/><strong>{week} min</strong><span>studied in the last 7 days</span></div>
          <div><Flame size={18}/><strong>{streak} {streak === 1 ? "day" : "days"}</strong><span>study streak</span></div>
        </div>
        <div className="cls-goal"><div className="cls-goal-row"><span>Weekly goal: {weekGoal} min ({minutes} min × 5 days)</span><b>{Math.min(100, Math.round(week / weekGoal * 100))}%</b></div><div className="finance-progress-track"><div style={{width:`${Math.min(100, week / weekGoal * 100)}%`}}/></div></div>
        <p className="cls-note">{week >= weekGoal ? "You hit your goal this week. Keep the streak going." : week > 0 ? `${weekGoal - week} more minutes to reach this week's goal.` : "Start a lesson to begin this week's streak. Time in lessons counts automatically."}</p>
      </section>
    </div>

    <div className="finance-info-grid"><div className="finance-info-card"><Target size={20}/><strong>Your learning goal</strong><p>{profile.goal}</p></div><div className="finance-info-card"><Clock3 size={20}/><strong>Your study schedule</strong><p>{minutes} minutes available daily · {Math.min(minutes,25)} minute core lessons</p></div><div className="finance-info-card"><Sparkles size={20}/><strong>Your personalized approach</strong><p>{profile.explanationPreference} + {profile.practicePreference.toLowerCase()}</p></div></div>

    {!diagnostic && !takingCheck && <div className="cls-diagnostic-cta"><div><strong>Take a 2-minute check-in</strong><p>Four quick questions show what you already know, so your lesson plan starts with what you need most.</p></div><button type="button" className="primary-button" onClick={() => setTakingCheck(true)}>Start check-in <ArrowRight size={15}/></button></div>}
    {takingCheck && <DiagnosticCheck onDone={(results) => { setDiagnostic(saveDiagnostic(accountId, results)); setTakingCheck(false); setActivity(readActivity(accountId)); }} onCancel={() => setTakingCheck(false)} />}

    <div className="finance-section-heading"><div><span className="eyebrow">BUILT FOR YOUR NEXT QUIZ</span><h2>Your personalized lesson plan</h2><p>{diagnostic ? "Ordered by your check-in: topics you missed come first, topics you already know become quick reviews." : "Professor-defined objectives, ordered from foundations to applications. Lessons adapt their presentation to your onboarding preferences."}</p></div>{diagnostic && <button type="button" className="text-button" onClick={() => setTakingCheck(true)}>Retake check-in</button>}</div>
    {profile.motivation && <div className="finance-motivation"><Sparkles size={17}/><span><strong>Remember your why:</strong> {profile.motivation}</span></div>}
    <div className="finance-lessons">{plan.map((lesson, index) => <article key={lesson.id} className={`finance-lesson ${active===lesson.id?"finance-lesson-active":""}`}><div className="finance-lesson-main"><span className="finance-lesson-index">{lesson.done ? <CheckCircle2 size={20}/> : index+1}</span><div><span className="finance-lesson-meta">DAY {lesson.day} · {lesson.minutes} MIN · {lesson.done ? "MASTERED" : "UPCOMING"}</span>{!lesson.done && lesson.focus && <span className="cls-badge focus">Focus: missed in your check-in</span>}{!lesson.done && lesson.review && <span className="cls-badge review">Quick review: you got this right</span>}<h3>{lesson.title}</h3><p>{lesson.short}</p><small><Target size={13}/> {lesson.objective}</small></div><button className="primary-button" onClick={()=>{setActive(lesson.id);}}>{lesson.done?"Review lesson":"Start lesson"} <ArrowRight size={15}/></button></div>
</article>)}</div>
    <p className="finance-disclaimer">Demonstration: course, professor, quiz date, questions, and objectives are sample content. Your check-in results, study time, practice answers and reflections are shared with your professor in this demo and stored in this browser only.</p>
  </section>;
}

function DiagnosticCheck({ onDone, onCancel }: { onDone: (results: Record<string, boolean>) => void; onCancel: () => void }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const allAnswered = DIAGNOSTIC_QUESTIONS.every((_, i) => answers[i] !== undefined);
  return <section className="cls-card cls-check-in" aria-labelledby="check-in-title">
    <div className="cls-card-head"><div><span className="eyebrow">2-MINUTE CHECK-IN</span><h2 id="check-in-title">What do you already know?</h2><p className="cls-note">This isn't graded. Pick your best guess, or skip the ones you don't know.</p></div></div>
    {DIAGNOSTIC_QUESTIONS.map((question, i) => <fieldset className="cls-question" key={question.objectiveId}>
      <legend>{i + 1}. {question.question}</legend>
      <div className="finance-practice-options">{question.options.map((option, j) => <button type="button" key={option} className={answers[i] === j ? "chosen" : ""} aria-pressed={answers[i] === j} onClick={() => setAnswers((prev) => ({ ...prev, [i]: j }))}>{option}</button>)}
        <button type="button" className={answers[i] === -1 ? "chosen" : ""} aria-pressed={answers[i] === -1} onClick={() => setAnswers((prev) => ({ ...prev, [i]: -1 }))}>I don&apos;t know yet</button></div>
    </fieldset>)}
    <div className="finance-full-actions"><button type="button" className="secondary-button" onClick={onCancel}>Cancel</button><button type="button" className="primary-button" disabled={!allAnswered} onClick={() => onDone(Object.fromEntries(DIAGNOSTIC_QUESTIONS.map((question, i) => [question.objectiveId, answers[i] === question.correct])))}>See my plan <ArrowRight size={15}/></button></div>
  </section>;
}
