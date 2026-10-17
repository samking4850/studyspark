import { sampleLessons, type Lesson } from "./course-content.ts";

export type PublishedLesson = { lesson: Lesson; version: number; publishedAt: string };
export const publicationKey = "study-spark-publication-v1";
export const loopEvent = "study-spark-learning-loop";
export type Question = { question: string; options: string[]; correct: number; why: string };
export type ReviewItem = { id: string; lessonId: string; title: string; question: string; selected: string; help: string; followup: Question; status: "due" | "resolved"; missedAt: string; resolvedAt?: string };

export function validLesson(value: unknown): value is Lesson {
  if (!value || typeof value !== "object") return false;
  const v = value as Lesson;
  return sampleLessons.some(l => l.id === v.id) && [v.title,v.objective,v.short,v.explanation,v.application,v.prompt,v.feedback].every(x => typeof x === "string" && x.trim().length > 0 && x.length <= 10000)
    && Array.isArray(v.steps) && v.steps.length > 0 && v.steps.length <= 20 && v.steps.every(x => typeof x === "string" && x.trim().length > 0)
    && Array.isArray(v.choices) && v.choices.length === 4 && v.choices.every(x => typeof x === "string" && x.trim().length > 0)
    && new Set(v.choices.map(x => x.trim().toLowerCase())).size === 4 && Number.isInteger(v.answer) && v.answer >= 0 && v.answer < 4;
}

export function parsePublication(raw: string | null): PublishedLesson | null {
  try {
    const p = JSON.parse(raw || "null");
    return p && validLesson(p.lesson) && Number.isInteger(p.version) && p.version > 0 && typeof p.publishedAt === "string" ? p : null;
  } catch { return null; }
}

export function validQuestion(q: unknown): q is Question {
  if (!q || typeof q !== "object") return false;
  const v = q as Question;
  return typeof v.question === "string" && typeof v.why === "string" && Array.isArray(v.options) && v.options.length === 4 && v.options.every(x => typeof x === "string") && Number.isInteger(v.correct) && v.correct >= 0 && v.correct < 4;
}

export function parseReviews(raw: string | null): ReviewItem[] {
  try {
    const data = JSON.parse(raw || "[]");
    return Array.isArray(data) ? data.filter((r): r is ReviewItem => r && typeof r.id === "string" && sampleLessons.some(l => l.id === r.lessonId) && [r.title,r.question,r.selected,r.help,r.missedAt].every(x => typeof x === "string") && validQuestion(r.followup) && ["due","resolved"].includes(r.status)) : [];
  } catch { return []; }
}

export function recordMiss(items: ReviewItem[], item: Omit<ReviewItem,"status">): ReviewItem[] {
  return [...items.filter(r => r.id !== item.id), { ...item, status: "due" }];
}

export function resolveReview(items: ReviewItem[], id: string, correct: boolean, now = new Date().toISOString()): ReviewItem[] {
  return items.map(r => r.id === id ? { ...r, status: correct ? "resolved" : "due", resolvedAt: correct ? now : undefined } : r);
}

// Prepared follow-ups assess the same objective with a different calculation or situation.
export function followupFor(lessonId: string, index: number): Question {
  const n = index + 2, principal = n * 100;
  const growth = Math.round(principal * 1.1), interest = Math.round(principal * .2);
  if (lessonId === "fin-pv") return { question: `At 10%, what is the present value of $${growth} received in one year?`, options: [`$${principal}`, `$${growth}`, `$${principal + 10}`, `$${principal * 2}`], correct: 0, why: `Discount once: $${growth} ÷ 1.10 = $${principal}. Growing this forward checks your answer.` };
  if (lessonId === "fin-fv") return { question: `What will $${principal} grow to after one year at 10%?`, options: [`$${principal}`, `$${principal + 10}`, `$${growth}`, `$${principal * 2}`], correct: 2, why: `Keep the principal and add 10%: $${principal} × 1.10 = $${growth}.` };
  if (lessonId === "fin-annuity") return { question: `A club deposits $${principal} at the end of every month. What payment pattern is this?`, options: ["An annuity due", "A single lump sum", "An ordinary annuity", "Irregular payments"], correct: 2, why: "The amounts and intervals are equal, and payments occur at period ends: an ordinary annuity." };
  if (index !== 1) return { question: `What is the balance after $${principal} earns 10% compound interest annually for two years?`, options: [`$${Math.round(principal*1.2)}`, `$${growth}`, `$${Math.round(principal*1.21)}`, `$${principal*2}`], correct: 2, why: `Apply growth twice: $${principal} × 1.10 × 1.10 = $${Math.round(principal*1.21)}. The second year earns interest on the first year’s interest too.` };
  return { question: `$${principal} earns 10% simple interest each year. How much interest is earned in two years?`, options: [`$${principal + interest}`, `$${Math.round(principal * .1)}`, `$${Math.round(principal * .21)}`, `$${interest}`], correct: 3, why: `Interest earned = $${principal} × 0.10 × 2 = $${interest}. The ending balance also includes the original $${principal}.` };
}

export function targetedHelp(lessonId: string, q: Question, selected: number, isCore: boolean): string {
  const original = sampleLessons.find(l => l.id === lessonId);
  if (isCore && original && q.question === original.prompt && JSON.stringify(q.options) === JSON.stringify(original.choices)) {
    const help: Record<string, Record<number,string>> = {
      "fin-interest": { 0: "That is the balance after only one year. Apply the interest rate again to the new balance.", 1: "That treats interest as simple interest. In year two, compound interest also earns interest on the first year's interest.", 3: "Apply the rate once per year rather than adding an extra growth period." },
      "fin-fv": { 0: "That includes only one year of growth. There are two compounding periods.", 1: "That adds the same interest each year. Compound growth also includes interest on interest.", 3: "Use the stated rate for each period; doubling is not the same as compounding at 10%." },
      "fin-pv": { 0: "Discount by dividing by 1 plus the rate, rather than subtracting a percentage of the future payment.", 2: "That is the future payment, not its value today. Bring it back one period.", 3: "Multiplying grows money forward. Present value reverses growth by dividing." },
      "fin-annuity": { 0: "An annuity needs repeated payments, not a one-time amount.", 2: "An annuity needs equal payments at regular intervals.", 3: "Beginning-of-period payments are an annuity due; an ordinary annuity pays at period ends." },
    };
    if (help[lessonId]?.[selected]) return `${help[lessonId][selected]} ${q.why}`;
  }
  return `You selected “${q.options[selected]}”. Compare that with the worked reasoning: ${q.why}`;
}
