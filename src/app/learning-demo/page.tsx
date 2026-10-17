"use client";
import FinanceClass from "../FinanceClass";
import type { StudentProfile } from "../StudentOnboarding";
const profile: StudentProfile = { goal:"Understand my finance course", motivation:"Feel ready for my next class", confidence:"Some topics make sense, others don't", explanationPreference:"Detailed explanations", practicePreference:"Practice questions with hints", dailyMinutes:15, biggestChallenge:"Knowing where to start", completedAt:"2026-10-17T00:00:00Z" };
export default function LearningDemo() {
  return <main className="loop-editor"><div className="loop-heading"><a className="back-link" href="/">← Back to StudySpark</a><a className="secondary-button" href="/instructor-demo">Open instructor workspace →</a></div><p className="night-notice">Student preview · prepared FIN101 course · this preview learner’s progress and review queue save on this browser only. Your regular student account is separate.</p><FinanceClass profile={profile} accountId="learning-loop-preview-student" onBack={()=>{window.location.href="/";}}/></main>;
}
