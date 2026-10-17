"use client";

import { FormEvent, useState } from "react";
import { ArrowRight } from "lucide-react";
import { DEMO_PROFESSOR, professorSessionKey, readProfessorData } from "./professor/data";

// Professor sign-in on the shared landing page; opens the professor portal on success.
export default function ProfessorSignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const match = readProfessorData().professors.find((item) => item.email.toLowerCase() === email.trim().toLowerCase() && item.password === password);
    if (!match) {
      setError("That email and password don't match a professor account. Use the demo professor account below.");
      return;
    }
    window.sessionStorage.setItem(professorSessionKey, match.id);
    window.location.assign("/professor");
  }

  return <>
    <div className="auth-card-heading">
      <span className="eyebrow">FOR INSTRUCTORS</span>
      <h2 id="auth-heading">Professor sign in</h2>
      <p>Assign coursework, see each student&apos;s progress, and reach out to students who need help.</p>
    </div>
    <form className="auth-form" onSubmit={submit}>
      <label>Email<input value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} type="email" autoComplete="username" placeholder="you@college.edu" required /></label>
      <label>Password<input value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} type="password" autoComplete="current-password" placeholder="Your password" required /></label>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <button type="submit" className="primary-button">Sign in to professor portal <ArrowRight size={15} /></button>
    </form>
    <div className="scratch-login">
      <div><strong>Just exploring?</strong><p>Try the demo professor for FIN101.</p></div>
      <button type="button" className="secondary-button" onClick={() => { setEmail(DEMO_PROFESSOR.email); setPassword(DEMO_PROFESSOR.password); setError(""); }}>Use demo professor</button>
      <small>{DEMO_PROFESSOR.email} · {DEMO_PROFESSOR.password}</small>
    </div>
    <p className="auth-demo-note">Demo mode: professor accounts and assignments are saved in this browser only.</p>
  </>;
}
