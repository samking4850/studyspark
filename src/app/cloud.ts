"use client";

import { createClient } from "@supabase/supabase-js";
import type { LearningProfile } from "./professor/data";

// Shared database for accounts, classes and learning data. The publishable key is
// meant to be public; row level security in supabase/migrations decides who can
// read and write each row.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://wuizvwyqamrpfjotteci.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_Mk_7yi2es8XHQJ2Qu3x0xg_-j5w5jT5";
export const supabase = createClient(supabaseUrl, supabaseKey);

export type Role = "student" | "professor";
export type Profile = { id: string; role: Role; name: string; email: string; learning_profile: (LearningProfile & { completedAt?: string }) | null };
export type ClassTemplate = "finance-tvm" | "custom";
export type ClassInfo = { id: string; code: string; name: string; unit: string | null; template: ClassTemplate; professor_id: string; professorName?: string };
export type ObjectiveRow = { id: string; class_id: string; key: string; title: string; description: string; student_lesson: boolean; source: string | null; position: number };
export type AssignmentRow = { id: string; class_id: string; title: string; type: "Lesson" | "Reading" | "Practice set" | "Reflection"; objective_key: string | null; due_date: string; est_minutes: number; instructions: string; assigned_to: string[] | null; created_at: string };
export type SessionRow = { student_id: string; lesson_key: string; started_at: string; seconds: number };
export type AttemptRow = { student_id: string; lesson_key: string; question: number; chosen: number; correct: boolean; hinted: boolean; at: string };
export type ReflectionRow = { student_id: string; lesson_key: string; text: string; at: string };
// results holds the starting-point check: { scores: { [objective]: 0 | 1 | 2 }, completedAt } (see lib/learning-plan).
export type DiagnosticRow = { student_id: string; results: Record<string, unknown>; taken_at: string };
export type MessageRow = { id: string; class_id: string; student_id: string; professor_id: string; text: string; sent_at: string; read_at: string | null };
export type MasteryRow = { student_id: string; objective_key: string; mastered_at: string };
export type CompletionRow = { assignment_id: string; student_id: string };

export function friendlyError(message: string | undefined) {
  if (!message) return "Something went wrong. Please try again.";
  if (/invalid login credentials/i.test(message)) return "That email and password don't match an account.";
  if (/already registered|already been registered/i.test(message)) return "An account with that email already exists. Sign in instead.";
  if (/password should be at least/i.test(message)) return "Use a password with at least 6 characters.";
  if (/fetch|network/i.test(message)) return "Can't reach Study Spark right now. Check your internet connection and try again.";
  return message;
}

// Accounts -------------------------------------------------------------------
export async function currentProfile(): Promise<Profile | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data } = await supabase.from("profiles").select("id, role, name, email, learning_profile").eq("id", session.user.id).maybeSingle();
  return (data as Profile | null) ?? null;
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) return { profile: null, error: friendlyError(error.message) };
  return { profile: await currentProfile(), error: "" };
}

export async function signUp(name: string, email: string, password: string, role: Role) {
  const { data, error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password, options: { data: { name: name.trim(), role } } });
  if (error) return { profile: null, error: friendlyError(error.message) };
  if (!data.session) return { profile: null, error: "Check your email to confirm your account, then sign in." };
  return { profile: await currentProfile(), error: "" };
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function saveLearningProfile(userId: string, profile: LearningProfile & { completedAt?: string }) {
  const { error } = await supabase.from("profiles").update({ learning_profile: profile }).eq("id", userId);
  return error ? friendlyError(error.message) : "";
}

// Student workspace (their own classes, PDF text and completed topics) ---------
export async function loadWorkspace(userId: string) {
  const { data } = await supabase.from("workspaces").select("data").eq("user_id", userId).maybeSingle();
  return (data?.data as { courses: unknown[]; completed: string[] } | undefined) ?? null;
}

export async function saveWorkspace(userId: string, data: unknown) {
  const { error } = await supabase.from("workspaces").upsert({ user_id: userId, data, updated_at: new Date().toISOString() });
  return error ? friendlyError(error.message) : "";
}

// Classes ----------------------------------------------------------------------
export function normalizeCode(code: string) {
  return code.trim().replace(/[-\s]/g, "").toUpperCase();
}

export async function findClassByCode(code: string) {
  const { data } = await supabase.from("classes").select("id, code, name, unit, template, professor_id").eq("code", normalizeCode(code)).maybeSingle();
  return (data as ClassInfo | null) ?? null;
}

export async function joinClass(classId: string, userId: string) {
  const { error } = await supabase.from("enrollments").upsert({ class_id: classId, student_id: userId }, { onConflict: "class_id,student_id", ignoreDuplicates: true });
  return error ? friendlyError(error.message) : "";
}

async function attachProfessorNames(classes: ClassInfo[]) {
  const ids = Array.from(new Set(classes.map((item) => item.professor_id)));
  if (!ids.length) return classes;
  const { data } = await supabase.from("profiles").select("id, name").in("id", ids);
  const names = new Map((data ?? []).map((row: { id: string; name: string }) => [row.id, row.name]));
  return classes.map((item) => ({ ...item, professorName: names.get(item.professor_id) }));
}

export async function myEnrolledClasses(userId: string) {
  const { data } = await supabase.from("enrollments").select("classes(id, code, name, unit, template, professor_id)").eq("student_id", userId);
  const classes = (data ?? []).map((row) => (row as unknown as { classes: ClassInfo }).classes).filter(Boolean);
  return attachProfessorNames(classes);
}

export async function myTeachingClasses(userId: string) {
  const { data } = await supabase.from("classes").select("id, code, name, unit, template, professor_id").eq("professor_id", userId).order("created_at");
  return (data as ClassInfo[] | null) ?? [];
}

export async function createClass(input: { code: string; name: string; unit: string; template: ClassTemplate }) {
  const code = normalizeCode(input.code);
  if (!/^[A-Z0-9]{3,12}$/.test(code)) return { cls: null, error: "Use 3–12 letters or numbers for the class code, like FIN101." };
  const { data, error } = await supabase.from("classes").insert({ code, name: input.name.trim(), unit: input.unit.trim() || null, template: input.template }).select("id, code, name, unit, template, professor_id").single();
  if (error) return { cls: null, error: /duplicate|unique/i.test(error.message) ? "That class code is already taken. Try another one." : friendlyError(error.message) };
  return { cls: data as ClassInfo, error: "" };
}

// Everything a student needs for one class.
export async function loadStudentClass(classId: string, userId: string) {
  const [objectives, assignments, completions, mastery, sessions, attempts, reflections, diagnostic, messages] = await Promise.all([
    supabase.from("objectives").select("*").eq("class_id", classId).order("position"),
    supabase.from("assignments").select("*").eq("class_id", classId).order("due_date"),
    supabase.from("assignment_completions").select("assignment_id, student_id").eq("student_id", userId),
    supabase.from("lesson_mastery").select("student_id, objective_key, mastered_at").eq("class_id", classId).eq("student_id", userId),
    supabase.from("study_sessions").select("student_id, lesson_key, started_at, seconds").eq("class_id", classId).eq("student_id", userId),
    supabase.from("practice_attempts").select("student_id, lesson_key, question, chosen, correct, hinted, at").eq("class_id", classId).eq("student_id", userId),
    supabase.from("reflections").select("student_id, lesson_key, text, at").eq("class_id", classId).eq("student_id", userId),
    supabase.from("diagnostics").select("student_id, results, taken_at").eq("class_id", classId).eq("student_id", userId).maybeSingle(),
    supabase.from("messages").select("*").eq("class_id", classId).eq("student_id", userId).order("sent_at", { ascending: false }),
  ]);
  return {
    objectives: (objectives.data as ObjectiveRow[] | null) ?? [],
    assignments: (assignments.data as AssignmentRow[] | null) ?? [],
    completions: (completions.data as CompletionRow[] | null) ?? [],
    mastery: (mastery.data as MasteryRow[] | null) ?? [],
    sessions: (sessions.data as SessionRow[] | null) ?? [],
    attempts: (attempts.data as AttemptRow[] | null) ?? [],
    reflections: (reflections.data as ReflectionRow[] | null) ?? [],
    diagnostic: (diagnostic.data as DiagnosticRow | null) ?? null,
    messages: (messages.data as MessageRow[] | null) ?? [],
  };
}
export type StudentClassData = Awaited<ReturnType<typeof loadStudentClass>>;

// Student writes -----------------------------------------------------------------
export async function recordSession(classId: string, lessonKey: string, startedAt: Date, seconds: number) {
  if (seconds < 15) return;
  await supabase.from("study_sessions").insert({ class_id: classId, lesson_key: lessonKey, started_at: startedAt.toISOString(), seconds: Math.round(seconds) });
}

export async function recordAttempts(classId: string, rows: { lessonKey: string; question: number; chosen: number; correct: boolean; hinted: boolean }[]) {
  await supabase.from("practice_attempts").insert(rows.map((row) => ({ class_id: classId, lesson_key: row.lessonKey, question: row.question, chosen: row.chosen, correct: row.correct, hinted: row.hinted })));
}

export async function saveReflection(classId: string, userId: string, lessonKey: string, text: string) {
  await supabase.from("reflections").upsert({ class_id: classId, student_id: userId, lesson_key: lessonKey, text, at: new Date().toISOString() });
}

export async function saveMastery(classId: string, userId: string, objectiveKey: string) {
  await supabase.from("lesson_mastery").upsert({ class_id: classId, student_id: userId, objective_key: objectiveKey }, { onConflict: "class_id,student_id,objective_key", ignoreDuplicates: true });
}

export async function saveDiagnostic(classId: string, userId: string, results: unknown) {
  await supabase.from("diagnostics").upsert({ class_id: classId, student_id: userId, results, taken_at: new Date().toISOString() });
}

export async function setCompletion(assignmentId: string, studentId: string, done: boolean) {
  const query = done
    ? supabase.from("assignment_completions").upsert({ assignment_id: assignmentId, student_id: studentId }, { onConflict: "assignment_id,student_id", ignoreDuplicates: true })
    : supabase.from("assignment_completions").delete().eq("assignment_id", assignmentId).eq("student_id", studentId);
  const { error } = await query;
  return error ? friendlyError(error.message) : "";
}

export async function markMessageRead(messageId: string) {
  await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", messageId).is("read_at", null);
}

// Professor reads and writes -----------------------------------------------------------
export async function loadClassForProfessor(classId: string) {
  const [objectives, assignments, enrollments, mastery, sessions, attempts, reflections, diagnostics, messages, notes] = await Promise.all([
    supabase.from("objectives").select("*").eq("class_id", classId).order("position"),
    supabase.from("assignments").select("*").eq("class_id", classId).order("due_date"),
    supabase.from("enrollments").select("student_id, joined_at").eq("class_id", classId),
    supabase.from("lesson_mastery").select("student_id, objective_key, mastered_at").eq("class_id", classId),
    supabase.from("study_sessions").select("student_id, lesson_key, started_at, seconds").eq("class_id", classId),
    supabase.from("practice_attempts").select("student_id, lesson_key, question, chosen, correct, hinted, at").eq("class_id", classId),
    supabase.from("reflections").select("student_id, lesson_key, text, at").eq("class_id", classId),
    supabase.from("diagnostics").select("student_id, results, taken_at").eq("class_id", classId),
    supabase.from("messages").select("*").eq("class_id", classId).order("sent_at", { ascending: false }),
    supabase.from("professor_notes").select("student_id, text").eq("class_id", classId),
  ]);
  const assignmentRows = (assignments.data as AssignmentRow[] | null) ?? [];
  const enrollmentRows = (enrollments.data as { student_id: string; joined_at: string }[] | null) ?? [];
  const [profiles, completions] = await Promise.all([
    enrollmentRows.length ? supabase.from("profiles").select("id, role, name, email, learning_profile").in("id", enrollmentRows.map((row) => row.student_id)) : Promise.resolve({ data: [] }),
    assignmentRows.length ? supabase.from("assignment_completions").select("assignment_id, student_id").in("assignment_id", assignmentRows.map((row) => row.id)) : Promise.resolve({ data: [] }),
  ]);
  return {
    objectives: (objectives.data as ObjectiveRow[] | null) ?? [],
    assignments: assignmentRows,
    enrollments: enrollmentRows,
    profiles: (profiles.data as Profile[] | null) ?? [],
    completions: (completions.data as CompletionRow[] | null) ?? [],
    mastery: (mastery.data as MasteryRow[] | null) ?? [],
    sessions: (sessions.data as SessionRow[] | null) ?? [],
    attempts: (attempts.data as AttemptRow[] | null) ?? [],
    reflections: (reflections.data as ReflectionRow[] | null) ?? [],
    diagnostics: (diagnostics.data as DiagnosticRow[] | null) ?? [],
    messages: (messages.data as MessageRow[] | null) ?? [],
    notes: (notes.data as { student_id: string; text: string }[] | null) ?? [],
  };
}
export type ProfessorClassData = Awaited<ReturnType<typeof loadClassForProfessor>>;

export async function createAssignment(classId: string, input: { title: string; type: AssignmentRow["type"]; objectiveKey?: string; dueDate: string; estMinutes: number; instructions: string; assignedTo: string[] | null }) {
  const { error } = await supabase.from("assignments").insert({
    class_id: classId, title: input.title, type: input.type, objective_key: input.objectiveKey ?? null, due_date: input.dueDate,
    est_minutes: input.estMinutes, instructions: input.instructions, assigned_to: input.assignedTo,
  });
  return error ? friendlyError(error.message) : "";
}

export async function deleteAssignment(id: string) {
  const { error } = await supabase.from("assignments").delete().eq("id", id);
  return error ? friendlyError(error.message) : "";
}

export async function addObjective(classId: string, input: { title: string; description: string; source: string; position: number }) {
  const key = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const { error } = await supabase.from("objectives").insert({ class_id: classId, key, title: input.title, description: input.description, source: input.source, position: input.position, student_lesson: false });
  return error ? friendlyError(error.message) : "";
}

export async function removeObjective(id: string) {
  const { error } = await supabase.from("objectives").delete().eq("id", id).eq("student_lesson", false);
  return error ? friendlyError(error.message) : "";
}

export async function sendMessage(classId: string, studentId: string, text: string) {
  const { error } = await supabase.from("messages").insert({ class_id: classId, student_id: studentId, text });
  return error ? friendlyError(error.message) : "";
}

export async function saveNote(classId: string, studentId: string, professorId: string, text: string) {
  const { error } = await supabase.from("professor_notes").upsert({ class_id: classId, student_id: studentId, professor_id: professorId, text, updated_at: new Date().toISOString() });
  return error ? friendlyError(error.message) : "";
}

function isoDay(offsetDays: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

// One-click starter coursework for a finance class, handy for demos.
export async function addExampleAssignments(classId: string) {
  const lesson = "Complete the lesson in Study Spark. Mastery requires 3 of 4 practice questions correct and a written reflection.";
  const { error } = await supabase.from("assignments").insert([
    { class_id: classId, title: "Lesson: Simple vs. compound interest", type: "Lesson", objective_key: "fin-interest", due_date: isoDay(2), est_minutes: 25, instructions: lesson },
    { class_id: classId, title: "Lesson: Future value", type: "Lesson", objective_key: "fin-fv", due_date: isoDay(4), est_minutes: 25, instructions: lesson },
    { class_id: classId, title: "Read Chapter 5: Time Value of Money", type: "Reading", objective_key: null, due_date: isoDay(5), est_minutes: 40, instructions: "Read sections 5.1–5.3 and bring one question to class." },
    { class_id: classId, title: "Lesson: Present value", type: "Lesson", objective_key: "fin-pv", due_date: isoDay(7), est_minutes: 25, instructions: lesson },
    { class_id: classId, title: "Lesson: Annuities and loan payments", type: "Lesson", objective_key: "fin-annuity", due_date: isoDay(9), est_minutes: 25, instructions: lesson },
  ]);
  return error ? friendlyError(error.message) : "";
}
