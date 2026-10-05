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

The application is a self-contained static website. Open `index.html` locally or serve it with GitHub Pages.

The board uses Pointer Events for mouse and other devices, and WebKit's stylus TouchEvents for Apple Pencil where available. Non-passive board touch handlers cancel native canvas gestures. Pencil and pointer streams are deduplicated, and a Pencil lift ends that stroke independently of any resting palm. Page-wide scrolling styles are not toggled between strokes, and late pointer-capture events cannot cancel the next Pencil stroke.

Open `#students/jay` for Jay's topic board, `#students` for the directory, or `#grinds` for the revision workspace. Every directory card opens its own board at `#students/<id>`. Grey means not assessed, red needs support, yellow developing and green confident. Ratings are teaching judgements, not exam grades. They survive refreshes on the same browser, but do not sync between devices and are removed if browser site data is cleared. No student ratings are published to the repository or sent to a server.

Jay keeps his original storage key. Other profiles start with random ratings generated on first opening and saved independently for each student. The shuffled directory order also persists in the browser, with Jay always pinned first. These demonstration profiles can be edited without changing Jay's ratings. Exam and year labels vary by student; this is a presentation-only change, and all topic boards still use the existing Junior Cycle Higher checklist, not exam-specific curricula.

Vladimir's 90%-green preset replaces his older random ratings once per browser. The updated preset preserves the 43 green topics from the previous version and makes the other five yellow. A saved preset version keeps subsequent manual edits intact on refresh; all other students' ratings are unchanged.

The topic checklist follows the [NCCA Junior Cycle Mathematics learning outcomes](https://www.curriculumonline.ie/junior-cycle/junior-cycle-subjects/mathematics/expectations-for-students/), including Higher Level content. Basic arithmetic is assumed. Reasoning, communication and problem solving are practised across the checklist rather than treated as a separate content column.

The (HL) labels follow the bold additions on pages 15–20 of the NCCA specification. A label means the topic contains Higher Level-only content, not necessarily that the entire topic is absent from Ordinary Level. The popup distinguishes a wholly Higher Level topic from a shared topic with Higher Level additions. Stable topic IDs preserve previously saved ratings when a label or title changes.
