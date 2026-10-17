# Study Spark

A responsive local study-planner prototype built with Next.js, TypeScript, and Tailwind CSS.

## Run locally

Requirements: Node.js 20.16+ (but below 21) or 22.3+ and npm. The PDF extraction dependency does not support Node 21.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The landing page provides sign-in and new-account setup, plus a guide to the app. The scratch account is intentionally empty:

- Email: `student@scratch.test`
- Password: `scratch123`

To get started, create a class with an exam date, open the class, upload a text-based PDF, and review the suggested topics. Study guides and planner sessions stay unavailable until there is a class with an exam date, a file, and at least one topic. Marking a topic complete updates My Progress; no sample lessons, streaks, quiz scores, or course progress are shown.

This is a local prototype, not production authentication: demo accounts, passwords, course data, and extracted text are stored in browser storage on this device only. Do not use real passwords or sensitive personal information. The original PDFs are processed for text extraction and then discarded. No external API keys are required.

To configure future integrations, copy `.env.example` to `.env.local` and add credentials there. Do not put secrets in browser code or commit `.env.local`.

## Current scope

The app includes a sign-in/new-account landing page with product and navigation guidance; Overview, My courses, Study planner, Study guides, and My progress views; a responsive sidebar; theme toggle; course creation with required exam date and daily study time; browser read-aloud; and local demo persistence.

Course details let you upload text-based PDFs (up to 5 MB and 100 pages), extract selectable text on the server, review the extracted text, and add/edit/remove topic suggestions with source filename/page references. Invalid, empty, scanned, or unsupported documents receive clear errors. Extracted text and course data stay in browser local storage, not cloud storage. Topic suggestions come from simple heading/repeated-phrase heuristics, not AI, and should be checked by the student. Study guides use uploaded excerpts and are self-study prompts, not AI-generated instruction; topic completion is a self-check and is not graded.

Live AI, OCR, generated quizzes, cloud persistence, and production authentication are not implemented. The planner creates simple topic sessions between today and the exam date; it does not account for conflicts or calendar availability. See [TASKS.md](./TASKS.md) for the development checklist and setup requirements.

## Startup 48 college classroom demo

The student workspace now includes a **Join class** action on the overview and My courses screens. Enter `FIN101` to enroll the current local demo account in a sample **Introduction to Finance** class. Open the class card to see the instructor's current Time Value of Money unit, next-quiz countdown, four ordered lesson objectives, and personalized explanations and practice. Lesson mastery is recorded separately for each demo account in browser localStorage. Different accounts with different onboarding choices see different lesson presentations.

This is a **simulated institutional workflow**, not a real Canvas integration: the class code is hard-coded, the professor, objectives and quiz date are illustrative, and the personalization is rules-based (not an AI-generated adaptive diagnostic). Existing manual class creation, PDF upload, planner, and study guides remain available.

### Expanded finance lessons (Startup 48 demo)

Join `FIN101`, then select **Start lesson**. Each lesson now opens a dedicated full-page learning workspace with four sections: concept explanation, guided example, four- or six-question practice, and written application/reflection. The layout and practice language respond to the student's saved onboarding preferences. The study-time target is apportioned across sections, and an elapsed timer is shown; this is an **estimate, not a forced minimum**. Students must answer at least 75% of practice questions correctly (rounded up) and submit a 30-character reflection to mark the lesson mastered. Completion is stored locally per demo account.

This is structured, rules-based sample content, not AI-generated instruction, live instructor content, or a validated guarantee that every learner spends the target minutes. No real student records should be used in this demo.

## Judge demo and Study Night

Select **Experience the demo** on the public landing page. Six guided chapters cover demo student signup, all 11 personalization questions, FIN101 enrollment, a lesson that uses those preferences, class-event creation with invitation previews and two playable games, and a sourced competitor comparison. The walkthrough uses a separate per-run demo account namespace. See [STUDENT_DEMO_GUIDE.md](STUDENT_DEMO_GUIDE.md).

`/study-night` is the public multiplayer entry point. It supports room codes and invite links, individual or alternating Purple/Gold teams, 30-second questions, host-controlled reveals, leaderboards, and personal missed-question review. Hosts can use an eight-question shuffled FIN101 sample deck or write 3–12 questions with four distinct choices, explanations, and optional source references. This does not generate quizzes from PDFs or use AI. Rooms support 12 players and expire four hours after creation; closing the page does not remove a player from the room. Hosts should keep their session open or return in the same tab.

Live rooms require an Upstash Redis REST database connected through Vercel. Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (the Vercel integration's `KV_REST_API_URL` / `KV_REST_API_TOKEN` names are also supported). These are server-only secrets and must never be committed. Without configuration, shared-room controls stay disabled while solo warm-up and the judge preview remain playable. Database provisioning requires the owner's provider agreement; use the free plan with automatic paid upgrades disabled. Do not use temporary in-memory storage for production rooms.

Room sessions use per-player random bearer tokens in browser session storage. The API hides answer keys until reveal, validates host actions and question indices, rejects duplicate/late answers, and uses atomic Redis compare-and-set updates so simultaneous submissions are preserved. Creation/join attempts are limited per IP. Rooms store nicknames and quiz content, not school account credentials or uploaded PDFs. This is an early prototype, not institutional authentication.

Run game-domain regression tests with Node.js 24: `node --experimental-strip-types --test tests/study-night.test.mjs`.

## College-focused demo and adaptive sample plan

The public landing page positions StudySpark as college-funded learning support. The student walkthrough demonstrates the intended college-supported experience. Signup, enrollment, class rosters, and invitations are simulations; Canvas/SSO are future integrations. The existing student prototype remains available through **Student prototype**.

Onboarding captures study habits, goals/motivation, self-reported reading comfort, and reading/writing support preferences. Plain-language/key-idea bridges, sentence starters/outlines, brief/detailed explanations, progressive worked steps, hints, recall-before-choices, and scenario practice have concrete effects in sample lessons. Preferences are not validated reading/writing assessments.

The diagnostic scores two prepared questions per sample objective. Transparent rules prioritize weaker topics, shorten stronger-topic sessions, add foundation support or application practice, and pack sessions within the daily time budget. Completing a lesson moves it to review. Individual data still saves locally. Uploading arbitrary materials does not generate AI lessons; the new public-demo PDF widget demonstrates extraction only.

See [PRODUCT_ALIGNMENT.md](./PRODUCT_ALIGNMENT.md) for the complete requirements audit, competitive research, proposed institutional pilot approach, and customer-discovery questions. Run both regression suites with Node.js 24: `node --experimental-strip-types --test tests/*.test.mjs`.

## v1.2: real accounts and shared data (branch `main-v1.2`)

v1.2 runs on a Supabase database, so students and professors use real accounts from any device.

- **Sign in:** on the home page choose **I'm a student** or **I'm a professor**. Both can create accounts. Demo accounts: `student@scratch.test` / `scratch123` and `professor@scratch.test` / `teach123` (they must be created once with the New user / New professor tabs).
- **Professors** create classes with their own join code (choose the built-in Finance: Time Value of Money lessons or start empty), assign coursework, add objectives or import them from a syllabus PDF, and see each student's study time, check-in results, practice answers, hints, reflections and assignment status. They can message students in the app, get read receipts, keep private notes, see alerts and a weekly summary, and export a CSV.
- **Students** join with the class code, take the 8-question starting-point check that reorders their lesson plan, work through lessons with hints, and see professor assignments, messages, a weekly goal and streak. Their own classes, PDFs and topics are saved to their account too.
- **Privacy:** row level security in `supabase/migrations` lets students see only their own work and professors only students in their classes.
- **Setup for a new environment:** the app has the project URL and public (publishable) key built in, and also reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Database changes live in `supabase/migrations` (`supabase db push`).
- Email confirmation is turned off in the Supabase project for the demo, so new accounts work immediately. Turn it back on in Supabase → Authentication before real students use it.

### AI assistant ("Ask Spark")

Students get a lesson tutor inside every lesson and on their class page. It follows their learning profile, explains, gives hints and makes practice examples, and is instructed never to give answers to practice or graded work or write work students submit. Professors get a class assistant on the Class overview that answers from their class's data (progress, study time, practice results, check-ins) and drafts messages to review before sending.

- Runs as the Supabase Edge Function `supabase/functions/assistant` using Claude (`claude-opus-5-5`) with the official Anthropic SDK. Each request runs as the signed-in user, so row level security limits what it can read; professors only get their own classes.
- Daily limits: 40 questions per student, 60 per professor (`assistant_usage` table; no message content is stored).
- **Turn it on:** create an API key at console.anthropic.com, then run `supabase secrets set ANTHROPIC_API_KEY=your-key` from this folder. No redeploy or Vercel setting is needed. Until then the panels say the assistant isn't set up yet.
- Redeploy after editing the function: `supabase functions deploy assistant --use-api --no-verify-jwt` (the function checks the user's sign-in itself).

### Relationship to `main`

This branch includes everything on `main` as of commit `e0eb4de` (guided judge demo, Study Night, college landing page, starting-point check, expanded onboarding and lessons). The judge walkthrough keeps running locally with no account (`DemoFinanceClass`); signed-in students use the same lessons with progress saved to their account. `main` itself is not changed by this branch.


## v1.3: Course Notebook (branch `main-v1.3`)

v1.3 builds on v1.2 and adds a **Course Notebook** to every class: a NotebookLM-style study space built around the class, so it knows the professor's sources, objectives and students.

- **Sources:** professors add shared class sources (PDF upload, or **Add a sample FIN101 reading**); students see those and can add their own private PDFs. Each source can be switched on or off.
- **Ask:** searches the sources and returns the most relevant passages with the file and page cited. Clicking a citation opens the reader at that page. Passages can be saved to notes.
- **Study guide:** organized by the class objectives, with key points cited by page.
- **Flashcards:** built from definitions in the sources, with spaced repetition. Students' progress is saved and shows up for the professor.
- **Quiz:** 8 multiple-choice questions from the sources; results are recorded for the professor.
- **Mind map:** topics and key terms; click a topic to ask about it.
- **Audio overview:** a spoken summary read by the browser (play, pause, speed) with a transcript.
- **Notes:** saved to the student's account.
- **Professors** open it from **Course notebook** in the portal. A student's drawer shows their notebook flashcards and quiz results.

Everything above works without an AI key. With the key set (see "Turn it on" above), three extras turn on through the same `assistant` function: AI-written answers grounded in the cited passages, an AI-rewritten study guide, and a two-host podcast episode. The search, cards, quizzes and guides come from `src/lib/notebook.ts` (tests in `tests/notebook.test.mjs`); the tables are in `supabase/migrations/20261018150000_course_notebook.sql`.
