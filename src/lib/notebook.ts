// Course notebook engine. Works entirely on the text of uploaded course sources with
// transparent, deterministic rules, so every feature runs without an AI service:
// cited search (BM25), an extractive study guide, glossary, flashcards, quizzes,
// a topic mind map, and an audio narration script. AI features build on top of it.

export type SourcePage = { num: number; text: string };
export type SourceTopic = { name: string; page: number };
export type NotebookSource = { id: string; title: string; pages: SourcePage[]; topics: SourceTopic[]; shared: boolean };
export type Passage = { id: string; sourceId: string; title: string; page: number; text: string };
export type Citation = { sourceId: string; title: string; page: number };
export type SearchHit = { passage: Passage; score: number; terms: string[] };
// back is shown on the flashcard; answer is the part used as a quiz option (without the term itself).
export type Flashcard = { id: string; front: string; back: string; answer: string; kind: "definition" | "cloze"; citation: Citation };
export type QuizQuestion = { id: string; prompt: string; options: string[]; answer: number; explanation: string; citation: Citation };
export type GuidePoint = { text: string; citation: Citation };
export type StudyGuide = { overview: GuidePoint[]; sections: { title: string; points: GuidePoint[] }[]; glossary: Flashcard[]; questions: string[] };
export type MindNode = { label: string; children: MindNode[] };

const STOP = new Set(("a about above after again against all also am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers him his how however i if in into is it its itself just may me might more most must my no nor not now of off on once only or other our ours out over own same she should so some such than that the their theirs them then there these they this those through to too under until up upon very was we were what when where which while who whom why will with within without would you your yours "
  + "one two three first second also using used use example examples figure table chapter section page pages shown show note notes see called thus therefore based given let get gets got make makes made like often usually many much well way ways").split(" "));

function stem(word: string) {
  if (word.length > 5 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && word.endsWith("es") && /(ss|x|ch|sh)es$/.test(word)) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

export function tokenize(text: string) {
  return (text.toLowerCase().match(/[a-z][a-z0-9'’-]{2,}/g) ?? []).map((word) => word.replace(/['’]s$/, "").replace(/['’-]+$/, "")).filter((word) => word.length > 2 && !STOP.has(word)).map(stem);
}

export function sentences(text: string) {
  return text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[A-Z0-9“"(])/).map((sentence) => sentence.trim()).filter((sentence) => sentence.length >= 30 && sentence.length <= 420 && /[a-z]/.test(sentence));
}

export function hashId(text: string) {
  let hash = 5381;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  return hash.toString(36);
}

export function toPassages(sources: NotebookSource[], size = 600): Passage[] {
  const passages: Passage[] = [];
  for (const source of sources) {
    for (const page of source.pages) {
      let chunk = "";
      const push = () => { if (chunk.trim().length > 40) passages.push({ id: `${source.id}:${page.num}:${passages.length}`, sourceId: source.id, title: source.title, page: page.num, text: chunk.trim() }); chunk = ""; };
      const parts = sentences(page.text);
      for (const sentence of parts.length ? parts : [page.text.replace(/\s+/g, " ").slice(0, size)]) {
        if (chunk.length + sentence.length > size) push();
        chunk += `${sentence} `;
      }
      push();
    }
  }
  return passages;
}

function cite(passage: Passage): Citation {
  return { sourceId: passage.sourceId, title: passage.title, page: passage.page };
}

// Okapi BM25 ranking over passages.
export function searchPassages(passages: Passage[], query: string, limit = 6): SearchHit[] {
  const terms = Array.from(new Set(tokenize(query)));
  if (!terms.length || !passages.length) return [];
  const docs = passages.map((passage) => tokenize(passage.text));
  const avg = docs.reduce((sum, doc) => sum + doc.length, 0) / docs.length || 1;
  const df = new Map(terms.map((term) => [term, docs.filter((doc) => doc.includes(term)).length]));
  const k1 = 1.4, b = 0.75, n = docs.length;
  return passages.map((passage, i) => {
    const doc = docs[i];
    let score = 0;
    const matched: string[] = [];
    for (const term of terms) {
      const tf = doc.filter((word) => word === term).length;
      if (!tf) continue;
      matched.push(term);
      const idf = Math.log(1 + (n - (df.get(term) ?? 0) + 0.5) / ((df.get(term) ?? 0) + 0.5));
      score += idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * doc.length / avg));
    }
    return { passage, score: score * (0.6 + 0.4 * matched.length / terms.length), terms: matched };
  }).filter((hit) => hit.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
}

// Distinctive terms and two-word phrases, weighted by how often and how widely they appear.
export function keyTerms(passages: Passage[], limit = 24) {
  const counts = new Map<string, { count: number; docs: Set<number>; label: string }>();
  passages.forEach((passage, i) => {
    const words = (passage.text.match(/[A-Za-z][A-Za-z'’-]{2,}/g) ?? []).map((word) => word.replace(/['’]s$/, ""));
    for (let j = 0; j < words.length; j += 1) {
      const one = words[j].toLowerCase();
      const grams: [string, string][] = [];
      if (!STOP.has(one) && one.length > 3) grams.push([stem(one), words[j]]);
      const two = words[j + 1]?.toLowerCase();
      if (two && !STOP.has(one) && !STOP.has(two) && one.length > 2 && two.length > 2) grams.push([`${stem(one)} ${stem(two)}`, `${words[j]} ${words[j + 1]}`]);
      for (const [key, label] of grams) {
        const entry = counts.get(key) ?? { count: 0, docs: new Set<number>(), label: label.toLowerCase() };
        entry.count += 1;
        entry.docs.add(i);
        counts.set(key, entry);
      }
    }
  });
  const n = Math.max(1, passages.length);
  return [...counts.entries()]
    .filter(([key, value]) => value.count >= 2 && (key.includes(" ") ? value.count >= 2 : value.docs.size >= 2))
    .map(([key, value]) => ({ key, term: value.label, count: value.count, weight: value.count * (key.includes(" ") ? 2.2 : 1) * Math.log(1 + n / value.docs.size) }))
    .sort((a, b) => b.weight - a.weight)
    .filter((item, index, all) => !all.slice(0, index).some((other) => other.key.includes(item.key) || item.key.includes(other.key)))
    .slice(0, limit);
}

function sentenceIndex(passages: Passage[]) {
  return passages.flatMap((passage) => sentences(passage.text).map((text) => ({ text, passage })));
}

const DEFINITION = /^(An?\s+|The\s+)?([A-Za-z][A-Za-z0-9\s()'’/-]{2,60}?)\s+(is|are|refers to|means|is defined as|describes|measures)\s+(.{12,260}?)[.!?]?$/;
const TERM_GLUE = new Set(["of", "and", "the", "a", "an", "to", "in", "on", "for"]);
const NOT_A_TERM = new Set(["also", "when", "while", "which", "that", "because", "if", "this", "these", "those", "there", "it", "what", "so", "then", "only", "usually", "often"]);

function looksLikeTerm(term: string) {
  const words = term.toLowerCase().split(/\s+/);
  return words.length <= 5 && !words.some((word) => NOT_A_TERM.has(word)) && words.every((word) => TERM_GLUE.has(word) || !STOP.has(word)) && !TERM_GLUE.has(words[words.length - 1]);
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function buildFlashcards(passages: Passage[], limit = 30): Flashcard[] {
  const cards: Flashcard[] = [];
  const seen = new Set<string>();
  const index = sentenceIndex(passages);
  for (const { text, passage } of index) {
    const match = DEFINITION.exec(text);
    if (!match) continue;
    const article = (match[1] ?? "").trim().toLowerCase();
    const term = match[2].trim().replace(/\s+/g, " ");
    if (!looksLikeTerm(term)) continue;
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const verb = match[3];
    const named = `${article ? `${article} ` : ""}${/^[A-Z]{2,}/.test(term) ? term : term.charAt(0).toLowerCase() + term.slice(1)}`;
    const front = verb === "measures" ? `What does ${named} measure?` : `What ${verb === "are" ? "are" : "is"} ${named}?`;
    const definition = match[4].trim().replace(/[.!?]$/, "");
    cards.push({ id: hashId(`d:${key}`), front, back: `${capitalize(article ? `${article} ${term}` : term)} ${verb} ${definition}.`, answer: `${capitalize(definition)}.`, kind: "definition", citation: cite(passage) });
    if (cards.length >= limit) return cards;
  }
  for (const term of keyTerms(passages, 40)) {
    const hit = index.find(({ text }) => new RegExp(`\\b${term.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text) && text.length < 260);
    if (!hit) continue;
    const key = term.term;
    if (seen.has(key)) continue;
    seen.add(key);
    const pattern = new RegExp(`\\b${term.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (!pattern.test(hit.text)) continue;
    cards.push({ id: hashId(`c:${key}`), front: hit.text.replace(pattern, "_____"), back: term.term, answer: term.term, kind: "cloze", citation: cite(hit.passage) });
    if (cards.length >= limit) break;
  }
  return cards;
}

function seeded(seed: number) {
  let state = seed || 1;
  return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 2 ** 32; };
}

export function buildQuiz(cards: Flashcard[], count = 8, seed = 7): QuizQuestion[] {
  const random = seeded(seed);
  const pool = [...cards].sort(() => random() - 0.5);
  const questions: QuizQuestion[] = [];
  for (const card of pool) {
    const sameKind = cards.filter((other) => other.kind === card.kind && other.id !== card.id && other.answer !== card.answer);
    if (sameKind.length < 3) continue;
    const distractors = Array.from(new Set([...sameKind].sort(() => random() - 0.5).map((other) => other.answer))).slice(0, 3);
    if (distractors.length < 3) continue;
    const options = [...distractors, card.answer].sort(() => random() - 0.5);
    questions.push({
      id: card.id,
      prompt: card.kind === "cloze" ? `Fill in the blank: ${card.front}` : card.front,
      options,
      answer: options.indexOf(card.answer),
      explanation: card.kind === "cloze" ? `The missing term is “${card.back}”.` : card.back,
      citation: card.citation,
    });
    if (questions.length >= count) break;
  }
  return questions;
}

// Extractive summary: sentences that carry the most of the sources' distinctive vocabulary.
function rankSentences(passages: Passage[], focus?: string[], phrase?: string) {
  const weights = new Map(keyTerms(passages, 60).flatMap((item) => item.key.split(" ").map((word) => [word, item.weight] as const)));
  const focusSet = new Set(focus ?? []);
  return sentenceIndex(passages).map(({ text, passage }) => {
    const words = tokenize(text);
    const base = words.reduce((sum, word) => sum + (weights.get(word) ?? 0), 0) / Math.sqrt(words.length + 4);
    // Sentences that contain every word of the topic name rank well above partial matches.
    const matched = focus ? new Set(words.filter((word) => focusSet.has(word))).size : 1;
    const coverage = focus && focusSet.size ? matched / focusSet.size : 1;
    const exact = phrase && text.toLowerCase().includes(phrase.toLowerCase()) ? 4 : 1;
    return { text, passage, score: focus ? base * matched * coverage * exact : base };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
}

function uniquePoints(items: { text: string; passage: Passage }[], limit: number, seen = new Set<string>()) {
  const points: GuidePoint[] = [];
  for (const item of items) {
    const key = item.text.slice(0, 60).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    points.push({ text: item.text, citation: cite(item.passage) });
    if (points.length >= limit) break;
  }
  return points;
}

export function buildStudyGuide(sources: NotebookSource[], passages: Passage[], objectives: string[] = []): StudyGuide {
  const cards = buildFlashcards(passages, 40);
  const topicNames = objectives.length ? objectives
    : Array.from(new Set(sources.flatMap((source) => source.topics.map((topic) => topic.name)))).slice(0, 8);
  const headings = topicNames.length >= 2 ? topicNames : keyTerms(passages, 6).map((item) => item.term);
  const used = new Set<string>();
  const overview = uniquePoints(rankSentences(passages), 4, used);
  const sections = headings.slice(0, 8).map((title) => ({ title, points: uniquePoints(rankSentences(passages, tokenize(title), title), 3, used) })).filter((section) => section.points.length);
  return {
    overview,
    sections,
    glossary: cards.filter((card) => card.kind === "definition").slice(0, 12),
    questions: cards.slice(0, 6).map((card) => card.kind === "cloze" ? `Explain “${card.back}” in your own words and give an example.` : card.front),
  };
}

// Topics at the first level; terms that appear in the same passages as each topic below it.
export function buildMindMap(rootLabel: string, sources: NotebookSource[], passages: Passage[]): MindNode {
  const terms = keyTerms(passages, 40);
  const fromTopics = Array.from(new Set(sources.flatMap((source) => source.topics.map((topic) => topic.name)))).slice(0, 6);
  const branches = (fromTopics.length >= 3 ? fromTopics : terms.slice(0, 6).map((item) => item.term));
  const used = new Set(branches.map((branch) => branch.toLowerCase()));
  return {
    label: rootLabel,
    children: branches.map((branch) => {
      const tokens = tokenize(branch);
      const related = passages.filter((passage) => tokenize(passage.text).some((word) => tokens.includes(word)));
      const children = terms.filter((item) => !used.has(item.term) && related.some((passage) => passage.text.toLowerCase().includes(item.term)))
        .slice(0, 4).map((item) => { used.add(item.term); return { label: item.term, children: [] }; });
      return { label: branch, children };
    }),
  };
}

export function narrationScript(className: string, guide: StudyGuide) {
  const lines = [`Here's your audio overview for ${className}.`];
  if (guide.overview.length) lines.push("First, the big picture.", ...guide.overview.map((point) => point.text));
  for (const section of guide.sections.slice(0, 5)) lines.push(`Next: ${section.title}.`, ...section.points.slice(0, 2).map((point) => point.text));
  if (guide.glossary.length) lines.push("A few key terms to remember.", ...guide.glossary.slice(0, 5).map((card) => card.back));
  if (guide.questions.length) lines.push("Before you go, try answering these out loud.", ...guide.questions.slice(0, 3));
  lines.push("That's the overview. Open your flashcards to lock it in.");
  return lines.join(" ");
}

// Leitner spaced repetition: box 1 is reviewed again today; correct answers move a card up.
export const BOX_DAYS = [0, 1, 3, 7, 14] as const;
export function nextReview(box: number, grade: "again" | "good" | "easy") {
  const next = grade === "again" ? 1 : Math.min(5, box + (grade === "easy" ? 2 : 1));
  return { box: next, days: BOX_DAYS[next - 1] };
}

export function formatCitation(citation: Citation) {
  return `${citation.title}, p. ${citation.page}`;
}
