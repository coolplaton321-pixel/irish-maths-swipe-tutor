# Plato Maths School

An iPad-friendly maths revision app for Irish Junior Cycle and Leaving Certificate students, published as `plato-maths-school`.

## Features

- Ten-question Higher Level Junior Cycle test, with five earlier questions archived for future restoration
- Thirty-question applied-arithmetic set: the original ten plus twenty harder, multi-step questions covering percentages, margins, changing balances, tax bands, ratios, rates, bills, bulk offers and budgets
- Separate Leaving Cert Differentiation button with ten ordered easy-to-medium questions: basic powers, negative and fractional powers, slope at a point, one limit-definition question, then product, quotient and chain rules. Each includes a worked solution, method and example; HL material is labelled.
- Problem text on question cards reduced by 20% at every responsive size, without shrinking solutions or controls
- Swipe-based self-assessment cards
- Worked methods, examples, key terms, and solutions
- Apple Pencil-ready working board
- Pressure-sensitive black, red, and blue pens
- Single-input Pencil lock that blocks palm and extra-finger touches while writing
- Eraser for correcting work
- Clear board button to erase all marks while keeping the selected drawing tool
- Immediate consecutive drawing strokes with palm rejection while writing
- Native Apple Pencil touch handling on iPad, with immediate lift-to-next-stroke release even while a palm remains on screen
- Top-left menu switching between Students and the existing Grinds workspace
- Jay's Junior Cycle Higher Level board with 48 topics across four strands
- Topic descriptions and grey, red, yellow and green knowledge ratings
- (HL) labels for topics containing Higher Level-only content, with the exact additions explained in each popup
- Fifteen working student profiles, with David first, Jay second and the others shuffled
- Mixed Junior Cycle and Leaving Cert exam labels, at Higher and Ordinary Level
- Separate saved ratings per student and curriculum-specific boards
- Leaving Certificate Higher Level board with 83 topics across all five syllabus strands; Ordinary Level boards omit HL-only rows
- Precise Leaving Cert (HL) distinctions, topic descriptions and syllabus-section links
- David's new Leaving Cert Higher Level profile, initially unassessed
- Junior Cycle demonstration ratings and Jay's saved colours are preserved
- Responsive landscape and portrait layouts

The application is a static website served with GitHub Pages at https://coolplaton321-pixel.github.io/plato-maths-school/. Run `npm ci` and `npm run build` to regenerate the committed, locally served Supabase browser client. Package versions and the lockfile are pinned; no external JavaScript CDN is used.

The board uses Pointer Events for mouse and other devices, and WebKit's stylus TouchEvents for Apple Pencil where available. Non-passive board touch handlers cancel native canvas gestures. Pencil and pointer streams are deduplicated, and a Pencil lift ends that stroke independently of any resting palm. Page-wide scrolling styles are not toggled between strokes, and late pointer-capture events cannot cancel the next Pencil stroke.

Open `#students/jay` for Jay's topic board, `#students` for the directory, or `#grinds` for the revision workspace. Every directory card opens its own board at `#students/<id>`. Grey means not assessed, red needs support, yellow developing and green confident. Ratings are teaching judgements, not exam grades.

## Private cloud colours

Student ratings use the separate **plato-maths-school** Supabase project (`iljziesnhngxpbcrjvww`, Ireland region). The existing finance/other-app project is untouched. Only this new project's `student_topic_ratings` table is used. A public publishable key is committed; no secret or service-role key is present in the website.

Choose **Teacher sign in** in Students, create an email/password account, verify the email, and use the same account on the computer and iPad. Passwords are sent directly to Supabase Auth, never saved by app code or to this repository. Supabase's default free mail service sends only to organisation-member email addresses. Other addresses need custom SMTP configured in this new project. The confirmation-link paste option verifies the original email link directly on this site, so setup still works without changing the project's default redirect settings. Alternatively, configure the Site URL and allowed redirects to `https://coolplaton321-pixel.github.io/plato-maths-school/` in this project's Auth URL Configuration. Email confirmations stay enabled.

Row-level security restricts SELECT, INSERT and UPDATE to the signed-in owner. Anonymous visitors, anonymous auth users and other accounts cannot access that owner's colours. The indexed composite primary key is `(owner_id, student_id, topic_id)`. Grey is an explicit persisted value, so resetting a topic also syncs. The versioned migration is in `supabase/migrations/`.

On first sign-in this browser's original student colours are imported into missing cloud rows only. Cloud values take priority and insert-or-ignore prevents a second device from overwriting them with new random presets. Browser imports are claimed by one account to avoid leaking local colours into a different account. Subsequent accounts receive independent starter profiles. Account-scoped local caches and pending-write queues are separate from the original guest keys. Signing out restores device-only colours.

Edits appear immediately and save in order, with an account-scoped offline queue and a visible sync status/retry button. Saved colours refresh when the tab returns to the foreground and every 30 seconds. Failed saves remain queued, never labelled cloud-saved. Signing out is blocked while unsynced changes remain. Until sign-in, the existing device-only behaviour remains available. Clearing browser data removes unsynced/device-only colours, but signed-in cloud colours can be restored by signing in again.

Jay keeps his original storage key. Junior Cycle demonstration profiles retain independently saved ratings. David appears first and Jay second; the remaining saved directory order is preserved. Leaving Cert profiles now use their own syllabus: Higher profiles have 83 rows; Ordinary profiles omit wholly HL-only rows and show shared content without HL additions. Old Junior Cycle ratings belonging to Leaving Cert-labelled profiles remain in their original local keys and cloud rows; they are not reinterpreted as Leaving Cert assessments. New Leaving Cert topics start grey.

Vladimir's historical 90%-green preset is retained in his original Junior Cycle data. His Leaving Cert board starts unassessed like the other migrated Leaving Cert profiles; old colours are not transferred between unrelated curricula.

The topic checklist follows the [NCCA Junior Cycle Mathematics learning outcomes](https://www.curriculumonline.ie/junior-cycle/junior-cycle-subjects/mathematics/expectations-for-students/), including Higher Level content. Basic arithmetic is assumed. Reasoning, communication and problem solving are practised across the checklist rather than treated as a separate content column.

The (HL) labels follow the bold additions on pages 15–20 of the NCCA specification. A label means the topic contains Higher Level-only content, not necessarily that the entire topic is absent from Ordinary Level. The popup distinguishes a wholly Higher Level topic from a shared topic with Higher Level additions. Stable topic IDs preserve previously saved ratings when a label or title changes.

## Leaving Certificate Boards

The Leaving Cert checklist uses the current [NCCA Mathematics syllabus for examinations from 2015](https://www.curriculumonline.ie/getmedia/f6f2e822-2b0c-461e-bcd4-dfcde6decc0c/SCSEC25_Maths_syllabus_examination-2015_English.pdf), not the 2026 consultation draft. See [the coverage audit](docs/leaving-cert-curriculum.md). Foundation Level is a separate course, not an OL/HL subset offered by these boards. `leaving-curriculum.js` holds the content and stable `lc-` identifiers; the existing rendering and rating controls are reused. Run `npm test` for syntax, coverage, level boundaries, storage isolation and cloud-pagination regression tests.

David appears at `#students/david` with unassessed topics grey. His colours now sync with the signed-in teacher's account. The `allow_david_student_ratings` migration adds David to the allowed student IDs without changing RLS or existing ratings. On sign-in or session restoration, his former account-scoped device key is imported into missing cloud rows; valid account-local colours take priority over guest colours, but never overwrite existing cloud rows. Other teachers' local keys are not imported. Original device keys remain intact. Existing student colours are paginated in batches of 500 to preserve results above the REST row limit.
