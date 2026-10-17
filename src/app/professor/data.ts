import { daysSince, readActivity, storageChangeEvent, readDiagnostic, weeklyMinutes, type Attempt, type Diagnostic, type Reflection } from "../classroom";

// Data for the professor portal. Student records are read from the same
// browser storage keys the student app writes; nothing here writes to them.

export type Objective = { id: string; title: string; objective: string };

// studentLesson: the student app has a lesson for it, so mastery is recorded.
export type ObjectiveRecord = Objective & { studentLesson: boolean; source?: string };

export type BankQuestion = { question: string; options: string[]; correct: number; why: string; sampleMissRate: number };

export type ProfessorAccount = { id: string; name: string; email: string; password: string };

export type AssignmentType = "Lesson" | "Reading" | "Practice set" | "Reflection";

export type Assignment = {
  id: string;
  classCode: string;
  title: string;
  type: AssignmentType;
  objectiveId?: string;
  dueDate: string;
  estMinutes: number;
  instructions: string;
  assignedTo: "all" | string[];
  createdAt: string;
};

export type ClassMessage = { id: string; studentKey: string; from: string; text: string; sentAt: string; readAt?: string };

export type ProfessorData = {
  professors: ProfessorAccount[];
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

export type OtherCourse = { name: string; code: string; topics: number; completed: number };

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
  otherCourses: OtherCourse[];
  attempts: Attempt[];
  reflections: Reflection[];
  diagnostic: Diagnostic | null;
};

export type StudentStatus = "Mastered" | "On track" | "Needs attention" | "Not started";

export const CLASS_CODE = "FIN101";
export const CLASS_NAME = "Introduction to Finance";
export const CLASS_UNIT = "Time Value of Money";

// Same ids as the student lessons in FinanceClass.tsx so mastery lines up.
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

export const DEMO_PROFESSOR = { email: "professor@scratch.test", password: "teach123" };

const storageKey = "study-spark-professor-data";
export const professorSessionKey = "study-spark-professor-active";

function isoDay(offsetDays: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function defaultData(): ProfessorData {
  const now = new Date().toISOString();
  const lesson = (id: string, objectiveId: string, title: string, due: number, minutes: number): Assignment => ({
    id, classCode: CLASS_CODE, title, type: "Lesson", objectiveId, dueDate: isoDay(due), estMinutes: minutes,
    instructions: "Complete the lesson in Study Spark. Mastery requires 3 of 4 practice questions correct and a written reflection.",
    assignedTo: "all", createdAt: now,
  });
  return {
    professors: [{ id: "professor-demo", name: "Morgan Lee", email: DEMO_PROFESSOR.email, password: DEMO_PROFESSOR.password }],
    objectives: OBJECTIVES.map((objective) => ({ ...objective, studentLesson: true })),
    messages: [],
    assignments: [
      lesson("a-interest", "fin-interest", "Lesson: Simple vs. compound interest", -3, 25),
      lesson("a-fv", "fin-fv", "Lesson: Future value", 1, 25),
      {
        id: "a-reading", classCode: CLASS_CODE, title: "Read Chapter 5: Time Value of Money", type: "Reading", dueDate: isoDay(2), estMinutes: 40,
        instructions: "Read sections 5.1–5.3 and bring one question to class.", assignedTo: "all", createdAt: now,
      },
      lesson("a-pv", "fin-pv", "Lesson: Present value", 4, 25),
      lesson("a-annuity", "fin-annuity", "Lesson: Annuities and loan payments", 6, 25),
    ],
    received: {},
    notes: {},
    showSamples: true,
  };
}

export function readProfessorData(): ProfessorData {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw) as Partial<ProfessorData>;
    const base = defaultData();
    return {
      professors: Array.isArray(parsed.professors) && parsed.professors.length ? parsed.professors : base.professors,
      objectives: Array.isArray(parsed.objectives) && parsed.objectives.length ? parsed.objectives : base.objectives,
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      assignments: Array.isArray(parsed.assignments) ? parsed.assignments : base.assignments,
      received: parsed.received && typeof parsed.received === "object" ? parsed.received : {},
      notes: parsed.notes && typeof parsed.notes === "object" ? parsed.notes : {},
      showSamples: parsed.showSamples ?? true,
    };
  } catch {
    return defaultData();
  }
}

export function saveProfessorData(data: ProfessorData) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(data));
    window.dispatchEvent(new Event(storageChangeEvent));
    return true;
  } catch {
    return false;
  }
}

export function resetProfessorData() {
  const data = defaultData();
  saveProfessorData(data);
  return data;
}

// Reads students enrolled in FIN101 from the student app's demo storage (read-only).
export function readEnrolledStudents(): Student[] {
  const students: Student[] = [];
  try {
    const accounts: unknown = JSON.parse(window.localStorage.getItem("study-spark-accounts") || "[]");
    if (!Array.isArray(accounts)) return students;
    for (const account of accounts) {
      if (typeof account !== "object" || account === null || !("id" in account)) continue;
      const { id, name, email } = account as { id: string; name?: string; email?: string };
      let joinedAt: string | null = null;
      let otherCourses: OtherCourse[] = [];
      try {
        const data = JSON.parse(window.localStorage.getItem(`study-spark-data:${id}`) || "null") as {
          courses?: { id: number; name: string; code: string; courseTopics?: { id: string }[] }[];
          completed?: string[];
        } | null;
        const course = data?.courses?.find((item) => item.code === CLASS_CODE);
        if (!course) continue;
        joinedAt = new Date(course.id).toISOString();
        const done = new Set(Array.isArray(data?.completed) ? data.completed : []);
        otherCourses = (data?.courses ?? []).filter((item) => item.code !== CLASS_CODE).map((item) => {
          const topics = item.courseTopics ?? [];
          return { name: item.name, code: item.code, topics: topics.length, completed: topics.filter((topic) => done.has(topic.id)).length };
        });
      } catch {
        continue;
      }
      let mastered: string[] = [];
      try {
        const stored: unknown = JSON.parse(window.localStorage.getItem(`study-spark-finance-completed:${id}`) || "[]");
        if (Array.isArray(stored)) mastered = stored.filter((item): item is string => typeof item === "string");
      } catch { /* demo storage */ }
      let profile: LearningProfile | null = null;
      try {
        profile = JSON.parse(window.localStorage.getItem(`study-spark-onboarding:${id}`) || "null") as LearningProfile | null;
      } catch { /* demo storage */ }
      const activity = readActivity(id);
      students.push({
        key: `account:${id}`,
        name: name || "Student",
        email: email || "",
        sample: false,
        joinedAt,
        lastActiveDaysAgo: daysSince(activity.lastActiveAt),
        mastered,
        weeklyMinutes: weeklyMinutes(activity),
        profile,
        otherCourses,
        attempts: activity.attempts,
        reflections: activity.reflections,
        diagnostic: readDiagnostic(id),
      });
    }
  } catch { /* demo storage */ }
  return students;
}

const sampleProfile = (goal: string, confidence: string, explanationPreference: string, practicePreference: string, biggestChallenge: string, motivation: string, dailyMinutes: number): LearningProfile =>
  ({ goal, confidence, explanationPreference, practicePreference, biggestChallenge, motivation, dailyMinutes });

export const SAMPLE_STUDENTS: Student[] = [
  { key: "sample:maya", name: "Maya Rodriguez", email: "maya.r@example.edu", sample: true, joinedAt: null, lastActiveDaysAgo: 0, mastered: ["fin-interest", "fin-fv", "fin-pv"], weeklyMinutes: [95, 110, 120, 85],
    profile: sampleProfile("Earn a higher grade", "I understand most things quickly", "Real-world applications", "Scenario-based challenges", "Finding enough time", "I want to run my own business someday.", 30), otherCourses: [], attempts: [], reflections: [], diagnostic: null },
  { key: "sample:jordan", name: "Jordan Taylor", email: "jordan.t@example.edu", sample: true, joinedAt: null, lastActiveDaysAgo: 1, mastered: ["fin-interest", "fin-fv"], weeklyMinutes: [60, 75, 70, 55],
    profile: sampleProfile("Understand the material deeply", "Some topics make sense, others don't", "Step-by-step examples", "Practice questions with hints", "Understanding difficult concepts", "", 30), otherCourses: [], attempts: [], reflections: [], diagnostic: null },
  { key: "sample:sam", name: "Sam Kim", email: "sam.k@example.edu", sample: true, joinedAt: null, lastActiveDaysAgo: 6, mastered: [], weeklyMinutes: [40, 15, 0, 0],
    profile: sampleProfile("Build confidence in difficult subjects", "I usually need help with the basics", "Short and simple explanations", "Games and trivia", "Staying motivated", "Pass this class so I can stay on the team.", 15), otherCourses: [], attempts: [], reflections: [], diagnostic: null },
  { key: "sample:priya", name: "Priya Shah", email: "priya.s@example.edu", sample: true, joinedAt: null, lastActiveDaysAgo: 0, mastered: ["fin-interest", "fin-fv", "fin-pv", "fin-annuity"], weeklyMinutes: [80, 90, 105, 120],
    profile: sampleProfile("Prepare for a career", "I'm ready for challenging material", "Detailed explanations", "Scenario-based challenges", "Remembering what I've learned", "Become a financial analyst.", 45), otherCourses: [], attempts: [], reflections: [], diagnostic: null },
  { key: "sample:alex", name: "Alex Nguyen", email: "alex.n@example.edu", sample: true, joinedAt: null, lastActiveDaysAgo: 3, mastered: ["fin-fv"], weeklyMinutes: [35, 45, 30, 25],
    profile: sampleProfile("Earn a higher grade", "Some topics make sense, others don't", "Step-by-step examples", "Flashcards and quick recall", "Knowing where to start", "", 30), otherCourses: [], attempts: [], reflections: [], diagnostic: null },
  { key: "sample:chris", name: "Chris Okafor", email: "chris.o@example.edu", sample: true, joinedAt: null, lastActiveDaysAgo: null, mastered: [], weeklyMinutes: [0, 0, 0, 0],
    profile: null, otherCourses: [], attempts: [], reflections: [], diagnostic: null },
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

export function studentStatus(student: Student, assignments: Assignment[], received: Record<string, string[]>): StudentStatus {
  if (student.mastered.length >= OBJECTIVES.length) return "Mastered";
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

export function weeklySummary(professorName: string, students: Student[], assignments: Assignment[], received: Record<string, string[]>) {
  const alerts = computeAlerts(students, assignments, received);
  const lines = [
    `${CLASS_CODE} weekly summary — ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
    `Prepared for Prof. ${professorName}`,
    "",
    `Students: ${students.length}`,
    ...OBJECTIVES.map((objective) => {
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

export function progressCsv(students: Student[], assignments: Assignment[], received: Record<string, string[]>) {
  const header = ["Name", "Email", "Sample", "Status", "Objectives mastered", ...OBJECTIVES.map((objective) => objective.title), "Assignments done", "Assignments assigned", "Study time (min, 4 weeks)", "Last active"];
  const rows = students.map((student) => {
    const mine = assignments.filter((assignment) => isAssignedTo(assignment, student.key));
    const done = mine.filter((assignment) => isAssignmentDone(assignment, student, received)).length;
    const minutes = totalMinutes(student);
    return [
      student.name, student.email, student.sample ? "Yes" : "No", studentStatus(student, assignments, received),
      `${student.mastered.length}/${OBJECTIVES.length}`,
      ...OBJECTIVES.map((objective) => (student.mastered.includes(objective.id) ? "Mastered" : "Not yet")),
      done, mine.length, minutes === null ? "Not tracked" : minutes, lastActiveLabel(student),
    ];
  });
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function nudgeEmail(student: Student, professorName: string, reasons: string[]) {
  const first = student.name.split(" ")[0];
  const subject = `${CLASS_CODE}: checking in`;
  const body = [
    `Hi ${first},`,
    "",
    `I'm checking in on your progress in ${CLASS_NAME}.`,
    ...(reasons.length ? ["", ...reasons.map((reason) => `• ${reason}`)] : []),
    "",
    "Open Study Spark to pick up where you left off, and let me know if anything is getting in the way. I'm happy to help.",
    "",
    `Prof. ${professorName}`,
  ].join("\n");
  return `mailto:${student.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export const studentKeyFor = (accountId: string) => `account:${accountId}`;

// Lets a student mark non-lesson work (a reading, a reflection) as done; the professor sees it as received.
export function markAssignmentDone(assignmentId: string, studentKey: string, done: boolean) {
  const data = readProfessorData();
  const list = data.received[assignmentId] ?? [];
  const next = done ? Array.from(new Set([...list, studentKey])) : list.filter((key) => key !== studentKey);
  saveProfessorData({ ...data, received: { ...data.received, [assignmentId]: next } });
}

export function markMessageRead(messageId: string) {
  const data = readProfessorData();
  saveProfessorData({ ...data, messages: data.messages.map((message) => message.id === messageId ? { ...message, readAt: message.readAt ?? new Date().toISOString() } : message) });
}

// Share of answers missed on one practice question by real students, from saved attempts.
export function questionMissRate(students: Student[], lessonId: string, question: number) {
  const answers = students.flatMap((student) => student.attempts.filter((attempt) => attempt.lessonId === lessonId && attempt.question === question));
  if (!answers.length) return null;
  const missed = answers.filter((attempt) => !attempt.correct).length;
  return { missed, total: answers.length, pct: Math.round(missed / answers.length * 100) };
}
