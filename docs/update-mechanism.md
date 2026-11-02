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

## Remaining work

This is shared planning integration, not full server-wide enforcement. Direct SQL maintenance, chapter/rule save paths outside DSL, externally created records and migration-version discovery still require a further audit. Existing conflicting story decisions remain unresolved. The mechanism cannot automatically decide which contradictory narrative statement is correct. Actual iPhone acceptance remains outstanding.
