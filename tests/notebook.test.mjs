import test from "node:test";
import assert from "node:assert/strict";
import { buildFlashcards, buildMindMap, buildQuiz, buildStudyGuide, keyTerms, nextReview, searchPassages, toPassages } from "../src/lib/notebook.ts";

const source = {
  id: "s1",
  title: "Chapter 5",
  shared: true,
  topics: [{ name: "Present value", page: 2 }, { name: "Future value", page: 1 }, { name: "Compound interest", page: 1 }],
  pages: [
    { num: 1, text: "Future value is the amount an investment will grow to after earning interest. Compound interest is interest earned on both the principal and previously earned interest. The future value of a lump sum depends on the interest rate and the number of periods. A higher interest rate increases future value when the rate is positive." },
    { num: 2, text: "Present value is the current worth of a future amount of money. The discount rate is the rate used to bring future cash flows back to today. Present value falls when the discount rate rises. An annuity is a series of equal payments made at regular intervals." },
    { num: 3, text: "An ordinary annuity makes payments at the end of each period. An annuity due makes payments at the beginning of each period, so each payment earns one extra period of interest. Loan payments are a common example of an ordinary annuity in everyday life." },
  ],
};

const passages = toPassages([source]);

test("search ranks the most relevant passage first and cites its page", () => {
  const hits = searchPassages(passages, "what is the discount rate");
  assert.ok(hits.length > 0);
  assert.equal(hits[0].passage.page, 2);
  assert.equal(hits[0].passage.title, "Chapter 5");
});

test("search with only stop words returns nothing", () => {
  assert.deepEqual(searchPassages(passages, "what is the"), []);
});

test("flashcards come from definitions with citations", () => {
  const cards = buildFlashcards(passages);
  const pv = cards.find((card) => /present value/i.test(card.front));
  assert.ok(pv, "expected a present value card");
  assert.equal(pv.citation.page, 2);
  assert.match(pv.back, /current worth/);
  assert.doesNotMatch(pv.answer, /present value/i, "quiz answers shouldn't repeat the term");
  assert.ok(!cards.some((card) => /also falls when/i.test(card.front)), "non-definitions are skipped");
});

test("quiz questions have exactly one correct option among four", () => {
  const quiz = buildQuiz(buildFlashcards(passages), 4);
  assert.ok(quiz.length > 0);
  for (const question of quiz) {
    assert.equal(question.options.length, 4);
    assert.equal(new Set(question.options).size, 4);
    assert.ok(question.answer >= 0 && question.answer < 4);
  }
});

test("study guide and mind map follow the source topics", () => {
  const guide = buildStudyGuide([source], passages);
  assert.ok(guide.overview.length > 0);
  assert.ok(guide.sections.some((section) => section.title === "Present value"));
  const map = buildMindMap("FIN101", [source], passages);
  assert.equal(map.children[0].label, "Present value");
  assert.ok(keyTerms(passages).length > 0);
});

test("spaced repetition moves cards between boxes", () => {
  assert.deepEqual(nextReview(1, "good"), { box: 2, days: 1 });
  assert.deepEqual(nextReview(3, "easy"), { box: 5, days: 14 });
  assert.deepEqual(nextReview(4, "again"), { box: 1, days: 0 });
});
