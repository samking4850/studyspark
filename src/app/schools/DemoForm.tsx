"use client";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import s from "./schools.module.css";

export default function DemoForm() {
  const [previewed, setPreviewed] = useState(false);
  return <form className={s.form} onSubmit={event => { event.preventDefault(); setPreviewed(true); }}>
    <div className={s.formRow}><label>Your name<input name="name" autoComplete="name" required placeholder="Alex Morgan" /></label><label>Work email<input name="email" type="email" autoComplete="email" required placeholder="alex@school.edu" /></label></div>
    <div className={s.formRow}><label>School or organization<input name="organization" autoComplete="organization" required placeholder="Organization name" /></label><label>Your role<select name="role" required defaultValue=""><option value="" disabled>Select your role</option><option>Educator / instructor</option><option>School or program leader</option><option>Learning & development</option><option>Other</option></select></label></div>
    <label>What would you like to explore? <span>(optional)</span><textarea name="message" rows={3} placeholder="Tell us about your learners or a challenge you’re working on…" /></label>
    <button className={s.button} type="submit">Preview school sign up <ArrowRight size={16}/></button>
    <p className={s.formHint}>Review prototype only. Nothing entered here is sent or saved.</p>
    {previewed && <p role="status" className={s.success}>School sign up preview complete. No account was created and no information was sent or saved. Registration will be connected after review.</p>}
  </form>;
}
