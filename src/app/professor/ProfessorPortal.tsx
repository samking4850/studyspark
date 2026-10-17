"use client";

import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Copy,
  Download,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Lock,
  Mail,
  Menu,
  Moon,
  Plus,
  RotateCcw,
  Sparkles,
  Sun,
  Target,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ASSIGNMENT_TYPES,
  CLASS_CODE,
  CLASS_NAME,
  CLASS_UNIT,
  DEMO_PROFESSOR,
  OBJECTIVES,
  QUESTION_BANK,
  SAMPLE_STUDENTS,
  computeAlerts,
  daysUntil,
  formatDue,
  formatMinutes,
  isAssignedTo,
  isAssignmentDone,
  lastActiveLabel,
  nudgeEmail,
  professorSessionKey,
  progressCsv,
  readEnrolledStudents,
  readProfessorData,
  resetProfessorData,
  saveProfessorData,
  studentStatus,
  totalMinutes,
  weeklySummary,
  type Assignment,
  type AssignmentType,
  type ObjectiveRecord,
  type ProfessorData,
  type Student,
  type StudentStatus,
} from "./data";
import s from "./professor.module.css";

type View = "Class overview" | "Students" | "Assignments" | "Learning objectives" | "Alerts";

const statusPill: Record<StudentStatus, string> = {
  Mastered: s.pillGreen,
  "On track": s.pillPurple,
  "Needs attention": s.pillRed,
  "Not started": s.pillGray,
};

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

function Pill({ status }: { status: StudentStatus }) {
  return <span className={`${s.pill} ${statusPill[status]}`}><i />{status}</span>;
}

function Bar({ value, tone }: { value: number; tone?: "green" | "amber" }) {
  return <div className={`${s.bar} ${tone === "green" ? s.barGreen : tone === "amber" ? s.barAmber : ""}`}><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

export default function ProfessorPortal() {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<ProfessorData | null>(null);
  const [enrolled, setEnrolled] = useState<Student[]>([]);
  const [professorId, setProfessorId] = useState<string | null>(null);
  const [view, setView] = useState<View>("Class overview");
  const [dark, setDark] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [openStudent, setOpenStudent] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");

  const refreshStudents = useCallback(() => setEnrolled(readEnrolledStudents()), []);

  useEffect(() => {
    setData(readProfessorData());
    refreshStudents();
    setProfessorId(window.sessionStorage.getItem(professorSessionKey));
    setMounted(true);
    window.addEventListener("storage", refreshStudents);
    window.addEventListener("focus", refreshStudents);
    return () => {
      window.removeEventListener("storage", refreshStudents);
      window.removeEventListener("focus", refreshStudents);
    };
  }, [refreshStudents]);

  const update = useCallback((next: ProfessorData) => {
    setData(next);
    setSaveError(saveProfessorData(next) ? "" : "Browser storage is unavailable, so this change won't be kept after you reload.");
  }, []);

  const students = useMemo(() => [...enrolled, ...(data?.showSamples ? SAMPLE_STUDENTS : [])], [enrolled, data?.showSamples]);

  if (!mounted || !data) {
    return <main className={s.portal}><div className={s.authShell}><p className={s.muted}>Loading the professor portal…</p></div></main>;
  }

  const professor = data.professors.find((item) => item.id === professorId) ?? null;
  const themeClass = `${s.portal} ${dark ? s.dark : ""}`;

  if (!professor) {
    return <main className={themeClass}><SignIn data={data} onSignIn={(id) => { window.sessionStorage.setItem(professorSessionKey, id); setProfessorId(id); }} /></main>;
  }

  const classAssignments = data.assignments.filter((assignment) => assignment.classCode === CLASS_CODE).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const needsAttention = students.filter((student) => studentStatus(student, classAssignments, data.received) === "Needs attention");
  const alerts = computeAlerts(students, classAssignments, data.received);
  const selected = students.find((student) => student.key === openStudent) ?? null;

  const navItems: { title: View; icon: typeof Users; count?: number }[] = [
    { title: "Class overview", icon: LayoutDashboard },
    { title: "Students", icon: Users, count: needsAttention.length || undefined },
    { title: "Assignments", icon: ClipboardList },
    { title: "Learning objectives", icon: Target },
    { title: "Alerts", icon: Bell, count: alerts.length || undefined },
  ];

  function signOut() {
    window.sessionStorage.removeItem(professorSessionKey);
    setProfessorId(null);
  }

  return (
    <main className={themeClass}>
      <div className={s.shell}>
        <aside className={`${s.sidebar} ${mobileNav ? s.sidebarOpen : ""}`}>
          <span className={s.brand}>
            <span className={s.brandMark}><Sparkles size={19} strokeWidth={2.5} /></span>
            <span>study<span className={s.brandLight}>spark</span><span className={s.brandDot}>.</span></span>
          </span>
          <span className={s.roleTag}>PROFESSOR</span>
          <div className={s.label}>TEACHING</div>
          <nav className={s.nav} aria-label="Professor navigation">
            {navItems.map(({ title, icon: Icon, count }) => (
              <button key={title} type="button" className={`${s.navItem} ${view === title ? s.navActive : ""}`} aria-current={view === title ? "page" : undefined} onClick={() => { setView(title); setMobileNav(false); }}>
                <Icon size={18} strokeWidth={1.9} /><span>{title}</span>
                {count ? <span className={s.navCount} aria-label={`${count} need attention`}>{count}</span> : null}
              </button>
            ))}
          </nav>
          <div className={s.classCard}>
            <span className={s.codePill}>{CLASS_CODE}</span>
            <strong>{CLASS_NAME}</strong>
            <span>Unit: {CLASS_UNIT}</span>
            <span>{students.length} students · {OBJECTIVES.length} objectives</span>
          </div>
          <div className={s.spacer} />
          <a className={s.studentLink} href="/"><GraduationCap size={17} /> Open student view</a>
          <button type="button" className={s.profile} onClick={signOut} aria-label={`Sign out ${professor.name}`}>
            <span className={s.avatar}>{initials(professor.name)}</span>
            <span><strong>Prof. {professor.name}</strong><small>Sign out</small></span>
          </button>
        </aside>
        {mobileNav && <button type="button" className={s.scrim} aria-label="Close navigation" onClick={() => setMobileNav(false)} />}

        <section className={s.main}>
          <header className={s.topbar}>
            <button type="button" className={`${s.iconButton} ${s.menuButton}`} aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={19} /></button>
            <div className={s.crumb}>{CLASS_CODE} <ChevronRight size={14} /> <strong>{view}</strong></div>
            <div className={s.topActions}>
              <span className={s.demoPill}><i />Demo mode</span>
              <button type="button" className={s.iconButton} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} onClick={() => setDark(!dark)}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
            </div>
          </header>

          <div className={s.content}>
            {saveError && <p className={s.notice} role="alert"><AlertTriangle size={16} />{saveError}</p>}
            {view === "Class overview" && <Overview professorName={professor.name} students={students} assignments={classAssignments} data={data} onOpenStudent={setOpenStudent} onGo={setView} />}
            {view === "Students" && <StudentsView students={students} assignments={classAssignments} data={data} enrolledCount={enrolled.length} onToggleSamples={(value) => update({ ...data, showSamples: value })} onOpenStudent={setOpenStudent} />}
            {view === "Assignments" && <AssignmentsView students={students} assignments={classAssignments} data={data} onChange={update} />}
            {view === "Learning objectives" && <ObjectivesView students={students} assignments={classAssignments} data={data} onChange={update} />}
            {view === "Alerts" && <AlertsView professorName={professor.name} students={students} assignments={classAssignments} data={data} onOpenStudent={setOpenStudent} />}
          </div>
        </section>
      </div>

      {selected && <StudentDrawer key={selected.key} professorName={professor.name} student={selected} assignments={classAssignments} data={data} onChange={update} onClose={() => setOpenStudent(null)} />}
    </main>
  );
}

function SignIn({ data, onSignIn }: { data: ProfessorData; onSignIn: (id: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const match = data.professors.find((item) => item.email.toLowerCase() === email.trim().toLowerCase() && item.password === password);
    if (!match) {
      setError("That email and password don't match a professor account. Use the demo professor account below.");
      return;
    }
    onSignIn(match.id);
  }

  return (
    <div className={s.authShell}>
      <section className={s.authCard} aria-labelledby="professor-signin">
        <span className={s.brand}>
          <span className={s.brandMark}><Sparkles size={19} strokeWidth={2.5} /></span>
          <span>study<span className={s.brandLight}>spark</span><span className={s.brandDot}>.</span></span>
        </span>
        <h1 id="professor-signin">Professor sign in</h1>
        <p>Assign coursework and see how each student in your class is progressing.</p>
        <form className={s.form} style={{ marginTop: 20 }} onSubmit={submit}>
          <label className={s.field}>Email<input id="professor-email" type="email" autoComplete="username" value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} placeholder="you@college.edu" required /></label>
          <label className={s.field}>Password<input id="professor-password" type="password" autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} required /></label>
          {error && <p className={s.error} role="alert">{error}</p>}
          <button type="submit" className={s.primary}>Sign in <ArrowRight size={15} /></button>
        </form>
        <div className={s.authDemo}>
          <strong>Demo professor</strong>
          <small>{DEMO_PROFESSOR.email} · {DEMO_PROFESSOR.password}</small>
          <button type="button" className={s.secondary} onClick={() => { setEmail(DEMO_PROFESSOR.email); setPassword(DEMO_PROFESSOR.password); setError(""); }}>Fill in demo account</button>
        </div>
        <p className={s.footnote}>Demo mode: professor accounts and assignments are saved in this browser only. Student pages are not changed. <a href="/">Go to the student sign in</a>.</p>
      </section>
    </div>
  );
}

function Overview({ professorName, students, assignments, data, onOpenStudent, onGo }: { professorName: string; students: Student[]; assignments: Assignment[]; data: ProfessorData; onOpenStudent: (key: string) => void; onGo: (view: View) => void }) {
  const statuses = students.map((student) => ({ student, status: studentStatus(student, assignments, data.received) }));
  const attention = statuses.filter((item) => item.status === "Needs attention");
  const avgMastered = students.length ? students.reduce((sum, student) => sum + student.mastered.length, 0) / students.length : 0;
  const tracked = students.filter((student) => student.weeklyMinutes);
  const avgWeek = tracked.length ? Math.round(tracked.reduce((sum, student) => sum + (student.weeklyMinutes?.[3] ?? 0), 0) / tracked.length) : null;
  const upcoming = assignments.filter((assignment) => daysUntil(assignment.dueDate) >= -7).slice(0, 4);

  return <>
    <div className={s.pageHead}>
      <div>
        <span className={s.eyebrow}>{CLASS_CODE} · {CLASS_UNIT}</span>
        <h1>Welcome back, Prof. {professorName.split(" ").slice(-1)[0]}. <span>Here's your class.</span></h1>
        <p>{attention.length ? `${attention.length} ${attention.length === 1 ? "student needs" : "students need"} a check-in this week.` : "Everyone is on track right now."}</p>
      </div>
      <button type="button" className={s.primary} onClick={() => onGo("Assignments")}><Plus size={16} /> Assign coursework</button>
    </div>

    <div className={s.stats}>
      <div className={s.stat}><div className={s.statTop}><span>Students</span><Users size={17} /></div><div className={s.statValue}>{students.length}</div><div className={s.statFoot}>Enrolled with code {CLASS_CODE}</div></div>
      <div className={s.stat}><div className={s.statTop}><span>Objectives mastered</span><Target size={17} /></div><div className={s.statValue}>{avgMastered.toFixed(1)}<small>/ {OBJECTIVES.length} avg</small></div><div className={s.statFoot}>Per student in this unit</div></div>
      <div className={s.stat}><div className={s.statTop}><span>Need attention</span><AlertTriangle size={17} /></div><div className={s.statValue}>{attention.length}</div><div className={s.statFoot}>Overdue work or 5+ days inactive</div></div>
      <div className={s.stat}><div className={s.statTop}><span>Study time this week</span><Clock3 size={17} /></div><div className={s.statValue}>{avgWeek === null ? "—" : avgWeek}<small>{avgWeek === null ? "" : "min avg"}</small></div><div className={s.statFoot}>{tracked.length} of {students.length} students tracked</div></div>
    </div>

    <div className={s.grid2}>
      <section className={s.panel}>
        <div className={s.panelHead}><div><h2>Learning objectives</h2><p>Share of students who have mastered each objective</p></div></div>
        {OBJECTIVES.map((objective) => {
          const count = students.filter((student) => student.mastered.includes(objective.id)).length;
          const pct = students.length ? Math.round(count / students.length * 100) : 0;
          return <div className={s.objective} key={objective.id}>
            <div className={s.objectiveRow}><strong>{objective.title}</strong><span>{count} of {students.length} · {pct}%</span></div>
            <p className={s.objectiveSub}>{objective.objective}</p>
            <Bar value={pct} tone={pct >= 70 ? "green" : pct < 40 ? "amber" : undefined} />
          </div>;
        })}
      </section>

      <section className={s.panel}>
        <div className={s.panelHead}><div><h2>Needs attention</h2><p>Students to check in with</p></div><button type="button" className={s.textButton} onClick={() => onGo("Students")}>All students <ArrowRight size={14} /></button></div>
        {attention.length ? attention.map(({ student }) => {
          const overdue = assignments.filter((assignment) => isAssignedTo(assignment, student.key) && daysUntil(assignment.dueDate) < 0 && !isAssignmentDone(assignment, student, data.received));
          const reason = [overdue.length ? `${overdue.length} overdue` : "", student.lastActiveDaysAgo !== null && student.lastActiveDaysAgo >= 5 ? `inactive ${student.lastActiveDaysAgo} days` : ""].filter(Boolean).join(" · ");
          return <button type="button" className={s.attentionItem} key={student.key} onClick={() => onOpenStudent(student.key)}>
            <span className={s.avatar}>{initials(student.name)}</span>
            <div><strong>{student.name}{student.sample && <span className={s.sampleTag}>SAMPLE</span>}</strong><small>{reason || "Behind the class pace"} · {student.mastered.length}/{OBJECTIVES.length} objectives</small></div>
            <ChevronRight size={16} className={s.muted} />
          </button>;
        }) : <p className={s.empty}>No one needs attention right now.</p>}
      </section>
    </div>

    <section className={s.panel}>
      <div className={s.panelHead}><div><h2>Coursework</h2><p>Recent and upcoming assignments</p></div><button type="button" className={s.textButton} onClick={() => onGo("Assignments")}>Manage <ArrowRight size={14} /></button></div>
      {upcoming.length ? upcoming.map((assignment) => <AssignmentSummary key={assignment.id} assignment={assignment} students={students} data={data} />) : <p className={s.empty}>No coursework assigned yet.</p>}
    </section>
  </>;
}

function dueLabel(dueDate: string) {
  const days = daysUntil(dueDate);
  if (days < 0) return { text: `Was due ${formatDue(dueDate)}`, cls: s.pillRed };
  if (days === 0) return { text: "Due today", cls: s.pillAmber };
  if (days === 1) return { text: "Due tomorrow", cls: s.pillAmber };
  return { text: `Due ${formatDue(dueDate)}`, cls: s.pillGray };
}

function AssignmentSummary({ assignment, students, data }: { assignment: Assignment; students: Student[]; data: ProfessorData }) {
  const assigned = students.filter((student) => isAssignedTo(assignment, student.key));
  const done = assigned.filter((student) => isAssignmentDone(assignment, student, data.received)).length;
  const pct = assigned.length ? Math.round(done / assigned.length * 100) : 0;
  const due = dueLabel(assignment.dueDate);
  return <div className={s.assignment}>
    <div className={s.assignmentMain}>
      <strong>{assignment.title}</strong>
      <div className={s.assignmentMeta}><span className={`${s.pill} ${due.cls}`}>{due.text}</span><span><BookOpen size={13} /> {assignment.type}</span><span><Clock3 size={13} /> ~{assignment.estMinutes} min</span></div>
    </div>
    <div className={s.completion}><small><span>Completed</span><span>{done}/{assigned.length}</span></small><Bar value={pct} tone={pct >= 70 ? "green" : undefined} /></div>
  </div>;
}

function StudentsView({ students, assignments, data, enrolledCount, onToggleSamples, onOpenStudent }: { students: Student[]; assignments: Assignment[]; data: ProfessorData; enrolledCount: number; onToggleSamples: (value: boolean) => void; onOpenStudent: (key: string) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | StudentStatus>("All");
  const rows = students
    .map((student) => ({ student, status: studentStatus(student, assignments, data.received) }))
    .filter(({ student, status }) => (filter === "All" || status === filter) && `${student.name} ${student.email}`.toLowerCase().includes(query.trim().toLowerCase()));

  return <>
    <div className={s.pageHead}>
      <div><span className={s.eyebrow}>Roster</span><h1>Students</h1><p>Status, study time and objectives mastered for everyone in {CLASS_CODE}.</p></div>
      <button type="button" className={s.secondary} onClick={() => downloadCsv(progressCsv(students, assignments, data.received))}><Download size={15} /> Export CSV</button>
    </div>
    <div className={s.toolbar}>
      <label htmlFor="student-search" className="sr-only">Search students</label>
      <input id="student-search" className={s.search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or email" />
      <label htmlFor="status-filter" className="sr-only">Filter by status</label>
      <select id="status-filter" className={s.filter} value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}>
        <option>All</option><option>Needs attention</option><option>On track</option><option>Not started</option><option>Mastered</option>
      </select>
      <label className={s.toggle}><input id="show-samples" type="checkbox" checked={data.showSamples} onChange={(event) => onToggleSamples(event.target.checked)} />Show sample students</label>
    </div>
    {enrolledCount === 0 && <p className={s.notice} style={{ marginBottom: 14 }}><AlertTriangle size={16} /><span>No real students have joined yet. Students who sign in on this device and join with code <b>{CLASS_CODE}</b> appear here automatically.</span></p>}
    {rows.length ? <div className={s.tableWrap}>
      <table className={s.table}>
        <thead><tr><th>Student</th><th>Status</th><th>Objectives</th><th>This week</th><th>Total time</th><th>Assignments</th><th>Last active</th><th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>
          {rows.map(({ student, status }) => {
            const mine = assignments.filter((assignment) => isAssignedTo(assignment, student.key));
            const done = mine.filter((assignment) => isAssignmentDone(assignment, student, data.received)).length;
            return <tr key={student.key}>
              <td><div className={s.studentCell}><span className={s.avatar}>{initials(student.name)}</span><span><strong>{student.name}{student.sample && <span className={s.sampleTag}>SAMPLE</span>}</strong><small>{student.email}</small></span></div></td>
              <td><Pill status={status} /></td>
              <td><div className={s.miniProgress}><Bar value={student.mastered.length / OBJECTIVES.length * 100} tone={student.mastered.length === OBJECTIVES.length ? "green" : undefined} /><span>{student.mastered.length}/{OBJECTIVES.length}</span></div></td>
              <td className={student.weeklyMinutes ? "" : s.muted}>{formatMinutes(student.weeklyMinutes ? student.weeklyMinutes[3] : null)}</td>
              <td className={student.weeklyMinutes ? "" : s.muted}>{formatMinutes(totalMinutes(student))}</td>
              <td>{done}/{mine.length}</td>
              <td className={s.muted}>{lastActiveLabel(student)}</td>
              <td><button type="button" className={s.textButton} onClick={() => onOpenStudent(student.key)} aria-label={`View ${student.name}`}>View <ArrowRight size={14} /></button></td>
            </tr>;
          })}
        </tbody>
      </table>
    </div> : <p className={s.empty}>No students match this search.</p>}
    <p className={s.footnote}>Study time is not recorded by the student app yet, so real students show &ldquo;Not tracked.&rdquo; Sample students show example times.</p>
  </>;
}

function AssignmentsView({ students, assignments, data, onChange }: { students: Student[]; assignments: Assignment[]; data: ProfessorData; onChange: (next: ProfessorData) => void }) {
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function remove(id: string) {
    const received = { ...data.received };
    delete received[id];
    onChange({ ...data, assignments: data.assignments.filter((assignment) => assignment.id !== id), received });
    setConfirmDelete(null);
  }

  function toggleReceived(assignmentId: string, studentKey: string) {
    const list = data.received[assignmentId] ?? [];
    const next = list.includes(studentKey) ? list.filter((key) => key !== studentKey) : [...list, studentKey];
    onChange({ ...data, received: { ...data.received, [assignmentId]: next } });
  }

  return <>
    <div className={s.pageHead}>
      <div><span className={s.eyebrow}>Coursework</span><h1>Assignments</h1><p>Assign lessons and other work, then track who has finished.</p></div>
      <div className={s.assignmentActions}>
        <button type="button" className={s.secondary} onClick={() => onChange(resetProfessorData())} title="Restore the example assignments"><RotateCcw size={15} /> Reset demo</button>
        {!creating && <button type="button" className={s.primary} onClick={() => setCreating(true)}><Plus size={16} /> New assignment</button>}
      </div>
    </div>

    {creating && <section className={s.panel} style={{ marginBottom: 16 }}>
      <div className={s.panelHead}><div><h2>New assignment</h2><p>Lessons tied to an objective are marked done automatically when the student masters it.</p></div></div>
      <AssignmentForm students={students} onCancel={() => setCreating(false)} onSave={(assignment) => { onChange({ ...data, assignments: [...data.assignments, assignment] }); setCreating(false); }} />
    </section>}

    <section className={s.panel}>
      {assignments.length ? assignments.map((assignment) => {
        const assigned = students.filter((student) => isAssignedTo(assignment, student.key));
        const done = assigned.filter((student) => isAssignmentDone(assignment, student, data.received));
        const pct = assigned.length ? Math.round(done.length / assigned.length * 100) : 0;
        const due = dueLabel(assignment.dueDate);
        const objective = OBJECTIVES.find((item) => item.id === assignment.objectiveId);
        const open = expanded === assignment.id;
        return <div className={s.assignment} key={assignment.id}>
          <div className={s.assignmentMain}>
            <strong>{assignment.title}</strong>
            <div className={s.assignmentMeta}>
              <span className={`${s.pill} ${due.cls}`}>{due.text}</span>
              <span><BookOpen size={13} /> {assignment.type}</span>
              <span><Clock3 size={13} /> ~{assignment.estMinutes} min</span>
              {objective && <span><Target size={13} /> {objective.title}</span>}
              <span><Users size={13} /> {assignment.assignedTo === "all" ? "Whole class" : `${assignment.assignedTo.length} selected`}</span>
            </div>
          </div>
          <div className={s.completion}><small><span>Completed</span><span>{done.length}/{assigned.length}</span></small><Bar value={pct} tone={pct >= 70 ? "green" : undefined} /></div>
          <div className={s.assignmentActions}>
            <button type="button" className={s.secondary} aria-expanded={open} onClick={() => setExpanded(open ? null : assignment.id)}>{open ? "Hide" : "Details"}</button>
            {confirmDelete === assignment.id
              ? <><button type="button" className={s.danger} onClick={() => remove(assignment.id)}>Delete</button><button type="button" className={s.secondary} onClick={() => setConfirmDelete(null)}>Keep</button></>
              : <button type="button" className={s.iconButton} aria-label={`Delete ${assignment.title}`} onClick={() => setConfirmDelete(assignment.id)}><Trash2 size={16} /></button>}
          </div>
          {open && <div className={s.detailBox}>
            {assignment.instructions && <p>{assignment.instructions}</p>}
            <div className={s.chips}>
              {assigned.map((student) => {
                const isDone = done.includes(student);
                if (assignment.objectiveId) return <span key={student.key} className={`${s.pill} ${isDone ? s.pillGreen : s.pillGray}`}>{isDone ? <Check size={13} /> : <i />}{student.name}</span>;
                return <button type="button" key={student.key} className={`${s.pill} ${isDone ? s.pillGreen : s.pillGray}`} style={{ border: 0 }} aria-pressed={isDone} onClick={() => toggleReceived(assignment.id, student.key)}>{isDone ? <Check size={13} /> : <i />}{student.name}</button>;
              })}
            </div>
            {!assignment.objectiveId && <p className={s.hint} style={{ marginTop: 8 }}>Click a name to mark their work as received.</p>}
          </div>}
        </div>;
      }) : <p className={s.empty}>No assignments yet. Select <b>New assignment</b> to add the first one.</p>}
    </section>
  </>;
}

function AssignmentForm({ students, onSave, onCancel }: { students: Student[]; onSave: (assignment: Assignment) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<AssignmentType>("Lesson");
  const [objectiveId, setObjectiveId] = useState(OBJECTIVES[0].id);
  const [dueDate, setDueDate] = useState(() => { const date = new Date(); date.setDate(date.getDate() + 7); return date.toISOString().slice(0, 10); });
  const [estMinutes, setEstMinutes] = useState(25);
  const [instructions, setInstructions] = useState("");
  const [audience, setAudience] = useState<"all" | "some">("all");
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const objective = type === "Lesson" ? OBJECTIVES.find((item) => item.id === objectiveId) : undefined;
    const finalTitle = title.trim() || (objective ? `Lesson: ${objective.title}` : "");
    if (!finalTitle) { setError("Add a title for this assignment."); return; }
    if (audience === "some" && !picked.length) { setError("Choose at least one student, or assign it to the whole class."); return; }
    onSave({
      id: `a-${Date.now()}`,
      classCode: CLASS_CODE,
      title: finalTitle,
      type,
      objectiveId: objective?.id,
      dueDate,
      estMinutes,
      instructions: instructions.trim(),
      assignedTo: audience === "all" ? "all" : picked,
      createdAt: new Date().toISOString(),
    });
  }

  return <form className={s.form} onSubmit={submit}>
    <div className={s.formRow}>
      <label className={s.field}>Type
        <select id="assignment-type" value={type} onChange={(event) => setType(event.target.value as AssignmentType)}>{ASSIGNMENT_TYPES.map((item) => <option key={item}>{item}</option>)}</select>
      </label>
      {type === "Lesson"
        ? <label className={s.field}>Learning objective
          <select id="assignment-objective" value={objectiveId} onChange={(event) => setObjectiveId(event.target.value)}>{OBJECTIVES.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
        </label>
        : <label className={s.field}>Title<input id="assignment-title" value={title} onChange={(event) => { setTitle(event.target.value); setError(""); }} placeholder="e.g. Read Chapter 6" maxLength={120} /></label>}
    </div>
    {type === "Lesson" && <label className={s.field}>Title <span className={s.hint}>Optional. Defaults to the lesson name.</span><input id="assignment-title-lesson" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={`Lesson: ${OBJECTIVES.find((item) => item.id === objectiveId)?.title ?? ""}`} maxLength={120} /></label>}
    <div className={s.formRow}>
      <label className={s.field}>Due date<input id="assignment-due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required /></label>
      <label className={s.field}>Estimated time
        <select id="assignment-minutes" value={estMinutes} onChange={(event) => setEstMinutes(Number(event.target.value))}>{[10, 15, 25, 40, 60, 90].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}</select>
      </label>
    </div>
    <label className={s.field}>Instructions <span className={s.hint}>Optional</span><textarea id="assignment-instructions" rows={3} value={instructions} onChange={(event) => setInstructions(event.target.value)} maxLength={600} placeholder="What should students do, and how will you check it?" /></label>
    <fieldset className={s.field} style={{ border: 0, margin: 0, padding: 0 }}>
      <legend style={{ marginBottom: 6 }}>Assign to</legend>
      <div className={s.radioRow}>
        <label><input type="radio" name="audience" checked={audience === "all"} onChange={() => setAudience("all")} />Whole class</label>
        <label><input type="radio" name="audience" checked={audience === "some"} onChange={() => setAudience("some")} />Selected students</label>
      </div>
      {audience === "some" && <div className={s.checkList}>
        {students.map((student) => <label key={student.key}><input type="checkbox" checked={picked.includes(student.key)} onChange={(event) => { setError(""); setPicked(event.target.checked ? [...picked, student.key] : picked.filter((key) => key !== student.key)); }} />{student.name}</label>)}
      </div>}
    </fieldset>
    {error && <p className={s.error} role="alert">{error}</p>}
    <div className={s.formActions}><button type="button" className={s.secondary} onClick={onCancel}>Cancel</button><button type="submit" className={s.primary}><Check size={15} /> Assign</button></div>
  </form>;
}

function StudentDrawer({ professorName, student, assignments, data, onChange, onClose }: { professorName: string; student: Student; assignments: Assignment[]; data: ProfessorData; onChange: (next: ProfessorData) => void; onClose: () => void }) {
  const status = studentStatus(student, assignments, data.received);
  const mine = assignments.filter((assignment) => isAssignedTo(assignment, student.key));
  const doneCount = mine.filter((assignment) => isAssignmentDone(assignment, student, data.received)).length;
  const maxWeek = Math.max(1, ...(student.weeklyMinutes ?? [0]));
  const [note, setNote] = useState(data.notes[student.key] ?? "");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const profile = student.profile;
  return <div className={s.backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className={s.drawer} role="dialog" aria-modal="true" aria-labelledby="student-drawer-title">
      <div className={s.drawerHead}>
        <div className={s.studentCell}>
          <span className={s.avatar}>{initials(student.name)}</span>
          <div><h2 id="student-drawer-title">{student.name}{student.sample && <span className={s.sampleTag}>SAMPLE</span>}</h2><p>{student.email}</p></div>
        </div>
        <button type="button" className={s.iconButton} aria-label="Close" onClick={onClose} autoFocus><X size={18} /></button>
      </div>
      <div className={s.drawerActions}>
        <Pill status={status} />
        <a className={s.secondary} href={nudgeEmail(student, professorName, computeAlerts([student], assignments, data.received)[0]?.reasons ?? [])}><Mail size={15} /> Email student</a>
      </div>

      <div className={s.miniStats}>
        <div><strong>{student.mastered.length}/{OBJECTIVES.length}</strong><span>Objectives mastered</span></div>
        <div><strong>{formatMinutes(totalMinutes(student))}</strong><span>Study time, 4 weeks</span></div>
        <div><strong>{doneCount}/{mine.length}</strong><span>Assignments done</span></div>
      </div>

      <section className={s.drawerSection}>
        <h3>Weekly study time</h3>
        {student.weeklyMinutes
          ? <div className={s.weekBars} role="img" aria-label={`Minutes studied per week: ${student.weeklyMinutes.join(", ")}`}>
            {student.weeklyMinutes.map((minutes, index) => <div key={index} className={`${s.weekBar} ${index === 3 ? s.weekBarCurrent : ""}`}><b>{minutes}m</b><span style={{ height: `${Math.round(minutes / maxWeek * 80)}%` }} />{index === 3 ? "This wk" : `${3 - index} wk ago`}</div>)}
          </div>
          : <p className={s.notice}><Clock3 size={16} /><span>Study time isn't recorded yet. Lesson timers in the student app would need to save their totals for this to appear.</span></p>}
      </section>

      <section className={s.drawerSection}>
        <h3>Learning objectives</h3>
        {OBJECTIVES.map((objective) => {
          const done = student.mastered.includes(objective.id);
          return <div className={s.checkItem} key={objective.id}>
            <span className={`${s.checkIcon} ${done ? s.checkIconDone : ""}`}>{done ? <CheckCircle2 size={16} /> : <Target size={15} />}</span>
            <div><strong>{objective.title}</strong><small>{objective.objective}</small></div>
            <span className={`${s.pill} ${done ? s.pillGreen : s.pillGray}`}>{done ? "Mastered" : "Not yet"}</span>
          </div>;
        })}
      </section>

      <section className={s.drawerSection}>
        <h3>Assignments</h3>
        {mine.length ? mine.map((assignment) => {
          const done = isAssignmentDone(assignment, student, data.received);
          const late = !done && daysUntil(assignment.dueDate) < 0;
          return <div className={s.checkItem} key={assignment.id}>
            <span className={`${s.checkIcon} ${done ? s.checkIconDone : ""}`}>{done ? <Check size={15} /> : <CalendarDays size={14} />}</span>
            <div><strong>{assignment.title}</strong><small>{assignment.type} · due {formatDue(assignment.dueDate)}</small></div>
            <span className={`${s.pill} ${done ? s.pillGreen : late ? s.pillRed : s.pillGray}`}>{done ? "Done" : late ? "Overdue" : "Open"}</span>
          </div>;
        }) : <p className={s.empty}>No assignments for this student.</p>}
      </section>

      {!student.sample && <section className={s.drawerSection}>
        <h3>Other classes in Study Spark</h3>
        {student.otherCourses.length ? student.otherCourses.map((course) => <div className={s.checkItem} key={`${course.code}-${course.name}`}>
          <span className={s.checkIcon}><BookOpen size={14} /></span>
          <div><strong>{course.name}</strong><small>{course.code} · {course.topics} topics from their files</small></div>
          <span className={`${s.pill} ${s.pillGray}`}>{course.completed}/{course.topics} done</span>
        </div>) : <p className={s.empty}>This student hasn't added other classes.</p>}
      </section>}

      <section className={s.drawerSection}>
        <h3>Learning profile</h3>
        {profile ? <dl className={s.profileGrid}>
          <div><dt>Goal</dt><dd>{profile.goal}</dd></div>
          <div><dt>Confidence</dt><dd>{profile.confidence}</dd></div>
          <div><dt>Explanations</dt><dd>{profile.explanationPreference}</dd></div>
          <div><dt>Practice</dt><dd>{profile.practicePreference}</dd></div>
          <div><dt>Biggest challenge</dt><dd>{profile.biggestChallenge}</dd></div>
          <div><dt>Daily study time</dt><dd>{profile.dailyMinutes} minutes</dd></div>
          {profile.motivation && <div style={{ gridColumn: "1 / -1" }}><dt>Motivation</dt><dd>&ldquo;{profile.motivation}&rdquo;</dd></div>}
        </dl> : <p className={s.empty}>This student hasn't completed their learning profile.</p>}
      </section>

      <section className={s.drawerSection}>
        <label className={s.field} htmlFor="student-note">Private note
          <textarea id="student-note" rows={3} value={note} onChange={(event) => setNote(event.target.value)} onBlur={() => onChange({ ...data, notes: { ...data.notes, [student.key]: note } })} placeholder="Only you can see this. Saved when you click away." maxLength={1000} />
        </label>
      </section>
    </aside>
  </div>;
}

function downloadCsv(csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${CLASS_CODE}-progress-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

type Suggestion = { name: string; page: number; excerpt: string };

function ObjectivesView({ students, assignments, data, onChange }: { students: Student[]; assignments: Assignment[]; data: ProfessorData; onChange: (next: ProfessorData) => void }) {
  const [openBank, setOpenBank] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [syllabus, setSyllabus] = useState<{ filename: string; suggestions: Suggestion[] } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function addObjective(name: string, objective: string, source?: string) {
    const clean = name.trim();
    if (!clean) return "Add a name for the objective.";
    if (data.objectives.some((item) => item.title.toLowerCase() === clean.toLowerCase())) return "That objective is already in this class.";
    const record: ObjectiveRecord = { id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title: clean, objective: objective.trim(), studentLesson: false, source };
    onChange({ ...data, objectives: [...data.objectives, record] });
    return "";
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = addObjective(title, description, "Added by professor");
    setFormError(error);
    if (!error) { setTitle(""); setDescription(""); }
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadError("");
    if (!file.name.toLowerCase().endsWith(".pdf")) { setUploadError("Choose a PDF file."); return; }
    if (file.size > 5 * 1024 * 1024) { setUploadError("This file is too large. Choose a PDF under 5 MB."); return; }
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/documents/extract", { method: "POST", body });
      const payload = await response.json() as { error?: string; filename?: string; suggestedTopics?: Suggestion[] };
      if (!response.ok) throw new Error(payload.error || "The PDF couldn't be processed. Try another file.");
      setSyllabus({ filename: payload.filename ?? file.name, suggestions: payload.suggestedTopics ?? [] });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "The PDF couldn't be processed. Try another file.");
    } finally {
      setUploading(false);
    }
  }

  const existing = new Set(data.objectives.map((item) => item.title.toLowerCase()));

  return <>
    <div className={s.pageHead}>
      <div><span className={s.eyebrow}>{CLASS_CODE} · {CLASS_UNIT}</span><h1>Learning objectives</h1><p>What students should be able to do, how many have mastered it, and the questions they answer.</p></div>
    </div>

    <section className={s.panel} style={{ marginBottom: 16 }}>
      {data.objectives.map((objective) => {
        const bank = objective.studentLesson ? QUESTION_BANK[objective.id] ?? [] : [];
        const count = students.filter((student) => student.mastered.includes(objective.id)).length;
        const pct = students.length ? Math.round(count / students.length * 100) : 0;
        const linked = assignments.filter((assignment) => assignment.objectiveId === objective.id).length;
        const open = openBank === objective.id;
        return <div className={s.objective} key={objective.id}>
          <div className={s.objectiveRow}>
            <strong>{objective.title}</strong>
            {objective.studentLesson
              ? <span>{count} of {students.length} mastered · {pct}%</span>
              : <span className={`${s.pill} ${s.pillAmber}`}>Not in the student app yet</span>}
          </div>
          {objective.objective && <p className={s.objectiveSub}>{objective.objective}</p>}
          {objective.studentLesson && <Bar value={pct} tone={pct >= 70 ? "green" : pct < 40 ? "amber" : undefined} />}
          <div className={s.assignmentMeta} style={{ marginTop: 8 }}>
            {objective.studentLesson ? <span><Lock size={13} /> Matches the student lesson</span> : <span><FileText size={13} /> {objective.source ?? "Added by professor"}</span>}
            <span><ClipboardList size={13} /> {linked} {linked === 1 ? "assignment" : "assignments"}</span>
            {bank.length > 0 && <button type="button" className={s.textButton} aria-expanded={open} onClick={() => setOpenBank(open ? null : objective.id)}>{open ? "Hide questions" : `View ${bank.length} practice questions`}</button>}
            {!objective.studentLesson && (confirmDelete === objective.id
              ? <><button type="button" className={s.danger} onClick={() => { onChange({ ...data, objectives: data.objectives.filter((item) => item.id !== objective.id) }); setConfirmDelete(null); }}>Remove</button><button type="button" className={s.secondary} onClick={() => setConfirmDelete(null)}>Keep</button></>
              : <button type="button" className={s.textButton} onClick={() => setConfirmDelete(objective.id)}><Trash2 size={13} /> Remove</button>)}
          </div>
          {open && <div className={s.detailBox} style={{ marginTop: 10 }}>
            {bank.map((question, index) => <div className={s.question} key={index}>
              <div className={s.objectiveRow}><strong>Q{index + 1}. {question.question}</strong>{data.showSamples && <span className={`${s.pill} ${question.sampleMissRate >= 50 ? s.pillRed : s.pillGray}`}>{question.sampleMissRate}% missed · sample</span>}</div>
              <p className={s.objectiveSub}>Answer: <b>{question.options[question.correct]}</b> · {question.why}</p>
            </div>)}
            <p className={s.hint}>These are the same questions students answer in the lesson. The student app checks answers but doesn't save them, so miss rates are sample data.</p>
          </div>}
        </div>;
      })}
    </section>

    <div className={s.grid2}>
      <section className={s.panel}>
        <div className={s.panelHead}><div><h2>Add an objective</h2><p>New objectives appear here for planning. Students get a lesson for them once one is built in the student app.</p></div></div>
        <form className={s.form} onSubmit={submit}>
          <label className={s.field}>Objective<input id="objective-title" value={title} onChange={(event) => { setTitle(event.target.value); setFormError(""); }} placeholder="e.g. Calculate loan amortization" maxLength={100} /></label>
          <label className={s.field}>What students should be able to do <span className={s.hint}>Optional</span><input id="objective-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="e.g. Build a payment schedule for a fixed-rate loan" maxLength={200} /></label>
          {formError && <p className={s.error} role="alert">{formError}</p>}
          <div className={s.formActions}><button type="submit" className={s.primary}><Plus size={15} /> Add objective</button></div>
        </form>
      </section>

      <section className={s.panel}>
        <div className={s.panelHead}><div><h2>Import from a syllabus</h2><p>Upload a text-based PDF. Topics are found the same way as when students upload class files.</p></div></div>
        <label htmlFor="syllabus-upload" className={s.dropZone}>
          <Upload size={22} />
          <strong>{uploading ? "Reading your PDF…" : "Choose a syllabus PDF"}</strong>
          <span>Up to 5 MB and 100 pages</span>
          <input id="syllabus-upload" type="file" accept="application/pdf,.pdf" onChange={upload} disabled={uploading} className="sr-only" />
        </label>
        {uploadError && <p className={s.error} role="alert" style={{ marginTop: 10 }}>{uploadError}</p>}
        {syllabus && <div style={{ marginTop: 14 }}>
          <p className={s.objectiveSub}>Suggested from <b>{syllabus.filename}</b>. Check each one before adding it.</p>
          {syllabus.suggestions.length ? syllabus.suggestions.map((suggestion) => {
            const added = existing.has(suggestion.name.toLowerCase());
            return <div className={s.checkItem} key={`${suggestion.page}-${suggestion.name}`}>
              <div><strong>{suggestion.name}</strong><small>Page {suggestion.page} · {suggestion.excerpt}</small></div>
              <button type="button" className={s.secondary} disabled={added} onClick={() => addObjective(suggestion.name, "", `${syllabus.filename}, p. ${suggestion.page}`)}>{added ? <><Check size={14} /> Added</> : <><Plus size={14} /> Add</>}</button>
            </div>;
          }) : <p className={s.empty}>No topics were found in this PDF. Add objectives by hand instead.</p>}
        </div>}
      </section>
    </div>
  </>;
}

function AlertsView({ professorName, students, assignments, data, onOpenStudent }: { professorName: string; students: Student[]; assignments: Assignment[]; data: ProfessorData; onOpenStudent: (key: string) => void }) {
  const alerts = computeAlerts(students, assignments, data.received);
  const summary = weeklySummary(professorName, students, assignments, data.received);
  const [copied, setCopied] = useState("");

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied("Copied. Paste it into an email or your notes.");
    } catch {
      setCopied("Couldn't copy automatically. Select the text and copy it.");
    }
  }

  return <>
    <div className={s.pageHead}>
      <div><span className={s.eyebrow}>Early warning</span><h1>Alerts</h1><p>Students with overdue work, deadlines coming up, or no progress yet.</p></div>
    </div>
    <div className={s.grid2}>
      <section className={s.panel}>
        <div className={s.panelHead}><div><h2>{alerts.length ? `${alerts.length} ${alerts.length === 1 ? "student" : "students"} to check in with` : "No alerts"}</h2><p>High: overdue work or 5+ days inactive. Medium: due within 2 days or no objectives yet.</p></div></div>
        {alerts.length ? alerts.map((alert) => <div className={s.alertRow} key={alert.student.key}>
          <span className={s.avatar}>{initials(alert.student.name)}</span>
          <div className={s.alertMain}>
            <div className={s.objectiveRow}><strong>{alert.student.name}{alert.student.sample && <span className={s.sampleTag}>SAMPLE</span>}</strong><span className={`${s.pill} ${alert.severity === "High" ? s.pillRed : s.pillAmber}`}>{alert.severity}</span></div>
            <ul className={s.reasonList}>{alert.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
            <div className={s.assignmentActions}>
              <a className={s.secondary} href={nudgeEmail(alert.student, professorName, alert.reasons)}><Mail size={14} /> Email</a>
              <button type="button" className={s.secondary} onClick={() => onOpenStudent(alert.student.key)}>View student</button>
            </div>
          </div>
        </div>) : <p className={s.empty}>Everyone is up to date.</p>}
      </section>
      <section className={s.panel}>
        <div className={s.panelHead}><div><h2>Weekly summary</h2><p>Copy this into an email to yourself, a TA, or an advisor.</p></div><button type="button" className={s.secondary} onClick={copySummary}><Copy size={14} /> Copy</button></div>
        <label htmlFor="weekly-summary" className="sr-only">Weekly summary</label>
        <textarea id="weekly-summary" className={s.summaryBox} readOnly value={summary} rows={18} onFocus={(event) => event.currentTarget.select()} />
        {copied && <p className={s.hint} role="status" style={{ marginTop: 8 }}>{copied}</p>}
      </section>
    </div>
  </>;
}
