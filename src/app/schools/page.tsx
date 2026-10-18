import type { Metadata } from "next";
import { ArrowRight, BookOpen, Check, CalendarDays, Sparkles, Target } from "lucide-react";
import DemoForm from "./DemoForm";
import s from "./schools.module.css";

export const metadata: Metadata = { title: "Study Spark for schools & organizations", description: "Explore a Study Spark pilot for your learning community." };

export default function SchoolsPage() {
  return <div className={s.page}>
    <header className={s.header}>
      <a href="/" className={s.logo}><span><Sparkles size={20} /></span>study<span className={s.light}>spark.</span></a>
      <nav aria-label="Schools navigation"><a href="#approach">Student benefits</a><a href="#pilot">Get started</a><a href="/">Student experience ↗</a></nav>
      <a className={s.button} href="#demo">Prepare a pilot brief <ArrowRight size={15} /></a>
    </header>
    <main>
      <section className={s.hero}>
        <div><div className={s.audience}><span /> FOR PRIVATE COLLEGES & INDEPENDENT HIGH SCHOOLS</div>
          <h1>Help students know<br /><em>what to study next.</em></h1>
          <p>Give students a plan for upcoming exams, step-by-step lessons, and practice that helps them check their understanding.</p>
          <div className={s.actions}><a className={s.button} href="#demo">Prepare a pilot brief <ArrowRight size={17} /></a><a className={s.textLink} href="#approach">See student benefits ↓</a></div>
          <small>Explore the prototype. Help shape a pilot for your school.</small>
        </div>
        <div className={s.visual} aria-label="Illustrative student lesson preview">
          <div className={s.visualTop}><Sparkles size={17} /> FROM “WHERE DO I START?” TO A CLEAR NEXT STEP.</div>
          <div className={s.lesson}><div className={s.lessonLabel}><span>FINANCE · LESSON PREVIEW</span><BookOpen size={19} /></div><h2>Learn a concept.<br />Put it into practice.</h2><p>Time value of money</p>
          <div className={s.lessonSteps}>{["Understand the concept", "Work through an example", "Practice what you learned", "Reflect and apply"].map((label,i)=><div key={label}><span>{i+1}</span>{label}{i===0 && <Check size={16}/>}</div>)}</div>
          <a href="/" className={s.lessonLink}>Explore the student demo <ArrowRight size={16}/></a></div>
          <div className={s.note}><Target size={23}/><div><strong>One objective at a time.</strong><span>Read an explanation. Try a question. Check your answer.</span></div></div>
          <small>Illustrative interface · sample lesson content</small>
        </div>
      </section>
      <section id="approach" className={s.section}><div className={s.eyebrow}>THE VALUE FOR STUDENTS</div><h2>Less guesswork.<br />More focused studying.</h2>
      <div className={s.cards}>{[
        {icon:CalendarDays,title:"Plan",text:"Know what to work on.",body:"Turn exam dates and reviewed course topics into manageable study sessions."},
        {icon:BookOpen,title:"Learn",text:"Take it one concept at a time.",body:"Explore explanations and worked examples in the sample finance lessons."},
        {icon:Target,title:"Practice",text:"Check your understanding.",body:"Answer practice questions, review feedback, and track completed lessons in the demo."},
      ].map(({icon:Icon,title,text,body})=><article key={title}><div className={s.icon}><Icon size={23}/></div><span>{title}</span><h3>{text}</h3><p>{body}</p></article>)}</div></section>
      <section id="pilot" className={s.pilot}><div><div className={s.eyebrow}>START WITH ONE COURSE</div><h2>Three steps to<br />explore a pilot.</h2><p>Choose a starting point. Agree on what success would look like before involving students.</p><a href="#demo" className={s.textLink}>Request a demo <ArrowRight size={16}/></a></div><ol>{[["Book a walkthrough","Tell us your role and school. Try the student experience with our team."],["Choose a course and a goal","Identify an instructor, learner group, and the study challenge you want to address."],["Agree on a pilot plan","Set timing, support, cost, and feedback goals. Review data and accessibility needs before launch."]].map(([title,body],i)=><li key={title}><span>0{i+1}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}</ol></section>
      <section className={s.faq}><div><div className={s.eyebrow}>GOOD TO KNOW</div><h2>Your questions, answered.</h2></div><div>{[["Does Study Spark replace our LMS?","The proposed role is a study companion alongside teaching. No live LMS or Canvas integration is implemented in the current prototype."],["What can we try today?","The prototype includes course organization, PDF text extraction, study plans, and sample finance lessons. Personal learning progress stays in this browser. Shared class discussions and live trivia work through invitation links. School identity, verified enrollment, and institutional reporting remain future work."],["What would a pilot cost?","Pricing and support are not finalized. Scope, timing, costs, and responsibilities would be agreed together before a pilot begins."],["How are privacy and accessibility handled?","The demo uses local learning records and nickname-based shared spaces. Use sample data. Data handling, security, accessibility, and any applicable institutional requirements need review before a real deployment."]].map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></section>
      <section id="demo" className={s.contact}><div><div className={s.eyebrow}>PLAN A SCHOOL PILOT</div><h2>A starting point for your school.</h2><p>Prepare a brief for a private college, independent high school, or learning-support program. Start with one educator and a small cohort.</p><span className={s.prototype}>Pilot planning only · no account is created and no information is sent</span></div><DemoForm /></section>
    </main><footer className={s.footer}><a href="/" className={s.logo}>studyspark.</a><span>A personal path from course material to understanding.</span><a href="/">Back to the student experience ↗</a></footer>
  </div>;
}
