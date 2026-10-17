// Data for the professor portal. Student records are read from the same
// browser storage keys the student app writes; nothing here writes to them.

export type Objective = { id: string; title: string; objective: string };

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

export type ProfessorData = {
  professors: ProfessorAccount[];
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
      try {
        const data = JSON.parse(window.localStorage.getItem(`study-spark-data:${id}`) || "null") as { courses?: { id: number; code: string }[] } | null;
        const course = data?.courses?.find((item) => item.code === CLASS_CODE);
        if (!course) continue;
        joinedAt = new Date(course.id).toISOString();
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
      students.push({
        key: `account:${id}`,
        name: name || "Student",
        email: email || "",
        sample: false,
        joinedAt,
        lastActiveDaysAgo: null,
        mastered,
        weeklyMinutes: null,
        profile,
      });
    }
  } catch { /* demo storage */ }
  return students;
}

const sampleProfile = (goal: string, confidence: string, explanationPreference: string, practicePreference: string, biggestChallenge: string, motivation: string, dailyMinutes: number): LearningProfile =>
  ({ goal, confidence, explanationPreference, practicePreference, biggestChallenge, motivation, dailyMinutes });

export const SAMPLE_STUDENTS: Student[] = [
  { key: "sample:maya", name: "Maya Rodriguez", email: "maya.r@example.edu", sample: true, joinedAt: null, lastActiveDaysAgo: 0, mastered: ["fin-interest", "fin-fv", "fin-pv"], weeklyMinutes: [95, 110, 120, 85],
    profile: sampleProfile("Earn a higher grade", "I understand most things quickly", "Real-world applications", "Scenario-based challenges", "Finding enough time", "I want to run my own business someday.", 30) },
  { key: "sample:jordan", name: "Jordan Taylor", email: "jordan.t@example.edu", sample: true, joinedAt: null, lastActiveDaysAgo: 1, mastered: ["fin-interest", "fin-fv"], weeklyMinutes: [60, 75, 70, 55],
    profile: sampleProfile("Understand the material deeply", "Some topics make sense, others don't", "Step-by-step examples", "Practice questions with hints", "Understanding difficult concepts", "", 30) },
  { key: "sample:sam", name: "Sam Kim", email: "sam.k@example.edu", sample: true, joinedAt: null, lastActiveDaysAgo: 6, mastered: [], weeklyMinutes: [40, 15, 0, 0],
    profile: sampleProfile("Build confidence in difficult subjects", "I usually need help with the basics", "Short and simple explanations", "Games and trivia", "Staying motivated", "Pass this class so I can stay on the team.", 15) },
  { key: "sample:priya", name: "Priya Shah", email: "priya.s@example.edu", sample: true, joinedAt: null, lastActiveDaysAgo: 0, mastered: ["fin-interest", "fin-fv", "fin-pv", "fin-annuity"], weeklyMinutes: [80, 90, 105, 120],
    profile: sampleProfile("Prepare for a career", "I'm ready for challenging material", "Detailed explanations", "Scenario-based challenges", "Remembering what I've learned", "Become a financial analyst.", 45) },
  { key: "sample:alex", name: "Alex Nguyen", email: "alex.n@example.edu", sample: true, joinedAt: null, lastActiveDaysAgo: 3, mastered: ["fin-fv"], weeklyMinutes: [35, 45, 30, 25],
    profile: sampleProfile("Earn a higher grade", "Some topics make sense, others don't", "Step-by-step examples", "Flashcards and quick recall", "Knowing where to start", "", 30) },
  { key: "sample:chris", name: "Chris Okafor", email: "chris.o@example.edu", sample: true, joinedAt: null, lastActiveDaysAgo: null, mastered: [], weeklyMinutes: [0, 0, 0, 0],
    profile: null },
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
  if (student.lastActiveDaysAgo === null) return student.sample ? "Never" : "This device";
  if (student.lastActiveDaysAgo === 0) return "Today";
  if (student.lastActiveDaysAgo === 1) return "Yesterday";
  return `${student.lastActiveDaysAgo} days ago`;
}
