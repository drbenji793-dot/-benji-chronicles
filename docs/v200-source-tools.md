# Reader v200: source review tools

The v199 production source at `20b313c42979891f8547bd1131a49be871bbe75a` is the parent baseline. v198 and v199 decision verification, neutral historical labels and explicit character knowledge were merged before release. Production planning r262 was inspected without writes. No manuscript or planning rows were changed during implementation.

## Source and route map

| Surface | Canonical data | Behavior |
| --- | --- | --- |
| Story | `summary`, current full brief, approved `synopsisMeta`, `synopsisSections` | Existing summary editor remains a working draft editor; source review is linked explicitly |
| Synopsis | Same branch, selected `short`, `full` or `chapters`, selected `plan` or `manuscript` | Existing paragraphs retain their text; legacy chapter outlines remain read only in this tool |
| Twists and Clues | Existing `events` with explicit `twist`, `clue` or `secret` type | Classification is proposed and reviewed; no automatic conversion of existing events |
| Knowledge | Acquisition event `knowledgeRecords`, stable `characterId` and `factEventId` | Existing v198 format preserved; Reader is an explicit holder, not an inferred character |
| Decisions | `workshop.questions` and v199 application evidence | Existing apply, continuity review, verification, history and reopening workflow preserved |
| Pending work | Projection of questions, findings, event checks, source proposals | Links return to the canonical workspace; no duplicate work cards are saved |
| Review proposals | `workshop.toolProposals` | Attributed before/after payload, source snapshots, separate apply and saved verification |
| Publication | Existing project publication RPC | Proposal approval does not publish Storyline or modify saved chapters |

## Implemented

Clue cards carry linked setup, reinforcement, reveal and character IDs. Labels resolve from current records. Missing fields, unavailable links and setup after reveal are notices rather than assertions of a story error. General knowledge notes remain in a collapsed source inventory without assigning them to characters. Knowledge can be filtered by holder, acquisition event and reading order; unknown order is excluded from bounded queries. Unread possession remains distinct from knowledge.

Synopsis sections retain stable IDs, source snapshots and before/current source differences. The saved manuscript scope starts empty unless a synopsis has been explicitly saved for that scope. It does not generate a summary from unwritten planning. Existing short and full text remains unclassified until reviewed. A new section is empty and proposed. Authors choose source records and wording; this release does not infer canon or rewrite prose.

Proposals can be imported from a current review package. Book, path, revision, target, field allowlists and source existence are checked. Duplicate pending imports are rejected. Approval requires the selected writer Benji and rejects changed targets or dependencies. Writer selection remains the existing application convention, not verified authentication. Database branch compare and swap prevents concurrent overwrites. Verification checks the saved applied fields separately from literary continuity.

HTML exports match the selected view and scope, preserve Arabic text, label writer spoilers, include source context and pending decisions, escape content, and keep export time separate from source stamps in one bottom Technical details panel. Share uses the native file share API when supported and otherwise directs the user to HTML export. A JSON package carries the exact review scope and return instructions.

## Verification

The release check runs existing Arabic and English routes plus source tool tests. New tests cover wrong book, stale revision, missing sources, field allowlists, source changes, duplicate application, renamed character labels, unread possession, delayed reader knowledge, saved manuscript scope, stale synopsis dependencies, escaped export, actual proposal/save/reopen/verify handlers and decision history. Existing rendered knowledge editing and connected decision application tests are retained.

## Limits still open

1. Actual iPhone Safari clipping, native Share destination, downloaded HTML reopening and preserved edits need device acceptance. Desktop DOM tests do not establish this.
2. Broader character/place structured application, conflicting approved decisions and critique finding continuity are not all closed by this release.
3. No automatic literary judgment, name replacement, clue classification, story essence rewrite or author decision resolution is performed. Those require source specific editorial review.
4. Synopsis source links are user selected. Linked source freshness does not certify complete coverage or literary accuracy. Legacy outlines must be edited in their original chapter plan editor.
5. Source proposal field verification is not an independent human continuity review. Later source changes remain visible in synopsis dependency checks and knowledge truth checks; comprehensive cross-tool invalidation remains open.
6. Database recovery archives and external backup parity were not verified. This is a code release, not a complete recovery lock.

## Batched author decisions

No new author answer is required to deploy these tools. Recommendation: preserve unclassified legacy content, use the existing Decisions workspace for unresolved canon, and compare any future prose proposal with the original before approval. Do not approve content merely to fill an empty view. Keep the previously parked writing voice and reference title choices outside website completion.
