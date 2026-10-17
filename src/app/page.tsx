"use client";

import CollegeLanding from "./CollegeLanding";
import JudgeDemo from "./JudgeDemo";
import StudyNight from "./StudyNight";
import StudentOnboarding, { type StudentProfile } from "./StudentOnboarding";
import FinanceClass from "./FinanceClass";
import { currentProfile, findClassByCode, joinClass as joinCloudClass, loadWorkspace, myEnrolledClasses, normalizeCode, saveLearningProfile, saveWorkspace, signIn as cloudSignIn, signOut as cloudSignOut, signUp as cloudSignUp, type ClassInfo, type Profile } from "./cloud";
import ClassUpdates from "./ClassUpdates";
import ProfessorSignInForm from "./ProfessorSignInForm";

import {
  ArrowRight,
  AudioLines,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileText,
  GraduationCap,
  Headphones,
  Library,
  Lightbulb,
  Menu,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  Sparkles,
  Sun,
  Target,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { ChangeEvent, DragEvent, FormEvent, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

type Course = {
  id: number;
  name: string;
  code: string;
  color: string;
  progress: number;
  exam: string;
  topics: number;
  examDate?: string;
  description?: string;
  dailyStudyMinutes?: number;
  targetGrade?: string;
  documents?: UploadedDocument[];
  courseTopics?: CourseTopic[];
};

type UploadedDocument = {
  id: string;
  filename: string;
  pageCount: number;
  extractedText: string;
  textTruncated: boolean;
  addedAt: string;
};

type CourseTopic = {
  id: string;
  name: string;
  sourceDocumentId?: string;
  sourcePage?: number;
  sourceExcerpt?: string;
};

type ExtractedDocument = {
  filename: string;
  pageCount: number;
  extractedText: string;
  textTruncated: boolean;
  suggestedTopics: Array<{ name: string; page: number; excerpt: string }>;
};

type Page = "Study Night" | "Overview" | "My courses" | "Course details" | "Study planner" | "Study guides" | "My progress" | "Finance classroom";

type DemoData = { courses: Course[]; completed: string[] };
type Account = { id: string; name: string; email: string };
const initialDemoData: DemoData = { courses: [], completed: [] };
const demoStorageEvent = "study-spark-storage-change";
const scratchAccountEmail = "student@scratch.test";
const scratchAccountPassword = "scratch123";

function subscribeToDemoStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(demoStorageEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(demoStorageEvent, onChange);
  };
}

function useDemoStorage(key: string, fallback: DemoData) {
  const [error, setError] = useState("");
  const getSnapshot = useCallback(() => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }, [key]);
  const getServerSnapshot = useCallback(() => null, []);
  const raw = useSyncExternalStore(subscribeToDemoStorage, getSnapshot, getServerSnapshot);
  const value = useMemo(() => {
    if (!raw) return fallback;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "courses" in parsed &&
        Array.isArray(parsed.courses) &&
        "completed" in parsed &&
        Array.isArray(parsed.completed)
      ) {
        return parsed as DemoData;
      }
      return fallback;
    } catch {
      return fallback;
    }
  }, [fallback, raw]);
  const save = useCallback(
    (next: DemoData) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
        setError("");
        window.dispatchEvent(new Event(demoStorageEvent));
        return true;
      } catch {
        setError("Browser storage is unavailable. Changes may not be saved.");
        return false;
      }
    },
    [key],
  );
  return { value, save, hasStoredData: Boolean(raw), error };
}

const navItems: { title: Page; icon: typeof GraduationCap }[] = [
  { title: "Overview", icon: GraduationCap },
  { title: "My courses", icon: Library },
  { title: "Study planner", icon: CalendarDays },
  { title: "Study guides", icon: Headphones },
  { title: "My progress", icon: Target },
  { title: "Study Night", icon: Sparkles },
];

type StudySession = {
  title: string;
  courseCode: string;
  courseName: string;
  duration: number;
  status: "Complete" | "Up next" | "Planned";
  focus: string;
  examDate: string;
  scheduledDate: string;
  topicId: string;
};

function isReadyToStudy(course: Course) {
  return Boolean(course.examDate && course.documents?.length && course.courseTopics?.length);
}

function getStudyReadyCourses(courses: Course[]) {
  return courses.filter(isReadyToStudy);
}

function buildStudyPlan(courses: Course[], completed: string[]) {
  const completedSet = new Set(completed);
  const activeCourses = getStudyReadyCourses(courses).sort((first, second) => (first.examDate ?? "").localeCompare(second.examDate ?? ""));
  const sessions: StudySession[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const course of activeCourses) {
    const courseTopics = course.courseTopics ?? [];
    const examDay = new Date(`${course.examDate}T00:00:00`);
    const daysUntilExam = Math.max(1, Math.floor((examDay.getTime() - today.getTime()) / 86_400_000) + 1);
    const dates = courseTopics.map((_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + Math.floor(index * daysUntilExam / courseTopics.length));
      return date.toISOString().slice(0, 10);
    });
    const topicsPerDay = new Map<string, number>();
    for (const date of dates) topicsPerDay.set(date, (topicsPerDay.get(date) ?? 0) + 1);
    for (const [index, topic] of courseTopics.entries()) {
      const scheduledDate = dates[index];
      const duration = Math.max(5, Math.floor((course.dailyStudyMinutes ?? 30) / (topicsPerDay.get(scheduledDate) ?? 1)));
      sessions.push({
        title: `Study ${topic.name}`,
        courseCode: course.code || "COURSE",
        courseName: course.name,
        duration,
        status: completedSet.has(topic.id) ? "Complete" : "Planned",
        focus: topic.name,
        examDate: course.examDate!,
        scheduledDate,
        topicId: topic.id,
      });
    }
  }
  sessions.sort((first, second) => first.scheduledDate.localeCompare(second.scheduledDate) || first.examDate.localeCompare(second.examDate));
  let nextSessionFound = false;
  for (const session of sessions) {
    if (session.status === "Complete") continue;
    if (!nextSessionFound) {
      session.status = "Up next";
      nextSessionFound = true;
    }
  }
  const totalMinutes = sessions.reduce((sum, session) => sum + session.duration, 0);

  return {
    sessions,
    totalMinutes,
    completeCount: sessions.filter((session) => session.status === "Complete").length,
    upcomingCount: sessions.filter((session) => session.status !== "Complete").length,
  };
}

export default function Home() {
  const [activeAccount, setActiveAccount] = useState<Account | null>(null);
  const [studentAccess, setStudentAccess] = useState(false);
  const [judgeDemo, setJudgeDemo] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [openClass, setOpenClass] = useState<ClassInfo | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  // Load the student's saved workspace and classes from their account.
  const enterAccount = useCallback(async (profile: Profile) => {
    if (profile.role === "professor") { window.location.assign("/professor"); return; }
    const workspace = await loadWorkspace(profile.id);
    try {
      window.localStorage.setItem(`study-spark-data:${profile.id}`, JSON.stringify(workspace ?? initialDemoData));
      window.dispatchEvent(new Event(demoStorageEvent));
    } catch { /* the in-memory copy still works */ }
    setStudentProfile((profile.learning_profile as StudentProfile | null) ?? null);
    setClasses(await myEnrolledClasses(profile.id));
    setEditingProfile(false);
    setActiveAccount({ id: profile.id, name: profile.name, email: profile.email });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const profile = await currentProfile();
      if (profile && !cancelled) await enterAccount(profile);
      if (!cancelled) setMounted(true);
    })();
    return () => { cancelled = true; };
  }, [enterAccount]);

  async function saveStudentProfile(profile: StudentProfile) {
    if (!activeAccount) return;
    const error = await saveLearningProfile(activeAccount.id, profile);
    if (error) { window.alert(`Could not save your learning profile. ${error}`); return; }
    setStudentProfile(profile);
    setEditingProfile(false);
  }

  const accountDemoKey = activeAccount ? `study-spark-data:${activeAccount.id}` : "study-spark-data";
  const { value: demoData, save: saveLocalData, error: storageError } = useDemoStorage(accountDemoKey, initialDemoData);
  // Keep a local copy for speed and save every change to the student's account.
  const saveDemoData = useCallback((next: DemoData) => {
    const ok = saveLocalData(next);
    if (ok && activeAccount) void saveWorkspace(activeAccount.id, next);
    return ok;
  }, [saveLocalData, activeAccount]);
  const { courses, completed } = demoData;
  const [activePage, setActivePage] = useState<Page>("Overview");
  const [courseDialog, setCourseDialog] = useState(false);
  const [joinDialog, setJoinDialog] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [dark, setDark] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authRole, setAuthRole] = useState<"student" | "professor">("student");
  const [authError, setAuthError] = useState("");
  const [authName, setAuthName] = useState("Jamie Davis");
  const [authEmail, setAuthEmail] = useState(scratchAccountEmail);
  const [authPassword, setAuthPassword] = useState(scratchAccountPassword);
  const studyReadyCourses = useMemo(() => getStudyReadyCourses(courses), [courses]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    const { profile, error } = await cloudSignIn(authEmail, authPassword.trim());
    setAuthBusy(false);
    if (error || !profile) { setAuthError(error || "Couldn't sign in. Please try again."); return; }
    setAuthError("");
    setActivePage("Overview");
    await enterAccount(profile);
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = authName.trim();
    if (!name || !authEmail.trim() || !authPassword.trim()) {
      setAuthError("Add a name, email, and password to create an account.");
      return;
    }
    setAuthBusy(true);
    const { profile, error } = await cloudSignUp(name, authEmail, authPassword.trim(), "student");
    setAuthBusy(false);
    if (error || !profile) { setAuthError(error || "Couldn't create your account. Please try again."); return; }
    setAuthError("");
    setAuthMode("signin");
    setActivePage("Overview");
    await enterAccount(profile);
  }

  async function signOut() {
    if (activeAccount) { try { window.localStorage.removeItem(`study-spark-data:${activeAccount.id}`); } catch { /* nothing cached */ } }
    await cloudSignOut();
    setActiveAccount(null);
    setStudentProfile(null);
    setClasses([]);
    setOpenClass(null);
    setAuthMode("signin");
    setAuthEmail(scratchAccountEmail);
    setAuthPassword(scratchAccountPassword);
    setAuthError("");
  }

  if (!mounted) {
    return (
      <main className="auth-shell">
        <div className="auth-loading"><span className="brand-mark"><Sparkles size={19} /></span><strong>Getting your study space ready…</strong></div>
      </main>
    );
  }

  if (judgeDemo) return <JudgeDemo onExit={() => { setJudgeDemo(false); window.scrollTo({ top: 0 }); }} />;

  if (!activeAccount && !studentAccess) return <CollegeLanding onDemo={() => { setJudgeDemo(true); window.scrollTo({ top: 0 }); }} onStudentAccess={() => { setStudentAccess(true); window.scrollTo({ top: 0 }); }} />;

  if (!activeAccount) {
    return (
      <main className="auth-shell">
        <div className="auth-page">
          <header className="auth-brand-row">
            <a className="brand auth-brand" href="#" onClick={(event) => event.preventDefault()}>
              <span className="brand-mark"><Sparkles size={19} strokeWidth={2.5} /></span>
              <span>study<span className="brand-light">spark</span><span className="brand-dot">.</span></span>
            </a>
            <button className="secondary-button" onClick={() => setStudentAccess(false)}>For colleges</button>
          </header>

          <div className="auth-columns">
            <section className="auth-intro">
              <div className="auth-kicker"><Sparkles size={14} /> YOUR NEXT STEP, MADE CLEAR</div>
              <h1>Turn class materials into a study plan that <span>fits your life.</span></h1>
              <p className="auth-lede">Stop wondering where to start. Turn your course material into focused practice, a realistic plan, and momentum you can share with friends.</p>

              <div className="judge-entry"><span className="eyebrow">STARTUP 48 · SEE THE SOLUTION</span><button className="primary-button" onClick={() => { setJudgeDemo(true); window.scrollTo({ top: 0 }); }}>Experience the demo <ArrowRight size={16} /></button><small>Follow one student from overwhelmed to ready. No signup required.</small></div>

              <div className="how-to-use">
                <h2>How Study Spark works</h2>
                <article className="how-step"><span>1</span><div><strong>Add your classes</strong><p>Set the class name, exam date, and realistic daily study time.</p></div></article>
                <article className="how-step"><span>2</span><div><strong>Add class content</strong><p>Open a class and upload a text-based PDF. Review its extracted text and suggested topics.</p></div></article>
                <article className="how-step"><span>3</span><div><strong>Study and track progress</strong><p>Once a class has an exam date, an uploaded PDF, and reviewed topics, use Study guides and Study planner. My Progress counts topics you actually complete.</p></div></article>
              </div>

              <div className="auth-nav-guide">
                <strong>Find your way around</strong>
                <p><b>Overview</b> is your home base · <b>My courses</b> holds classes and content · <b>Study planner</b> organizes sessions · <b>Study guides</b> opens source-based guides · <b>My progress</b> shows completed topics.</p>
              </div>
            </section>

            <section className="auth-card" aria-labelledby="auth-heading">
              <div className="role-switch" role="group" aria-label="Sign in as">
                <button type="button" aria-pressed={authRole === "student"} className={authRole === "student" ? "selected" : ""} onClick={() => setAuthRole("student")}><GraduationCap size={15} /> I&apos;m a student</button>
                <button type="button" aria-pressed={authRole === "professor"} className={authRole === "professor" ? "selected" : ""} onClick={() => setAuthRole("professor")}><Library size={15} /> I&apos;m a professor</button>
              </div>
              {authRole === "professor" ? <ProfessorSignInForm /> : <>
              <div className="auth-card-heading">
                <span className="eyebrow">{authMode === "signin" ? "WELCOME BACK" : "GET STARTED"}</span>
                <h2 id="auth-heading">{authMode === "signin" ? "Sign in to study" : "Create your account"}</h2>
                <p>{authMode === "signin" ? "Pick up where you left off." : "Start with a blank workspace and add your own classes and materials."}</p>
              </div>

              <div className="auth-tabs" role="tablist" aria-label="Account access">
                <button type="button" role="tab" aria-selected={authMode === "signin"} className={authMode === "signin" ? "selected" : ""} onClick={() => { setAuthMode("signin"); setAuthError(""); }}>Sign in</button>
                <button type="button" role="tab" aria-selected={authMode === "signup"} className={authMode === "signup" ? "selected" : ""} onClick={() => { setAuthMode("signup"); setAuthEmail(""); setAuthPassword(""); setAuthError(""); }}>New user</button>
              </div>

              {authMode === "signin" ? (
                <form className="auth-form" onSubmit={signIn}>
                  <label>Email<input value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} type="email" autoComplete="username" placeholder="you@example.com" required /></label>
                  <label>Password<input value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} type="password" autoComplete="current-password" placeholder="Your password" required /></label>
                  {authError && <p className="inline-error" role="alert">{authError}</p>}
                  <button type="submit" className="primary-button" disabled={authBusy}>{authBusy ? "Signing in…" : <>Sign in <ArrowRight size={15} /></>}</button>
                </form>
              ) : (
                <form className="auth-form" onSubmit={createAccount}>
                  <label>Your name<input value={authName} onChange={(event) => setAuthName(event.target.value)} autoComplete="name" placeholder="Jamie Davis" required /></label>
                  <label>Email<input value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} type="email" autoComplete="email" placeholder="you@example.com" required /></label>
                  <label>Password<input value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} type="password" autoComplete="new-password" minLength={6} placeholder="At least 6 characters" required /></label>
                  {authError && <p className="inline-error" role="alert">{authError}</p>}
                  <button type="submit" className="primary-button" disabled={authBusy}>{authBusy ? "Creating account…" : <>Create account <ArrowRight size={15} /></>}</button>
                </form>
              )}

              <div className="scratch-login">
                <div><strong>Just exploring?</strong><p>Use the demo student account.</p></div>
                <button type="button" className="secondary-button" onClick={() => { setAuthMode("signin"); setAuthEmail(scratchAccountEmail); setAuthPassword(scratchAccountPassword); setAuthError(""); }}>Use demo student</button>
                <small>{scratchAccountEmail} · {scratchAccountPassword}</small>
              </div>
              <p className="auth-demo-note">Your account, classes and progress are saved securely, so you can sign in from any device. Study guides unlock after you add a class, an exam date, and an uploaded PDF.</p>
              </>}
            </section>
          </div>
          <footer className="auth-footer">Study Spark · Build a steady study habit, one session at a time.</footer>
        </div>
      </main>
    );
  }

  if (!studentProfile || editingProfile) {
    return <StudentOnboarding key={activeAccount.id} name={activeAccount.name} initial={studentProfile} onSave={saveStudentProfile} onExit={signOut} />;
  }

  async function joinClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeAccount) return;
    const cls = await findClassByCode(joinCode);
    if (!cls) { setJoinError("No class uses that code. Check the code with your professor."); return; }
    const error = await joinCloudClass(cls.id, activeAccount.id);
    if (error) { setJoinError(error); return; }
    const enrolled = await myEnrolledClasses(activeAccount.id);
    setClasses(enrolled);
    const withName = enrolled.find((item) => item.id === cls.id) ?? cls;
    if (!courses.some((course) => course.code === cls.code)) {
      const newCourse: Course = { id: Date.now(), name: cls.name, code: cls.code, color: "blue", progress: 0, exam: "Upcoming", description: [withName.professorName ? `Professor ${withName.professorName}` : "", cls.unit ?? ""].filter(Boolean).join(" · "), topics: 0, courseTopics: [], documents: [] };
      saveDemoData({ ...demoData, courses: [...courses, newCourse] });
    }
    setOpenClass(withName);
    setJoinDialog(false); setJoinCode(""); setJoinError(""); setActivePage("Finance classroom");
  }

  function openJoinedClass(code: string) {
    const cls = classes.find((item) => item.code === normalizeCode(code));
    if (!cls) return false;
    setOpenClass(cls);
    setActivePage("Finance classroom");
    return true;
  }

  function submitCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    if (!name) return;
    const examRaw = String(form.get("exam") || "");
    const dailyStudyMinutes = Number(form.get("dailyStudyMinutes") || 30);
    const newCourse: Course = {
      id: Date.now(),
      name,
      code: String(form.get("code") || "NEW COURSE").trim().toUpperCase(),
      color: ["lilac", "peach", "blue"][courses.length % 3],
      progress: 0,
      exam: examRaw
        ? new Date(`${examRaw}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "Not set",
      examDate: examRaw || undefined,
      description: String(form.get("description") || "").trim(),
      dailyStudyMinutes,
      targetGrade: String(form.get("targetGrade") || ""),
      topics: 0,
      documents: [],
      courseTopics: [],
    };
    saveDemoData({ ...demoData, courses: [...courses, newCourse] });
    setCourseDialog(false);
    setSelectedCourseId(newCourse.id);
    setActivePage("Course details");
  }

  function updateCourse(courseId: number, update: (course: Course) => Course) {
    return saveDemoData({
      ...demoData,
      courses: courses.map((course) => course.id === courseId ? update(course) : course),
    });
  }

  function saveExtractedDocument(courseId: number, result: ExtractedDocument) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return updateCourse(courseId, (course) => {
      const document: UploadedDocument = {
        id,
        filename: result.filename,
        pageCount: result.pageCount,
        extractedText: result.extractedText,
        textTruncated: result.textTruncated,
        addedAt: new Date().toISOString(),
      };
      const currentTopics = course.courseTopics ?? [];
      const existingNames = new Set(currentTopics.map((topic) => topic.name.toLocaleLowerCase()));
      const suggestedTopics = result.suggestedTopics
        .filter((topic) => !existingNames.has(topic.name.toLocaleLowerCase()))
        .map((topic) => ({
          id: `${id}-${topic.page}-${topic.name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          name: topic.name,
          sourceDocumentId: id,
          sourcePage: topic.page,
          sourceExcerpt: topic.excerpt,
        }));
      const nextTopics = [...currentTopics, ...suggestedTopics];
      return {
        ...course,
        documents: [...(course.documents ?? []), document],
        courseTopics: nextTopics,
        topics: nextTopics.length,
      };
    });
  }

  function markLessonComplete(topicId: string) {
    if (!completed.includes(topicId)) saveDemoData({ ...demoData, completed: [...completed, topicId] });
  }

  return (
    <main className={dark ? "app-shell dark-mode" : "app-shell"}>
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setActivePage("Overview"); }}>
          <span className="brand-mark"><Sparkles size={19} strokeWidth={2.5} /></span>
          <span>study<span className="brand-light">spark</span><span className="brand-dot">.</span></span>
        </a>
        <div className="workspace-label">YOUR SPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map(({ title, icon: Icon }) => (
            <button key={title} className={`nav-item ${activePage === title ? "active" : ""}`} onClick={() => { setActivePage(title); setMobileNav(false); }}>
              <Icon size={18} strokeWidth={1.9} /><span>{title}</span>
              {title === "Study guides" && studyReadyCourses.length > 0 && <span className="nav-new">READY</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-section-heading">
          <span>YOUR COURSES</span>
          <button className="icon-button tiny" aria-label="Add a course" onClick={() => setCourseDialog(true)}><Plus size={16} /></button>
        </div>
        <div className="course-nav-list">
          {courses.map((course) => (
            <button className="course-nav-item" key={course.id} onClick={() => setActivePage("My courses")}>
              <span className={`course-dot ${course.color}`} />
              <span className="course-nav-copy"><span>{course.name}</span><small>{course.code}</small></span>
            </button>
          ))}
        </div>
        <div className="sidebar-tools">
          <button className="sidebar-tool-button primary" onClick={() => setCourseDialog(true)}><Plus size={14} /> Add class</button>
          <button className="sidebar-tool-button" onClick={() => { if (courses[0]) { setSelectedCourseId(courses[0].id); setActivePage("Course details"); } else setCourseDialog(true); }}><Upload size={14} /> Add content</button>
          <button className="sidebar-tool-button" onClick={() => setActivePage("Study guides")} disabled={!studyReadyCourses.length}><Sparkles size={14} /> {studyReadyCourses.length ? "Continue lesson" : "No lessons yet"}</button>
        </div>
        <div className="sidebar-spacer" />
        <button type="button" className="onboarding-edit" onClick={() => setEditingProfile(true)}><Target size={16}/> My learning profile</button>
        <button className="profile-button" onClick={signOut}>
          <span className="avatar">{(activeAccount?.name ?? "JD").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span>
          <span className="profile-copy"><strong>{activeAccount?.name ?? "Student"}</strong><small>Sign out</small></span>
          <MoreHorizontal size={18} className="profile-more" />
        </button>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(!mobileNav)}><Menu size={20} /></button>
          <div className="breadcrumb">My workspace <ChevronRight size={14} /> <strong>{activePage}</strong></div>
          <div className="topbar-actions">
            <div className="demo-indicator"><span />Saved to your account</div>
            <button className="icon-button theme-button" aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} onClick={() => setDark(!dark)}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button className="help-button"><CircleHelp size={17} /> <span>Help</span></button>
          </div>
        </header>

        <div className="content">
          {activePage === "Overview" && classes.length > 0 && <ClassUpdates userId={activeAccount.id} classes={classes} onOpen={(cls) => { setOpenClass(cls); setActivePage("Finance classroom"); }} />}
          {activePage === "Overview" && classes.length === 0 && <div className="join-class-banner"><div><strong>Join your college class</strong><p>Enter your professor’s class code to unlock personalized lessons and assignments.</p></div><button className="primary-button" onClick={() => setJoinDialog(true)}>Join class <ArrowRight size={15}/></button></div>}
          {activePage === "Overview" && (
            <Overview
            studentName={activeAccount.name}
            courses={courses}
              completed={completed}
              storageError={storageError}
              onAdd={() => setJoinDialog(true)}
              onGo={setActivePage}
            />
          )}
          {activePage === "My courses" && <div className="join-class-banner"><div><strong>Taking a college course?</strong><p>Join your professor’s class using the class code they share with you.</p></div><button className="primary-button" onClick={() => setJoinDialog(true)}><Plus size={15}/> Join a class</button></div>}
          {activePage === "My courses" && <CoursesPage courses={courses} completed={completed} onAdd={() => setJoinDialog(true)} onOpen={(courseId) => { const course = courses.find((item) => item.id === courseId); setSelectedCourseId(courseId); if (!(course && openJoinedClass(course.code))) setActivePage("Course details"); }} />}
          {activePage === "Course details" && (
            <CourseDetailPage
              course={courses.find((course) => course.id === selectedCourseId)}
              storageError={storageError}
              onBack={() => setActivePage("My courses")}
              onUpload={saveExtractedDocument}
              onUpdate={updateCourse}
              onTutor={() => setActivePage("Study guides")}
            />
          )}
          {activePage === "Finance classroom" && studentProfile && activeAccount && openClass && <FinanceClass key={openClass.id} cls={openClass} profile={studentProfile} userId={activeAccount.id} onBack={() => setActivePage("My courses")} />}
          {activePage === "Study planner" && <PlannerPage courses={courses} completed={completed} />}
          {activePage === "Study guides" && <TutorPage courses={studyReadyCourses} completed={completed} onComplete={markLessonComplete} onAddCourse={() => { if (courses[0]) { setSelectedCourseId(courses[0].id); setActivePage("Course details"); } else setCourseDialog(true); }} />}
          {activePage === "Study Night" && <StudyNight key={activeAccount.id} name={activeAccount.name} accountId={activeAccount.id} />}
          {activePage === "My progress" && <ProgressPage courses={courses} completed={completed} />}
        </div>
      </section>

      {joinDialog && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setJoinDialog(false); }}><section className="finance-join-modal" role="dialog" aria-modal="true" aria-label="Join a class"><button className="finance-close" onClick={() => setJoinDialog(false)} aria-label="Close"><X size={20}/></button><GraduationCap size={28}/><h2>Join your professor's class</h2><p>Enter the class code shared by your instructor.</p><form onSubmit={joinClass}><label htmlFor="finance-code">Class code</label><input id="finance-code" autoFocus value={joinCode} onChange={e=>{setJoinCode(e.target.value);setJoinError("");}} placeholder="FIN101" required /><small>Demo class code: <strong>FIN101</strong></small>{joinError && <p className="inline-error" role="alert">{joinError}</p>}<button className="primary-button" type="submit">Join class <ArrowRight size={15}/></button></form></section></div>}
      {courseDialog && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCourseDialog(false); }}>
          <section className="course-modal" role="dialog" aria-modal="true" aria-labelledby="course-modal-title">
            <div className="modal-heading">
              <div><span className="eyebrow">LET’S GET STARTED</span><h2 id="course-modal-title">Add a course</h2><p>A little setup now makes your study plan personal.</p></div>
              <button className="icon-button" aria-label="Close" onClick={() => setCourseDialog(false)}><X size={19} /></button>
            </div>
            <form onSubmit={submitCourse} className="course-form">
              <label>Course name<input name="name" placeholder="e.g. Introduction to Biology" required maxLength={100} autoFocus /></label>
              <label>Course code <span className="optional-label">Optional</span><input name="code" placeholder="e.g. BIO 101" maxLength={30} /></label>
              <label>Course description <span className="optional-label">Optional</span><textarea name="description" rows={2} maxLength={500} placeholder="What are you learning in this class?" /></label>
              <div className="course-form-row">
                <label>Exam date<input name="exam" type="date" required /></label>
                <label>Study time per day<select name="dailyStudyMinutes" defaultValue="30"><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option><option value="120">2 hours</option></select></label>
              </div>
              <label>Target grade <span className="optional-label">Optional</span><select name="targetGrade" defaultValue=""><option value="">Not set</option><option>A range (90%+)</option><option>B range (80–89%)</option><option>C range (70–79%)</option><option>Pass the course</option></select></label>
              <div className="demo-note"><Lightbulb size={17} /><span>Course details are saved to your account. You can add a PDF and review its extracted topics after creating the course.</span></div>
              <div className="modal-footer"><button type="button" className="secondary-button" onClick={() => setCourseDialog(false)}>Cancel</button><button type="submit" className="primary-button">Create course <ArrowRight size={16} /></button></div>
            </form>
          </section>
        </div>
      )}
      {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
    </main>
  );
}

function Overview({ studentName, courses, completed, storageError, onAdd, onGo }: { studentName: string; courses: Course[]; completed: string[]; storageError: string; onAdd: () => void; onGo: (page: Page) => void }) {
  const plan = buildStudyPlan(courses, completed);
  const readyCourses = getStudyReadyCourses(courses);
  const documentCount = courses.reduce((sum, course) => sum + (course.documents?.length ?? 0), 0);
  const topicCount = courses.reduce((sum, course) => sum + (course.courseTopics?.length ?? 0), 0);

  return <>
    <div className="welcome-row">
      <div><div className="date-label"><Sun size={14} /> YOUR STUDY SPACE</div><h1>Hey {studentName.split(" ")[0]}, <span>you’ve got this.</span></h1><p>Your classes, course materials, and next steps — all in one place.</p></div>
      <button className="primary-button add-course-top" onClick={onAdd}><Plus size={17} /> Add a class</button>
    </div>
    <div className="stats-grid">
      <div className="stat-card"><div className="stat-top"><span>YOUR CLASSES</span><Library size={17} /></div><div className="stat-value">{courses.length}</div><div className="stat-foot">Added to your workspace</div></div>
      <div className="stat-card"><div className="stat-top"><span>FILES UPLOADED</span><FileText size={17} /></div><div className="stat-value">{documentCount}</div><div className="stat-foot">PDFs processed from your classes</div></div>
      <div className="stat-card"><div className="stat-top"><span>TOPICS FROM YOUR FILES</span><BookOpen size={17} /></div><div className="stat-value">{topicCount}</div><div className="stat-foot">Review and edit in course details</div></div>
      <div className="stat-card"><div className="stat-top"><span>TOPICS COMPLETED</span><CheckCircle2 size={17} /></div><div className="stat-value">{completed.length}</div><div className="stat-foot">Only lessons you finished</div></div>
    </div>
    <div className="quick-action-strip">
      <button className="quick-action primary" onClick={onAdd}><Plus size={17} /> Add class &amp; exam date</button>
      <button className="quick-action secondary" onClick={() => courses[0] ? onGo("My courses") : onAdd()}><Upload size={17} /> Add class content</button>
      <button className="quick-action accent" onClick={() => onGo("Study guides")} disabled={!readyCourses.length}><Sparkles size={17} /> {readyCourses.length ? "Continue lesson" : "No lessons until files are added"}</button>
    </div>
    <div className="dashboard-grid">
      <section className="panel today-panel">
        <div className="panel-heading"><div><span className="eyebrow">BASED ON YOUR CLASS FILES</span><h2>Study plan</h2></div><button className="text-button" onClick={() => onGo("Study planner")}>Open planner <ArrowRight size={15} /></button></div>
        {plan.sessions.length ? <div className="week-sessions">{plan.sessions.slice(0, 5).map((session) => <div className={`week-session ${session.status === "Complete" ? "completed-week" : session.status === "Up next" ? "active-week" : ""}`} key={session.topicId}>
          <span className="week-session-check">{session.status === "Complete" ? <Check size={14} /> : <BookOpen size={14} />}</span>
          <div><strong>{session.title}</strong><span>{session.courseCode} · {session.courseName} · Exam {new Date(`${session.examDate}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></div>
          <span className="week-session-time">{session.duration} min</span>
          {session.status !== "Complete" && <button className="small-link" onClick={() => onGo("Study guides")}>{session.status === "Up next" ? "Study now" : "Open"} <ArrowRight size={12} /></button>}
        </div>)}</div> : <div className="first-course-empty"><BookOpen size={23} /><strong>No lessons or study sessions yet</strong><p>Add a class, exam date, upload a PDF, and review at least one topic. Your study plan will only use your own course content.</p><button className="primary-button" onClick={() => courses[0] ? onGo("My courses") : onAdd()}>{courses.length ? "Open class materials" : "Add your first class"} <ArrowRight size={14} /></button></div>}
      </section>
      <section className="panel focus-panel">
        <div className="panel-heading"><div><span className="eyebrow">YOUR CLASSES</span><h2>{courses.length ? `${courses.length} ${courses.length === 1 ? "class" : "classes"}` : "No classes yet"}</h2></div><button className="icon-button tiny" aria-label="View all classes" onClick={() => onGo("My courses")}><ArrowRight size={16} /></button></div>
        {courses.length ? <div className="overview-course-list">{courses.map((course) => <button className="overview-course-item" key={course.id} onClick={() => onGo("My courses")}><span className={`course-dot ${course.color}`} /><span><strong>{course.name}</strong><small>{course.examDate ? `Exam ${new Date(`${course.examDate}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : "Exam date missing"} · {course.documents?.length ?? 0} files</small></span><ChevronRight size={15} /></button>)}</div> : <div className="first-course-empty compact"><p>Add a class to see its exam schedule and course files here.</p><button className="secondary-button" onClick={onAdd}><Plus size={14} /> Add class</button></div>}
      </section>
    </div>
    <div className="data-footnote"><span><span className="demo-dot" /> SYNCED</span>{storageError || "Your classes, files and progress are saved to your account, so they follow you to any device."}<button onClick={() => onGo("My progress")}>View actual progress <ArrowRight size={12} /></button></div>
  </>;
}

function CoursesPage({ courses, completed, onAdd, onOpen }: { courses: Course[]; completed: string[]; onAdd: () => void; onOpen: (courseId: number) => void }) {
  const totalTopics = courses.reduce((sum, course) => sum + (course.courseTopics?.length ?? 0), 0);
  const totalFiles = courses.reduce((sum, course) => sum + (course.documents?.length ?? 0), 0);
  return <><div className="welcome-row page-welcome"><div><div className="date-label"><Library size={14} /> YOUR LEARNING SPACE</div><h1>My <span>courses.</span></h1><p>Only classes and materials you add appear here.</p></div><button className="primary-button" onClick={onAdd}><Plus size={17} /> Add a class</button></div>
    <div className="course-overview-strip"><div><strong>{courses.length}</strong><span>classes added</span></div><div><strong>{totalFiles}</strong><span>PDFs uploaded</span></div><div><strong>{totalTopics}</strong><span>topics from your files</span></div><div><strong>{completed.length}</strong><span>topics completed</span></div></div>
    {courses.length ? <div className="course-page-grid">{courses.map((course) => <article className={`course-detail-card ${course.color}`} key={course.id}><div className="course-detail-header"><span className="course-code-pill">{course.code}</span><button className="icon-button tiny" aria-label={`Open ${course.name}`} onClick={() => onOpen(course.id)}><ArrowRight size={16} /></button></div><h2>{course.name}</h2><p className="course-exam"><CalendarDays size={15} /> Exam {course.examDate ? new Date(`${course.examDate}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "not set"}</p>{course.description && <p className="course-card-description">{course.description}</p>}<div className="course-detail-progress"><div><span>Course materials</span><strong>{course.documents?.length ?? 0} files</strong></div><div className="course-detail-foot"><span><BookOpen size={15} /> {course.courseTopics?.length ?? 0} topics</span><button className="small-link" onClick={() => onOpen(course.id)}>Open class &amp; files <ArrowRight size={14} /></button></div></div></article>)}
      <button className="course-create-card" onClick={onAdd}><span className="add-circle"><Plus size={19} /></span><strong>Add another class</strong><span>Add your class and exam schedule.</span></button></div> : <div className="first-course-empty"><Library size={24} /><strong>No classes added</strong><p>Create a class with an exam date first. Then open it to drop in course materials.</p><button className="primary-button" onClick={onAdd}><Plus size={15} /> Add your first class</button></div>}</>;
}

function CourseDetailPage({
  course,
  storageError,
  onBack,
  onUpload,
  onUpdate,
  onTutor,
}: {
  course: Course | undefined;
  storageError: string;
  onBack: () => void;
  onUpload: (courseId: number, result: ExtractedDocument) => boolean;
  onUpdate: (courseId: number, update: (course: Course) => Course) => boolean;
  onTutor: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [draggingFile, setDraggingFile] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [addingTopic, setAddingTopic] = useState("");
  const [topicError, setTopicError] = useState("");

  async function processFile(file: File | undefined) {
    if (!file || !course) return;
    setUploadError("");
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Please choose a PDF file. Other file types aren’t supported yet.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("This file is too large. Choose a PDF under 5 MB.");
      return;
    }
    if (!file.size) {
      setUploadError("This PDF is empty. Choose a file with course notes.");
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/documents/extract", { method: "POST", body });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
            ? payload.error
            : "The PDF couldn’t be processed. Please try another file.";
        throw new Error(message);
      }
      if (!isExtractedDocument(payload)) {
        throw new Error("The extraction service returned an unexpected response. Please try again.");
      }
      if (!onUpload(course.id, payload)) {
        throw new Error("The PDF was extracted, but browser storage is full or unavailable. Remove a document or free browser storage, then try again.");
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "The PDF could not be processed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    await processFile(file);
  }

  async function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDraggingFile(false);
    await processFile(event.dataTransfer.files[0]);
  }

  function addTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!course || !addingTopic.trim()) return;
    const name = addingTopic.trim();
    const currentTopics = course.courseTopics ?? [];
    if (currentTopics.some((topic) => topic.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      setTopicError("That topic is already in this course.");
      return;
    }
    const nextTopics = [...currentTopics, { id: `${Date.now()}-manual`, name }];
    if (!onUpdate(course.id, (item) => ({ ...item, courseTopics: nextTopics, topics: nextTopics.length }))) {
      setTopicError("Browser storage is unavailable. Your topic was not saved.");
      return;
    }
    setAddingTopic("");
    setTopicError("");
  }

  function renameTopic(topicId: string, name: string) {
    if (!course || !name.trim()) return;
    onUpdate(course.id, (item) => ({
      ...item,
      courseTopics: (item.courseTopics ?? []).map((topic) => topic.id === topicId ? { ...topic, name: name.trim() } : topic),
    }));
  }

  function deleteTopic(topicId: string) {
    if (!course) return;
    const nextTopics = (course.courseTopics ?? []).filter((topic) => topic.id !== topicId);
    onUpdate(course.id, (item) => ({ ...item, courseTopics: nextTopics, topics: nextTopics.length }));
  }

  if (!course) {
    return <section className="panel missing-course"><h1>Course not found</h1><p>It may have been removed from your account.</p><button className="secondary-button" onClick={onBack}><ChevronLeft size={15} /> Back to courses</button></section>;
  }

  const documents = course.documents ?? [];
  const courseTopics = course.courseTopics ?? [];

  return <>
    <button className="back-link" onClick={onBack}><ChevronLeft size={15} /> My courses</button>
    <div className="course-detail-title-row"><div><div className="date-label"><Library size={14} /> {course.code}</div><h1>{course.name}</h1><p>{course.description || "Add notes and topics to make this course your own."}</p></div><button className="primary-button" onClick={onTutor} disabled={!isReadyToStudy(course)}><Sparkles size={15} /> {isReadyToStudy(course) ? "Open study guide" : "Upload a PDF to unlock lessons"}</button></div>
    <div className="course-setup-summary"><div><CalendarDays size={16} /><span><small>EXAM DATE</small><strong>{course.examDate ? new Date(`${course.examDate}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Not set"}</strong></span></div><div><Clock3 size={16} /><span><small>STUDY TIME</small><strong>{course.dailyStudyMinutes ?? 30} min per day</strong></span></div><div><Target size={16} /><span><small>TARGET GRADE</small><strong>{course.targetGrade || "Not set"}</strong></span></div></div>
    {storageError && <p className="storage-warning" role="alert">{storageError}</p>}
    <div className="course-workspace-grid">
      <section className="panel materials-panel"><div className="panel-heading"><div><span className="eyebrow">YOUR COURSE MATERIALS</span><h2>Study documents</h2></div><span className="document-count">{documents.length}</span></div><p className="section-description">Upload text-based PDFs you have permission to use. We extract the text and save it to your account; the original file is not retained.</p>
        <label className={`upload-dropzone ${uploading ? "uploading" : ""} ${draggingFile ? "dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDraggingFile(true); }} onDragLeave={(event) => { if (event.currentTarget === event.target) setDraggingFile(false); }} onDrop={handleDrop}><input type="file" accept="application/pdf,.pdf" onChange={handleUpload} disabled={uploading} /><span className="upload-icon">{uploading ? <span className="loading-spinner" /> : <Upload size={18} />}</span><strong>{uploading ? "Reading your PDF…" : draggingFile ? "Drop PDF to add course content" : "Drop a PDF here or choose a file"}</strong><small>{uploading ? "Extracting selectable text and finding heading suggestions" : "PDF only · up to 5 MB · max 100 pages. The PDF is processed and its extracted text is saved to your account."}</small></label>
        {uploadError && <p className="inline-error" role="alert">{uploadError}</p>}
        <div className="document-list">{documents.map((document) => <article className="document-card" key={document.id}><span className="document-file-icon"><FileText size={17} /></span><div className="document-info"><strong>{document.filename}</strong><small>{document.pageCount} pages · text extracted</small></div><details className="document-text"><summary>View text</summary><pre>{document.extractedText}{document.textTruncated ? "\n\n[Text excerpt truncated at 100,000 characters in this demo.]" : ""}</pre></details><button className="icon-button tiny remove-document" aria-label={`Remove ${document.filename}`} onClick={() => { const nextDocuments = documents.filter((item) => item.id !== document.id); const nextTopics = courseTopics.filter((topic) => topic.sourceDocumentId !== document.id); onUpdate(course.id, (item) => ({ ...item, documents: nextDocuments, courseTopics: nextTopics, topics: nextTopics.length })); }}><Trash2 size={14} /></button></article>)}</div>
        {!documents.length && !uploadError && <div className="empty-documents"><FileText size={16} /><span>No documents yet. You can still add topics manually.</span></div>}
        <div className="document-disclaimer"><Lightbulb size={14} /><span>The original PDF is processed for text extraction, then discarded; extracted text and topic references are saved to your account. Scanned/image-only PDFs need OCR, which is not included.</span></div>
      </section>

      <section className="panel topics-panel"><div className="panel-heading"><div><span className="eyebrow">REVIEW &amp; EDIT</span><h2>Course topics</h2></div><span className="document-count">{courseTopics.length}</span></div><p className="section-description">{documents.length ? "Suggestions come from headings and repeated phrases in your document. Check them against your materials." : "Add topics yourself, or upload a PDF to get heading suggestions."}</p>
        {courseTopics.length ? <div className="editable-topic-list">{courseTopics.map((topic) => { const source = documents.find((document) => document.id === topic.sourceDocumentId); return <article className="editable-topic" key={topic.id}><span className="topic-grip"><Pencil size={13} /></span><div className="editable-topic-main"><input aria-label="Edit topic name" defaultValue={topic.name} onBlur={(event) => renameTopic(topic.id, event.target.value)} /><span className="topic-source">{source ? <><FileText size={12} /> {source.filename}{topic.sourcePage ? ` · p. ${topic.sourcePage}` : ""}</> : "Added manually"}</span>{topic.sourceExcerpt && <small className="topic-excerpt">“{topic.sourceExcerpt}”</small>}</div><button className="icon-button tiny delete-topic" aria-label={`Remove ${topic.name}`} onClick={() => deleteTopic(topic.id)}><X size={15} /></button></article>; })}</div> : <div className="empty-topics"><span className="empty-topic-icon"><BookOpen size={18} /></span><strong>Your topic list is ready when you are</strong><span>Upload a PDF or add your first topic below.</span></div>}
        <form className="add-topic-form" onSubmit={addTopic}><label htmlFor="new-topic">Add a topic</label><div><input id="new-topic" value={addingTopic} onChange={(event) => { setAddingTopic(event.target.value); setTopicError(""); }} placeholder="e.g. Supply and demand" maxLength={100} /><button className="primary-button" type="submit" disabled={!addingTopic.trim()}><Plus size={15} /> Add</button></div>{topicError && <span className="inline-error" role="alert">{topicError}</span>}</form>
        <div className="topic-note"><Sparkles size={14} /><span>These topic suggestions are extracted heuristically, not generated by AI. Review and edit them before studying.</span></div>
      </section>
    </div>
  </>;
}

function isExtractedDocument(value: unknown): value is ExtractedDocument {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Record<string, unknown>;
  return typeof result.filename === "string" &&
    typeof result.pageCount === "number" &&
    typeof result.extractedText === "string" &&
    typeof result.textTruncated === "boolean" &&
    Array.isArray(result.suggestedTopics) &&
    result.suggestedTopics.every((topic: unknown) =>
      typeof topic === "object" &&
      topic !== null &&
      "name" in topic &&
      typeof topic.name === "string" &&
      "page" in topic &&
      typeof topic.page === "number" &&
      "excerpt" in topic &&
      typeof topic.excerpt === "string"
    );
}

function PlannerPage({ courses, completed }: { courses: Course[]; completed: string[] }) {
  const plan = useMemo(() => buildStudyPlan(courses, completed), [courses, completed]);
  const sessionCount = plan.sessions.length;

  return <><div className="welcome-row page-welcome"><div><div className="date-label"><CalendarDays size={14} /> BUILT FROM YOUR CLASS SCHEDULE &amp; FILES</div><h1>Study <span>planner.</span></h1><p>Sessions are scheduled between today and each class’s exam date.</p></div></div>
    {sessionCount ? <>
      <div className="planner-summary"><div><span className="summary-icon"><Clock3 size={18} /></span><div><strong>{plan.totalMinutes} min</strong><span>estimated across your topics</span></div></div><div><span className="summary-icon green-summary"><CheckCircle2 size={18} /></span><div><strong>{plan.completeCount} of {sessionCount}</strong><span>topics completed</span></div></div><div><span className="summary-icon orange-summary"><Target size={18} /></span><div><strong>{getStudyReadyCourses(courses).length}</strong><span>classes with materials</span></div></div></div>
      <section className="panel week-panel"><div className="panel-heading"><div><span className="eyebrow">EXAM-BASED SCHEDULE</span><h2>Your study sessions</h2></div></div>
        <div className="week-sessions">{plan.sessions.map((session) => {
          const isCompleted = session.status === "Complete";
          const isCurrent = session.status === "Up next";
          return <div className={`week-session ${isCompleted ? "completed-week" : isCurrent ? "active-week" : ""}`} key={session.topicId}>
            <span className="week-session-check">{isCompleted ? <Check size={14} /> : <BookOpen size={14} />}</span>
            <div><strong>{session.title}</strong><span>{session.courseCode} · {session.courseName} · Exam {new Date(`${session.examDate}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></div>
            <span className="week-session-time">{new Date(`${session.scheduledDate}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            <span className="week-session-time">{session.duration} min</span>
            <span className={`week-status ${isCurrent ? "current-status" : ""}`}>{session.status}</span>
          </div>;
        })}</div>
        <div className="planner-note"><Lightbulb size={16} /><span>Time estimates use your daily study-time setting and the number of topics scheduled for that day.</span></div>
      </section>
    </> : <section className="panel first-course-empty"><CalendarDays size={24} /><strong>Your schedule is empty</strong><p>Add a class with an exam date, upload a PDF, and review at least one topic. Sessions will only be created from classes with all three.</p></section>}
  </>;
}

function TutorPage({ courses, completed, onComplete, onAddCourse }: { courses: Course[]; completed: string[]; onComplete: (topicId: string) => void; onAddCourse: () => void }) {
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(courses[0]?.id ?? null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [reflection, setReflection] = useState("");
  const course = courses.find((item) => item.id === selectedCourseId) ?? courses[0];
  const courseTopics = course?.courseTopics ?? [];
  const topic = courseTopics.find((item) => item.id === selectedTopicId) ?? courseTopics.find((item) => !completed.includes(item.id)) ?? courseTopics[0];
  const document = course?.documents?.find((item) => item.id === topic?.sourceDocumentId) ?? course?.documents?.[0];
  const excerpt = topic?.sourceExcerpt?.trim() || document?.extractedText.trim().slice(0, 600) || "No text excerpt is available for this topic.";
  const isComplete = topic ? completed.includes(topic.id) : false;

  useEffect(() => {
    setSelectedTopicId(null);
    setStep(0);
    setReflection("");
  }, [course?.id]);

  useEffect(() => {
    setStep(0);
    setReflection("");
  }, [topic?.id]);

  if (!course || !topic || !document) {
    return <section className="panel first-course-empty"><BookOpen size={24} /><strong>No study guides available yet</strong><p>A guide becomes available only after you add a class with an exam date, upload a PDF, and review at least one topic from its materials.</p><button className="primary-button" onClick={onAddCourse}>{courses.length ? "Open class setup" : "Add your first class"} <ArrowRight size={14} /></button><p className="honest-feature-note">Guides are assembled from uploaded text and topic excerpts. Live AI tutoring and AI-generated quizzes are not connected.</p></section>;
  }

  const steps = [
    { title: "Start with " + topic.name, label: "Topic overview", body: "This topic was identified in your uploaded class material, " + document.filename + ". Read the source excerpt and use it to focus your review." },
    { title: "Review the source", label: "Your uploaded notes", body: "Source: " + document.filename + (topic.sourcePage ? ", page " + topic.sourcePage : "") + ". The excerpt below is taken directly from the extracted PDF text." },
    { title: "Explain it in your own words", label: "Check your understanding", body: "Using the source excerpt, write a short explanation of " + topic.name + ". This is a self-check; it is not graded by AI." },
  ];
  const currentStep = steps[step];

  function finishLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reflection.trim() && !isComplete) onComplete(topic.id);
  }

  return <>
    <div className="tutor-topline"><div className="date-label"><Headphones size={14} /> YOUR COURSE STUDY GUIDE</div><span className="tutor-demo-tag"><FileText size={12} /> BUILT FROM YOUR UPLOADED FILE</span></div>
    <div className="tutor-layout">
      <section className="panel lesson-panel">
        <div className="lesson-breadcrumb"><span>{course.code}</span><ChevronRight size={14} /><span>{course.name}</span><ChevronRight size={14} /><strong>{topic.name}</strong></div>
        <div className="lesson-title-row"><div><span className="eyebrow">STEP {step + 1} OF {steps.length} · {currentStep.label.toUpperCase()}</span><h1>{currentStep.title}</h1></div><button className="sound-button" onClick={() => { if ("speechSynthesis" in window) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(currentStep.title + ". " + currentStep.body + ". " + excerpt)); } }}><AudioLines size={16} /> Listen</button></div>
        <p className="lesson-body">{currentStep.body}</p>
        <div className="lesson-example"><div className="example-heading"><span className="example-icon"><FileText size={17} /></span><strong>{document.filename}{topic.sourcePage ? " · page " + topic.sourcePage : " · extracted notes"}</strong></div><p>{excerpt}</p></div>
        {step === 2 && <form className="answer-form" onSubmit={finishLesson}><label htmlFor="topic-reflection">Your explanation (saved as complete, not automatically graded)</label><div className="answer-input-row"><textarea id="topic-reflection" value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder={"In your own words, what does " + topic.name + " mean?"} rows={3} disabled={isComplete} /><button type="submit" className="primary-button" disabled={!reflection.trim() || isComplete}>{isComplete ? <><Check size={15} /> Topic complete</> : <>Mark topic complete <Check size={15} /></>}</button></div>{isComplete && <p className="feedback-message correct-feedback">You marked this topic complete.</p>}</form>}
        {step < 2 && <div className="lesson-action-row"><span className="lesson-reassurance"><CheckCircle2 size={14} /> Read the source carefully, then continue.</span></div>}
        <div className="lesson-footer"><button className="secondary-button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}><ChevronLeft size={16} /> Back</button><div className="step-dots">{steps.map((item, index) => <button aria-label={"Go to lesson step " + (index + 1)} key={item.label} className={index === step ? "step-dot active-step-dot" : index < step ? "step-dot done-step-dot" : "step-dot"} onClick={() => setStep(index)} />)}</div>{step < steps.length - 1 && <button className="primary-button" onClick={() => setStep(step + 1)}>Next step <ChevronRight size={16} /></button>}</div>
      </section>
      <aside className="tutor-aside">
        <div className="panel lesson-outline"><div className="aside-heading"><h3>Study from your files</h3><span>{courseTopics.length} topics</span></div><label className="guide-select-label">Class<select value={course.id} onChange={(event) => setSelectedCourseId(Number(event.target.value))}>{courses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="guide-select-label">Topic<select value={topic.id} onChange={(event) => setSelectedTopicId(event.target.value)}>{courseTopics.map((item) => <option key={item.id} value={item.id}>{item.name}{completed.includes(item.id) ? " · complete" : ""}</option>)}</select></label>{steps.map((item, index) => <button className={"outline-item " + (step === index ? "outline-active " : "") + (index < step ? "outline-done" : "")} key={item.label} onClick={() => setStep(index)}><span className="outline-number">{index < step ? <Check size={12} /> : index + 1}</span><span><strong>{item.title}</strong><small>{item.label}</small></span></button>)}</div>
        <div className="source-note"><BookOpen size={14} /> Extracted locally from {document.filename}. Not AI-generated.</div>
      </aside>
    </div>
  </>;
}

function ProgressPage({ courses, completed }: { courses: Course[]; completed: string[] }) {
  const topics = courses.flatMap((course) => (course.courseTopics ?? []).map((topic) => ({ course, topic })));
  const validCompleted = completed.filter((id) => topics.some(({ topic }) => topic.id === id));
  const completedSet = new Set(validCompleted);

  return <>
    <div className="welcome-row page-welcome"><div><div className="date-label"><Target size={14} /> SAVED LEARNING ACTIVITY</div><h1>Your <span>progress.</span></h1><p>Only topics you marked complete are counted here. No streaks or quiz scores are estimated.</p></div></div>
    <div className="progress-summary-cards"><div className="stat-card"><div className="stat-top"><span>CLASSES</span><Library size={17} /></div><div className="stat-value">{courses.length}</div></div><div className="stat-card"><div className="stat-top"><span>UPLOADED PDFS</span><FileText size={17} /></div><div className="stat-value">{courses.reduce((count, course) => count + (course.documents?.length ?? 0), 0)}</div></div><div className="stat-card"><div className="stat-top"><span>TOPICS COMPLETED</span><CheckCircle2 size={17} /></div><div className="stat-value">{validCompleted.length}<span> / {topics.length}</span></div></div></div>
    {topics.length ? <section className="panel actual-progress-panel"><div className="panel-heading"><div><span className="eyebrow">FROM YOUR UPLOADED MATERIALS</span><h2>Topic checklist</h2></div></div>{topics.map(({ course, topic }) => <div className="actual-progress-row" key={topic.id}><span className={completedSet.has(topic.id) ? "actual-progress-check complete" : "actual-progress-check"}>{completedSet.has(topic.id) && <Check size={13} />}</span><span><strong>{topic.name}</strong><small>{course.name} · {topic.sourceDocumentId ? course.documents?.find((document) => document.id === topic.sourceDocumentId)?.filename ?? "uploaded file" : "class topic"}</small></span><span className="week-status">{completedSet.has(topic.id) ? "Complete" : "Not started"}</span></div>)}</section> : <section className="panel first-course-empty"><Target size={24} /><strong>No progress to show yet</strong><p>Progress appears only after you add a class, exam date, course PDF, and topic from that material.</p></section>}
  </>;
}
