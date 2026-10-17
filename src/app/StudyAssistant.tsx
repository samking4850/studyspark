"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Send, Sparkles, X } from "lucide-react";
import { supabase } from "./cloud";
import "./classroom.css";

type Turn = { role: "user" | "assistant"; content: string };

const STARTERS = {
  student: ["Explain this a different way", "Give me a hint for the next step", "Show me a similar example", "Quiz me on this"],
  professor: ["Who needs help this week, and why?", "Which topic should I reteach?", "Draft a check-in message for students who are behind", "Suggest a 5-minute in-class activity"],
} as const;

// "Ask Spark": the AI assistant panel. Students get a tutor that won't hand over answers;
// professors get a class assistant grounded in their class data (see supabase/functions/assistant).
export default function StudyAssistant({ mode, classId, lessonContext, lessonTitle }: { mode: "student" | "professor"; classId: string; lessonContext?: string; lessonTitle?: string }) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [turns, busy]);

  async function ask(question: string) {
    const content = question.trim().slice(0, 2000);
    if (!content || busy) return;
    const history: Turn[] = [...turns, { role: "user", content }];
    setTurns(history);
    setText("");
    setNotice("");
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("assistant", { body: { mode, classId, lessonContext, messages: history } });
    setBusy(false);
    if (error) {
      let message = "The assistant couldn't answer right now. Try again in a moment.";
      if (error instanceof FunctionsHttpError) {
        try { const payload = await error.context.json(); if (typeof payload?.message === "string") message = payload.message; } catch { /* keep the default message */ }
      }
      setNotice(message);
      setTurns(history.slice(0, -1));
      setText(content);
      return;
    }
    setTurns([...history, { role: "assistant", content: String((data as { reply?: string })?.reply ?? "") }]);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(text);
  }

  const title = mode === "student" ? (lessonTitle ? `Ask Spark about ${lessonTitle}` : "Ask Spark, your study tutor") : "Ask Spark about your class";
  const intro = mode === "student"
    ? "Spark explains, gives hints and makes practice examples. It won't give answers to practice or graded work, so you build the skill yourself."
    : "Spark answers from this class's data: progress, study time, practice results and check-ins. It can also draft messages for you to review.";

  if (!open) {
    return <button type="button" className="spark-launch" onClick={() => setOpen(true)}><Sparkles size={17} /> {title}</button>;
  }

  return <section className="spark-panel" aria-labelledby={`spark-title-${mode}`}>
    <header className="spark-head">
      <span className="spark-icon"><Sparkles size={17} /></span>
      <div><h2 id={`spark-title-${mode}`}>{title}</h2><p>{intro}</p></div>
      <button type="button" className="spark-close" aria-label="Close the assistant" onClick={() => setOpen(false)}><X size={17} /></button>
    </header>
    <div className="spark-messages" ref={listRef} aria-live="polite">
      {!turns.length && <div className="spark-starters">{STARTERS[mode].map((starter) => <button type="button" key={starter} onClick={() => void ask(starter)} disabled={busy}>{starter}</button>)}</div>}
      {turns.map((turn, index) => <div key={index} className={`spark-turn ${turn.role}`}><p>{turn.content}</p></div>)}
      {busy && <div className="spark-turn assistant"><p className="spark-typing">Spark is thinking…</p></div>}
    </div>
    {notice && <p className="spark-notice" role="alert">{notice}</p>}
    <form className="spark-form" onSubmit={submit}>
      <label className="sr-only" htmlFor={`spark-input-${mode}`}>Your question</label>
      <textarea id={`spark-input-${mode}`} rows={2} value={text} maxLength={2000} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void ask(text); } }} placeholder={mode === "student" ? "Ask about this topic…" : "Ask about your students or plan a lesson…"} />
      <button type="submit" className="primary-button" disabled={busy || !text.trim()} aria-label="Send"><Send size={15} /></button>
    </form>
    <small className="spark-foot">AI can make mistakes. {mode === "student" ? "Check important ideas with your notes or professor." : "Review drafts before sending."}</small>
  </section>;
}
