// Helpers shared by the student classroom and the professor portal. Learning data
// itself lives in the database (see cloud.ts).

export const storageChangeEvent = "study-spark-storage-change";

type Session = { started_at: string; seconds: number };

// Minutes per week for the last four weeks, oldest first; the last entry is the past 7 days.
export function weeklyMinutes(sessions: Session[], now = new Date()) {
  const buckets = [0, 0, 0, 0];
  for (const session of sessions) {
    const daysAgo = (now.getTime() - new Date(session.started_at).getTime()) / 86_400_000;
    const week = Math.floor(daysAgo / 7);
    if (week >= 0 && week < 4) buckets[3 - week] += session.seconds / 60;
  }
  return buckets.map((minutes) => Math.ceil(minutes));
}

// Consecutive days, ending today or yesterday, with at least one study session.
export function studyStreak(sessions: Session[], now = new Date()) {
  const days = new Set(sessions.map((session) => new Date(session.started_at).toDateString()));
  const cursor = new Date(now);
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(cursor.toDateString())) { streak += 1; cursor.setDate(cursor.getDate() - 1); }
  return streak;
}

// Most recent of any timestamps, for "last active".
export function latest(...dates: (string | null | undefined)[]) {
  const valid = dates.filter((date): date is string => Boolean(date));
  return valid.length ? valid.reduce((a, b) => (a > b ? a : b)) : null;
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
