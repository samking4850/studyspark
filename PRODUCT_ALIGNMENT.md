# StudySpark: college-focused product alignment

Updated October 17, 2026. This is a prototype plan, not a claim of institutional deployment or measured learning impact.

## Product and customer

StudySpark helps colleges turn instructor-defined course objectives and materials into a clear next study session, active practice, and feedback that informs the next session. Students use it; colleges fund access. The initial buyer is a faculty-backed department or academic-success program, with institutional technology and procurement stakeholders involved before a live school deployment.

Start as an add-on to the existing course workflow. Canvas replacement is outside the initial scope. The public site now leads with the college buyer, an interactive campus demo, and course/department/campus pilot scopes. No student subscription, student checkout, invented ROI, fabricated testimonials, or unverified partnership claim is presented.

## Notes compared with the implementation

| Requirement | Current implementation | Remaining dependency or boundary |
|---|---|---|
| One-click school access | Clearly labeled demo school-email signup; Canvas/SSO described as planned | Institution-approved identity/LTI integration. No school password is collected; a university email alone is not verified enrollment. |
| Materials by upload/drag-and-drop | Working text-based PDF extraction in course details and the public demo | Slides, notes, syllabus, or permitted textbook excerpts must currently be PDFs. Native PowerPoint/Word, scans/OCR, and automatic course import are not supported. |
| Goals, motivation, habits | Expanded onboarding captures all three; motivation appears in lessons | No validated inference about a student's motivation or behavior. |
| Reading/writing support | Self-reported reading comfort plus preferences for plain language, key ideas, sentence starters, and outlines; lesson support follows those choices | Not a literacy, disability, reading-level, or writing-ability assessment. |
| Instructor learning targets | Explicit prepared FIN101 objectives drive its diagnostic and lessons | Real instructor authoring/approval is separate work; the team's existing professor-portal branch is not merged by this change. |
| Diagnostic knowledge check | Eight prepared questions, two per FIN101 objective; results save per local account | This small sample is a starting-point check, not a validated mastery or literacy assessment. |
| Personalized plan | Weak topics first; session length and support depend on topic results and time budget | Transparent rules over the sample course, not AI-generated plans from arbitrary uploads. |
| Explanation / practice preferences | Brief mode shortens the core explanation; detailed mode adds context/formula/common mistakes; step-by-step reveals progressive steps; real-world starts with a scenario. Hints, recall-before-choices, scenario questions, and practice points follow the selected practice preference | Prepared variants, not a uniquely generated curriculum or proof of a fixed learning style. |
| Supplemental learning | Weak topic results add a foundation bridge; strong results add application questions | Content is prepared and bounded to FIN101. |
| Automatic plan updates | Passing lesson practice and reflection moves the topic into review and reprioritizes unfinished topics | No automatic generalization to other courses; no spaced-retention model yet. |
| Academic integrity | Practice-only context, attempt before feedback, no homework-answer chat or graded-work generation endpoint | Cannot guarantee prevention of cheating. Institutional policies and instructor-defined assessment boundaries remain necessary. |
| Study Night | Trivia, individual/team rooms, host-written questions, explanations, missed-question review, and a clearly simulated judge preview | The walkthrough includes playable local Word Wheel and Category Quest games plus simulated class invitations. Production shared rooms still require the approved Redis setup/provider terms; actual event delivery and roster integration are not connected. |
| Hosting | GitHub main deploys to Vercel | Already working; do not duplicate the repository or hosting project. |
| Backend / school records | Current accounts and individual progress are browser-local | Choose and configure institutional identity, durable student records, roles, permissions, and appropriate data handling before a real pilot. Supabase is an option, not currently connected. |
| AI generation | Prepared content demonstrates the intended learning loop | Model selection, grounded generation, quality evaluation, cost controls, and provider credentials are not connected. A quoted subscription amount does not establish API pricing or budget. |
| Pricing and payment | Proposed course pilot, department, and campus licensing scopes | Validate buyer, budget, contract term, delivery/support scope. Payment processing follows a real institutional commercial agreement. |
| Institutional evidence | The site describes pilot measures rather than inventing results | Obtain permission and evidence before publishing testimonials, student outcomes, or college logos. |

## Competitive research and pushback

- **ALEKS / McGraw Hill:** knowledge checks already update adaptive learning, and Canvas integration already exists. Adaptation plus LMS access is not unique. [Knowledge checks](https://www.mheducation.com/highered/support/support-at-every-step/aleks/assignments.html), [Canvas setup](https://www.mheducation.com/highered/support/support-at-every-step/aleks/course-setup/syncing-aleks-canvas.html).
- **Pearson:** MyLab, Mastering, and Revel already have LMS integrations, including Canvas. A generic "Canvas add-on" is a distribution approach, not a defensible differentiation by itself. [Pearson integration services](https://www.pearson.com/en-us/higher-education/educators/digital-learning-platforms/lms-integration-services.html).
- **Khanmigo:** guided tutoring rather than simply supplying answers is also an existing approach. Learning-first guardrails are necessary product behavior, not an exclusive invention. [Khan Academy](https://www.khanacademy.org/khan-labs).
- **StudySpark's positioning hypothesis:** bring instructor-owned course context, actionable short study sessions, evidence-driven support, and collaborative review into one loop across the materials a course actually uses. Validate this with buyers rather than claiming no competitor does it.

Canvas supports external-tool launches through LTI, including LTI 1.3. Integration needs a real institutional setup, permissions, and testing; it is not established by drawing a Canvas-style screen. Partner discovery/marketplace participation also does not guarantee a purchase. [Canvas external-tool documentation](https://dhs.instructure.com/doc/api/file.tools_intro.html), [Instructure partner program](https://www.instructure.com/partners).

## Recommended pilot and business model

1. Interview faculty and an academic-success buyer about one specific course problem before promising an institution-wide rollout.
2. Agree on the course, sample size, faculty owner, evaluation period, material permissions, and technical/accessibility/data requirements.
3. Offer a limited, explicitly scoped evaluation; free access can support discovery, but must have an end date and a decision point. Do not promise a paid conversion or testimonial in return for an outcome.
4. Measure activation, repeat practice, change on instructor-approved checks, and faculty workload. Interpret improvement cautiously; a small pilot alone does not establish causation or retention impact.
5. Use the findings to scope a paid departmental pilot or annual institutional license. Avoid arbitrary pricing tiers disconnected from implementation, support, and inference costs.

## Customer discovery interview guide

For faculty:
- Where do students most often get stuck between receiving materials and demonstrating understanding?
- What evidence tells you a student needs more support, and when do you receive it?
- Which learning targets and materials could a pilot use with your permission?
- What assistance would cross the line into doing assessed work for a student?
- How much setup or weekly oversight could you realistically provide?

For college buyers / academic-success and technology staff:
- Who owns this problem, approves the budget, and signs off on a pilot?
- What do your existing LMS, publisher products, and tutoring services already solve?
- Which gap remains, and what would justify paying to close it?
- What identity, Canvas, accessibility, security, data, and support reviews are required?
- What specific pilot result would support a purchase decision? What would rule it out?

For students (users, not buyers):
- Walk through the last time you studied for this course. How did you choose what to do?
- Show an example of when reading notes did not translate into solving a problem.
- When would a short guided session be useful? When would it get in your way?
- Would a study night help you show up, and what would make it feel unhelpful or stressful?
- After trying the demo, explain what you would work on next and why.

Do not collect sensitive student records for discovery. Ask permission before recording or publishing quotes. These are prepared questions; no interviews or outreach have been sent.

## Judge demo sequence

1. **Student signup:** create a clearly labeled demo student identity without a password or real account.
2. **Personalize:** complete all 11 questions, including goals, explanation/practice preferences, reading comfort/support, writing support, motivation, and time.
3. **Join a class:** enroll in sample FIN101 and see instructor learning objectives. PDF extraction remains available.
4. **Start learning:** inspect the preference summary, open an actual lesson, and show how explanations, practice, and support change. The diagnostic remains available in the class.
5. **Class study event:** create an event, preview classmate invitations, and play Word Wheel or Category Quest. Roster and invitations are simulated; games run locally.
6. **Why StudySpark:** show sourced competitor comparisons, the proposed institutional learning loop, and explicit working-versus-future capabilities.

## Additional implemented prototypes

Turner's schools landing page is available at `/schools`. The instructor publishing and student review loop is integrated at `/instructor-demo` and `/learning-demo`: published lesson versions feed the student lesson, wrong answers generate prepared follow-up practice, and missed questions populate an individual review queue. These records remain local to the browser; teacher roles are not authenticated.

The FIN101 class common room at `/community` supports course questions, threaded replies, study get-togethers, attendance, and invitation links. A browser-only preview is available without a backend. Shared spaces require the Redis integration and provider setup; they use nickname membership rather than verified enrollment, and expire after 30 days. This adds a place to coordinate studying alongside the games without claiming Canvas, university identity, email delivery, or production moderation.

## Final judging release, October 17, 2026

The public judge demo remains the final rehearsal release, as selected by the user. The separate main-v1.2 and main-v1.3 team branches remain separate releases. The landing page and school-pilot page now target private colleges and independent high schools, including potential educator-led design partnerships for individualized learning support. Private purchasing authority and specialty-school demand remain hypotheses to validate. The 50-response college survey supports student-problem statements, not learning outcomes or buyer demand.

Use `/demo` for a direct fresh guided walkthrough. Local student/instructor records and prepared lessons remain clearly distinguished from connected nickname-based discussions and live trivia. School identity, verified enrollment, Canvas integration, institutional records, and AI-generated lessons remain outside this final public demonstration. `/schools` creates a downloadable pilot brief instead of implying a registration was submitted. The free Redis integration is now connected with automatic paid upgrades disabled.
