"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, GraduationCap, Sparkles, Target } from "lucide-react";

export type StudentProfile = {
  goal: string;
  motivation: string;
  confidence: string;
  explanationPreference: string;
  practicePreference: string;
  dailyMinutes: number;
  biggestChallenge: string;
  studyHabits?: string;
  readingComfort?: string;
  readingSupport?: string;
  writingSupport?: string;
  completedAt: string;
};

type Draft = Omit<StudentProfile, "completedAt">;
const defaults: Draft = {
  goal: "Understand the material deeply",
  motivation: "",
  confidence: "Some topics make sense, others don't",
  explanationPreference: "Step-by-step examples",
  practicePreference: "Practice questions with hints",
  dailyMinutes: 30,
  biggestChallenge: "Knowing where to start",
  studyHabits: "Reread or highlight notes",
  readingComfort: "I follow most course readings",
  readingSupport: "Standard explanations",
  writingSupport: "Open reflection prompts",
};

const choices: { field: Exclude<keyof Draft,"dailyMinutes"|"motivation">; title: string; subtitle: string; options: string[] }[] = [
  { field: "goal", title: "What do you want to get out of your classes?", subtitle: "We'll keep this goal in mind as you learn.", options: ["Understand the material deeply", "Earn a higher grade", "Prepare for a career", "Build confidence in difficult subjects"] },
  { field: "confidence", title: "How confident do you feel about new course material?", subtitle: "There are no right or wrong answers. Your confidence helps set the tone. A separate course check will test topic knowledge.", options: ["I usually need help with the basics", "Some topics make sense, others don't", "I understand most things quickly", "I'm ready for challenging material"] },
  { field: "explanationPreference", title: "How would you like explanations presented?", subtitle: "This is a preference, not a fixed learning style. You can change it anytime.", options: ["Step-by-step examples", "Short and simple explanations", "Real-world applications", "Detailed explanations"] },
  { field: "practicePreference", title: "What kind of practice sounds most useful?", subtitle: "We’ll keep this preference with your profile. Practice formats vary by course and available content.", options: ["Practice questions with hints", "Flashcards and quick recall", "Scenario-based challenges", "Games and trivia"] },
  { field: "biggestChallenge", title: "What's your biggest challenge when studying?", subtitle: "Knowing the obstacle helps us build a better study experience.", options: ["Knowing where to start", "Staying motivated", "Understanding difficult concepts", "Remembering what I've learned", "Finding enough time"] },
  {field:"studyHabits",title:"How do you usually study?",subtitle:"Tell us your current habit so we can help you add active practice.",options:["Reread or highlight notes","Test myself with questions","Study with friends","Cram before an exam","I do not have a consistent routine"]},
  {field:"readingComfort",title:"How comfortable are you with course readings?",subtitle:"Your own reading-comfort estimate helps us choose support. This is not a measured reading grade or a literacy diagnosis.",options:["I need help unpacking course readings","I follow most course readings","I am comfortable with complex course readings"]},
  {field:"readingSupport",title:"What makes course explanations easier to follow?",subtitle:"Choose support that helps you. This survey does not measure reading level or diagnose a learning difference.",options:["Standard explanations","Plain language and short sections","Key terms defined before examples"]},
  {field:"writingSupport",title:"What helps you explain an idea in writing?",subtitle:"We can offer a starting point. Your reflections are not automatically graded for writing ability.",options:["Open reflection prompts","Sentence starters","A short outline before writing"]},
];

export default function StudentOnboarding({ name, initial, onSave, onExit, embedded=false }: { name: string; initial?: StudentProfile | null; onSave: (profile: StudentProfile) => void; onExit?:()=>void;embedded?:boolean }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(initial ? {
    goal: initial.goal, motivation: initial.motivation, confidence: initial.confidence,
    explanationPreference: initial.explanationPreference, practicePreference: initial.practicePreference,
    dailyMinutes: initial.dailyMinutes, biggestChallenge: initial.biggestChallenge,
    studyHabits:initial.studyHabits??defaults.studyHabits,readingComfort:initial.readingComfort??defaults.readingComfort,readingSupport:initial.readingSupport??defaults.readingSupport,writingSupport:initial.writingSupport??defaults.writingSupport,
  } : defaults);
  const total = choices.length+2;
  const current = choices[step];
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((previous) => ({ ...previous, [key]: value }));
  const next = () => {
    if (step < total - 1) setStep(step + 1);
    else onSave({ ...draft, completedAt: new Date().toISOString() });
  };
  const Container=embedded?"section":"main";
  return (
    <Container className={embedded?"onboarding-embedded":"onboarding-shell"}>
      <div className="onboarding-card">
        <div className="onboarding-brand"><span className="onboarding-brand-icon"><Sparkles size={20}/></span> study<span>spark</span><b>.</b></div>
        <div className="onboarding-progress-heading"><span>YOUR LEARNING PROFILE</span><span>Step {step + 1} of {total}</span></div>
        <div className="onboarding-progress" aria-label={`${Math.round(((step + 1) / total) * 100)}% complete`}><div style={{ width: `${((step + 1) / total) * 100}%` }}/></div>
        <div className="onboarding-icon">{step === total-1 ? <Target size={26}/> : <GraduationCap size={26}/>}</div>
        {step < choices.length ? (
          <>
            <h1>{step === 0 ? `Welcome, ${name.split(" ")[0]}!` : current.title}</h1>
            {step === 0 && <h2>Let's make learning work for you.</h2>}
            <p>{current.subtitle}</p>
            <div className="onboarding-options" role="group" aria-label={current.title}>
              {current.options.map((option) => <button type="button" key={option} aria-pressed={draft[current.field] === option} className={`onboarding-option ${draft[current.field] === option ? "selected" : ""}`} onClick={() => update(current.field, option)}><span>{option}</span>{draft[current.field] === option && <Check size={19}/>}</button>)}
            </div>
          </>
        ) : step === choices.length ? (
          <>
            <h1>What keeps you going?</h1>
            <p>Tell us why this class matters to you. Your lesson workspace will keep that motivation visible.</p>
            <label className="onboarding-label" htmlFor="motivation">Your motivation (optional)</label>
            <textarea id="motivation" className="onboarding-textarea" maxLength={300} value={draft.motivation} onChange={(event) => update("motivation", event.target.value)} placeholder="e.g. I want to become a nurse and feel confident helping patients." rows={5}/>
          </>
        ) : (
          <>
            <h1>How much time can you study each day?</h1>
            <p>Choose a realistic amount. You can always adjust this later.</p>
            <div className="onboarding-options" role="group" aria-label="Daily study time">
              {[15, 30, 45, 60, 90].map((minutes) => <button type="button" key={minutes} aria-pressed={draft.dailyMinutes === minutes} className={`onboarding-option ${draft.dailyMinutes === minutes ? "selected" : ""}`} onClick={() => update("dailyMinutes", minutes)}><span>{minutes} minutes</span>{draft.dailyMinutes === minutes && <Check size={19}/>}</button>)}
            </div>
          </>
        )}
        <div className="onboarding-actions">
          <button type="button" className="onboarding-back" onClick={() => setStep((previous) => Math.max(0, previous - 1))} disabled={step === 0}><ArrowLeft size={17}/> Back</button>
          <button type="button" className="onboarding-next" onClick={next}>{step === total - 1 ? "Save my profile" : "Continue"} {step === total - 1 ? <Check size={17}/> : <ArrowRight size={17}/>}</button>
        </div>
        {onExit&&<button className="night-text-button" onClick={onExit}>{embedded?"Return to profile":"Back to sign in"}</button>}
        <small className="onboarding-privacy">{embedded?"Demo profile changes stay in this tour. Your preferences do not replace a knowledge assessment.":"Demo mode: your answers are stored in this browser, not sent to a server. Your preferences do not replace a knowledge assessment."}</small>
      </div>
    </Container>
  );
}
