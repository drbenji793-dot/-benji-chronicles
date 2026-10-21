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
