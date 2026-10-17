"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookOpen, Brain, Check, FileText, Headphones, Layers, ListChecks, Map as MapIcon, MessageSquareText, NotebookPen, Pause, Play, Plus, RotateCcw, Search, Sparkles, Square, Trash2, Upload, X } from "lucide-react";
import { addNote, addSource, deleteNote, deleteSource, invokeAssistant, listNotes, listReviews, listSources, recordAttempts, saveReview, type ClassInfo, type NoteRow, type ReviewRow, type SourceRow } from "./cloud";
import { buildFlashcards, buildMindMap, buildQuiz, buildStudyGuide, formatCitation, narrationScript, nextReview, searchPassages, tokenize, toPassages, type Citation, type MindNode, type NotebookSource, type SearchHit } from "../lib/notebook";
import { SAMPLE_SOURCE } from "../lib/sample-source";
import "./notebook.css";

type Tool = "Ask" | "Study guide" | "Flashcards" | "Quiz" | "Mind map" | "Audio overview" | "Notes";
const TOOLS: { name: Tool; icon: typeof Search }[] = [
  { name: "Ask", icon: MessageSquareText },
  { name: "Study guide", icon: BookOpen },
  { name: "Flashcards", icon: Layers },
  { name: "Quiz", icon: ListChecks },
  { name: "Mind map", icon: MapIcon },
  { name: "Audio overview", icon: Headphones },
  { name: "Notes", icon: NotebookPen },
];

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (days: number) => { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); };

// NotebookLM-style workspace for one class: sources on the left, study tools on the right.
// Everything runs on the source text (see lib/notebook); the AI buttons need an API key.
export default function CourseNotebook({ cls, userId, role, objectives = [], onBack }: { cls: ClassInfo; userId: string; role: "student" | "professor"; objectives?: string[]; onBack?: () => void }) {
  const [rows, setRows] = useState<SourceRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [tool, setTool] = useState<Tool>("Ask");
  const [reader, setReader] = useState<Citation | null>(null);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [askSeed, setAskSeed] = useState("");
  const [toast, setToast] = useState("");

  const refresh = useCallback(async () => {
    const [{ sources }, noteRows, reviewRows] = await Promise.all([listSources(cls.id), listNotes(cls.id, userId), role === "student" ? listReviews(cls.id, userId) : Promise.resolve([])]);
    setRows(sources); setNotes(noteRows); setReviews(reviewRows); setLoaded(true);
  }, [cls.id, userId, role]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(""), 2600); return () => window.clearTimeout(timer); }, [toast]);

  const active = useMemo<NotebookSource[]>(() => rows.filter((row) => !excluded.includes(row.id)).map((row) => ({ id: row.id, title: row.title, pages: row.pages ?? [], topics: row.topics ?? [], shared: row.shared })), [rows, excluded]);
  const passages = useMemo(() => toPassages(active), [active]);
  const cards = useMemo(() => buildFlashcards(passages, 40), [passages]);
  const guide = useMemo(() => buildStudyGuide(active, passages, objectives), [active, passages, objectives]);

  async function saveToNotes(title: string, body: string, citation?: string) {
    const error = await addNote(cls.id, { title, body, citation });
    setToast(error || "Saved to your notes");
    if (!error) setNotes(await listNotes(cls.id, userId));
  }

  const openCitation = (citation: Citation) => setReader(citation);
  const readerSource = reader ? rows.find((row) => row.id === reader.sourceId) : null;

  return <section className="nb">
    {onBack && <button className="back-link" onClick={onBack}><ArrowLeft size={16} /> Back to class</button>}
    <header className="nb-head">
      <div>
        <span className="eyebrow">{cls.code} · COURSE NOTEBOOK</span>
        <h1>{cls.name}</h1>
        <p>Every answer, guide, card and quiz comes from {role === "professor" ? "your class sources" : "your class sources and your own uploads"}, with the file and page cited.</p>
      </div>
      <div className="nb-stats"><span><b>{active.length}</b> sources</span><span><b>{active.reduce((sum, source) => sum + source.pages.length, 0)}</b> pages</span><span><b>{cards.length}</b> flashcards</span></div>
    </header>

    <div className="nb-layout">
      <SourcesPanel cls={cls} role={role} userId={userId} rows={rows} loaded={loaded} excluded={excluded} setExcluded={setExcluded} onOpen={(row) => setReader({ sourceId: row.id, title: row.title, page: row.pages[0]?.num ?? 1 })} onChanged={refresh} onToast={setToast} />

      <div className="nb-main">
        <nav className="nb-tools" aria-label="Notebook tools">
          {TOOLS.map(({ name, icon: Icon }) => <button key={name} type="button" className={tool === name ? "on" : ""} aria-current={tool === name ? "page" : undefined} onClick={() => setTool(name)}><Icon size={16} /> {name}</button>)}
        </nav>
        {!passages.length ? <EmptyState role={role} loaded={loaded} /> : <>
          {tool === "Ask" && <AskTool key={askSeed} cls={cls} passages={passages} initial={askSeed} onCite={openCitation} onSave={saveToNotes} />}
          {tool === "Study guide" && <GuideTool cls={cls} guide={guide} passages={passages} onCite={openCitation} onSave={saveToNotes} />}
          {tool === "Flashcards" && <FlashcardTool cls={cls} userId={userId} role={role} cards={cards} reviews={reviews} onReviewed={(row) => setReviews((prev) => [...prev.filter((item) => item.card_id !== row.card_id), row])} onCite={openCitation} />}
          {tool === "Quiz" && <QuizTool cls={cls} role={role} cards={cards} onCite={openCitation} />}
          {tool === "Mind map" && <MindMapTool map={buildMindMap(cls.code, active, passages)} onPick={(label) => { setAskSeed(label); setTool("Ask"); }} />}
          {tool === "Audio overview" && <AudioTool cls={cls} guide={guide} passages={passages} />}
          {tool === "Notes" && <NotesTool notes={notes} onAdd={saveToNotes} onDelete={async (id) => { await deleteNote(id); setNotes(await listNotes(cls.id, userId)); }} />}
        </>}
      </div>
    </div>

    {reader && readerSource && <SourceReader source={readerSource} page={reader.page} onPage={(page) => setReader({ ...reader, page })} onClose={() => setReader(null)} />}
    {toast && <p className="nb-toast" role="status">{toast}</p>}
  </section>;
}

function EmptyState({ role, loaded }: { role: "student" | "professor"; loaded: boolean }) {
  if (!loaded) return <p className="nb-muted">Loading your notebook…</p>;
  return <div className="nb-empty">
    <FileText size={28} />
    <h2>Add a source to get started</h2>
    <p>{role === "professor" ? "Upload your syllabus, slides, notes or readings as PDFs. Every student in the class can study from them." : "Upload your slides, notes or readings as PDFs, or use the sources your professor shares."} Study Spark builds a cited study guide, flashcards, quizzes, a mind map and an audio overview from them.</p>
  </div>;
}

function SourcesPanel({ cls, role, userId, rows, loaded, excluded, setExcluded, onOpen, onChanged, onToast }: { cls: ClassInfo; role: "student" | "professor"; userId: string; rows: SourceRow[]; loaded: boolean; excluded: string[]; setExcluded: (ids: string[]) => void; onOpen: (row: SourceRow) => void; onChanged: () => Promise<void>; onToast: (text: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const shared = role === "professor";

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    if (!file.name.toLowerCase().endsWith(".pdf")) { setError("Choose a PDF file."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Choose a PDF under 5 MB."); return; }
    setBusy(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/documents/extract", { method: "POST", body });
      const payload = await response.json() as { error?: string; filename?: string; pageCount?: number; extractedText?: string; pages?: { num: number; text: string }[]; suggestedTopics?: { name: string; page: number }[] };
      if (!response.ok) throw new Error(payload.error || "The PDF couldn't be read.");
      const pages = payload.pages?.length ? payload.pages : [{ num: 1, text: payload.extractedText ?? "" }];
      const failure = await addSource(cls.id, { title: (payload.filename ?? file.name).replace(/\.pdf$/i, ""), pageCount: payload.pageCount ?? pages.length, pages, topics: (payload.suggestedTopics ?? []).map((topic) => ({ name: topic.name, page: topic.page })), shared });
      if (failure) throw new Error(failure);
      await onChanged();
      onToast("Source added");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The PDF couldn't be read.");
    } finally {
      setBusy(false);
    }
  }

  async function addSample() {
    setBusy(true);
    const failure = await addSource(cls.id, { title: SAMPLE_SOURCE.title, pageCount: SAMPLE_SOURCE.pages.length, pages: SAMPLE_SOURCE.pages, topics: SAMPLE_SOURCE.topics, shared });
    setBusy(false);
    if (failure) { setError(failure); return; }
    await onChanged();
    onToast("Sample reading added");
  }

  return <aside className="nb-sources" aria-label="Sources">
    <div className="nb-sources-head"><h2>Sources</h2><span>{rows.length}</span></div>
    <label className="nb-upload" htmlFor="nb-file"><Upload size={16} /> {busy ? "Reading…" : shared ? "Add class source (PDF)" : "Add my source (PDF)"}<input id="nb-file" type="file" accept="application/pdf,.pdf" onChange={upload} disabled={busy} className="sr-only" /></label>
    {error && <p className="inline-error" role="alert">{error}</p>}
    {loaded && !rows.some((row) => row.title === SAMPLE_SOURCE.title) && <button type="button" className="nb-sample" onClick={() => void addSample()} disabled={busy}><Sparkles size={14} /> Add a sample FIN101 reading</button>}
    <ul className="nb-source-list">
      {rows.map((row) => {
        const on = !excluded.includes(row.id);
        return <li key={row.id} className={on ? "" : "off"}>
          <input type="checkbox" id={`src-${row.id}`} checked={on} onChange={() => setExcluded(on ? [...excluded, row.id] : excluded.filter((id) => id !== row.id))} aria-label={`Use ${row.title}`} />
          <button type="button" className="nb-source-name" onClick={() => onOpen(row)}><FileText size={14} /><span>{row.title}</span></button>
          <small>{row.shared ? "Class source" : "My source"} · {row.page_count || row.pages.length} pp.</small>
          {row.owner_id === userId && (confirm === row.id
            ? <span className="nb-confirm"><button type="button" onClick={async () => { await deleteSource(row.id); setConfirm(null); await onChanged(); onToast("Source removed"); }}>Remove</button><button type="button" onClick={() => setConfirm(null)}>Keep</button></span>
            : <button type="button" className="nb-icon" aria-label={`Remove ${row.title}`} onClick={() => setConfirm(row.id)}><Trash2 size={14} /></button>)}
        </li>;
      })}
    </ul>
    <p className="nb-muted">Uncheck a source to leave it out. {shared ? "Class sources are visible to every student in this class." : "Your sources are private to you."}</p>
  </aside>;
}

function Cite({ citation, onCite }: { citation: Citation; onCite: (citation: Citation) => void }) {
  return <button type="button" className="nb-cite" onClick={() => onCite(citation)} aria-label={`Open ${formatCitation(citation)}`}>{formatCitation(citation)}</button>;
}

function highlight(text: string, terms: string[]) {
  if (!terms.length) return text;
  return text.split(/(\s+)/).map((word, index) => {
    const tokens = tokenize(word);
    return tokens.length && terms.includes(tokens[0]) ? <mark key={index}>{word}</mark> : word;
  });
}

function AiNotice({ text }: { text: string }) {
  return <div className="nb-ai-notice"><Sparkles size={15} /><span>{text}</span></div>;
}

function AskTool({ cls, passages, initial, onCite, onSave }: { cls: ClassInfo; passages: ReturnType<typeof toPassages>; initial: string; onCite: (citation: Citation) => void; onSave: (title: string, body: string, citation?: string) => Promise<void> }) {
  const [query, setQuery] = useState(initial);
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [asked, setAsked] = useState("");
  const [ai, setAi] = useState<{ text: string; note: string; busy: boolean }>({ text: "", note: "", busy: false });

  const run = useCallback(async (question: string) => {
    const q = question.trim();
    if (!q) return;
    const found = searchPassages(passages, q, 6);
    setHits(found);
    setAsked(q);
    setAi({ text: "", note: "", busy: found.length > 0 });
    if (!found.length) return;
    const result = await invokeAssistant({ mode: "notebook", task: "answer", classId: cls.id, question: q, passages: found.map((hit, i) => ({ n: i + 1, title: hit.passage.title, page: hit.passage.page, text: hit.passage.text })) });
    setAi({ text: result.reply, note: result.notConfigured ? "AI-written answers turn on when your team adds an AI key. Here's what your sources say, ranked by relevance:" : result.error, busy: false });
  }, [cls.id, passages]);

  useEffect(() => { if (initial) void run(initial); }, [initial, run]);

  return <div className="nb-panel">
    <form className="nb-ask" onSubmit={(event: FormEvent) => { event.preventDefault(); void run(query); }}>
      <label className="sr-only" htmlFor="nb-question">Ask your sources</label>
      <Search size={17} />
      <input id="nb-question" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ask anything about your sources, e.g. “What is the discount rate?”" maxLength={300} />
      <button type="submit" className="primary-button">Ask</button>
    </form>
    {!hits && <div className="nb-suggest">{["What is the time value of money?", "How does present value change when the rate rises?", "Compare an ordinary annuity and an annuity due"].map((sample) => <button type="button" key={sample} onClick={() => { setQuery(sample); void run(sample); }}>{sample}</button>)}</div>}
    {hits && !hits.length && <p className="nb-muted">Nothing in your sources matches “{asked}”. Try different words, or add a source that covers it.</p>}
    {hits && hits.length > 0 && <>
      {ai.busy && <p className="nb-muted"><Sparkles size={14} /> Writing an answer from your sources…</p>}
      {ai.text && <article className="nb-answer"><span className="eyebrow">ANSWER FROM YOUR SOURCES</span><p>{ai.text}</p><div className="nb-row">{hits.map((hit, i) => <span key={hit.passage.id} className="nb-ref">[{i + 1}] <Cite citation={{ sourceId: hit.passage.sourceId, title: hit.passage.title, page: hit.passage.page }} onCite={onCite} /></span>)}</div><button type="button" className="text-button" onClick={() => void onSave(asked, ai.text, hits.map((hit, i) => `[${i + 1}] ${hit.passage.title}, p. ${hit.passage.page}`).join("; "))}><NotebookPen size={14} /> Save answer to notes</button></article>}
      {ai.note && <AiNotice text={ai.note} />}
      <div className="nb-hits">{hits.map((hit, i) => {
        const citation = { sourceId: hit.passage.sourceId, title: hit.passage.title, page: hit.passage.page };
        return <article key={hit.passage.id} className="nb-hit"><span className="nb-hit-n">{i + 1}</span><div><p>{highlight(hit.passage.text, hit.terms)}</p><div className="nb-row"><Cite citation={citation} onCite={onCite} /><button type="button" className="text-button" onClick={() => void onSave(asked, hit.passage.text, formatCitation(citation))}><NotebookPen size={14} /> Save</button></div></div></article>;
      })}</div>
    </>}
  </div>;
}

function GuideTool({ cls, guide, passages, onCite, onSave }: { cls: ClassInfo; guide: ReturnType<typeof buildStudyGuide>; passages: ReturnType<typeof toPassages>; onCite: (citation: Citation) => void; onSave: (title: string, body: string, citation?: string) => Promise<void> }) {
  const [ai, setAi] = useState<{ text: string; note: string; busy: boolean }>({ text: "", note: "", busy: false });
  const asText = () => [
    "Overview", ...guide.overview.map((point) => `• ${point.text} (${formatCitation(point.citation)})`), "",
    ...guide.sections.flatMap((section) => [section.title, ...section.points.map((point) => `• ${point.text} (${formatCitation(point.citation)})`), ""]),
    "Key terms", ...guide.glossary.map((card) => `• ${card.back}`), "", "Check yourself", ...guide.questions.map((question) => `• ${question}`),
  ].join("\n");
  async function writeWithAi() {
    setAi({ text: "", note: "", busy: true });
    const sample = passages.slice(0, 16).map((passage, i) => ({ n: i + 1, title: passage.title, page: passage.page, text: passage.text }));
    const result = await invokeAssistant({ mode: "notebook", task: "guide", classId: cls.id, passages: sample });
    setAi({ text: result.reply, note: result.notConfigured ? "AI-written study guides turn on when your team adds an AI key. The guide below is built directly from your sources." : result.error, busy: false });
  }
  return <div className="nb-panel">
    <div className="nb-row nb-actions"><button type="button" className="secondary-button" onClick={() => void onSave(`Study guide · ${cls.code}`, asText())}><NotebookPen size={14} /> Save guide to notes</button><button type="button" className="secondary-button" onClick={() => void writeWithAi()} disabled={ai.busy}><Sparkles size={14} /> {ai.busy ? "Writing…" : "Rewrite with AI"}</button></div>
    {ai.note && <AiNotice text={ai.note} />}
    {ai.text && <article className="nb-answer"><span className="eyebrow">AI STUDY GUIDE</span><p>{ai.text}</p></article>}
    <section className="nb-guide"><h2>Overview</h2><ul>{guide.overview.map((point) => <li key={point.text}>{point.text} <Cite citation={point.citation} onCite={onCite} /></li>)}</ul></section>
    {guide.sections.map((section) => <section className="nb-guide" key={section.title}><h3>{section.title}</h3><ul>{section.points.map((point) => <li key={point.text}>{point.text} <Cite citation={point.citation} onCite={onCite} /></li>)}</ul></section>)}
    {guide.glossary.length > 0 && <section className="nb-guide"><h3>Key terms</h3><dl className="nb-glossary">{guide.glossary.map((card) => <div key={card.id}><dt>{card.front.replace(/^What (is|are|does) /, "").replace(/( measure)?\?$/, "")}</dt><dd>{card.back} <Cite citation={card.citation} onCite={onCite} /></dd></div>)}</dl></section>}
    {guide.questions.length > 0 && <section className="nb-guide"><h3>Check yourself</h3><ol>{guide.questions.map((question) => <li key={question}>{question}</li>)}</ol></section>}
  </div>;
}

function FlashcardTool({ cls, userId, role, cards, reviews, onReviewed, onCite }: { cls: ClassInfo; userId: string; role: "student" | "professor"; cards: ReturnType<typeof buildFlashcards>; reviews: ReviewRow[]; onReviewed: (row: ReviewRow) => void; onCite: (citation: Citation) => void }) {
  const byId = new Map(reviews.map((row) => [row.card_id, row]));
  const due = cards.filter((card) => { const row = byId.get(card.id); return !row || row.due <= today(); });
  const mastered = cards.filter((card) => (byId.get(card.id)?.box ?? 0) >= 4).length;
  const [flipped, setFlipped] = useState(false);
  const [index, setIndex] = useState(0);
  const deck = role === "student" ? due : cards;
  const card = deck[index % Math.max(1, deck.length)];

  async function grade(value: "again" | "good" | "easy") {
    if (!card) return;
    if (role === "student") {
      const current = byId.get(card.id);
      const next = nextReview(current?.box ?? 1, value);
      const row: ReviewRow = { user_id: userId, card_id: card.id, box: next.box, due: addDays(next.days), reviews: (current?.reviews ?? 0) + 1, updated_at: new Date().toISOString() };
      onReviewed(row);
      void saveReview(cls.id, userId, card.id, row.box, row.due, row.reviews);
      // Cards answered correctly leave today's deck; "Again" keeps the card due, so move past it.
      if (value === "again") setIndex((i) => i + 1);
    } else {
      setIndex((i) => i + 1);
    }
    setFlipped(false);
  }

  return <div className="nb-panel">
    <div className="nb-row nb-cardstats"><span><b>{cards.length}</b> cards from your sources</span>{role === "student" && <><span><b>{due.length}</b> due today</span><span><b>{mastered}</b> mastered</span></>}</div>
    {role === "professor" && <AiNotice text="Preview mode: these are the cards your students study. Student progress shows in each student's activity." />}
    {!card ? <div className="nb-empty small"><Check size={24} /><h2>You're done for today</h2><p>Every card is scheduled for a later review. Spaced repetition brings each one back right before you'd forget it.</p></div>
      : <>
        <button type="button" className={`nb-card ${flipped ? "flipped" : ""}`} onClick={() => setFlipped(!flipped)} aria-label={flipped ? "Show question" : "Show answer"}>
          <span className="eyebrow">{flipped ? "ANSWER" : card.kind === "cloze" ? "FILL IN THE BLANK" : "QUESTION"}</span>
          <p>{flipped ? card.back : card.front}</p>
          <small>{flipped ? "Click to flip back" : "Click to reveal the answer"}</small>
        </button>
        <div className="nb-row nb-grade">{flipped ? <>
          <button type="button" className="secondary-button" onClick={() => void grade("again")}><RotateCcw size={14} /> Again</button>
          <button type="button" className="primary-button" onClick={() => void grade("good")}>Got it</button>
          <button type="button" className="secondary-button" onClick={() => void grade("easy")}>Easy</button>
        </> : <button type="button" className="primary-button" onClick={() => setFlipped(true)}>Show answer</button>}</div>
        <div className="nb-row nb-center"><Cite citation={card.citation} onCite={onCite} /><span className="nb-muted">Card {(index % deck.length) + 1} of {deck.length}</span></div>
      </>}
  </div>;
}

function QuizTool({ cls, role, cards, onCite }: { cls: ClassInfo; role: "student" | "professor"; cards: ReturnType<typeof buildFlashcards>; onCite: (citation: Citation) => void }) {
  const [seed, setSeed] = useState(7);
  const quiz = useMemo(() => buildQuiz(cards, 8, seed), [cards, seed]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const score = quiz.filter((question, i) => answers[i] === question.answer).length;
  if (quiz.length < 3) return <div className="nb-panel"><p className="nb-muted">Add more source material to build a quiz. Quizzes need at least a handful of terms and definitions.</p></div>;
  return <div className="nb-panel">
    <div className="nb-row nb-actions"><span className="nb-muted">{quiz.length} questions generated from your sources</span><button type="button" className="secondary-button" onClick={() => { setSeed((value) => value + 1); setAnswers({}); setChecked(false); }}><RotateCcw size={14} /> New quiz</button></div>
    {quiz.map((question, i) => <article className="nb-quiz" key={question.id}>
      <span className="eyebrow">QUESTION {i + 1}</span>
      <h3>{question.prompt}</h3>
      <div className="nb-options">{question.options.map((option, j) => {
        const state = checked ? (j === question.answer ? "right" : answers[i] === j ? "wrong" : "") : answers[i] === j ? "chosen" : "";
        return <button type="button" key={option} className={state} aria-pressed={answers[i] === j} disabled={checked} onClick={() => setAnswers((prev) => ({ ...prev, [i]: j }))}>{option}</button>;
      })}</div>
      {checked && <p className="nb-explain">{answers[i] === question.answer ? "Correct. " : "Review: "}{question.explanation} <Cite citation={question.citation} onCite={onCite} /></p>}
    </article>)}
    {!checked ? <button type="button" className="primary-button" disabled={Object.keys(answers).length < quiz.length} onClick={() => { setChecked(true); if (role === "student") void recordAttempts(cls.id, quiz.map((question, i) => ({ lessonKey: "notebook-quiz", question: i, chosen: answers[i], correct: answers[i] === question.answer, hinted: false }))); }}>Check my answers</button>
      : <div className="nb-score"><strong>Score: {score} / {quiz.length}</strong><span>{score === quiz.length ? "Perfect. Try a new quiz or review your flashcards." : "Open the cited pages for the ones you missed, then try a new quiz."}</span></div>}
  </div>;
}

function MindMapTool({ map, onPick }: { map: MindNode; onPick: (label: string) => void }) {
  const width = 960, height = 620, cx = width / 2, cy = height / 2;
  const branches = map.children;
  const nodes: { x: number; y: number; label: string; level: number; px: number; py: number }[] = [];
  branches.forEach((branch, i) => {
    const angle = (i / Math.max(1, branches.length)) * Math.PI * 2 - Math.PI / 2;
    const bx = cx + Math.cos(angle) * 210, by = cy + Math.sin(angle) * 175;
    nodes.push({ x: bx, y: by, label: branch.label, level: 1, px: cx, py: cy });
    branch.children.forEach((leaf, j) => {
      const spread = (j - (branch.children.length - 1) / 2) * 0.32;
      const la = angle + spread;
      nodes.push({ x: bx + Math.cos(la) * 135, y: by + Math.sin(la) * 105, label: leaf.label, level: 2, px: bx, py: by });
    });
  });
  const clip = (text: string, max: number) => text.length > max ? `${text.slice(0, max - 1)}…` : text;
  return <div className="nb-panel">
    <p className="nb-muted">Topics from your sources and the terms that appear with them. Click any topic to ask your sources about it.</p>
    <div className="nb-map-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="nb-map" role="img" aria-label={`Mind map of ${map.label}`}>
        {nodes.map((node) => <line key={`l-${node.label}-${node.x}`} x1={node.px} y1={node.py} x2={node.x} y2={node.y} className={`nb-edge l${node.level}`} />)}
        <g className="nb-node root"><rect x={cx - 70} y={cy - 24} width={140} height={48} rx={24} /><text x={cx} y={cy + 5}>{map.label}</text></g>
        {nodes.map((node) => {
          const label = clip(node.label, node.level === 1 ? 26 : 22);
          const w = Math.max(90, label.length * (node.level === 1 ? 8.2 : 7.2) + 26);
          return <g key={`n-${node.label}-${node.x}`} className={`nb-node l${node.level}`} role="button" tabIndex={0} aria-label={`Ask about ${node.label}`} onClick={() => onPick(node.label)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onPick(node.label); } }}>
            <rect x={node.x - w / 2} y={node.y - 17} width={w} height={34} rx={17} /><text x={node.x} y={node.y + 4}>{label}</text>
          </g>;
        })}
      </svg>
    </div>
  </div>;
}

function AudioTool({ cls, guide, passages }: { cls: ClassInfo; guide: ReturnType<typeof buildStudyGuide>; passages: ReturnType<typeof toPassages> }) {
  const script = useMemo(() => narrationScript(cls.name, guide), [cls.name, guide]);
  const [state, setState] = useState<"idle" | "playing" | "paused">("idle");
  const [rate, setRate] = useState(1);
  const [podcast, setPodcast] = useState<{ lines: { speaker: string; text: string }[]; note: string; busy: boolean }>({ lines: [], note: "", busy: false });
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const queue = useRef<SpeechSynthesisUtterance[]>([]);

  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported]);

  function speak(parts: { text: string; voiceIndex: number }[]) {
    if (!supported) return;
    window.speechSynthesis.cancel();
    const voices = window.speechSynthesis.getVoices().filter((voice) => voice.lang.startsWith("en"));
    queue.current = parts.map((part, i) => {
      const utterance = new SpeechSynthesisUtterance(part.text);
      utterance.rate = rate;
      if (voices.length) utterance.voice = voices[part.voiceIndex % voices.length];
      if (i === parts.length - 1) utterance.onend = () => setState("idle");
      return utterance;
    });
    queue.current.forEach((utterance) => window.speechSynthesis.speak(utterance));
    setState("playing");
  }

  async function makePodcast() {
    setPodcast({ lines: [], note: "", busy: true });
    const sample = passages.slice(0, 16).map((passage, i) => ({ n: i + 1, title: passage.title, page: passage.page, text: passage.text }));
    const result = await invokeAssistant({ mode: "notebook", task: "podcast", classId: cls.id, passages: sample });
    const lines = result.reply.split("\n").map((line) => /^\s*(ALEX|SAM)\s*:\s*(.+)$/i.exec(line)).filter((match): match is RegExpExecArray => Boolean(match)).map((match) => ({ speaker: match[1].toUpperCase(), text: match[2].trim() }));
    setPodcast({ lines, note: result.notConfigured ? "The two-host AI podcast turns on when your team adds an AI key. The narrated overview above works now." : result.error || (!lines.length && result.reply ? "The podcast script came back in an unexpected format. Try again." : ""), busy: false });
  }

  return <div className="nb-panel">
    <article className="nb-audio">
      <span className="nb-audio-icon"><Headphones size={22} /></span>
      <div><h2>Audio overview</h2><p>A narrated recap of your sources: the big picture, each topic, key terms, and questions to answer out loud. Great for the commute or the gym.</p></div>
    </article>
    {!supported ? <p className="nb-muted">This browser can't read text aloud. Try Chrome, Edge or Safari.</p> : <div className="nb-row nb-actions">
      {state === "playing" ? <button type="button" className="primary-button" onClick={() => { window.speechSynthesis.pause(); setState("paused"); }}><Pause size={15} /> Pause</button>
        : state === "paused" ? <button type="button" className="primary-button" onClick={() => { window.speechSynthesis.resume(); setState("playing"); }}><Play size={15} /> Resume</button>
          : <button type="button" className="primary-button" onClick={() => speak([{ text: script, voiceIndex: 0 }])}><Play size={15} /> Play overview</button>}
      <button type="button" className="secondary-button" disabled={state === "idle"} onClick={() => { window.speechSynthesis.cancel(); setState("idle"); }}><Square size={14} /> Stop</button>
      <label className="nb-rate" htmlFor="nb-rate">Speed<select id="nb-rate" value={rate} onChange={(event) => setRate(Number(event.target.value))}>{[0.8, 1, 1.25, 1.5].map((value) => <option key={value} value={value}>{value}×</option>)}</select></label>
    </div>}
    <details className="nb-transcript"><summary>Read the transcript</summary><p>{script}</p></details>
    <article className="nb-podcast">
      <div><h3><Brain size={16} /> Two-host podcast</h3><p>Two AI hosts talk through your sources like a study podcast, with every fact taken from your class materials.</p></div>
      <button type="button" className="secondary-button" onClick={() => void makePodcast()} disabled={podcast.busy}><Sparkles size={14} /> {podcast.busy ? "Writing the episode…" : "Generate episode"}</button>
    </article>
    {podcast.note && <AiNotice text={podcast.note} />}
    {podcast.lines.length > 0 && <>
      <div className="nb-row nb-actions"><button type="button" className="primary-button" onClick={() => speak(podcast.lines.map((line) => ({ text: line.text, voiceIndex: line.speaker === "ALEX" ? 0 : 1 })))}><Play size={15} /> Play episode</button></div>
      <div className="nb-script">{podcast.lines.map((line, i) => <p key={i}><b>{line.speaker === "ALEX" ? "Alex" : "Sam"}:</b> {line.text}</p>)}</div>
    </>}
  </div>;
}

function NotesTool({ notes, onAdd, onDelete }: { notes: NoteRow[]; onAdd: (title: string, body: string) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  return <div className="nb-panel">
    <form className="nb-note-form" onSubmit={async (event: FormEvent) => { event.preventDefault(); if (!title.trim() || !body.trim()) return; await onAdd(title.trim(), body.trim()); setTitle(""); setBody(""); }}>
      <label htmlFor="nb-note-title">New note</label>
      <input id="nb-note-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" maxLength={200} />
      <textarea id="nb-note-body" value={body} onChange={(event) => setBody(event.target.value)} rows={3} placeholder="Write what you learned in your own words…" maxLength={8000} />
      <button type="submit" className="primary-button" disabled={!title.trim() || !body.trim()}><Plus size={14} /> Add note</button>
    </form>
    {!notes.length ? <p className="nb-muted">Saved answers, passages and guides appear here. Notes are private to you.</p>
      : <div className="nb-notes">{notes.map((note) => <article key={note.id} className="nb-note"><div className="nb-row nb-between"><h3>{note.title}</h3><button type="button" className="nb-icon" aria-label={`Delete note ${note.title}`} onClick={() => void onDelete(note.id)}><Trash2 size={14} /></button></div><p>{note.body}</p>{note.citation && <small>{note.citation}</small>}</article>)}</div>}
  </div>;
}

function SourceReader({ source, page, onPage, onClose }: { source: SourceRow; page: number; onPage: (page: number) => void; onClose: () => void }) {
  const pages = source.pages ?? [];
  const index = Math.max(0, pages.findIndex((item) => item.num === page));
  const current = pages[index];
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="nb-reader" role="dialog" aria-modal="true" aria-labelledby="nb-reader-title">
      <div className="nb-row nb-between"><div><span className="eyebrow">SOURCE</span><h2 id="nb-reader-title">{source.title}</h2></div><button type="button" className="nb-icon" aria-label="Close" onClick={onClose} autoFocus><X size={18} /></button></div>
      <div className="nb-row nb-between nb-pager"><button type="button" className="secondary-button" disabled={index === 0} onClick={() => onPage(pages[index - 1].num)}>Previous page</button><span>Page {current?.num ?? page} of {pages.length}</span><button type="button" className="secondary-button" disabled={index >= pages.length - 1} onClick={() => onPage(pages[index + 1].num)}>Next page</button></div>
      <div className="nb-page">{current ? current.text : "This page has no text."}</div>
    </section>
  </div>;
}
