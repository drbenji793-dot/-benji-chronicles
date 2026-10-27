# Benji Chronicles

An independent, lightweight shared writing room by Benji Ink. Public access is intentional. The only story is A Fracture in Time / شرخ زمني, with 55 chapters per language.

## Hosting

Vercel project: benji-chronicles
Project ID: prj_eAFrbUy7wAdZsUTAKmpxzuhru2ct
Production: https://benji-chronicles.vercel.app
Static output: public
Deploy the checked-in public directory. Build and install commands can remain empty. To rebuild JavaScript: npm install, then npm run build. Dependencies are pinned.

## Data

Supabase project: jrpchxdaylhdkkxbtump
The chronicles_chapters, chronicles_versions, and chronicles_notes tables are independent copies and never write to ink_entries. Only a publishable key is used by the client. No sign in is required; names are self-selected labels, not verified identities.

Original import: 110 chapter records, copied verbatim from story 12. The original database checksum stayed unchanged. db/schema.sql records the applied one-time schema and import; do not rerun it against the existing project.

Saves use revision-conditioned PATCH requests and return the saved record. Database triggers increment revisions and create history atomically. Stale saves affect zero rows and leave the draft on the device. History can be restored as a draft, preserving later revisions. Notes are additive. Text is sanitized before rendering and saving.

## Features

Single story card, Arabic and English switching, chapter navigation, protected reading mode, editing and save, chapter notes with writer labels, version history, local draft recovery, copy, print chapter, print current language, adjustable text size, explicit refresh, mobile layout, and home-screen icon.

## Verification

110 imported chapters matched their source title and body exactly. Anonymous database save, history insertion, stale-write rejection, and notes insertion passed in a rolled-back transaction. Live browser confirmed chapter loading, English left alignment, Arabic right alignment, save/protected behavior and version history. A 390px iframe viewport verified the responsive layout, no horizontal overflow, and Arabic mobile editing. Simulated stale-save and network-failure tests confirmed draft retention. English chapter 1 was saved unchanged once to verify the UI save flow.

## GitHub

Source repository: https://github.com/drbenji793-dot/-benji-chronicles
The repository is public. The existing Vercel project serves the public directory. Chapter edits are stored in Supabase; GitHub tracks the website code.


## Arabic collaboration update
Chronicles displays only Arabic chapters. Existing English records remain untouched.
Writer labels are self selected, with an Add friend option. Saved names also appear from existing history and notes. These labels are attribution, not verified identities.
The contribution history compares adjacent saved versions, highlighting added and removed text. Initial imported versions have no prior comparison. Formatting only changes can be read in the version preview.
Apply only the incremental migration in `supabase/migrations/20261021223017_chronicles_collaborator_names.sql` when upgrading an existing deployment. Never rerun `db/schema.sql` on an existing database.


## New books in Chronicles (October 22, 2026)

The Chronicles bookshelf has a compact `＋ كتاب جديد · New Book` button above the original *شرخ زمني* card. New books are Arabic writing spaces with a primary writer (Benji or Ahmed), individual or shared mode, and editable book specific rules inherited from the Global `_zkalam4` principles. Each new book has its own chapter list, notes, and immutable revision history. Writers can open Book Rules, add chapters, edit, save, review history, and recover unsaved local drafts. All book editing uses revision conditioned updates to prevent silent overwrites. The new routes `#book=<uuid>`, `#book=<uuid>&rules=1`, and `#book=<uuid>&chapter=N` participate in browser history and swipe navigation.

New work is stored separately in `chronicles_books`, `chronicles_book_entries`, `chronicles_book_versions`, and `chronicles_book_notes`. The migration named `chronicles_multi_book_library` was applied to the connected Supabase project, with row level security and public access matching the existing no sign in policy. `chronicles_create_book` creates a book and a rules entry atomically. The original 110 chapter records, their history, and Benji Ink books are unchanged. Original references, character guides, and PDF/HTML export continue to belong to *شرخ زمني*. A new book is not automatically exported through the original story export menu.

Access warning: anyone with the public site link can create or edit a book, because the user explicitly chose a no sign in collaboration space. Writer labels are self selected, not authenticated identities.

Verification: an anonymous role transaction successfully created a book and initial book rules, inserted a chapter, saved its revision, and recorded the revision history. The test transaction was rolled back. The original chapter checksum was compared before and after and was unchanged. The Vercel production deployment built successfully.

Reader v105 collection planning

Arabic stories 1, 2 and 3 use the shared DSL and Story Blender with independent
planning identities from src/collection-workspace.js. Apply the idempotent data
seed db/collection-planning-v105.sql before deployment. These chronicles_books
rows are planning containers, excluded from additional book cards. Chapters stay
in chronicles_chapters and chapter routes remain #story=N&lang=ar&chapter=M.
No manuscript or resource is copied, moved or overwritten. Storyline notes remain
available from the DSL footer; Characters, References and Book Rules retain their
existing revision protected resource editors. Run node tests/collection-planning.mjs
for route, toolbar, save isolation and original chapter link verification.

Reader v106 extends the same planning controls to Arabic stories 4, 5 and 6.
Apply db/collection-planning-v106.sql once. The shared regression now covers
all six story workspaces and their independent planning saves.

Reader v107 adds scene grips for desktop drag and touch hold, plus an accessible
Move dialog for precise placement and new year columns. Moves save only the active
DSL branch through the existing revision guard and history. Moving within a year
changes reading order; moving to another year requires date review and clears any
old exact date. Source chapter IDs, revisions and connections stay attached. The
map groups years and displays the chosen order inside each column. Published
Storyline snapshots still require Preview and Publish. No manuscript migration.
Validate with node tests/scene-moves.mjs and the existing collection/Blender tests.

Reader v108 pilots a Contents tab in Arabic story 1 (قطار الليل). It reads fresh
chapter metadata on each visit and provides book style dotted chapter listings,
planning shortcuts, supporting material and direct Story Blender navigation.
Chapter numbers are used rather than invented page numbers. No database writes
or manuscript changes are required. Other stories keep their existing tabs.

Reader v109 extends Contents to all six developed Arabic stories. Each visit reads
that story’s fresh chapter metadata. Contents and supporting links remain scoped
to the selected story. No database writes or manuscript changes.

Reader v110 adds Contents to the separate خارج الزمن navigation and renders its
fresh independent book chapters grouped by saved parts. Empty parts are labelled;
planned chapters are not invented. Rules, guide and DSL links use the book UUID.
The six numbered stories keep their Contents tabs. No database writes.

Reader v111 adds the transparent red Harsh Critique control to the six developed
stories, Outside Time and independent English books. Reports retain English and
Arabic text, source chapter revision fingerprints and stale labels. Manual review
brief export and saved critique drafts do not imply an automatic AI service.
Report saves use the planning branch revision guard and never edit prose.
Independent English books also expose Contents, Storyline, DSL and References.
Templates and the adaptation queue are downloadable under public/templates.
Run node tests/critique.mjs plus the Contents, book and planning regression checks.

Reader v112 gives The Night Train to Bellwether a generated illustrated cover,
matching the existing library cards, and reuses it on the book entrance. Chapter
count is read from saved chapter metadata. Existing shelf controls and book tools
remain attached to the same book UUID. No manuscript or database writes.
