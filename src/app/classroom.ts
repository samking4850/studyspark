// Shared record of what a student does in FIN101, written by the student app
// and read by the professor portal. Demo storage: this browser only.

export const storageChangeEvent = "study-spark-storage-change";

export type LessonSession = { lessonId: string; startedAt: string; seconds: number };
export type Attempt = { lessonId: string; question: number; chosen: number; correct: boolean; hinted: boolean; at: string };
export type Reflection = { lessonId: string; text: string; at: string };
export type Activity = { sessions: LessonSession[]; attempts: Attempt[]; reflections: Reflection[]; lastActiveAt: string | null };
export type Diagnostic = { results: Record<string, boolean>; takenAt: string };

const emptyActivity = (): Activity => ({ sessions: [], attempts: [], reflections: [], lastActiveAt: null });
export const activityKey = (accountId: string) => `study-spark-activity:${accountId}`;
export const diagnosticKey = (accountId: string) => `study-spark-diagnostic:${accountId}`;

export function readActivity(accountId: string): Activity {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(activityKey(accountId)) || "null") as Partial<Activity> | null;
    if (!parsed) return emptyActivity();
    return {
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
      reflections: Array.isArray(parsed.reflections) ? parsed.reflections : [],
      lastActiveAt: typeof parsed.lastActiveAt === "string" ? parsed.lastActiveAt : null,
    };
  } catch {
    return emptyActivity();
  }
}

function updateActivity(accountId: string, change: (activity: Activity) => Activity) {
  try {
    const next = change(readActivity(accountId));
    next.lastActiveAt = new Date().toISOString();
    window.localStorage.setItem(activityKey(accountId), JSON.stringify(next));
    window.dispatchEvent(new Event(storageChangeEvent));
  } catch { /* demo storage unavailable */ }
}

export function recordSession(accountId: string, lessonId: string, startedAt: Date, seconds: number) {
  if (seconds < 15) return;
  updateActivity(accountId, (activity) => ({ ...activity, sessions: [...activity.sessions, { lessonId, startedAt: startedAt.toISOString(), seconds: Math.round(seconds) }] }));
}

export function recordAttempts(accountId: string, attempts: Omit<Attempt, "at">[]) {
  const at = new Date().toISOString();
  updateActivity(accountId, (activity) => ({ ...activity, attempts: [...activity.attempts, ...attempts.map((attempt) => ({ ...attempt, at }))] }));
}

export function recordReflection(accountId: string, lessonId: string, text: string) {
  updateActivity(accountId, (activity) => ({ ...activity, reflections: [...activity.reflections.filter((item) => item.lessonId !== lessonId), { lessonId, text, at: new Date().toISOString() }] }));
}

export function readDiagnostic(accountId: string): Diagnostic | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(diagnosticKey(accountId)) || "null") as Diagnostic | null;
    return parsed && typeof parsed.results === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function saveDiagnostic(accountId: string, results: Record<string, boolean>) {
  const diagnostic: Diagnostic = { results, takenAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(diagnosticKey(accountId), JSON.stringify(diagnostic));
    updateActivity(accountId, (activity) => activity);
  } catch { /* demo storage unavailable */ }
  return diagnostic;
}

// Minutes per week for the last four weeks, oldest first; the last entry is the past 7 days.
export function weeklyMinutes(activity: Activity, now = new Date()) {
  const buckets = [0, 0, 0, 0];
  for (const session of activity.sessions) {
    const daysAgo = (now.getTime() - new Date(session.startedAt).getTime()) / 86_400_000;
    const week = Math.floor(daysAgo / 7);
    if (week >= 0 && week < 4) buckets[3 - week] += session.seconds / 60;
  }
  return buckets.map((minutes) => Math.ceil(minutes));
}

// Consecutive days, ending today or yesterday, with at least one study session.
export function studyStreak(activity: Activity, now = new Date()) {
  const days = new Set(activity.sessions.map((session) => new Date(session.startedAt).toDateString()));
  const cursor = new Date(now);
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(cursor.toDateString())) { streak += 1; cursor.setDate(cursor.getDate() - 1); }
  return streak;
}

export function daysSince(iso: string | null, now = new Date()) {
  if (!iso) return null;
  const then = new Date(iso); then.setHours(0, 0, 0, 0);
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today.getTime() - then.getTime()) / 86_400_000));
}

// One quick check per objective. Kept separate from lesson practice so the check doesn't give answers away.
export const DIAGNOSTIC_QUESTIONS: { objectiveId: string; question: string; options: string[]; correct: number }[] = [
  { objectiveId: "fin-interest", question: "Which kind of interest earns interest on interest you've already earned?", options: ["Simple interest", "Compound interest", "Both equally", "Neither"], correct: 1 },
  { objectiveId: "fin-fv", question: "You invest $100 at 10% for one year. What is it worth at the end of the year?", options: ["$100", "$105", "$110", "$120"], correct: 2 },
  { objectiveId: "fin-pv", question: "At a 10% rate, what is $110 received one year from now worth today?", options: ["$90", "$99", "$100", "$110"], correct: 2 },
  { objectiveId: "fin-annuity", question: "Paying $50 at the end of every month is an example of…", options: ["A lump sum", "An ordinary annuity", "An annuity due", "A random cash flow"], correct: 1 },
];

// Hints point to the method without giving the answer. Index 0 is the lesson's
// main question, followed by its three practice exercises.
export const PRACTICE_HINTS: Record<string, string[]> = {
  "fin-interest": [
    "Compound means year two earns interest on year one's ending balance. Multiply by 1.10 once per year.",
    "Simple interest = principal × rate × years. Write 5% as 0.05.",
    "Multiply $1,000 by 1.10 three times, once for each year.",
    "Which method earns interest on interest already earned?",
  ],
  "fin-fv": [
    "FV = PV × (1 + r)^n. Here PV is $500, r is 0.10 and n is 2.",
    "One year at 5% means multiplying by 1.05.",
    "Square 1.10 first, then multiply by $2,000.",
    "Each extra year multiplies the amount by (1 + r) again.",
  ],
  "fin-pv": [
    "PV = FV ÷ (1 + r)^n. Divide $1,100 by 1.10.",
    "Divide $1,050 by 1.05.",
    "Divide $1,210 by 1.10, then divide by 1.10 again.",
    "A bigger number on the bottom of a fraction makes the result smaller or larger?",
  ],
  "fin-annuity": [
    "Look for equal payments on a regular schedule, made at the end of each period.",
    "“Due” means the payment happens at the start of each period.",
    "Think about when in each period an ordinary annuity pays.",
    "Equal amounts, a regular schedule, and payment at period end.",
  ],
};
