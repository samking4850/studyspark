"use client";

import { FormEvent, useState } from "react";
import { ArrowRight } from "lucide-react";
import { signIn, signOut, signUp } from "./cloud";
import { DEMO_PROFESSOR } from "./professor/data";

// Professor sign-in and sign-up on the shared landing page; opens the professor portal on success.
export default function ProfessorSignInForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const result = mode === "signin" ? await signIn(email, password) : await signUp(name, email, password, "professor");
    if (result.error || !result.profile) { setBusy(false); setError(result.error || "Couldn't sign in. Please try again."); return; }
    if (result.profile.role !== "professor") {
      await signOut();
      setBusy(false);
      setError("That's a student account. Choose “I'm a student” to sign in.");
      return;
    }
    window.location.assign("/professor");
  }

  return <>
    <div className="auth-card-heading">
      <span className="eyebrow">FOR INSTRUCTORS</span>
      <h2 id="auth-heading">{mode === "signin" ? "Professor sign in" : "Create a professor account"}</h2>
      <p>Create classes, assign coursework, see each student&apos;s progress, and reach out to students who need help.</p>
    </div>
    <div className="auth-tabs" role="tablist" aria-label="Professor account access">
      <button type="button" role="tab" aria-selected={mode === "signin"} className={mode === "signin" ? "selected" : ""} onClick={() => { setMode("signin"); setError(""); }}>Sign in</button>
      <button type="button" role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "selected" : ""} onClick={() => { setMode("signup"); setError(""); }}>New professor</button>
    </div>
    <form className="auth-form" onSubmit={submit}>
      {mode === "signup" && <label>Your name<input value={name} onChange={(event) => { setName(event.target.value); setError(""); }} autoComplete="name" placeholder="Morgan Lee" required /></label>}
      <label>Email<input value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} type="email" autoComplete={mode === "signin" ? "username" : "email"} placeholder="you@college.edu" required /></label>
      <label>Password<input value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={6} placeholder={mode === "signin" ? "Your password" : "At least 6 characters"} required /></label>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <button type="submit" className="primary-button" disabled={busy}>{busy ? "One moment…" : mode === "signin" ? <>Sign in to professor portal <ArrowRight size={15} /></> : <>Create account <ArrowRight size={15} /></>}</button>
    </form>
    {mode === "signin" && <div className="scratch-login">
      <div><strong>Just exploring?</strong><p>Use the demo professor account.</p></div>
      <button type="button" className="secondary-button" onClick={() => { setEmail(DEMO_PROFESSOR.email); setPassword(DEMO_PROFESSOR.password); setError(""); }}>Use demo professor</button>
      <small>{DEMO_PROFESSOR.email} · {DEMO_PROFESSOR.password}</small>
    </div>}
    <p className="auth-demo-note">Accounts, classes and student progress are saved securely. Students only see their own work; professors only see students in their classes.</p>
  </>;
}
