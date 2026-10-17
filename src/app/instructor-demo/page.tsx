"use client";
import { useEffect, useState } from "react";
import { sampleLessons, type Lesson } from "../../lib/course-content";
import { loopEvent, parsePublication, publicationKey, validLesson } from "../../lib/learning-loop";
import { usePublication } from "../useLearningLoop";

const draftKey="study-spark-instructor-draft-v1";
export default function InstructorDemo() {
  const publication=usePublication();
  const [draft,setDraft]=useState<Lesson>(sampleLessons[0]);
  const [ready,setReady]=useState(false);
  const [preview,setPreview]=useState(false);
  const [notice,setNotice]=useState("");
  useEffect(()=>{try{const stored=JSON.parse(localStorage.getItem(draftKey)||"null");if(validLesson(stored))setDraft(stored);}catch{/* Start with prepared content. */}setReady(true);},[]);
  function change(field:keyof Lesson,value:string|string[]|number){setDraft(old=>({...old,[field]:value}));setNotice("");}
  function save(){try{localStorage.setItem(draftKey,JSON.stringify(draft));setNotice("Draft saved. Students still see the last published version.");}catch{setNotice("Draft could not be saved. Keep this page open and try again.");}}
  function publish(){
    if(!validLesson(draft)){setNotice("Complete every field, add at least one worked step, and provide four different answers before publishing.");return;}
    try{const previous=parsePublication(localStorage.getItem(publicationKey));const next={lesson:draft,version:(previous?.version??0)+1,publishedAt:new Date().toISOString()};localStorage.setItem(draftKey,JSON.stringify(draft));localStorage.setItem(publicationKey,JSON.stringify(next));window.dispatchEvent(new Event(loopEvent));setNotice(`Version ${next.version} published to the student demo on this browser. Later edits remain drafts until you publish again.`);}catch{setNotice("Publishing could not be saved. Keep this page open and try again.");}
  }
  if(!ready)return <main className="loop-editor"><p>Loading instructor demo…</p></main>;
  return <main className="loop-editor"><a className="back-link" href="/">← Back to StudySpark</a><div className="loop-heading"><div><span className="eyebrow">FIN101 · INSTRUCTOR WORKSPACE</span><h1>Review. Refine. Publish.</h1><p>Prepare the first finance lesson, then see it in the student experience.</p></div><a className="secondary-button" href="/learning-demo">Open student class →</a></div>
    <p className="night-notice">Local demo workspace · anyone on this browser can access it. No teacher authentication, AI generation, or cross-device publishing. The other finance lessons remain prepared samples.</p>
    <div className="loop-publish-status"><strong>{publication?`Published version ${publication.version}: ${publication.lesson.title}`:"Students currently see the original sample lesson."}</strong><p>Only the published snapshot appears for students. Use the same browser and website address for both views.</p></div>
    <div className="loop-editor-grid"><form className="loop-editor-form" onSubmit={e=>{e.preventDefault();setPreview(true);setNotice("");}}>
      <h2>Lesson draft</h2><p>Keep this demo lesson focused on simple and compound interest; the supplemental practice and review examples use that topic.</p><span className="eyebrow">PREPARED CONTENT · EDITABLE</span>
      {([['title','Lesson title'],['objective','Learning objective'],['short','Short description'],['explanation','Explanation'],['application','Real-world application']] as const).map(([field,label])=><label key={field}>{label}<textarea rows={field==="explanation"?4:2} required maxLength={10000} value={draft[field]} onChange={e=>change(field,e.target.value)}/></label>)}
      <label>Worked example (one step per line)<textarea rows={5} value={draft.steps.join("\n")} onChange={e=>change("steps",e.target.value.split("\n"))}/></label>
      <h3>Core practice question</h3><p>Review the question, all choices, the correct answer, and feedback together. Additional practice remains the prepared finance question bank.</p>
      <label>Question<textarea required value={draft.prompt} onChange={e=>change("prompt",e.target.value)}/></label>
      {draft.choices.map((choice,i)=><label key={i}>Answer {i+1}<input required value={choice} onChange={e=>change("choices",draft.choices.map((c,j)=>j===i?e.target.value:c))}/></label>)}
      <label>Correct answer<select value={draft.answer} onChange={e=>change("answer",Number(e.target.value))}>{draft.choices.map((_,i)=><option key={i} value={i}>Answer {i+1}</option>)}</select></label>
      <label>Feedback and worked reasoning<textarea required rows={3} value={draft.feedback} onChange={e=>change("feedback",e.target.value)}/></label>
      <div className="loop-buttons"><button className="secondary-button" type="button" onClick={save}>Save draft</button><button className="primary-button" type="submit">Preview lesson</button></div>
    </form><section className="loop-preview" aria-label="Lesson publication preview"><h2>{preview?"Student content preview":"Ready for review?"}</h2>{preview?<><span className="eyebrow">DRAFT · NOT YET PUBLISHED</span><h3>{draft.title}</h3><p><strong>Objective:</strong> {draft.objective}</p><p>{draft.explanation}</p><ol>{draft.steps.map((step,i)=><li key={i}>{step}</li>)}</ol><p>{draft.application}</p><h3>{draft.prompt}</h3><ol>{draft.choices.map((choice,i)=><li key={i}>{choice}{i===draft.answer?" · correct answer (instructor view)":""}</li>)}</ol><p>{draft.feedback}</p><button className="primary-button" onClick={publish} disabled={!validLesson(draft)}>Publish reviewed lesson</button><p>Publishing updates the lesson content. Changed content starts a fresh lesson attempt; historical review items keep their original wording.</p></>:<p>Edit the prepared lesson and select Preview lesson. Check the explanation and question before publishing.</p>}{notice&&<p role="status" className="night-notice">{notice}</p>}</section></div>
  </main>;
}
