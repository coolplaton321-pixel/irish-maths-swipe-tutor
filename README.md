# Plato Maths School

An iPad-friendly maths revision app for Irish Junior Cycle and Leaving Certificate students, published as `plato-maths-school`.

## Features

- Ten-question Higher Level Junior Cycle test, with five earlier questions archived for future restoration
- Thirty-question applied-arithmetic set: the original ten plus twenty harder, multi-step questions covering percentages, margins, changing balances, tax bands, ratios, rates, bills, bulk offers and budgets
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
- Fourteen working student profiles, with Jay first and the others shuffled
- Mixed Junior Cycle and Leaving Cert exam labels, at Higher and Ordinary Level
- Separate saved ratings per student; all profiles currently use the Junior Cycle Higher Level board
- Random initial ratings for other students, with Vladimir set to 43 of 48 topics green (89.6%) and the remaining five yellow; Jay's ratings are preserved
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

Jay keeps his original storage key. Other profiles start with random ratings generated on first opening and saved independently for each student. The shuffled directory order also persists in the browser, with Jay always pinned first. These demonstration profiles can be edited without changing Jay's ratings. Exam and year labels vary by student; this is a presentation-only change, and all topic boards still use the existing Junior Cycle Higher checklist, not exam-specific curricula.

Vladimir's 90%-green preset replaces his older random ratings once per browser. The updated preset preserves the 43 green topics from the previous version and makes the other five yellow. A saved preset version keeps subsequent manual edits intact on refresh; all other students' ratings are unchanged.

The topic checklist follows the [NCCA Junior Cycle Mathematics learning outcomes](https://www.curriculumonline.ie/junior-cycle/junior-cycle-subjects/mathematics/expectations-for-students/), including Higher Level content. Basic arithmetic is assumed. Reasoning, communication and problem solving are practised across the checklist rather than treated as a separate content column.

The (HL) labels follow the bold additions on pages 15–20 of the NCCA specification. A label means the topic contains Higher Level-only content, not necessarily that the entire topic is absent from Ordinary Level. The popup distinguishes a wholly Higher Level topic from a shared topic with Higher Level additions. Stable topic IDs preserve previously saved ratings when a label or title changes.
