# Reader v202 continuation

Baseline verified before editing: both production domains pointed to v201 commit 942a0b3e239a0593ee3485c16f5d2522a59d57d5. The checkout matched that commit. This release changes reusable review behavior only. No production planning or manuscript data writes were performed.

## Approval scope

Connected applications record the exact event fields they changed. A new application cannot overwrite fields governed by another active approved/applied/resolved question without a linked revision. Older decisions with only event links are treated conservatively as overlapping scope. Summary approvals are checked separately. Conflict, deferred and rejected questions must be resolved or reopened before application. Retired events cannot be edited through this path. Clue approvals use the same collision guard. This detects recorded scope collisions, not semantic contradictions in prose; character/place patches and broader semantic reconciliation remain open.

## Source and event review

Approved tool proposals retain postapplication source snapshots. Saved field verification checks linked sources as well as values; chapter revisions remain significant. Metadata stamping alone does not invalidate planning evidence. Verified proposals return to Pending work when their source changes or becomes unavailable. Missing chapter metadata does not establish verification. Review controls expose a fresh proposal path for changed sources and remove unusable repeated approval controls.

Connected event reviews retain content and connection evidence for their connected component. Changed upstream or downstream records, links and retired sources reopen the item. Older reviews without source snapshots are presented for recheck, not backfilled as verified. Current briefs and source review exports include reopened event IDs and reasons. All historical review records remain retained.

## Critique continuity

A new explicit continuity form records still open, resolved after verified repair, or obsolete. Still open and resolved require a quote from the current saved paragraph. Resolution requires an approved repair verified against that chapter revision, no unfinished repair decision and settled linked author decisions. Missing linked sources block closure. Original quote, chapter revision and source fingerprint are retained in source history. Human review records its reason and limited scope. Resolved or obsolete findings reappear when the reviewed chapter, linked planning records or writing rules change. No manuscript edits are performed by this workflow, and no automated critique is labelled independent validation.

## Validation and recovery limits

43 test programs, edition checks and both edition builds are required for this release. New regression coverage exercises both languages, scope collisions, linked revisions, legacy records, source invalidation, review reopening and retained JSON/HTML data. Actual continuity forms, local drafts, scoped saves and reopening are exercised through the existing rendered DOM harness. This is automated validation, not actual iPhone Safari acceptance.

JSON round trips and exported HTML are checked with isolated fixtures. This does not verify live Supabase/Google Drive archive parity or prove a production restore. Those checks remain open. No new editorial decisions are required to implement these safeguards.

## Remaining work

Additional structured record applications; broader semantic approval reconciliation; full source coverage audits; deliberate clue gap review; remaining Story navigation consolidation; live backup parity and recovery rehearsal; actual iPhone Safari layout, download, Share and reopening. Author choices stay in one final batch. HQ and SCP remain outside this work.
