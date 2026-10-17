# Study Spark — Development checklist

## Phase 1: Foundation
- [x] Create a Next.js App Router project with TypeScript and Tailwind CSS.
- [x] Build responsive app navigation and dashboard, course, planner, tutor, and progress views.
- [x] Add a clearly labeled local demo mode and persist demo courses/lesson completion in browser storage.
- [x] Add light/dark theme toggle and accessible responsive navigation.
- [x] Provide environment variable example and local launch instructions.
- [x] Install dependencies and verify the production build.

## Phase 2: Core AI workflow
- [x] Add course document upload and server-side PDF text extraction.
- [x] Handle invalid, empty, oversized, and scanned PDFs clearly.
- [x] Identify and edit document-derived topic suggestions, including filename and page references.
- [ ] Add server-side structured AI services with input validation and cost limits.

## Phase 3: Interactive tutoring
- [ ] Persist lesson outlines and steps generated from course content.
- [ ] Add contextual tutor questions and structured, grounded answers.
- [ ] Add hint behavior that does not reveal practice answers.
- [ ] Track lesson completion and recommend the next lesson.

## Phase 4: Study planner
- [x] Add course setup for exam date, description, daily study time, and optional target grade.
- [ ] Build and test deterministic daily scheduling and overload handling.
- [ ] Rebalance sessions using topic difficulty, lesson completion, and mastery estimates.

## Phase 5: Adaptive quizzes
- [ ] Generate source-grounded multiple-choice and short-answer questions.
- [ ] Grade multiple choice deterministically and short answers with structured feedback.
- [ ] Save attempts, show per-topic results, and update transparent mastery estimates.
- [ ] Add automated tests for scoring and scheduling.

## Phase 6: Optional voice
- [ ] Add speech controls for lesson read-aloud.
- [ ] Add browser speech recognition with permission checks and a text fallback.

## Phase 7: Polish and deployment
- [ ] Connect Supabase persistence and optional authentication with per-user data access.
- [ ] Add end-to-end critical-flow tests and Vercel deployment configuration.
- [ ] Review mobile accessibility, loading/error states, and production security.

## Setup needed
- **Now:** Node.js 20.16+ (below 21) or 22.3+ and npm. No external credentials are needed to run the foundation/demo.
- **Later:** An OpenAI API key for live AI features; Supabase project URL and anon key for cloud persistence/auth.
- Credentials belong in a local `.env.local` file and must never be committed. `.env.example` lists the planned server configuration.

## Current demo limitations
- Demo data is stored only in this browser on this device; it is not cloud-synced.
- The prebuilt lesson and dashboard metrics are sample content, not live AI-generated output.
- Uploaded PDF text and topics are stored in this browser only; original PDF bytes are not retained.
- Topic suggestions use heading/repeated-phrase heuristics, not AI; verify and edit them.
- OCR for scanned PDFs, live AI, generated quizzes, deterministic scheduling, and Supabase persistence are not connected yet.
