# Irish Maths Swipe Tutor

An iPad-friendly maths revision app for Irish Junior Cycle and Leaving Certificate students.

## Features

- Ten-question Higher Level Junior Cycle test, with five earlier questions archived for future restoration
- Separate ten-question applied-arithmetic test covering real-world percentage, ratio, rate, currency, fuel, and wage problems
- Swipe-based self-assessment cards
- Worked methods, examples, key terms, and solutions
- Apple Pencil-ready working board
- Pressure-sensitive black, red, and blue pens
- Single-input Pencil lock that blocks palm and extra-finger touches while writing
- Eraser for correcting work
- Clear board button to erase all marks while keeping the selected drawing tool
- Immediate consecutive drawing strokes with palm rejection while writing
- Top-left menu switching between Students and the existing Grinds workspace
- Jay's Junior Cycle Higher Level board with 48 topics across four strands
- Topic descriptions and grey, red, yellow and green knowledge ratings
- (HL) labels for topics containing Higher Level-only content, with the exact additions explained in each popup
- Fourteen working student profiles, with Jay first and the others shuffled
- Mixed Junior Cycle and Leaving Cert exam labels, at Higher and Ordinary Level
- Separate saved ratings per student; all profiles currently use the Junior Cycle Higher Level board
- Random sample ratings for the thirteen demo students; Jay's ratings are preserved
- Responsive landscape and portrait layouts

The application is a self-contained static website. Open `index.html` locally or serve it with GitHub Pages.

Open `#students/jay` for Jay's topic board, `#students` for the directory, or `#grinds` for the revision workspace. Every directory card opens its own board at `#students/<id>`. Grey means not assessed, red needs support, yellow developing and green confident. Ratings are teaching judgements, not exam grades. They survive refreshes on the same browser, but do not sync between devices and are removed if browser site data is cleared. No student ratings are published to the repository or sent to a server.

Jay keeps his original storage key. Other profiles start with random ratings generated on first opening and saved independently for each student. The shuffled directory order also persists in the browser, with Jay always pinned first. These demonstration profiles can be edited without changing Jay's ratings. Exam and year labels vary by student; this is a presentation-only change, and all topic boards still use the existing Junior Cycle Higher checklist, not exam-specific curricula.

The topic checklist follows the [NCCA Junior Cycle Mathematics learning outcomes](https://www.curriculumonline.ie/junior-cycle/junior-cycle-subjects/mathematics/expectations-for-students/), including Higher Level content. Basic arithmetic is assumed. Reasoning, communication and problem solving are practised across the checklist rather than treated as a separate content column.

The (HL) labels follow the bold additions on pages 15–20 of the NCCA specification. A label means the topic contains Higher Level-only content, not necessarily that the entire topic is absent from Ordinary Level. The popup distinguishes a wholly Higher Level topic from a shared topic with Higher Level additions. Stable topic IDs preserve previously saved ratings when a label or title changes.
