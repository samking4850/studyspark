import type { ClassInfo, ProfessorClassData } from "../cloud";
import { daysSince, latest, weeklyMinutes } from "../classroom";

// View model for the professor portal, built from the shared database.

export type Objective = { id: string; title: string; objective: string };

// studentLesson: the student app has a lesson for it, so mastery is recorded. id is the objective key.
export type ObjectiveRecord = Objective & { studentLesson: boolean; source?: string; dbId?: string };

export type BankQuestion = { question: string; options: string[]; correct: number; why: string; sampleMissRate: number };

export type AssignmentType = "Lesson" | "Reading" | "Practice set" | "Reflection";

export type Assignment = {
  id: string;
  title: string;
  type: AssignmentType;
  objectiveId?: string;
  dueDate: string;
  estMinutes: number;
  instructions: string;
  assignedTo: "all" | string[];
  createdAt: string;
};

export type ClassMessage = { id: string; studentKey: string; text: string; sentAt: string; readAt?: string };

export type ProfessorData = {
  objectives: ObjectiveRecord[];
  messages: ClassMessage[];
  assignments: Assignment[];
  received: Record<string, string[]>;
  notes: Record<string, string>;
  showSamples: boolean;
};

export type LearningProfile = {
  goal: string;
  motivation: string;
  confidence: string;
  explanationPreference: string;
  practicePreference: string;
  dailyMinutes: number;
  biggestChallenge: string;
};

export type Attempt = { lessonId: string; question: number; chosen: number; correct: boolean; hinted: boolean; at: string };
export type Reflection = { lessonId: string; text: string; at: string };
export type Diagnostic = { results: Record<string, boolean>; takenAt: string };

// key is the student's account id for real students, "sample:…" for examples.
export type Student = {
  key: string;
  name: string;
  email: string;
  sample: boolean;
  joinedAt: string | null;
  lastActiveDaysAgo: number | null;
  mastered: string[];
  weeklyMinutes: number[] | null;
  profile: LearningProfile | null;
  attempts: Attempt[];
  reflections: Reflection[];
  diagnostic: Diagnostic | null;
};

export type StudentStatus = "Mastered" | "On track" | "Needs attention" | "Not started";

// Built-in lessons for the finance template. Same keys as the student lessons in FinanceClass.tsx.
export const OBJECTIVES: Objective[] = [
  { id: "fin-interest", title: "Simple vs. compound interest", objective: "Explain how interest accumulates over time" },
  { id: "fin-fv", title: "Future value", objective: "Calculate the future value of a lump sum" },
  { id: "fin-pv", title: "Present value", objective: "Discount a future cash flow to today's dollars" },
  { id: "fin-annuity", title: "Annuities and loan payments", objective: "Recognize equal periodic cash flows" },
];

// Copy of the FIN101 practice questions students answer in FinanceClass.tsx
// (lesson prompt) and FinanceLesson.tsx (exercises). Keep in sync if those change.
// sampleMissRate is example data: the student app checks answers but doesn't save them.
export const QUESTION_BANK: Record<string, BankQuestion[]> = {
  "fin-interest": [
    { question: "You invest $1,000 at 10% compounded annually. What is the balance after 2 years?", options: ["$1,100", "$1,200", "$1,210", "$1,300"], correct: 2, why: "Year 1: $1,000 × 1.10 = $1,100. Year 2: $1,100 × 1.10 = $1,210.", sampleMissRate: 33 },
    { question: "A $2,000 investment earns 5% simple interest per year. How much interest is earned in 2 years?", options: ["$100", "$200", "$205", "$2,200"], correct: 1, why: "Simple interest = $2,000 × 0.05 × 2 = $200.", sampleMissRate: 17 },
    { question: "$1,000 earns 10% compound interest annually. What is the balance after 3 years?", options: ["$1,300", "$1,310", "$1,331", "$1,400"], correct: 2, why: "$1,000 × 1.10 × 1.10 × 1.10 = $1,331.", sampleMissRate: 67 },
    { question: "With a positive interest rate, which grows faster over many years?", options: ["Simple interest", "Compound interest", "They always grow equally", "Neither grows"], correct: 1, why: "Compound interest earns additional interest on previously earned interest.", sampleMissRate: 0 },
  ],
  "fin-fv": [
    { question: "What is the future value of $500 invested at 10% annually for 2 years?", options: ["$550", "$600", "$605", "$650"], correct: 2, why: "FV = $500 × (1.10)^2 = $605.", sampleMissRate: 33 },
    { question: "What is the future value of $1,000 at 5% for one year?", options: ["$950", "$1,005", "$1,050", "$1,500"], correct: 2, why: "FV = $1,000 × 1.05 = $1,050.", sampleMissRate: 17 },
    { question: "What is the future value of $2,000 at 10% annually for two years?", options: ["$2,200", "$2,400", "$2,420", "$2,500"], correct: 2, why: "FV = $2,000 × 1.10² = $2,420.", sampleMissRate: 50 },
    { question: "Holding the other inputs constant, what happens to future value when the number of years increases at a positive rate?", options: ["It decreases", "It stays the same", "It increases", "It becomes zero"], correct: 2, why: "More compounding periods increase future value when the rate is positive.", sampleMissRate: 0 },
  ],
  "fin-pv": [
    { question: "At a 10% discount rate, what is $1,100 received in one year worth today?", options: ["$900", "$1,000", "$1,100", "$1,210"], correct: 1, why: "PV = $1,100 ÷ 1.10 = $1,000.", sampleMissRate: 50 },
    { question: "What is the present value of $1,050 received in one year at 5%?", options: ["$950", "$1,000", "$1,050", "$1,102.50"], correct: 1, why: "PV = $1,050 / 1.05 = $1,000.", sampleMissRate: 33 },
    { question: "What is the present value of $1,210 received in two years at 10% annually?", options: ["$900", "$1,000", "$1,100", "$1,210"], correct: 1, why: "PV = $1,210 / 1.10² = $1,000.", sampleMissRate: 67 },
    { question: "For a fixed future payment, what happens to present value as the discount rate rises?", options: ["It rises", "It stays the same", "It falls", "It doubles"], correct: 2, why: "A higher discount rate means the future payment is worth less today.", sampleMissRate: 50 },
  ],
  "fin-annuity": [
    { question: "Which example best represents an ordinary annuity?", options: ["One $5,000 gift today", "$100 paid at the end of each month", "Different payments on random dates", "$100 paid at the beginning of each month"], correct: 1, why: "An ordinary annuity has equal payments at regular intervals, made at the end of each period.", sampleMissRate: 50 },
    { question: "Which payment schedule is an annuity due?", options: ["$100 at the beginning of each month", "$100 at the end of each month", "One $100 payment today", "Unequal payments on random dates"], correct: 0, why: "An annuity due has equal regular payments at the beginning of each period.", sampleMissRate: 67 },
    { question: "Which feature is essential to an ordinary annuity?", options: ["Unequal payments", "Payments at period ends", "A single payment", "Payments on random dates"], correct: 1, why: "Ordinary annuity payments are equal, regular, and occur at the end of each period.", sampleMissRate: 33 },
    { question: "Which is an example of an ordinary annuity?", options: ["A single bonus", "$200 deposited at each month-end", "Different deposits at random times", "A one-time tuition payment"], correct: 1, why: "Equal deposits at the end of every month form an ordinary annuity.", sampleMissRate: 17 },
  ],
};

export const ASSIGNMENT_TYPES: AssignmentType[] = ["Lesson", "Reading", "Practice set", "Reflection"];

// Demo accounts shown on the sign-in screens. They exist once someone creates them with these details.
export const DEMO_PROFESSOR = { email: "professor@scratch.test", password: "teach123" };
export const DEMO_STUDENT = { email: "student@scratch.test", password: "scratch123" };

export function buildProfessorView(d: ProfessorClassData, showSamples: boolean): { data: ProfessorData; students: Student[] } {
  const received: Record<string, string[]> = {};
  for (const row of d.completions) (received[row.assignment_id] ??= []).push(row.student_id);
  const data: ProfessorData = {
    objectives: d.objectives.map((row) => ({ id: row.key, dbId: row.id, title: row.title, objective: row.description, studentLesson: row.student_lesson, source: row.source ?? undefined })),
    assignments: d.assignments.map((row) => ({
      id: row.id, title: row.title, type: row.type, objectiveId: row.objective_key ?? undefined, dueDate: row.due_date, estMinutes: row.est_minutes,
      instructions: row.instructions, assignedTo: row.assigned_to ?? "all", createdAt: row.created_at,
    })),
    messages: d.messages.map((row) => ({ id: row.id, studentKey: row.student_id, text: row.text, sentAt: row.sent_at, readAt: row.read_at ?? undefined })),
    received,
    notes: Object.fromEntries(d.notes.map((row) => [row.student_id, row.text])),
    showSamples,
  };
  const students: Student[] = d.enrollments.map((enrollment) => {
    const id = enrollment.student_id;
    const profile = d.profiles.find((row) => row.id === id);
    const sessions = d.sessions.filter((row) => row.student_id === id);
    const attempts = d.attempts.filter((row) => row.student_id === id);
    const reflections = d.reflections.filter((row) => row.student_id === id);
    const mastery = d.mastery.filter((row) => row.student_id === id);
    const diagnostic = d.diagnostics.find((row) => row.student_id === id);
    const lastActive = latest(...sessions.map((row) => row.started_at), ...attempts.map((row) => row.at), ...reflections.map((row) => row.at), ...mastery.map((row) => row.mastered_at), diagnostic?.taken_at);
    return {
      key: id,
      name: profile?.name ?? "Student",
      email: profile?.email ?? "",
      sample: false,
      joinedAt: enrollment.joined_at,
      lastActiveDaysAgo: daysSince(lastActive),
      mastered: mastery.map((row) => row.objective_key),
      weeklyMinutes: weeklyMinutes(sessions),
      profile: profile?.learning_profile ?? null,
      attempts: attempts.map((row) => ({ lessonId: row.lesson_key, question: row.question, chosen: row.chosen, correct: row.correct, hinted: row.hinted, at: row.at })),
      reflections: reflections.map((row) => ({ lessonId: row.lesson_key, text: row.text, at: row.at })),
      diagnostic: diagnostic ? { results: diagnosticResults(diagnostic.results), takenAt: diagnostic.taken_at } : null,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
  return { data, students };
}

// A topic counts as known when both starting-point questions were right (score 2 of 2).
function diagnosticResults(raw: Record<string, unknown>): Record<string, boolean> {
  const scores = (raw.scores && typeof raw.scores === "object" ? raw.scores : raw) as Record<string, unknown>;
  return Object.fromEntries(Object.entries(scores).filter(([key]) => key !== "completedAt").map(([key, value]) => [key, value === true || value === 2]));
}

export const lessonObjectives = (data: ProfessorData): Objective[] => data.objectives.filter((item) => item.studentLesson);

const sampleProfile = (goal: string, confidence: string, explanationPreference: string, practicePreference: string, biggestChallenge: string, motivation: string, dailyMinutes: number): LearningProfile =>
  ({ goal, confidence, explanationPreference, practicePreference, biggestChallenge, motivation, dailyMinutes });

export const SAMPLE_STUDENTS: Student[] = [
  { key: "sample:maya", name: "Maya Rodriguez", email: "maya.r@example.edu", sample: true, joinedAt: null, lastActiveDaysAgo: 0, mastered: ["fin-interest", "fin-fv", "fin-pv"], weeklyMinutes: [95, 110, 120, 85],
    profile: sampleProfile("Earn a higher grade", "I understand most things quickly", "Real-world applications", "Scenario-based challenges", "Finding enough time", "I want to run my own business someday.", 30), attempts: [], reflections: [], diagnostic: null },
  { key: "sample:jordan", name: "Jordan Taylor", email: "jordan.t@example.edu", sample: true, joinedAt: null, lastActiveDaysAgo: 1, mastered: ["fin-interest", "fin-fv"], weeklyMinutes: [60, 75, 70, 55],
    profile: sampleProfile("Understand the material deeply", "Some topics make sense, others don't", "Step-by-step examples", "Practice questions with hints", "Understanding difficult concepts", "", 30), attempts: [], reflections: [], diagnostic: null },
  { key: "sample:sam", name: "Sam Kim", email: "sam.k@example.edu", sample: true, joinedAt: null, lastActiveDaysAgo: 6, mastered: [], weeklyMinutes: [40, 15, 0, 0],
    profile: sampleProfile("Build confidence in difficult subjects", "I usually need help with the basics", "Short and simple explanations", "Games and trivia", "Staying motivated", "Pass this class so I can stay on the team.", 15), attempts: [], reflections: [], diagnostic: null },
  { key: "sample:priya", name: "Priya Shah", email: "priya.s@example.edu", sample: true, joinedAt: null, lastActiveDaysAgo: 0, mastered: ["fin-interest", "fin-fv", "fin-pv", "fin-annuity"], weeklyMinutes: [80, 90, 105, 120],
    profile: sampleProfile("Prepare for a career", "I'm ready for challenging material", "Detailed explanations", "Scenario-based challenges", "Remembering what I've learned", "Become a financial analyst.", 45), attempts: [], reflections: [], diagnostic: null },
  { key: "sample:alex", name: "Alex Nguyen", email: "alex.n@example.edu", sample: true, joinedAt: null, lastActiveDaysAgo: 3, mastered: ["fin-fv"], weeklyMinutes: [35, 45, 30, 25],
    profile: sampleProfile("Earn a higher grade", "Some topics make sense, others don't", "Step-by-step examples", "Flashcards and quick recall", "Knowing where to start", "", 30), attempts: [], reflections: [], diagnostic: null },
  { key: "sample:chris", name: "Chris Okafor", email: "chris.o@example.edu", sample: true, joinedAt: null, lastActiveDaysAgo: null, mastered: [], weeklyMinutes: [0, 0, 0, 0],
    profile: null, attempts: [], reflections: [], diagnostic: null },
];

export function daysUntil(isoDate: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${isoDate}T00:00:00`);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

export function formatDue(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function isAssignedTo(assignment: Assignment, studentKey: string) {
  return assignment.assignedTo === "all" || assignment.assignedTo.includes(studentKey);
}

// Lesson assignments complete when the student masters the linked objective;
// other work is marked received by the professor.
export function isAssignmentDone(assignment: Assignment, student: Student, received: Record<string, string[]>) {
  if (assignment.objectiveId) return student.mastered.includes(assignment.objectiveId);
  return (received[assignment.id] ?? []).includes(student.key);
}

export function studentStatus(student: Student, assignments: Assignment[], received: Record<string, string[]>, lessonCount = OBJECTIVES.length): StudentStatus {
  if (lessonCount > 0 && student.mastered.length >= lessonCount) return "Mastered";
  const mine = assignments.filter((assignment) => isAssignedTo(assignment, student.key));
  const overdue = mine.some((assignment) => daysUntil(assignment.dueDate) < 0 && !isAssignmentDone(assignment, student, received));
  const inactive = student.lastActiveDaysAgo !== null && student.lastActiveDaysAgo >= 5;
  if (student.mastered.length === 0 && !overdue && !inactive) return "Not started";
  if (overdue || inactive) return "Needs attention";
  return "On track";
}

export function totalMinutes(student: Student) {
  return student.weeklyMinutes ? student.weeklyMinutes.reduce((sum, minutes) => sum + minutes, 0) : null;
}

export function formatMinutes(minutes: number | null) {
  if (minutes === null) return "Not tracked";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export function lastActiveLabel(student: Student) {
  if (student.lastActiveDaysAgo === null) return student.sample ? "Never" : "No activity yet";
  if (student.lastActiveDaysAgo === 0) return "Today";
  if (student.lastActiveDaysAgo === 1) return "Yesterday";
  return `${student.lastActiveDaysAgo} days ago`;
}

export type StudentAlert = { student: Student; severity: "High" | "Medium"; reasons: string[] };

// Rule-based early warnings built from the data the student app records.
export function computeAlerts(students: Student[], assignments: Assignment[], received: Record<string, string[]>): StudentAlert[] {
  const alerts: StudentAlert[] = [];
  for (const student of students) {
    const reasons: string[] = [];
    let high = false;
    for (const assignment of assignments) {
      if (!isAssignedTo(assignment, student.key) || isAssignmentDone(assignment, student, received)) continue;
      const days = daysUntil(assignment.dueDate);
      if (days < 0) { reasons.push(`Overdue: ${assignment.title} (was due ${formatDue(assignment.dueDate)})`); high = true; }
      else if (days <= 2) reasons.push(`Due ${days === 0 ? "today" : days === 1 ? "tomorrow" : "in 2 days"}: ${assignment.title}`);
    }
    if (student.lastActiveDaysAgo !== null && student.lastActiveDaysAgo >= 5) { reasons.push(`No study activity in ${student.lastActiveDaysAgo} days`); high = true; }
    if (student.mastered.length === 0 && reasons.length === 0) reasons.push("Hasn't mastered any objectives yet");
    if (reasons.length) alerts.push({ student, severity: high ? "High" : "Medium", reasons });
  }
  return alerts.sort((a, b) => (a.severity === b.severity ? b.reasons.length - a.reasons.length : a.severity === "High" ? -1 : 1));
}

export function weeklySummary(professorName: string, cls: ClassInfo, objectives: Objective[], students: Student[], assignments: Assignment[], received: Record<string, string[]>) {
  const alerts = computeAlerts(students, assignments, received);
  const lines = [
    `${cls.code} weekly summary — ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
    `Prepared for Prof. ${professorName}`,
    "",
    `Students: ${students.length}`,
    ...objectives.map((objective) => {
      const count = students.filter((student) => student.mastered.includes(objective.id)).length;
      return `• ${objective.title}: ${count} of ${students.length} mastered`;
    }),
    "",
    alerts.length ? `Students to check in with (${alerts.length}):` : "No students need a check-in this week.",
    ...alerts.map((alert) => `• ${alert.student.name}${alert.student.sample ? " (sample)" : ""} — ${alert.reasons.join("; ")}`),
    "",
    "Upcoming coursework:",
    ...assignments.filter((assignment) => daysUntil(assignment.dueDate) >= 0).slice(0, 5).map((assignment) => {
      const assigned = students.filter((student) => isAssignedTo(assignment, student.key));
      const done = assigned.filter((student) => isAssignmentDone(assignment, student, received)).length;
      return `• ${assignment.title} — due ${formatDue(assignment.dueDate)} — ${done}/${assigned.length} done`;
    }),
  ];
  return lines.join("\n");
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function progressCsv(objectives: Objective[], students: Student[], assignments: Assignment[], received: Record<string, string[]>) {
  const header = ["Name", "Email", "Sample", "Status", "Objectives mastered", ...objectives.map((objective) => objective.title), "Assignments done", "Assignments assigned", "Study time (min, 4 weeks)", "Last active"];
  const rows = students.map((student) => {
    const mine = assignments.filter((assignment) => isAssignedTo(assignment, student.key));
    const done = mine.filter((assignment) => isAssignmentDone(assignment, student, received)).length;
    const minutes = totalMinutes(student);
    return [
      student.name, student.email, student.sample ? "Yes" : "No", studentStatus(student, assignments, received, objectives.length),
      `${student.mastered.length}/${objectives.length}`,
      ...objectives.map((objective) => (student.mastered.includes(objective.id) ? "Mastered" : "Not yet")),
      done, mine.length, minutes === null ? "Not tracked" : minutes, lastActiveLabel(student),
    ];
  });
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function nudgeEmail(student: Student, professorName: string, reasons: string[], cls: ClassInfo) {
  const first = student.name.split(" ")[0];
  const subject = `${cls.code}: checking in`;
  const body = [
    `Hi ${first},`,
    "",
    `I'm checking in on your progress in ${cls.name}.`,
    ...(reasons.length ? ["", ...reasons.map((reason) => `• ${reason}`)] : []),
    "",
    "Open Study Spark to pick up where you left off, and let me know if anything is getting in the way. I'm happy to help.",
    "",
    `Prof. ${professorName}`,
  ].join("\n");
  return `mailto:${student.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// Share of answers missed on one practice question by real students, from saved attempts.
export function questionMissRate(students: Student[], lessonId: string, question: number) {
  const answers = students.flatMap((student) => student.attempts.filter((attempt) => attempt.lessonId === lessonId && attempt.question === question));
  if (!answers.length) return null;
  const missed = answers.filter((attempt) => !attempt.correct).length;
  return { missed, total: answers.length, pct: Math.round(missed / answers.length * 100) };
}
