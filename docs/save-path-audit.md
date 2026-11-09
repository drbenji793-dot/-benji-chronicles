# Chronicles save path audit

Scope: Arabic and English Chronicles. Starting live release v187, commit
03706aad333d5a9902f2af8954c0cd1cc847c0e0. HQ and SCP are excluded.

## Checked paths

| Path | Concurrency protection | Record and recovery | Result |
| --- | --- | --- | --- |
| Original chapter text | ID + source revision PATCH | Database revision and history triggers | Existing guard confirmed |
| Independent chapter text and book rules | ID + source revision PATCH | Database entry stamp and archive | Existing guard confirmed |
| Chapter rename | ID + source revision PATCH | Same chapter history | Existing guard confirmed |
| Part rename | ID + source revision PATCH | Database part stamp | Guard confirmed; separate part recovery history remains to audit |
| Chapter insertion | RPC expected chapter count | Existing RPC | RPC integration tests pass; broader server audit remains |
| Shelf order | RPC expected revision | Existing shelf order record | Existing guard confirmed |
| Name bank | ID + revision PATCH | Database stamp and archive | Existing guard confirmed |
| Story resource | RPC expected revision | Resource history | Existing guard confirmed |
| Planning and Story World | Book + branch + revision PATCH | Shared update record, database history | Implemented in v186 |
| Critique report | Book + branch + revision PATCH | Now uses shared update record and branch history | Fixed in v188 |
| Book rename, Trash, Restore | Book key + revision PATCH; plain INSERT for first record | New database stamps and private previous/current snapshots | Fixed in v188 |
| Related work | Book ID + revision PATCH | New database stamps and private recovery | Fixed in v188; retired UI stays retired |
| Note Resolve and Reopen | Entry + note ID + revision + prior resolution state | New database stamps and private recovery | Upgraded in v188; catches resolve/reopen cycles |
| New notes | INSERT; original source revision retained where supplied | Original created time; new notes get metadata via trigger | No overwrite operation |
| Approval and transfer | RPC explicit chapter/target revision | Existing workflow record | Existing tests pass; not a claim of exhaustive SQL audit |
| Adaptation title/setting | Story + revision PATCH | Existing revision update | Guard present; separate recovery remains to audit |

## Database change

`db/update-record-guards.sql` adds metadata to book controls, books and book notes.
Existing rows have revision 0 and unknown updated_at. The change does not invent
past timestamps. The first actual change is revision 1. No-op writes preserve the
revision and timestamp. Previous and current JSON records are retained in the
private `chronicles_internal.record_history` table. Browser roles cannot change
or read that recovery table. Recovery is currently an administrative operation,
not a new website history button.

The private trigger function uses SECURITY DEFINER only to append recovery
records without granting browser write access to history. It is not an exposed
RPC and has an empty search path. Existing public table policies are unchanged.
The selected writer is attribution, not verified authentication.

## Administrative maintenance

Use `chronicles_internal.update_record(table,id,expected_revision,patch,writer,note)`
for maintenance of the three new guarded paths. It checks the source revision
atomically and rejects unrelated fields. Run within a transaction, inspect the
returned record, verify preservation, then commit. Read the current revision
first. Never update recovery history to conceal a previous record.

Raw SQL can still bypass the compare-before-write helper. The triggers record
changes but cannot infer which revision an administrator intended to edit.
This limitation is explicit, rather than a claim of universal server enforcement.
Other tables must retain their existing guarded maintenance procedures until
individually audited. No direct content maintenance is part of v188.

## Verification

Database migration and guard tests run inside a rolled-back transaction first.
Tests check anonymous role writes, incremented revisions, stale rejection,
no-op preservation, private recovery history and administrative helper conflicts.
Client tests check a first-create race, stale rename/Trash/Restore, book scoping,
related work, note resolve/reopen cycles and critique draft recovery.

Actual iPhone Safari acceptance, unknown narrative dependencies and the remaining
server RPC/history audit are still open. These cannot be closed by desktop tests.

Migration applied: `20261102093913`, `chronicles_record_revision_recovery`.
Before/after content fingerprints match for 5 book controls, 31 books and 34
writing notes. The database tests were repeated after migration and rolled back.
Security review has no new exposed access: the recovery table intentionally has
RLS with no browser policies and no schema access. The advisor's informational
no-policy notice is expected for this private table:
https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

Recovery checkpoint: application commit 03706aad333d5a9902f2af8954c0cd1cc847c0e0.
An application rollback can retain these additive columns and triggers. Do not
remove recorded history as part of an application rollback.

## Source identity repair, 9 November 2026

Shared planning saves capture branch identity and revision before asynchronous loading, recheck before writing and before adopting the response, and retain local recovery drafts when navigation or an unexpected response makes completion uncertain. Shared forms are bound to the source opened for editing. An explicitly requested missing branch now fails instead of selecting another branch. Tests exercise the real form handlers in Arabic and English, interruptions before and during requests, response identity mismatch and unchanged recovery content.

This restores part of the unavailable local candidate 5e7b980. Its other preview, export, setup and recovery changes have not been recovered and are not claimed as deployed. Administrative writes and unregistered source relationships remain outside these UI checks.

## Planning operation boundaries, release 271

Preview publication, branch copying, recovery file review, history restoration, template setup, full recovery exports and readable HTML exports retain their opened source. Navigation or replacement of that source interrupts subsequent requests and prevents a late response from selecting another path. Copy and setup responses must identify the expected book and a revision. Duplicate branch and setup submissions are ignored while busy. Partial current copies retrieve the complete original revision, including unknown fields and their parent snapshot. Historical recovered data stays a separate copy and is never merged with current content.

Tests exercise actual UI handlers in Arabic and English, including source changes before submission, while reading, after a write, during setup, and before recovery confirmation. Export tests confirm no file is emitted after navigation. Existing checksum and recovery tests remain required. An already committed write cannot be undone by a browser navigation guard: reopen and inspect the saved paths before retrying an uncertain operation. Setup project creation and branch creation remain separate requests. These checks are UI protection, not a new database transaction or universal administrative lock.

## Workbook import boundary, release 272

Historical Ibn Al Jabal workbook imports bind their preview to the opened book, branch, revision and complete local planning snapshot. Delayed earlier reads cannot replace a later selection. Invalid files, cancelled selection and in-progress reads invalidate the old preview. Manual edits or a different branch at the same revision block merging. Only the Ibn Al Jabal planning book accepts its historical workbook schema. Duplicate submissions are ignored while saving, and a late completion cannot close a different page. Failed saves preserve the reviewed candidate for a guarded retry.

The workbook remains historical proposed input, never current authority by timestamp. Merging explicitly reviewed answers reopens affected questions and does not approve manuscript prose. Tests run the actual import handlers in both languages with isolated data; no production workbook or manuscript is imported by verification.

## Story World exchange, release 273

Story World export and selected proposal approval call the remote planning revision verifier through the actual workspace. Exports load complete planning and chapters, then compare the current branch and complete chapter ID/revision set before producing a review file. Missing, archived or changed branches and changed chapter inventories fail closed. Source identity and local planning content are checked again after asynchronous preparation. This is a checked snapshot, not an atomic lock against all later edits.

Imports retain the opened source and local snapshot, ignore delayed earlier reads, invalidate earlier previews when a new file is selected, freeze the approved selection during verification, and refuse duplicate saves. Superseded and archived records cannot receive proposal edits. Existing revision-conditional saves remain the final write boundary. Failure preserves the reviewed candidate for a guarded retry; no manuscript is automatically rewritten. Regression fixtures exercise both languages and the actual workspace callback. Other specialized exports and administrative writes require their own integration.

Reader synopsis Copy, Export HTML and Share use the same remote branch verifier through the source tools workspace. The selected language, length, text, branch ID and revision must still match after verification; a detached view or changed selection stops delivery. Only the reader synopsis text is delivered, with no private planning data. Editing also checks branch ID as well as revision. Tests cover all three delivery actions in both languages, including remote failure and same-revision branch replacement. Browser sharing remains subject to the browser's ordinary sharing capability and activation requirements.
