# Chronicles current sources and update contract

Scope: Chronicles Arabic, English, existing books and new books. Universal site framework rollout is deferred. HQ and SCP are unchanged.

## Current homes

| Information | Authority |
| --- | --- |
| Manuscript | chronicles_book_entries or chronicles_chapters, exact id and revision |
| Book metadata | chronicles_books |
| Story World | selected nonarchived chronicles_dsl_branches.data, exact branch id and revision |
| Characters | data.characters, stable character id |
| Relationships | data.relationships, one record per character pair, with story stages |
| Places | data.places; existing data.world remains available until reconciled |
| Decisions | data.decisions, with approval source; workshop answers retain their separate status |
| Writing guidance | data.rules plus applicable current approved decisions |
| Story drafts | data.storyDraft, explicitly a proposal until approved |
| Published storyline | chronicles_dsl_projects.published, separately published revision |
| Pending implementation | data.workStatus and currentUpdate |
| Recovery | chronicles_dsl_history and chapter version tables; load contents by explicit selection |

Do not infer approval from record presence or upload time. Approved names do not approve every proposed biography detail. Unknown statuses remain unclassified. Retire a corrected instruction in the same current record and let revision history preserve the prior state. Narrative stages are not obsolete facts.

Old ZHTML workbooks and sourceDocument fields are provenance, not overrides of later author decisions. Never reconstruct current decisions from an older export without comparison. Preserve complete source data in recovery exports but exclude old workbooks and checkpoints from ordinary writing briefs.

## Editing and review

Read the Current Book Brief before editing prose. It records branch revision, manuscript revisions, current planning, decisions, writing rules, proposals, unresolved statuses and pending work. Chapter text loads only for reading or explicit export. Recheck revisions before applying changes. Existing database triggers retain planning and manuscript history.

Language edits and changes to events or motivations remain separate. Do not publish the Chapter One proposal without Benji reviewing it. Egyptian narrative voice uses حافيين and retains character introductions, place context and narrator rhythm.

## Recovery and loading

The planning entry screen lists branch metadata and fetches only the chosen branch. An archived branch is opened only by explicit selection. The Story World load omits branch base snapshots and published payloads. Chapter link failure does not hide Story World. Planning and independent manuscript histories list metadata first and fetch contents on selection. No historical records are deleted by this release.

## Ibn al Jabal

Planning book: 66739f5d-2bac-4d75-a4fd-6df93da8ac7e.
Manuscript book: c911584d-bd5b-42fe-b41c-a2a456c64d41.
Planning branch: 9a8bd2d8-7cd0-484e-a94d-fbdc90f37bd1.

Checkpoint r237 preceded reconciliation; r238 replaces the obsolete delayed naming decision with Benji's latest correction. Saad Abu al Ala is introduced by name from Chapter One. His saved biography is preserved, not silently approved in its entirety. Chapter One remains manuscript r4. Chapter Two still contains an outdated unnamed friend note. Other legacy approvals require reconciliation against their specific documented decisions; no blanket approval migration was performed.

Manuscript digest before and after reconciliation: 40cb5a34c42338d1fae244876aa3efd6 (50 entries, id/revision/body ordered by id).

## Release verification

Test current records and revision conflicts, shared relationship editing, Arabic/English routes, new empty workspaces, large planning documents, exports and selected history restoration. Confirm production commit before publishing. Record deployed commit and verify live aliases. Keep unresolved reconciliation and author prose review visible rather than marking the eight tasks all complete.
