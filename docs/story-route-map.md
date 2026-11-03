# Chronicles route and source inventory

Audited during v205 against v204 main commit 08e197c15bb7767253f791e2886baedf01f553ce. Neither timestamps nor newest records establish author approval.

| Surface | Existing route | Authoritative source | Consumers and protection |
| --- | --- | --- | --- |
| Story | view=brief | Selected book and branch revision; summary, approved synopsisMeta/synopsisSections, storyBrief and saved planning fallback | Short, Full and Chapter plan selector; Copy and selected HTML export use the displayed view. Source reviews retain exact text and selected records. Related view changes reopen review. Approved summary editing routes to a proposal. |
| Synopsis proposals | view=dsl, dslview=synopsis | Same branch synopsis fields and workshop.toolProposals | Before/after, explicit review, branch guard, linked source snapshots and verification. This is the proposal workspace, not a second independently saved Story copy. |
| Chapter prose | book or collection chapter route | chronicles_book_entries or chronicles_chapters, scoped by book/collection/language and revision | Reader/editor, chapter history, Review and full export. Planning actions never update these tables. |
| Decisions | view=dsl, dslview=decisions | workshop.questions and application evidence | Focused answer/revision forms, Pending work and answer exports; protected answers require linked revisions. Old workbook bookmarks open the current list. |
| Characters and places | view=dsl, dslview=characters or garden | Stable branch record IDs and lifecycle state | Story World, linked labels, proposals and context exports. Historical prose names are not globally replaced. |
| Events and connections | view=dsl, dslview=map/reading/graph/connections | Branch events and links | Story Map, Scenes, connected review queue and source snapshots. Direct and indirect recorded dependencies are labelled; neither is an editorial conclusion. |
| Clues and knowledge | view=dsl, dslview=twists/knowledge | Same events, stable character/fact IDs, workshop source proposals and reviews | Shared metadata checks, source proposals, attributed knowledge and writer review exports. No automatic approval. |
| Critique | view=critique | Saved chapter revisions plus branch editorialFindings | One findings/decision/repair workflow; exact quote checks and explicit approval. Import is a proposal, not a running AI service. |
| Published Storyline | view=storyline | project.published.data and published source revision | Published preview and export use the publication, not the newer working branch. |
| History and recovery | view=dsl, dslview=history; Restore file | Database branch snapshots or validated portable snapshot | Restoration creates a new branch. Existing paths, manuscript and publication stay unchanged. File checksum detects accidental changes; it does not authenticate an author. |

Existing and independent books share bookNavigation. Collections retain story and language parameters. Ibn al Jabal's established planning ID maps to its existing manuscript book ID through planningChapterPath. No route migration or content deletion is needed for the changes in this release.

Recovery evidence: source versions remain in GitHub; branch history and metadata recovery triggers are present in the connected database. Seven part records have retained history. The private record_history and workflow_history tables are present with no retained rows at audit time; this does not establish a successful external archive. No matching Chronicles archive was found in the connected Drive searches or storage object search. Supabase contains only the existing private ink bucket. Identical external ZIP and SHA256 parity therefore remains unverified. No storage access was widened.

Remaining: actual iPhone Safari navigation/export/Share acceptance, full external archive verification and editorial decisions concerning synopsis wording or story mechanics. These are not implied by automated route and recovery checks.
