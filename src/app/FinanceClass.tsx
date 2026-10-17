"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Brain, CalendarDays, Check, CheckCircle2, Clock3, Flame, GraduationCap, Mail, Sparkles, Target } from "lucide-react";
import type { StudentProfile } from "./StudentOnboarding";
import FinanceLesson from "./FinanceLesson";
import DiagnosticQuiz from "./DiagnosticQuiz";
import StudyAssistant from "./StudyAssistant";
import CourseNotebook from "./CourseNotebook";
import { buildLearningPlan, parseDiagnostic } from "../lib/learning-plan";
import { studyStreak, weeklyMinutes } from "./classroom";
import { loadStudentClass, markMessageRead, saveDiagnostic, saveMastery, setCompletion, type ClassInfo, type StudentClassData } from "./cloud";
import { daysUntil, formatDue } from "./professor/data";
import "./classroom.css";

// A signed-in student's view of one class. Lessons follow the sample FIN101 design in
// DemoFinanceClass; progress, assignments and messages come from the shared database.
type Lesson = { id: string; title: string; objective: string; short: string; explanation: string; steps: string[]; application: string; prompt: string; choices: string[]; answer: number; feedback: string };
const lessons: Lesson[] = [
  { id:"fin-interest", title:"Simple vs. compound interest", objective:"Explain how interest accumulates over time", short:"Understand why money grows faster when interest earns interest.", explanation:"Simple interest is calculated on the original principal. Compound interest is calculated on the principal plus previously earned interest.", steps:["Start with a $1,000 balance and a 10% annual interest rate.","After one year, the balance is $1,100.","With compound interest, year two earns 10% of $1,100, so the balance becomes $1,210."], application:"If you save for a car, compound interest means your savings can grow faster the longer you leave them invested.", prompt:"You invest $1,000 at 10% compounded annually. What is the balance after 2 years?", choices:["$1,100", "$1,200", "$1,210", "$1,300"], answer:2, feedback:"Year 1: $1,000 × 1.10 = $1,100. Year 2: $1,100 × 1.10 = $1,210." },
  { id:"fin-fv", title:"Future value", objective:"Calculate the future value of a lump sum", short:"Predict how much an investment will be worth later.", explanation:"Future value (FV) tells you what money invested today may grow into at a stated rate and time horizon. FV = PV × (1 + r)^n.", steps:["Identify the amount invested today (PV).","Convert the annual interest rate to a decimal (r).","Raise (1 + r) to the number of periods (n), then multiply by PV."], application:"An entrepreneur can use future value to estimate how much today's business savings could become in five years.", prompt:"What is the future value of $500 invested at 10% annually for 2 years?", choices:["$550", "$600", "$605", "$650"], answer:2, feedback:"FV = $500 × (1.10)^2 = $605." },
  { id:"fin-pv", title:"Present value", objective:"Discount a future cash flow to today's dollars", short:"Compare money received later with money available today.", explanation:"Present value (PV) tells you what a future amount is worth today. PV = FV ÷ (1 + r)^n.", steps:["Identify the future amount (FV).","Choose the discount rate (r) and number of periods (n).","Divide the future amount by (1 + r)^n."], application:"A business owner can compare getting paid now with receiving a larger payment next year.", prompt:"At a 10% discount rate, what is $1,100 received in one year worth today?", choices:["$900", "$1,000", "$1,100", "$1,210"], answer:1, feedback:"PV = $1,100 ÷ 1.10 = $1,000." },
  { id:"fin-annuity", title:"Annuities and loan payments", objective:"Recognize equal periodic cash flows", short:"Understand repeated payments such as loans and savings plans.", explanation:"An annuity is a series of equal payments at regular intervals. An ordinary annuity pays at the end of each period; an annuity due pays at the beginning.", steps:["Identify the repeating payment and frequency.","Determine whether payments occur at the beginning or end of each period.","Connect the cash-flow pattern to savings or loan repayment."], application:"Monthly car-loan payments are a familiar example of an annuity-like payment stream.", prompt:"Which example best represents an ordinary annuity?", choices:["One $5,000 gift today", "$100 paid at the end of each month", "Different payments on random dates", "$100 paid at the beginning of each month"], answer:1, feedback:"An ordinary annuity has equal payments at regular intervals, made at the end of each period." },
];


export default function FinanceClass({ cls, profile, userId, onBack }: { cls: ClassInfo; profile: StudentProfile; userId: string; onBack: () => void }) {
  const [classData, setClassData] = useState<StudentClassData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [planNotice, setPlanNotice] = useState("");
  const [started, setStarted] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notebook, setNotebook] = useState(false);

  const refresh = useCallback(async () => {
    try { setClassData(await loadStudentClass(cls.id, userId)); setLoadError(""); }
    catch { setLoadError("Couldn't load this class. Check your connection and try again."); }
  }, [cls.id, userId]);

  // Load now, when the window regains focus, and every 30 seconds so professor updates show up.
  useEffect(() => {
    void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(onFocus, 30_000);
    return () => { window.removeEventListener("focus", onFocus); window.clearInterval(timer); };
  }, [refresh]);

  // Lessons with saved in-progress work on this device show "Resume".
  useEffect(() => {
    try { setStarted(lessons.filter((lesson) => window.localStorage.getItem(`study-spark-lesson-v1:${userId}:${lesson.id}`) !== null).map((lesson) => lesson.id)); } catch { /* storage can be unavailable */ }
  }, [userId, active]);

  const hasLessons = cls.template === "finance-tvm";
  const completed = useMemo(() => (classData?.mastery ?? []).map((row) => row.objective_key), [classData]);
  const diagnostic = useMemo(() => parseDiagnostic(classData?.diagnostic?.results ?? null), [classData]);
  const minutes = Math.max(10, Math.min(120, profile.dailyMinutes || 30));
  const plan = useMemo(() => hasLessons ? buildLearningPlan(diagnostic, completed, minutes).map((item) => ({ ...lessons.find((lesson) => lesson.id === item.id)!, ...item })) : [], [diagnostic, completed, minutes, hasLessons]);

  if (notebook) return <CourseNotebook cls={cls} userId={userId} role="student" objectives={(classData?.objectives ?? []).map((item) => item.title)} onBack={() => { setNotebook(false); void refresh(); }} />;
  if (showDiagnostic) return <DiagnosticQuiz onCancel={() => setShowDiagnostic(false)} onComplete={(result) => { setShowDiagnostic(false); setPlanNotice("Plan updated: topics needing the most support come first. This starting-point check is not a mastery grade."); void saveDiagnostic(cls.id, userId, result).then(refresh); }} />;
  const current = lessons.find((x) => x.id === active);
  const currentPlan = plan.find((item) => item.id === active);
  if (current) return <FinanceLesson key={`${current.id}:${currentPlan?.readiness ?? "none"}:${currentPlan?.minutes ?? minutes}:${profile.practicePreference}`} lesson={current} profile={profile} minutes={currentPlan?.minutes ?? Math.min(minutes, 25)} readiness={currentPlan?.readiness} accountId={userId} classId={cls.id} userId={userId} alreadyMastered={completed.includes(current.id)} assistant={<StudyAssistant mode="student" classId={cls.id} lessonTitle={current.title} lessonContext={`${current.title}\nObjective: ${current.objective}\nExplanation: ${current.explanation}\nWorked example: ${current.steps.join(" ")}\nWhy it matters: ${current.application}`} />} onBack={() => { setActive(null); void refresh(); }} onMastered={() => { setPlanNotice("Lesson completed. Your plan has moved this topic to review and prioritized the remaining topics."); void saveMastery(cls.id, userId, current.id).then(refresh); }} />;

  const objectives = classData?.objectives ?? [];
  const lessonCount = objectives.filter((item) => item.student_lesson).length;
  const done = (assignmentId: string, objectiveKey: string | null) => objectiveKey ? completed.includes(objectiveKey) : (classData?.completions ?? []).some((row) => row.assignment_id === assignmentId);
  const assignments = classData?.assignments ?? [];
  const unread = (classData?.messages ?? []).filter((message) => !message.read_at);
  const sessions = classData?.sessions ?? [];
  const week = weeklyMinutes(sessions)[3];
  const weekGoal = minutes * 5;
  const streak = studyStreak(sessions);
  const nextDue = assignments.filter((item) => !done(item.id, item.objective_key) && daysUntil(item.due_date) >= 0)[0];

  return <section className="finance-class">
    <button className="back-link" onClick={onBack}><ArrowLeft size={16}/> My classes</button>
    <div className="finance-hero"><div><span className="finance-kicker"><GraduationCap size={15}/> ENROLLED · {cls.code}</span><h1>{cls.name}</h1><p>{cls.professorName ? `Professor ${cls.professorName}` : "Your professor"}{cls.unit ? ` · Current unit: ${cls.unit}` : ""}</p><span className="finance-tag"><CalendarDays size={15}/> {nextDue ? `Next due: ${nextDue.title} · ${formatDue(nextDue.due_date)}` : "Nothing due right now"} · {objectives.length} learning objectives</span></div><div className="finance-progress"><strong>{completed.length} / {lessonCount || objectives.length}</strong><span>lessons mastered</span><div className="finance-progress-track"><div style={{width:`${Math.min(100,completed.length/Math.max(1, lessonCount)*100)}%`}}/></div></div></div>

    {loadError && <p className="inline-error" role="alert">{loadError}</p>}
    <div className="nb-launch"><div><strong><Brain size={18} /> Course notebook</strong><p>Ask questions about your class sources with page citations, and turn them into a study guide, flashcards, quizzes, a mind map and an audio overview.</p></div><button type="button" className="primary-button" onClick={() => { setNotebook(true); window.scrollTo({ top: 0 }); }}>Open notebook <ArrowRight size={15} /></button></div>
    {!classData && !loadError && <p className="cls-note">Loading your class…</p>}

    {unread.length > 0 && <div className="cls-messages">{unread.map((message) => <div className="cls-message" key={message.id}>
      <Mail size={18}/><div><strong>Message from {cls.professorName ? `Prof. ${cls.professorName}` : "your professor"}</strong><p>{message.text}</p><small>{new Date(message.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</small></div>
      <button type="button" className="secondary-button" onClick={() => { void markMessageRead(message.id).then(refresh); }}>Got it</button>
    </div>)}</div>}

    <div className="cls-row">
      <section className="cls-card">
        <div className="cls-card-head"><div><span className="eyebrow">FROM YOUR PROFESSOR</span><h2>Assignments</h2></div><span className="cls-count">{assignments.length}</span></div>
        {assignments.length ? assignments.map((assignment) => {
          const isDone = done(assignment.id, assignment.objective_key);
          const days = daysUntil(assignment.due_date);
          const dueText = isDone ? "Done" : days < 0 ? `Overdue · was due ${formatDue(assignment.due_date)}` : days === 0 ? "Due today" : days === 1 ? "Due tomorrow" : `Due ${formatDue(assignment.due_date)}`;
          const canStart = assignment.objective_key && hasLessons && lessons.some((lesson) => lesson.id === assignment.objective_key);
          return <div className="cls-item" key={assignment.id}>
            <span className={`cls-check ${isDone ? "done" : days < 0 ? "late" : ""}`}>{isDone ? <Check size={14}/> : <BookOpen size={13}/>}</span>
            <div><strong>{assignment.title}</strong><small className={!isDone && days < 0 ? "cls-late" : ""}>{assignment.type} · ~{assignment.est_minutes} min · {dueText}</small>{assignment.instructions && !isDone && <p>{assignment.instructions}</p>}</div>
            {assignment.objective_key
              ? canStart && !isDone && <button type="button" className="small-link" onClick={() => setActive(assignment.objective_key!)}>Start <ArrowRight size={12}/></button>
              : <button type="button" className="small-link" aria-pressed={isDone} disabled={busy === assignment.id} onClick={() => { setBusy(assignment.id); void setCompletion(assignment.id, userId, !isDone).then(refresh).finally(() => setBusy(null)); }}>{isDone ? "Undo" : "Mark done"}</button>}
          </div>;
        }) : <p className="cls-empty">No assignments yet. Your professor&apos;s coursework will show up here.</p>}
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

    {hasLessons ? <>
      <div className="finance-section-heading"><div><span className="eyebrow">BUILT FOR YOUR PROFESSOR&apos;S OBJECTIVES</span><h2>Your personalized lesson plan</h2><p>Your starting-point results prioritize topics needing support; completing a lesson updates the remaining plan.</p></div></div>
      <div className="diagnostic-banner"><div><strong>{diagnostic ? "Your plan responds to your starting point" : "Know where to begin"}</strong><p>{diagnostic ? "Priority, session length, and foundation support use your topic check. Retake it when you want a fresh starting point." : "Take eight quick questions to find which course objectives need the most attention."}</p></div><button className="secondary-button" onClick={() => setShowDiagnostic(true)}>{diagnostic ? "Retake starting-point check" : "Check my starting point"}</button></div>
      {planNotice && <p className="night-notice" role="status">{planNotice}</p>}
      {profile.motivation && <div className="finance-motivation"><Sparkles size={17}/><span><strong>Remember your why:</strong> {profile.motivation}</span></div>}
      <div className="finance-lessons">{plan.map((lesson, index) => <article key={lesson.id} className="finance-lesson"><div className="finance-lesson-main"><span className="finance-lesson-index">{lesson.done ? <CheckCircle2 size={20}/> : index+1}</span><div><span className="finance-lesson-meta">DAY {lesson.day} · {lesson.minutes} MIN · {lesson.done ? "MASTERED" : started.includes(lesson.id) ? "IN PROGRESS" : "UPCOMING"}</span><h3>{lesson.title}</h3><p>{lesson.short}</p><span className="learning-approach">{lesson.approach}</span><p className="learning-reason">{lesson.reason}</p><small><Target size={13}/> {lesson.objective}</small></div><button className="primary-button" onClick={() => { setActive(lesson.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{lesson.done ? "Review lesson" : started.includes(lesson.id) ? "Resume lesson" : "Start lesson"} <ArrowRight size={15}/></button></div>
</article>)}</div>
    </> : <section className="cls-card" style={{ marginTop: 16 }}>
      <div className="cls-card-head"><div><span className="eyebrow">LEARNING OBJECTIVES</span><h2>What you&apos;ll learn in this class</h2></div></div>
      {objectives.length ? objectives.map((objective) => <div className="cls-item" key={objective.id}><span className="cls-check"><Target size={13}/></span><div><strong>{objective.title}</strong>{objective.description && <small>{objective.description}</small>}</div></div>) : <p className="cls-empty">Your professor hasn&apos;t added objectives yet.</p>}
      <p className="cls-note">Interactive lessons are available for finance classes today. Use your assignments and Study Spark&apos;s planner for this class.</p>
    </section>}
    <StudyAssistant mode="student" classId={cls.id} />
    <p className="finance-disclaimer">Your starting-point check, study time, practice answers and reflections are saved to your account and shared only with your professor for this class.</p>
  </section>;
}
