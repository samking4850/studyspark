"use client";
import { useState } from "react";
import { resolveReview, type ReviewItem } from "../lib/learning-loop";
import { useReviews } from "./useLearningLoop";

export function Followup({item,onResult}:{item:ReviewItem;onResult:(correct:boolean)=>void}) {
  const [answer,setAnswer] = useState<number | null>(null);
  const [checked,setChecked] = useState(false);
  return <div className="loop-followup"><h4>Try a new example</h4><p>{item.followup.question}</p><div className="finance-practice-options">{item.followup.options.map((option,i)=><button key={i} disabled={checked} aria-pressed={answer===i} className={answer===i?"chosen":""} onClick={()=>setAnswer(i)}>{option}</button>)}</div>
    {!checked ? <button className="secondary-button" disabled={answer===null} onClick={()=>{setChecked(true);onResult(answer===item.followup.correct);}}>Check follow-up</button> : <div role="status" className={answer===item.followup.correct?"finance-answer-good":"finance-answer-wrong"}><strong>{answer===item.followup.correct?"Correct — this review item is complete":"Keep this concept in your review queue"}</strong><p>{item.followup.why}</p>{answer!==item.followup.correct&&<button className="secondary-button" onClick={()=>{setChecked(false);setAnswer(null);}}>Try follow-up again</button>}</div>}
  </div>;
}

export default function ReviewQueue({accountId}:{accountId:string}) {
  const {reviews,update,error} = useReviews(accountId);
  const [open,setOpen] = useState<string|null>(null);
  const due = reviews.filter(r=>r.status==="due");
  return <section className="loop-review" aria-labelledby="review-heading"><div className="loop-heading"><div><span className="eyebrow">YOUR NEXT STEP</span><h2 id="review-heading">Your personal review queue</h2><p>{due.length ? `${due.length} practice ${due.length===1?"item needs":"items need"} another look. Start with an explanation, then try a new example.` : "No practice mistakes waiting for review. Missed questions will appear here after you check your answers."}</p></div><span className="loop-count">{due.length} to review</span></div>
    {error&&<p role="alert">{error}</p>}
    {due.map(item=><article className="loop-review-item" key={item.id}><div className="loop-heading"><div><strong>{item.title}</strong><p>Recommended because you missed: {item.question}</p></div><button className="secondary-button" aria-expanded={open===item.id} onClick={()=>setOpen(open===item.id?null:item.id)}>{open===item.id?"Close review":"Review concept"}</button></div>{open===item.id&&<><p>{item.help}</p><Followup key={item.id} item={item} onResult={correct=>update(items=>resolveReview(items,item.id,correct))}/></>}</article>)}
    {reviews.some(r=>r.status==="resolved")&&<p className="finance-save-status" role="status">{reviews.filter(r=>r.status==="resolved").length} review item(s) completed with a follow-up question. Saved for this demo account on this browser.</p>}
  </section>;
}
