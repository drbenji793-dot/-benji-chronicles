# Chronicles update mechanism

Scope: Chronicles Arabic and English, existing and newly created books. HQ and SCP are excluded. The reusable planning module is not a claim of adoption by other sites.

## Current implementation

`src/update-mechanism.js` records every shared planning save through `src/dsl.js`. Records include scope, base revision, affected record IDs, previous revisions, writer, save time, change note, recorded dependencies and separate approval, verification and publication states. It never infers author approval from a selected writer or automatically rewrites chapter prose.

Changed characters, places, events, objects, decisions, relationships, links and questions receive individual revision stamps. Other changed planning roots receive root stamps. Unchanged records keep their timestamps. Chapter source revisions are preserved independently from the branch revision.

Partial loads fetch the full original revision before merging. The final PATCH matches book, branch and original revision. A stale source returns no rows and is rejected. Database branch stamp and history triggers were confirmed read-only before this change. Prior values remain in `chronicles_dsl_history`; the current payload keeps only the latest update record. No database migration or content maintenance was performed for this release.

Recorded event dependencies are followed transitively. Character renames inspect old and new names. Removed links still identify their former dependants. Linked chapters are flagged for review, never rewritten. Unrecorded consequences remain editorial work. Current Book Brief and review exports include the latest update and pending dependency review while excluding historical source snapshots.

The latest planning update appears inside the existing collapsed bottom Technical details panel. No new top-level controls are introduced.

## Release procedure

1. Compare both production deployments and GitHub main before editing.
2. Preserve the starting commit as recovery reference. This release starts at bdf05484495cef6a7b71b3e59e43523bd4354a04 (Reader v185).
3. Make and test isolated changes. `npm run release:check` runs the full configured suite and edition checks.
4. Recheck origin/main before pushing. Reconcile any new commits.
5. Vercel buildCommand enforces release:check before building either edition. Failed checks prevent that deployment.
6. Verify both deployment commits, READY status and aliases. Update the tracker separately from site versioning.

`public/update-reference.json` is generated during build. It declares edition, release, mechanism schema, source locations and the build commit when Vercel supplies it. Missing deployment/database metadata is explicitly unknown, never invented. Vercel deployment records remain authoritative for live state.

## v188 extension

Book controls, book connection edits and writing note resolution now use record revision guards. Additive database triggers stamp changed rows and retain private recovery snapshots. Critique reports now enter the shared planning update record. See `save-path-audit.md` for the precise coverage and administrative helper. Existing rows use revision zero as initialization and keep unknown modification times unknown.

## Remaining work

This is shared planning integration, not full server-wide enforcement. Direct SQL maintenance, chapter/rule save paths outside DSL, externally created records and migration-version discovery still require a further audit. Existing conflicting story decisions remain unresolved. The mechanism cannot automatically decide which contradictory narrative statement is correct. Actual iPhone acceptance remains outstanding.

## Current decision approval gate

`src/current-version-gate.js` registers the Ibn Al Jabal manuscript against its current nonarchived planning branch. The chapter approval and Ink transfer UI reread the saved chapter and decision records before a write. Combined approval and transfer also compare the branch revision with the one opened for review. Missing sources, changed revisions and the missing approved Chapter 1 name stop the controlled action before the approval RPC.

This gate does not change prose or approve biography, relationship chronology, or the zk6 experiment. Draft saving remains available. Other books retain their existing revision and approval checks until explicitly registered. The combined registered-book action now carries the reviewed branch revision into the server transaction described below. Separate approval, separate transfer, legacy RPC clients and administrative SQL do not carry that token. Those paths require further integration before universal coverage can be claimed.

Tests exercise missing name, stale chapter, changed decisions, unapproved or retired decisions, unavailable sources and chapter scope. A real approval UI test verifies zero write calls for rejected input and exactly one approval call for a corrected reviewed fixture. Live manuscript Chapter 1 r4 was separately checked and rejected as expected; no manuscript content was changed.

## Server approval boundary

The `chronicles_current_decision_guard` trigger now protects Chapter 1 approval metadata for the registered Ibn Al Jabal manuscript. It checks the live approved naming decision, requires the name in the saved prose and requires the approval snapshot to match the current chapter. It applies to direct approval RPC and direct workflow writes as well as browser actions. The source rows are locked for the transaction. The function is SECURITY INVOKER with an empty search path; no table privileges or RLS policies were widened.

Anonymous-role transaction tests rejected the unnamed chapter and a mismatched approval snapshot, and accepted a corrected fixture including inline author spans. Every fixture write was rolled back. Manuscript fingerprint before and after: `296ceff5d3b0fa9ecc7d1e5ad562b97e`, 50 entries. There are still zero recorded manuscript approvals. No prose or approval was persisted by testing.

Source: `db/current-decision-approval-guard.sql`. Regression: `tests/current-decision-approval.sql`, which always rolls back. Applied migrations: `chronicles_current_decision_approval_guard` and `chronicles_decision_guard_inline_author_spans`. This is exact naming enforcement, not automatic biography, chronology or style approval. Other books and arbitrary content writes remain outside this particular server rule. An administrator who disables triggers can bypass it; this is not a security boundary against database administrators.

Operational rollback: drop the named trigger on `public.chronicles_workflow` and its trigger function through a reviewed migration. Do not remove chapter or workflow recovery history. The browser gate remains a separate layer.

## Reviewed approval transaction

The registered Ibn Al Jabal combined Approve and send action uses
`chronicles_reviewed_approve_and_transfer`. The client passes the exact planning
branch ID and revision opened for review. The server locks the saved chapter,
checks its revision, then locks the registered nonarchived planning branch and
compares the reviewed revision before calling the existing atomic approval and
Ink transfer. These locks remain until commit or rollback. A decision update
between browser preflight and the RPC is rejected. Missing tokens also fail.

The endpoint is additive, SECURITY INVOKER with an empty search path. Existing
permissions and RLS are unchanged. The existing Chapter 1 naming trigger remains
active. No manuscript or author approval was persisted by installation or tests.

Tests in `tests/reviewed-approval-transfer.sql` run as anon and roll back. They
reject stale chapter/branch revisions, absent branch tokens and unnamed prose,
accept a corrected fixture, force a failure after approval and transfer, verify
rollback restores both records, and retry successfully. Saving the corrected
fixture also refreshes linked planning metadata, so the test rereads that branch
before review. Browser tests verify the exact review token reaches the endpoint
and a server conflict remains visible without claiming approval success.

Coverage: combined approval and transfer for the registered book. Separate
approval, separate transfer, old clients and direct calls to legacy endpoints do
not carry this review token; they retain their existing guards. This is not
universal transaction enforcement or an authorization identity change. Concurrent
legacy transactions can still cause a database deadlock abort and require retry;
no partial approval is committed. Rollback the application to the preceding
commit if necessary; leaving the additive endpoint installed is harmless. Do not
delete recovery history.
