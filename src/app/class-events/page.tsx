"use client";
import ClassEventDemo from "../ClassEventDemo";
export default function ClassEventsPage() {
  return <main className="loop-editor"><a className="back-link" href="/">← Back to StudySpark</a><h1>Study with the class</h1><p>Create a class study event and jump into a game. No lesson completion required.</p><ClassEventDemo studentName="Demo student" onCreated={()=>{}}/></main>;
}
