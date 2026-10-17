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

Join `FIN101`, then select **Start lesson**. Each lesson now opens a dedicated full-page learning workspace with four sections: concept explanation, guided example, four-question practice, and written application/reflection. The layout and practice language respond to the student's saved onboarding preferences. The study-time target is apportioned across sections, and an elapsed timer is shown; this is an **estimate, not a forced minimum**. Students must answer at least three of four practice questions correctly and submit a 30-character reflection to mark the lesson mastered. Completion is stored locally per demo account.

This is structured, rules-based sample content, not AI-generated instruction, live instructor content, or a validated guarantee that every learner spends the target minutes. No real student records should be used in this demo.
